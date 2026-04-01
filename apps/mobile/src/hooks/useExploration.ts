 import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import * as Haptics from "expo-haptics";
// Keep chunk size the same
const CHUNK_SIZE = 16;

// Only recenter visionGrid when player moves 5+ tiles from grid center (keeps SkiaWorldMap memo stable).
const GRID_REFRESH_DISTANCE = 5;

// Buffer zone: grid is larger than "visible" so we don't need a new array every few steps.
// 30x30 grid (radius 15) = 10-tile buffer each side if refresh is at 5.
// Prevents flickering at edges on large screens (iPad, Pro Max) during fast movement.
const VISIBLE_RADIUS_X = 18;
const VISIBLE_RADIUS_Y = 20;

// Large prefetch radii — minimize server round-trips during gameplay.
// Client holds more data; server sync only when player stops.
const PREFETCH_RADIUS_X = 48;
const PREFETCH_RADIUS_Y = 48;
const BOOTSTRAP_PREFETCH_RADIUS_X = 48;
const BOOTSTRAP_PREFETCH_RADIUS_Y = 48;

const EXPLORATION_CACHE_VERSION = 1;
const DEBUG_WORLD_MAP_SYNC = __DEV__;

function logWorldMapSync(message: string, payload?: Record<string, unknown>) {
  if (!DEBUG_WORLD_MAP_SYNC) return;
  if (payload) {
    console.log(`[WorldMapSync][useExploration] ${message}`, payload);
    return;
  }
  console.log(`[WorldMapSync][useExploration] ${message}`);
}

function makeExplorationCacheKey(userId: string, mapId: string) {
  return `exploration_cache_v${EXPLORATION_CACHE_VERSION}:${userId}:${mapId}`;
}

function mapToObject(map: Map<string, any>) {
  const out: Record<string, any> = {};
  map.forEach((value, key) => {
    out[key] = value;
  });
  return out;
}

function objectToMap(value: Record<string, any> | undefined) {
  const map = new Map<string, any>();
  if (!value || typeof value !== "object") return map;
  Object.entries(value).forEach(([k, v]) => {
    map.set(k, v);
  });
  return map;
}

