import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import * as Haptics from "expo-haptics";
import { useSharedValue } from "react-native-reanimated";

const MOVE_COST = 100;
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

export const useExploration = (
  setEncounter: (encounter: any | null) => void,
  setInteractionVisible: (visible: boolean) => void,
  setActiveRaid: (raid: any | null) => void,
  setRaidModalVisible: (visible: boolean) => void,
  currentMapId?: string | null,
  tileLibrary?: Map<string, any>,
) => {
  const { user, setUser } = useAuth();
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

  // Debounced DB write timer — batches rapid tile crossings into fewer Supabase calls
  const dbWriteTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestPos = useRef<{ x: number; y: number; banked: number }>({
    x: user?.world_x || 0,
    y: user?.world_y || 0,
    banked: user?.steps_banked || 0,
  });
  const nodeLookupRef = useRef<Map<string, any>>(new Map());
  const bankedSteps = useSharedValue(user?.steps_banked || 0);

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

  // Local ref for step limit so we don't trigger setUser on every step (avoids GC stutters)
  const localBankRef = useRef(user?.steps_banked || 0);

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

  // Keep the ref synced if the server or a menu updates the user's steps
  useEffect(() => {
    localBankRef.current = user?.steps_banked || 0;
    bankedSteps.value = localBankRef.current;
  }, [user?.steps_banked]);

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
  // Updates refs only — never setState during fetch. Caller passes onComplete to flush to React
  // when appropriate (e.g. initial load). When called from flushPendingVision on stop, no onComplete:
  // we defer the flush to the next stop to avoid re-renders mid-movement.
  const refreshVision = useCallback(
    async (
      cx: number,
      cy: number,
      force: boolean = false,
      onComplete?: () => void,
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
            inFlightChunks.current.delete(key);
          });
        }
      }

      // Update refs only — no setState. Flush to React via flushPendingVision.
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
      chunksVersionRef.current += 1;
      hasPendingVisionRef.current = true;

      onComplete?.();
    },
    [],
  );

  // Applies deferred vision data to React state. Call when player stops.
  // Also kicks off a new fetch if we drifted during movement.
  const flushPendingVision = useCallback(() => {
    if (hasPendingVisionRef.current) {
      setUnlocked(unlockedRef.current);
      setNodes(nodesRef.current);
      setGridCenter(gridCenterRef.current);
      setChunksVersion((v) => v + 1); // force memo invalidation
      hasPendingVisionRef.current = false;
    }

    const pending = pendingRefreshCenterRef.current;
    if (pending) {
      pendingRefreshCenterRef.current = null;
      // Center grid optimistically so camera matches player position while fetch runs
      setGridCenter({ x: pending.x, y: pending.y });
      lastRefreshCenter.current = { x: pending.x, y: pending.y };
      refreshVision(pending.x, pending.y, true);
    }
  }, [refreshVision]);

  // AUTO-HUNT
  const fastTravel = async (stepsAvailable: number) => {
    if (!user) return;
    const tilesToMove = Math.floor(stepsAvailable / MOVE_COST);

    if (tilesToMove < 1) {
      await bankSteps(stepsAvailable);
      return;
    }

    let ny = (user.world_y || 0) + tilesToMove;
    const nx = user.world_x || 0;

    const report = {
      tilesTraveled: tilesToMove,
      xpGained: tilesToMove * 50,
      itemsFound: Math.random() > 0.5 ? ["Mana Crystal"] : [],
    };

    const now = new Date().toISOString();

    await supabase
      .from("profiles")
      .update({
        world_y: ny,
        last_sync_time: now,
      })
      .eq("id", user.id);

    // Save fresh coords to local storage
    AsyncStorage.setItem(
      "last_known_coords",
      JSON.stringify({ x: nx, y: ny }),
    ).catch((e) => {
      console.warn("Failed to save local coordinates:", e);
    });

    setUser({ ...user, world_y: ny, last_sync_time: now });
    setAutoTravelReport(report);
  };

  // MANUAL BANK
  const bankSteps = async (steps: number) => {
    if (!user) return;
    const newTotal = (user.steps_banked || 0) + steps;

    const now = new Date().toISOString();

    await supabase
      .from("profiles")
      .update({
        steps_banked: newTotal,
        last_sync_time: now,
      })
      .eq("id", user.id);

    setUser({ ...user, steps_banked: newTotal, last_sync_time: now });
  };

  // MANUAL MOVE (Triggered by UI thread frame loop via runOnJS)
  // Fully synchronous — no await, no setUser, no DB reads.
  // DB write is fire-and-forget; React state sync happens only when movement stops
  // via applyPendingSync in WorldMapScreen.
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
        if (localBankRef.current < MOVE_COST) return;

        localBankRef.current -= MOVE_COST;
        bankedSteps.value = localBankRef.current;
        latestPos.current = { x: nx, y: ny, banked: localBankRef.current };
        lastProcessedTile.current = { x: nx, y: ny };

        // Node collision — local ref only, no DB read
        const u = userRef.current;
        const currentNodes = nodesRef.current || [];
        let node: any = null;
        for (let i = 0; i < currentNodes.length; i++) {
          if (currentNodes[i].x === nx && currentNodes[i].y === ny) {
            node = currentNodes[i];
            break;
          }
        }

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

        // Queue vision refresh — never call server during movement.
        // flushPendingVision (on stop) will fetch when player stops.
        const dist =
          Math.abs(nx - lastRefreshCenter.current.x) +
          Math.abs(ny - lastRefreshCenter.current.y);
        if (dist >= GRID_REFRESH_DISTANCE) {
          pendingRefreshCenterRef.current = { x: nx, y: ny };
          // Update gridCenter immediately during movement to prevent black spaces.
          // Chunk cache already covers prefetch radius; we just recenter the visible grid.
          setGridCenter({ x: nx, y: ny });
          lastRefreshCenter.current = { x: nx, y: ny };
        }

        // DB position write — fire and forget, NO setUser.
        // React state sync happens in WorldMapScreen via applyPendingSync when isMoving stops.
        if (dbWriteTimer.current) clearTimeout(dbWriteTimer.current);
        dbWriteTimer.current = setTimeout(() => {
          const pos = latestPos.current;
          const userForSync = userRef.current;
          if (!userForSync) return;
          supabase
            .from("profiles")
            .update({
              world_x: pos.x,
              world_y: pos.y,
              steps_banked: pos.banked,
            })
            .eq("id", userForSync.id)
            .then();
          // No setUser — WorldMapScreen owns that via applyPendingSync
        }, 500);
      } finally {
        tileEnterBusy.current = false;
      }
    },
    [currentMapId],
  ); // Stable — reads user/nodes/pool from refs

  return { onTileEnter, move: () => {}, refreshVision, flushPendingVision, visionGrid, nodesInVision, loading: false, fastTravel, bankSteps, autoTravelReport, setAutoTravelReport, checkpointAlert, setCheckpointAlert, latestPos, bankedSteps };
};
