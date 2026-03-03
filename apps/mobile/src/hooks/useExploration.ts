import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import * as Haptics from 'expo-haptics';

const MOVE_COST = 100;
// Keep chunk size the same
const CHUNK_SIZE = 16;

// UPDATE: Lower refresh distance so the grid recalculates BEFORE the player hits the edge
const REFRESH_DISTANCE = 4;

// UPDATE: Perfectly tuned to Screen Size + Refresh Distance + Buffer
// X: ~5 tiles for half screen + 4 steps + 2 buffer = 11
// Y: ~10 tiles for half screen + 4 steps + 2 buffer = 16
const VISIBLE_RADIUS_X = 11;
const VISIBLE_RADIUS_Y = 16;

// Keep prefetch large so DB background fetching remains seamless
const PREFETCH_RADIUS_X = 32;
const PREFETCH_RADIUS_Y = 40;
const BOOTSTRAP_PREFETCH_RADIUS_X = 20;
const BOOTSTRAP_PREFETCH_RADIUS_Y = 24;

export const useExploration = (
  setEncounter: (encounter: any | null) => void, 
  setInteractionVisible: (visible: boolean) => void,
  setActiveRaid: (raid: any | null) => void,
  setRaidModalVisible: (visible: boolean) => void,
  currentMapId?: string | null,
  tileLibrary?: Map<string, any>
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
  const lastRefreshCenter = useRef<{ x: number; y: number }>({ x: user?.world_x || 0, y: user?.world_y || 0 });
  const tileEnterBusy = useRef(false);

  // Debounced DB write timer — batches rapid tile crossings into fewer Supabase calls
  const dbWriteTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestPos = useRef<{ x: number; y: number; banked: number }>({ x: user?.world_x || 0, y: user?.world_y || 0, banked: user?.steps_banked || 0 });

  // Local ref for step limit so we don't trigger setUser on every step (avoids GC stutters)
  const localBankRef = useRef(user?.steps_banked || 0);

  useEffect(() => { userRef.current = user; }, [user]);
  useEffect(() => { nodesRef.current = nodes; }, [nodes]);

  // Keep the ref synced if the server or a menu updates the user's steps
  useEffect(() => {
    localBankRef.current = user?.steps_banked || 0;
  }, [user?.steps_banked]);

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

  // 1. GRID GENERATION -- uses gridCenter instead of user.world_x/y
  const { visionGrid, nodesInVision } = useMemo(() => {
    if (!user) return { visionGrid: [], nodesInVision: [] };

    const cx = gridCenter.x;
    const cy = gridCenter.y;
    
    const minX = cx - VISIBLE_RADIUS_X;
    const maxX = cx + VISIBLE_RADIUS_X;
    const minY = cy - VISIBLE_RADIUS_Y;
    const maxY = cy + VISIBLE_RADIUS_Y;

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

    // --- NEW OPTIMIZATION: Build Hash Maps BEFORE the loop ---
    const nodeMap = new Map();
    (nodes || []).forEach(n => nodeMap.set(`${n.x},${n.y}`, n));

    const unlockedSet = unlocked; // Already a Set, which is fast!
    // ---------------------------------------------------------

    const grid = [];
    const visibleNodesList: any[] = [];

    for (let dy = VISIBLE_RADIUS_Y; dy >= -VISIBLE_RADIUS_Y; dy--) {
      for (let dx = -VISIBLE_RADIUS_X; dx <= VISIBLE_RADIUS_X; dx++) {
        const tx = cx + dx;
        const ty = cy + dy;
        const key = `${tx},${ty}`;
        
        const isUnlocked = unlockedSet.has(key) || (tx === 0 && ty === 0);
        const isCurrent = (dx === 0 && dy === 0);
        
        // INSTANT LOOKUP - No more .find() inside the loop!
        const nodeAtSpot = nodeMap.get(key); 
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
  const refreshVision = useCallback(async (cx: number, cy: number, force: boolean = false) => {
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
        if (force || (!chunkCache.current.has(key) && !inFlightChunks.current.has(key))) {
          missingChunks.push(key);
        }
      }
    }

    const promises: Promise<any>[] = [];
    const userId = userRef.current.id;
    promises.push(Promise.resolve(supabase.from('player_discoveries').select('x, y').eq('user_id', userId)));
    
    const cachedNodes = nodesRef.current;
    if (force || (cachedNodes || []).length === 0) {
      promises.push(Promise.resolve(supabase.from('world_map_nodes').select('*')));
    }

    if (missingChunks.length > 0) {
      missingChunks.forEach(key => inFlightChunks.current.add(key));
      
      const chunkCoords = missingChunks.map(key => {
        const [x, y] = key.split(',').map(Number);
        return { x, y };
      });
      
      const minX = Math.min(...chunkCoords.map(c => c.x));
      const maxX = Math.max(...chunkCoords.map(c => c.x));
      const minY = Math.min(...chunkCoords.map(c => c.y));
      const maxY = Math.max(...chunkCoords.map(c => c.y));

      promises.push(
        Promise.resolve(
          supabase
            .from('map_chunks')
            .select('*')
            .gte('chunk_x', minX)
            .lte('chunk_x', maxX)
            .gte('chunk_y', minY)
            .lte('chunk_y', maxY)
        )
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

        missingChunks.forEach(key => {
          const chunkData = fetchedMap.get(key);
          chunkCache.current.set(
            key,
            chunkData ? { ...chunkData, tile_data: chunkData.tile_data || [] } : { tile_data: [] }
          );
          inFlightChunks.current.delete(key);
        });
      }
    }

    if (discoveriesRes?.data && Array.isArray(discoveriesRes.data)) {
      setUnlocked(new Set<string>(discoveriesRes.data.map((d: any) => `${d.x},${d.y}`)));
    }

    if (nodesRes?.data && Array.isArray(nodesRes.data)) {
      setNodes(
        nodesRes.data.map((n: any) => ({
          ...n,
          x: Number(n.global_x ?? n.x ?? 0),
          y: Number(n.global_y ?? n.y ?? 0),
        }))
      );
    }

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

      // 1. Check against our high-speed local ref instead of the React context
      if (localBankRef.current < MOVE_COST) return;

      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      // 2. Instantly update the local ref
      localBankRef.current -= MOVE_COST;

      // 3. Track latest position for the debounce
      latestPos.current = { x: nx, y: ny, banked: localBankRef.current };

      // DO NOT CALL setUser HERE — sync to context only when player pauses (250ms debounce).

      // 4. Update DB and Context only when the player stops moving for 250ms
      if (dbWriteTimer.current) clearTimeout(dbWriteTimer.current);
      dbWriteTimer.current = setTimeout(() => {
        const pos = latestPos.current;
        const userForSync = userRef.current;
        if (!userForSync) return;

        supabase.from('profiles')
          .update({ world_x: pos.x, world_y: pos.y, steps_banked: pos.banked })
          .eq('id', userForSync.id)
          .then();

        setUser({ ...userForSync, world_x: pos.x, world_y: pos.y, steps_banked: pos.banked });
      }, 250);

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

  return { onTileEnter, move: () => {}, refreshVision, visionGrid, nodesInVision, loading: false, fastTravel, bankSteps, autoTravelReport, setAutoTravelReport, checkpointAlert, setCheckpointAlert };
};