export const useExploration = (
  setEncounter: (encounter: any | null) => void,
  setInteractionVisible: (visible: boolean) => void,
  setActiveRaid: (raid: any | null) => void,
  setRaidModalVisible: (visible: boolean) => void,
  currentMapId?: string | null,
  tileLibrary?: Map<string, any>,
) => {
  const { user } = useAuth();
  const [unlocked, setUnlocked] = useState<Set<string>>(new Set());
  const [nodes, setNodes] = useState<any[]>([]);
  const [chunksVersion, setChunksVersion] = useState(0);
  const [autoTravelReport, setAutoTravelReport] = useState<any | null>(null);
  const [checkpointAlert, setCheckpointAlert] = useState<any | null>(null);

  // Chunk cache
  const chunkCache = useRef<Map<string, any>>(new Map());
  const inFlightChunks = useRef<Set<string>>(new Set());

  // Refs that let onTileEnter read fresh data without being in its dependency list
  const userRef = useRef(user);
  const nodesRef = useRef(nodes);
  const lastRefreshCenter = useRef<{ x: number; y: number }>({
    x: user?.world_x || 0,
    y: user?.world_y || 0,
  });
  const tileEnterBusy = useRef(false);
  const lastProcessedTile = useRef<{ x: number; y: number }>({
    x: user?.world_x || 0,
    y: user?.world_y || 0,
  });

  /** Latest grid position; synced to React on movement stop. Server sync is batched (useMapSessionSync). */
  const latestPos = useRef<{ x: number; y: number }>({
    x: user?.world_x || 0,
    y: user?.world_y || 0,
  });
  const nodeLookupRef = useRef<Map<string, any>>(new Map());

  // Pre-cached encounter pool — populated once on map load, never read mid-movement via DB
  const encounterPoolRef = useRef<any[]>([]);

  // Pending vision refresh — set during movement when drifted 5+ tiles.
  // Only flushed when player stops; no server calls during movement.
  const pendingRefreshCenterRef = useRef<{ x: number; y: number } | null>(null);

  // Deferred vision state — refreshVision updates refs, flushPendingVision applies to React.
  // Prevents setState during movement (avoids rubberbanding).
  const hasPendingVisionRef = useRef(false);
  const unlockedRef = useRef<Set<string>>(new Set());
  const gridCenterRef = useRef<{ x: number; y: number }>({
    x: user?.world_x || 0,
    y: user?.world_y || 0,
  });
  const chunksVersionRef = useRef(0);
  /** Chunk cache updated in refreshVision; React bumps `chunksVersion` only in flushPendingVision (movement stop). */
  const pendingChunksBumpRef = useRef(false);

  useEffect(() => {
    userRef.current = user;
  }, [user]);
  useEffect(() => {
    nodesRef.current = nodes;
  }, [nodes]);
  useEffect(() => {
    const lookup = new Map<string, any>();
    nodes.forEach((node) => {
      lookup.set(`${node.x},${node.y}`, node);
    });
    nodeLookupRef.current = lookup;
  }, [nodes]);

  // Hydrate local exploration cache immediately for local-first world rendering.
  useEffect(() => {
    const userId = user?.id;
    if (!userId || !currentMapId || currentMapId === "undefined") return;

    let cancelled = false;
    const cacheKey = makeExplorationCacheKey(userId, currentMapId);

    (async () => {
      try {
        const raw = await AsyncStorage.getItem(cacheKey);
        if (!raw || cancelled) return;
        const parsed = JSON.parse(raw);

        if (Array.isArray(parsed?.nodes)) {
          nodesRef.current = parsed.nodes;
          setNodes(parsed.nodes);
        }

        if (Array.isArray(parsed?.unlocked)) {
          const unlockedSet = new Set<string>(parsed.unlocked);
          unlockedRef.current = unlockedSet;
          setUnlocked(unlockedSet);
        }

        if (parsed?.chunkCache && typeof parsed.chunkCache === "object") {
          chunkCache.current = objectToMap(parsed.chunkCache);
          chunksVersionRef.current += 1;
          setChunksVersion((v) => v + 1);
        }

        if (parsed?.gridCenter && typeof parsed.gridCenter.x === "number" && typeof parsed.gridCenter.y === "number") {
          gridCenterRef.current = parsed.gridCenter;
          lastRefreshCenter.current = parsed.gridCenter;
          setGridCenter(parsed.gridCenter);
        }
      } catch (e) {
        console.warn("[useExploration] cache hydrate failed:", e);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user?.id, currentMapId]);

  // Persist exploration cache in small batches.
  useEffect(() => {
    const userId = user?.id;
    if (!userId || !currentMapId || currentMapId === "undefined") return;

    const cacheKey = makeExplorationCacheKey(userId, currentMapId);
    const id = setTimeout(() => {
      AsyncStorage.setItem(
        cacheKey,
        JSON.stringify({
          nodes: nodesRef.current,
          unlocked: Array.from(unlockedRef.current),
          chunkCache: mapToObject(chunkCache.current),
          gridCenter: gridCenterRef.current,
        }),
      ).catch((e) => {
        console.warn("[useExploration] cache persist failed:", e);
      });
    }, 800);

    return () => clearTimeout(id);
  }, [user?.id, currentMapId, nodes, unlocked, chunksVersion]);

  // Pre-cache encounter pool on map load so onTileEnter never does a DB read during movement
  useEffect(() => {
    if (!currentMapId || currentMapId === "undefined") return;
    supabase
      .from("encounter_pool")
      .select("*")
      .eq("map_id", currentMapId)
      .then(({ data }) => {
        encounterPoolRef.current = data || [];
      });
  }, [currentMapId]);

  // Separate camera position for visionGrid that only updates when we actually
  // want the grid to recalculate (initial load, chunk fetch, teleport).
  const [gridCenter, setGridCenter] = useState<{ x: number; y: number }>({
    x: user?.world_x || 0,
    y: user?.world_y || 0,
  });

  // On teleport (large jump), update gridCenter
  const prevTeleportX = useRef(user?.world_x || 0);
  const prevTeleportY = useRef(user?.world_y || 0);
  useEffect(() => {
    const ux = user?.world_x || 0;
    const uy = user?.world_y || 0;
    const dx = Math.abs(ux - prevTeleportX.current);
    const dy = Math.abs(uy - prevTeleportY.current);
    if (dx >= 2 || dy >= 2) {
      setGridCenter({ x: ux, y: uy });
      lastRefreshCenter.current = { x: ux, y: uy };
    }
    prevTeleportX.current = ux;
    prevTeleportY.current = uy;
  }, [user?.world_x, user?.world_y]);

  // 1. HEAVY LIFTING: Only runs when new chunks are downloaded
  const globalTileMap = useMemo(() => {
    const tileMap = new Map<string, any[]>();

    chunkCache.current.forEach((chunk) => {
      if (chunk && chunk.tile_data && Array.isArray(chunk.tile_data)) {
        chunk.tile_data.forEach((t: any) => {
          const tKey = `${t.x},${t.y}`;
          const layers = tileMap.get(tKey) || [];
          layers.push(t);
          tileMap.set(tKey, layers);
        });
      }
    });

    tileMap.forEach((layers) => {
      layers.sort((a, b) => {
        // Primary Sort: By Layer
        const layerDiff = (Number(a.layer) || 0) - (Number(b.layer) || 0);
        if (layerDiff !== 0) return layerDiff;

        // Secondary Sort: By ID (or cleanUrl) to PREVENT Z-FIGHTING
        // If they are on the same layer, their order is now permanently locked.
        const idA = a.id || a.cleanUrl || "";
        const idB = b.id || b.cleanUrl || "";
        return idA.localeCompare(idB);
      });
    });

    return tileMap;
  }, [chunksVersion]);

  // 2. LIGHTWEIGHT RENDER: Runs every 5 steps, but takes < 1ms
  const { visionGrid, nodesInVision } = useMemo(() => {
    if (!user) return { visionGrid: [], nodesInVision: [] };

    const cx = gridCenter.x;
    const cy = gridCenter.y;

    const nodeMap = new Map();
    (nodes || []).forEach((n) => nodeMap.set(`${n.x},${n.y}`, n));

    const grid = [];
    const visibleNodesList: any[] = [];

    for (let dy = VISIBLE_RADIUS_Y; dy >= -VISIBLE_RADIUS_Y; dy--) {
      for (let dx = -VISIBLE_RADIUS_X; dx <= VISIBLE_RADIUS_X; dx++) {
        const tx = cx + dx;
        const ty = cy + dy;
        const key = `${tx},${ty}`;

        const isUnlocked = unlocked.has(key) || (tx === 0 && ty === 0);
        const isCurrent = dx === 0 && dy === 0;

        grid.push({
          x: tx,
          y: ty,
          isVisible: isCurrent || isUnlocked,
          node: nodeMap.get(key),
          tiles: globalTileMap.get(key) || [],
        });
      }
    }

    const minX = cx - VISIBLE_RADIUS_X;
    const maxX = cx + VISIBLE_RADIUS_X;
    const minY = cy - VISIBLE_RADIUS_Y;
    const maxY = cy + VISIBLE_RADIUS_Y;

    (nodes || []).forEach((n) => {
      if (
        n.x >= minX - 2 &&
        n.x <= maxX + 2 &&
        n.y >= minY - 2 &&
        n.y <= maxY + 2
      ) {
        const isNodeUnlocked =
          unlocked.has(`${Math.floor(n.x)},${Math.floor(n.y)}`) ||
          (n.x === 0 && n.y === 0);
        visibleNodesList.push({ ...n, isVisible: isNodeUnlocked });
      }
    });

    return { visionGrid: grid, nodesInVision: visibleNodesList };
  }, [gridCenter.x, gridCenter.y, unlocked, nodes, globalTileMap]);

  // 2. REFRESH DATA (Fetching Chunks/Nodes/Discoveries)
  // Chunk data is written to chunkCache refs; `chunksVersion` bumps in flushPendingVision
  // (movement stop) via pendingChunksBumpRef — avoids globalTileMap/visionGrid re-renders mid-move.
  // Discoveries/nodes still flush via flushPendingVision on movement stop.
  const refreshVision = useCallback(
    async (
      cx: number,
      cy: number,
      force: boolean = false,
      onComplete?: () => void,
      opts?: { chunksOnly?: boolean },
    ) => {
      if (!userRef.current?.id) return;

      const prefetchX = force ? BOOTSTRAP_PREFETCH_RADIUS_X : PREFETCH_RADIUS_X;
      const prefetchY = force ? BOOTSTRAP_PREFETCH_RADIUS_Y : PREFETCH_RADIUS_Y;

      const minChunkX = Math.floor((cx - prefetchX) / CHUNK_SIZE);
      const maxChunkX = Math.floor((cx + prefetchX) / CHUNK_SIZE);
      const minChunkY = Math.floor((cy - prefetchY) / CHUNK_SIZE);
      const maxChunkY = Math.floor((cy + prefetchY) / CHUNK_SIZE);

      const missingChunks: string[] = [];
      for (let x = minChunkX; x <= maxChunkX; x++) {
        for (let y = minChunkY; y <= maxChunkY; y++) {
          const key = `${x},${y}`;
          if (
            force ||
            (!chunkCache.current.has(key) && !inFlightChunks.current.has(key))
          ) {
            missingChunks.push(key);
          }
        }
      }

      logWorldMapSync("refreshVision:start", {
        cx,
        cy,
        force,
        chunksOnly: Boolean(opts?.chunksOnly),
        missingChunks: missingChunks.length,
      });

      // Movement prefetch: only pull map_chunks (no discoveries/nodes) to avoid network + setState storms.
      if (opts?.chunksOnly) {
        if (missingChunks.length === 0) return;
        missingChunks.forEach((key) => inFlightChunks.current.add(key));
        const chunkCoords = missingChunks.map((key) => {
          const [x, y] = key.split(",").map(Number);
          return { x, y };
        });
        const minX = Math.min(...chunkCoords.map((c) => c.x));
        const maxX = Math.max(...chunkCoords.map((c) => c.x));
        const minY = Math.min(...chunkCoords.map((c) => c.y));
        const maxY = Math.max(...chunkCoords.map((c) => c.y));

        let wroteChunkTiles = false;
        try {
          const { data, error } = await supabase
            .from("map_chunks")
            .select("*")
            .gte("chunk_x", minX)
            .lte("chunk_x", maxX)
            .gte("chunk_y", minY)
            .lte("chunk_y", maxY);
          if (error) throw error;

          if (data && Array.isArray(data)) {
            const fetchedMap = new Map<string, any>();
            data.forEach((chunk: any) => {
              fetchedMap.set(`${chunk.chunk_x},${chunk.chunk_y}`, chunk);
            });

            missingChunks.forEach((key) => {
              const chunkData = fetchedMap.get(key);
              const rawTiles = chunkData?.tile_data || [];
              const tile_data = rawTiles.map((t: any) => ({
                ...t,
                cleanUrl: t.imageUrl ? t.imageUrl.split("?")[0] : undefined,
              }));
              chunkCache.current.set(
                key,
                chunkData ? { ...chunkData, tile_data } : { tile_data: [] },
              );
              wroteChunkTiles = true;
            });
          }

          if (wroteChunkTiles) {
            chunksVersionRef.current += 1;
            pendingChunksBumpRef.current = true;
          }
          logWorldMapSync("refreshVision:chunksOnly:complete", {
            cx,
            cy,
            fetchedChunks: missingChunks.length,
            wroteChunkTiles,
          });
          onComplete?.();
        } catch (e) {
          console.warn("[useExploration] refreshVision (chunksOnly) failed:", e);
        } finally {
          missingChunks.forEach((key) => inFlightChunks.current.delete(key));
        }
        return;
      }

      const promises: Promise<any>[] = [];
      const userId = userRef.current.id;
      promises.push(
        Promise.resolve(
          supabase
            .from("player_discoveries")
            .select("x, y")
            .eq("user_id", userId),
        ),
      );

      const cachedNodes = nodesRef.current;
      if (force || (cachedNodes || []).length === 0) {
        promises.push(
          Promise.resolve(supabase.from("world_map_nodes").select("*")),
        );
      }

      if (missingChunks.length > 0) {
        missingChunks.forEach((key) => inFlightChunks.current.add(key));

        const chunkCoords = missingChunks.map((key) => {
          const [x, y] = key.split(",").map(Number);
          return { x, y };
        });

        const minX = Math.min(...chunkCoords.map((c) => c.x));
        const maxX = Math.max(...chunkCoords.map((c) => c.x));
        const minY = Math.min(...chunkCoords.map((c) => c.y));
        const maxY = Math.max(...chunkCoords.map((c) => c.y));

        promises.push(
          Promise.resolve(
            supabase
              .from("map_chunks")
              .select("*")
              .gte("chunk_x", minX)
              .lte("chunk_x", maxX)
              .gte("chunk_y", minY)
              .lte("chunk_y", maxY),
          ),
        );
      }

      let wroteChunkTiles = false;

      try {
        const results = await Promise.all(promises);
        const discoveriesRes = results[0];

        let nodesRes: { data?: any[] } | undefined;
        let newChunksRes: { data?: any[] } | undefined;

        let resultIndex = 1;
        if (force || (cachedNodes || []).length === 0) {
          nodesRes = results[resultIndex++];
        } else {
          nodesRes = { data: cachedNodes || [] };
        }

        if (missingChunks.length > 0) {
          newChunksRes = results[resultIndex];

          if (newChunksRes?.data && Array.isArray(newChunksRes.data)) {
            const fetchedMap = new Map<string, any>();
            newChunksRes.data.forEach((chunk: any) => {
              fetchedMap.set(`${chunk.chunk_x},${chunk.chunk_y}`, chunk);
            });

            missingChunks.forEach((key) => {
              const chunkData = fetchedMap.get(key);
              const rawTiles = chunkData?.tile_data || [];
              const tile_data = rawTiles.map((t: any) => ({
                ...t,
                cleanUrl: t.imageUrl ? t.imageUrl.split("?")[0] : undefined,
              }));
              chunkCache.current.set(
                key,
                chunkData ? { ...chunkData, tile_data } : { tile_data: [] },
              );
              wroteChunkTiles = true;
            });
          }
        }

        if (discoveriesRes?.data && Array.isArray(discoveriesRes.data)) {
          unlockedRef.current = new Set<string>(
            discoveriesRes.data.map((d: any) => `${d.x},${d.y}`),
          );
        }

        if (nodesRes?.data && Array.isArray(nodesRes.data)) {
          const mapped = nodesRes.data.map((n: any) => ({
            ...n,
            x: Number(n.global_x ?? n.x ?? 0),
            y: Number(n.global_y ?? n.y ?? 0),
          }));
          nodesRef.current = mapped;
        }

        lastRefreshCenter.current = { x: cx, y: cy };
        gridCenterRef.current = { x: cx, y: cy };
        hasPendingVisionRef.current = true;

        if (wroteChunkTiles) {
          chunksVersionRef.current += 1;
          pendingChunksBumpRef.current = true;
        }
        logWorldMapSync("refreshVision:full:complete", {
          cx,
          cy,
          force,
          fetchedChunks: missingChunks.length,
          wroteChunkTiles,
          discoveries: unlockedRef.current.size,
          nodes: nodesRef.current.length,
        });

        onComplete?.();
      } catch (e) {
        console.warn("[useExploration] refreshVision failed:", e);
      } finally {
        missingChunks.forEach((key) => inFlightChunks.current.delete(key));
      }
    },
    [],
  );

  // Applies deferred vision data to React state. Call when player stops.
  const flushPendingVision = useCallback(() => {
    logWorldMapSync("flushPendingVision:start", {
      hasPendingVision: hasPendingVisionRef.current,
      hasPendingCenter: Boolean(pendingRefreshCenterRef.current),
      gridCenterRef: { ...gridCenterRef.current },
    });

    if (hasPendingVisionRef.current) {
      setUnlocked(unlockedRef.current);
      setNodes(nodesRef.current);
      hasPendingVisionRef.current = false;
    }

    if (pendingChunksBumpRef.current) {
      pendingChunksBumpRef.current = false;
      setChunksVersion((v) => v + 1);
    }

    // Apply the latest known player position to gridCenter.
    const target = pendingRefreshCenterRef.current ?? gridCenterRef.current;
    pendingRefreshCenterRef.current = null;

    setGridCenter({ x: target.x, y: target.y });
    lastRefreshCenter.current = { x: target.x, y: target.y };
    gridCenterRef.current = { x: target.x, y: target.y };

    // No refreshVision here; chunks are prefetched during movement via chunksOnly.
    logWorldMapSync("flushPendingVision:end", {
      gridCenterX: target.x,
      gridCenterY: target.y,
    });
  }, []);

  // MANUAL MOVE (Triggered by UI thread frame loop via runOnJS)
  // Fully synchronous — no await, no setUser. Profile world position saves on map blur / background (WorldMapScreen).
  const onTileEnter = useCallback(
    (nx: number, ny: number) => {
      if (
        lastProcessedTile.current.x === nx &&
        lastProcessedTile.current.y === ny
      )
        return;
      if (tileEnterBusy.current) return;
      tileEnterBusy.current = true;

      try {
        latestPos.current = { x: nx, y: ny };
        lastProcessedTile.current = { x: nx, y: ny };

        const u = userRef.current;
        const node = nodeLookupRef.current.get(`${nx},${ny}`) ?? null;

        if (node) {
          // Discovery upserts — fire and forget, never awaited
          if (u) {
            supabase
              .from("player_discoveries")
              .upsert({ user_id: u.id, x: nx, y: ny })
              .then();
            supabase
              .from("discovered_locations")
              .select("node_id")
              .match({ user_id: u.id, node_id: node.id })
              .maybeSingle()
              .then(({ data: existing }) => {
                if (!existing) {
                  supabase
                    .from("discovered_locations")
                    .upsert([{ user_id: u.id, node_id: node.id }], {
                      onConflict: "user_id,node_id",
                    })
                    .then();
                  setCheckpointAlert(node);
                  Haptics.notificationAsync(
                    Haptics.NotificationFeedbackType.Success,
                  );
                }
              });
          }

          if (node.interaction_type === "BOSS_RAID") {
            setActiveRaid({
              id: node.interaction_data?.raid_id,
              boss_name: node.name,
              boss_image: node.icon_url,
              max_hp: node.interaction_data?.max_hp || 100,
            });
            setRaidModalVisible(true);
          }
        } else {
          // Encounter roll — against pre-cached pool, zero DB reads
          const roll = Math.random();
          if (roll < 0.05 && encounterPoolRef.current.length > 0) {
            const eligible = encounterPoolRef.current.filter(
              (e) => e.spawn_chance >= roll,
            );
            if (eligible.length > 0) {
              const randomEncounter =
                eligible[Math.floor(Math.random() * eligible.length)];
              if (
                randomEncounter.event_type === "LOOT" &&
                randomEncounter.metadata?.display_mode === "TEXT"
              ) {
                // Toast logic (no-op for now)
              } else if (
                randomEncounter.metadata?.visuals?.layout === "SIDE_VIEW"
              ) {
                setEncounter(randomEncounter);
                setInteractionVisible(true);
              }
            }
          }
        }

        pendingRefreshCenterRef.current = { x: nx, y: ny };
        const dist =
          Math.abs(nx - lastRefreshCenter.current.x) +
          Math.abs(ny - lastRefreshCenter.current.y);
        if (dist >= GRID_REFRESH_DISTANCE) {
          logWorldMapSync("onTileEnter:gridRefreshThreshold", {
            nx,
            ny,
            dist,
            threshold: GRID_REFRESH_DISTANCE,
          });
          // Do not call setGridCenter here — that is setState mid-movement.
          // pendingRefreshCenterRef already tracks this; flushPendingVision applies it on stop.
          lastRefreshCenter.current = { x: nx, y: ny };
          void refreshVision(nx, ny, false, undefined, { chunksOnly: true });
        }

      } finally {
        tileEnterBusy.current = false;
      }
    },
    [currentMapId, refreshVision],
  ); // Stable — reads user/nodes/pool from refs

  return {
    onTileEnter,
    move: () => {},
    refreshVision,
    flushPendingVision,
    visionGrid,
    nodesInVision,
    loading: false,
    autoTravelReport,
    setAutoTravelReport,
    checkpointAlert,
    setCheckpointAlert,
    latestPos,
  };
};
