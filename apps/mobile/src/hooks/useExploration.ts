import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import * as Haptics from 'expo-haptics';

const MOVE_COST = 100;
const CHUNK_SIZE = 16;
const REFRESH_DISTANCE = 3; // Re-fetch chunks when 3+ tiles from last refresh center

// Pre-load radius extends beyond the visible grid to create a buffer zone.
// Visible grid is ±12x / ±14y; we fetch ±20x / ±22y so chunks are cached
// ~1 full chunk (16 tiles) ahead of the viewport edge — RPG-style streaming.
const PREFETCH_RADIUS_X = 20;
const PREFETCH_RADIUS_Y = 22;

export const useExploration = (
  setEncounter: (encounter: any | null) => void, 
  setInteractionVisible: (visible: boolean) => void,
  setActiveRaid: (raid: any | null) => void,
  setRaidModalVisible: (visible: boolean) => void,
  currentMapId?: string | null,
  tileLibrary?: Map<string, any>
) => {
  const { user, setUser } = useAuth();
  const [moving, setMoving] = useState(false);
  const moveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
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
  const lastRefreshCenter = useRef<{ x: number; y: number }>({ x: user?.world_x || 0, y: user?.world_y || 0 });
  const tileEnterBusy = useRef(false);

  useEffect(() => { userRef.current = user; }, [user]);
  useEffect(() => { nodesRef.current = nodes; }, [nodes]);

  // Separate camera position for visionGrid that only updates when we actually
  // want the grid to recalculate (initial load, chunk fetch, teleport).
  // During continuous joystick movement, we do NOT update this -- the camera
  // moves smoothly on the UI thread while the grid stays stable.
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

  // 1. GRID GENERATION -- uses gridCenter instead of user.world_x/y
  const { visionGrid, nodesInVision } = useMemo(() => {
    if (!user) return { visionGrid: [], nodesInVision: [] };

    const cx = gridCenter.x;
    const cy = gridCenter.y;
    
    const minX = cx - 12;
    const maxX = cx + 12;
    const minY = cy - 14;
    const maxY = cy + 14;

    const tileMap = new Map<string, any[]>();

    const minChunkX = Math.floor(minX / CHUNK_SIZE);
    const maxChunkX = Math.floor(maxX / CHUNK_SIZE);
    const minChunkY = Math.floor(minY / CHUNK_SIZE);
    const maxChunkY = Math.floor(maxY / CHUNK_SIZE);

    for (let x = minChunkX; x <= maxChunkX; x++) {
      for (let y = minChunkY; y <= maxChunkY; y++) {
        const chunk = chunkCache.current.get(`${x},${y}`);
        if (chunk && chunk.tile_data && Array.isArray(chunk.tile_data)) {
          chunk.tile_data.forEach((t: any) => {
            if (t && t.x >= minX && t.x <= maxX && t.y >= minY && t.y <= maxY) {
              const tKey = `${t.x},${t.y}`;
              const layers = tileMap.get(tKey) || [];
              layers.push(t);
              tileMap.set(tKey, layers);
            }
          });
        }
      }
    }

    tileMap.forEach(layers => {
      layers.sort((a, b) => (Number(a.layer) || 0) - (Number(b.layer) || 0));
    });

    const grid = [];
    const visibleNodesList: any[] = [];

    for (let dy = 13; dy >= -13; dy--) {
      for (let dx = -10; dx <= 10; dx++) {
        const tx = cx + dx;
        const ty = cy + dy;
        const key = `${tx},${ty}`;
        
        const isUnlocked = unlocked.has(key) || (tx === 0 && ty === 0);
        const isCurrent = (dx === 0 && dy === 0);
        
        const nodeAtSpot = (nodes || []).find(n => n.x === tx && n.y === ty);
        const spotTiles = tileMap.get(key) || [];

        grid.push({ 
          x: tx, 
          y: ty, 
          isVisible: isCurrent || isUnlocked, 
          node: nodeAtSpot,
          tiles: spotTiles
        });
      }
    }

    (nodes || []).forEach(n => {
      if (n.x >= minX - 2 && n.x <= maxX + 2 && n.y >= minY - 2 && n.y <= maxY + 2) {
        const isNodeUnlocked = unlocked.has(`${Math.floor(n.x)},${Math.floor(n.y)}`) || (n.x === 0 && n.y === 0);
        visibleNodesList.push({ ...n, isVisible: isNodeUnlocked });
      }
    });

    return { visionGrid: grid, nodesInVision: visibleNodesList };
  }, [gridCenter.x, gridCenter.y, unlocked, nodes, chunksVersion]);

  // 2. REFRESH DATA (Fetching Chunks/Nodes/Discoveries)
  // Uses the larger PREFETCH radius so chunks are cached well ahead of the viewport.
  const refreshVision = useCallback(async (cx: number, cy: number, force: boolean = false) => {
    if (!userRef.current?.id) return;

    const minChunkX = Math.floor((cx - PREFETCH_RADIUS_X) / CHUNK_SIZE);
    const maxChunkX = Math.floor((cx + PREFETCH_RADIUS_X) / CHUNK_SIZE);
    const minChunkY = Math.floor((cy - PREFETCH_RADIUS_Y) / CHUNK_SIZE);
    const maxChunkY = Math.floor((cy + PREFETCH_RADIUS_Y) / CHUNK_SIZE);

    const missingChunks: string[] = [];
    for (let x = minChunkX; x <= maxChunkX; x++) {
      for (let y = minChunkY; y <= maxChunkY; y++) {
        const key = `${x},${y}`;
        if (force || (!chunkCache.current.has(key) && !inFlightChunks.current.has(key))) {
          missingChunks.push(key);
        }
      }
    }

    const promises: Promise<any>[] = [];
    const userId = userRef.current.id;
    promises.push(supabase.from('player_discoveries').select('x, y').eq('user_id', userId));
    
    const cachedNodes = nodesRef.current;
    if (force || (cachedNodes || []).length === 0) {
      promises.push(supabase.from('world_map_nodes').select('*'));
    }

    if (missingChunks.length > 0) {
      missingChunks.forEach(key => inFlightChunks.current.add(key));
      const chunkQueries = missingChunks.map(key => {
        const [x, y] = key.split(',').map(Number);
        return supabase.from('map_chunks').select('*').eq('chunk_x', x).eq('chunk_y', y).maybeSingle();
      });
      promises.push(Promise.all(chunkQueries));
    }

    const results = await Promise.all(promises);
    let discoveriesRes = results[0];
    let nodesRes, newChunksRes;

    let resultIndex = 1;
    if (force || (cachedNodes || []).length === 0) {
      nodesRes = results[resultIndex++];
    } else {
      nodesRes = { data: cachedNodes || [] };
    }

    if (missingChunks.length > 0) {
      newChunksRes = results[resultIndex];
    } else {
      newChunksRes = [];
    }

    if (discoveriesRes?.data) {
      setUnlocked(new Set(discoveriesRes.data.map((d: any) => `${d.x},${d.y}`)));
    }

    if (nodesRes?.data) {
      setNodes(nodesRes.data.map((n: any) => ({
        ...n,
        x: Number(n.global_x ?? n.x ?? 0),
        y: Number(n.global_y ?? n.y ?? 0)
      })));
    }

    if (Array.isArray(newChunksRes)) {
      newChunksRes.forEach((res, index) => {
        const key = missingChunks[index];
        chunkCache.current.set(key, res.data ? { ...res.data, tile_data: res.data.tile_data || [] } : { tile_data: [] });
        inFlightChunks.current.delete(key);
      });
    }

    // Update gridCenter + trigger visionGrid recalculation after chunk data arrives
    lastRefreshCenter.current = { x: cx, y: cy };
    setGridCenter({ x: cx, y: cy });
    setChunksVersion(v => v + 1);
  }, []); // No deps -- reads from refs

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
      itemsFound: Math.random() > 0.5 ? ['Mana Crystal'] : []
    };

    const now = new Date().toISOString();

    await supabase.from('profiles').update({ 
      world_y: ny, 
      last_sync_time: now 
    }).eq('id', user.id);

    setUser({ ...user, world_y: ny, last_sync_time: now });
    setAutoTravelReport(report);
  };

  // MANUAL BANK
  const bankSteps = async (steps: number) => {
    if (!user) return;
    const newTotal = (user.steps_banked || 0) + steps;
    
    const now = new Date().toISOString();
    
    await supabase.from('profiles').update({ 
      steps_banked: newTotal,
      last_sync_time: now
    }).eq('id', user.id);

    setUser({ ...user, steps_banked: newTotal, last_sync_time: now });
  };

  // MANUAL MOVE (Triggered by UI thread frame loop via runOnJS)
  // Uses refs to avoid stale closures and dependency churn.
  // Throttled: skips if the previous call is still running.
  const onTileEnter = useCallback(async (nx: number, ny: number) => {
    if (tileEnterBusy.current) return;
    tileEnterBusy.current = true;

    try {
      const u = userRef.current;
      if (!u) return;
      if ((u.steps_banked || 0) < MOVE_COST) return;

      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setMoving(true);
      if (moveTimeout.current) clearTimeout(moveTimeout.current);
      moveTimeout.current = setTimeout(() => {
        setMoving(false);
        moveTimeout.current = null;
      }, 150);

      const newBank = (u.steps_banked || 0) - MOVE_COST;
      
      setUser((prev: any) => {
        if (!prev) return null;
        return { 
          ...prev, 
          world_x: nx, 
          world_y: ny, 
          steps_banked: newBank 
        };
      });
      
      // Fire-and-forget DB write
      supabase.from('profiles').update({ world_x: nx, world_y: ny, steps_banked: newBank }).eq('id', u.id).then();

      const currentNodes = nodesRef.current;
      const node = (currentNodes || []).find(n => n.x === nx && n.y === ny);
      if (node) {
        supabase.from('player_discoveries').upsert({ user_id: u.id, x: nx, y: ny }).then();
        supabase.from('discovered_locations').select('node_id').match({ user_id: u.id, node_id: node.id }).maybeSingle().then(({ data: existing }) => {
          if (!existing) {
            supabase.from('discovered_locations').upsert([{ user_id: u.id, node_id: node.id }], { onConflict: 'user_id,node_id' }).then();
            setCheckpointAlert(node); 
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          }
        });
        
        if (node.interaction_type === 'BOSS_RAID') {
          setActiveRaid({
            id: node.interaction_data?.raid_id,
            boss_name: node.name,
            boss_image: node.icon_url,
            max_hp: node.interaction_data?.max_hp || 100,
          });
          setRaidModalVisible(true);
        }
      } else {
        const roll = Math.random();
        const mapIdToUse = currentMapId || (u as any).current_map_id;
        if (roll < 0.05 && mapIdToUse && mapIdToUse !== 'undefined') {
          supabase.from('encounter_pool').select('*').eq('map_id', mapIdToUse).lte('spawn_chance', roll).then(({ data: encounters }) => {
            if (encounters && encounters.length > 0) {
              const randomEncounter = encounters[Math.floor(Math.random() * encounters.length)];
              if (randomEncounter.event_type === 'LOOT' && randomEncounter.metadata?.display_mode === 'TEXT') {
                // Toast logic
              } else if (randomEncounter.metadata?.visuals?.layout === 'SIDE_VIEW') {
                setEncounter(randomEncounter);
                setInteractionVisible(true);
              }
            }
          });
        }
      }

      // Only refreshVision when far enough from the last refresh center
      const distFromRefresh = Math.abs(nx - lastRefreshCenter.current.x) + Math.abs(ny - lastRefreshCenter.current.y);
      if (distFromRefresh >= REFRESH_DISTANCE) {
        refreshVision(nx, ny);
      }

    } catch (e) { console.error(e); }
    finally { tileEnterBusy.current = false; }
  }, [currentMapId]); // Stable -- reads user/nodes from refs

  return { onTileEnter, move: () => {}, refreshVision, visionGrid, nodesInVision, loading: moving, fastTravel, bankSteps, autoTravelReport, setAutoTravelReport, checkpointAlert, setCheckpointAlert };
};
