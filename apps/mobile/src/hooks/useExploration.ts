import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import * as Haptics from 'expo-haptics';

const MOVE_COST = 100; // 100 Steps = 1 Tile
const CHUNK_SIZE = 16;

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
  const [chunksVersion, setChunksVersion] = useState(0); // Trigger for memo
  const [autoTravelReport, setAutoTravelReport] = useState<any | null>(null);
  const [checkpointAlert, setCheckpointAlert] = useState<any | null>(null);

  // 0. CHUNK CACHE (Prevents redundant DB calls)
  const chunkCache = useRef<Map<string, any>>(new Map());
  const inFlightChunks = useRef<Set<string>>(new Set());
  const lastX = useRef<number | null>(null);
  const lastY = useRef<number | null>(null);
  const currentX = useRef<number>(user?.world_x || 0);
  const currentY = useRef<number>(user?.world_y || 0);

  // Sync refs with user state safely
  useEffect(() => {
    if (user) {
      currentX.current = user.world_x || 0;
      currentY.current = user.world_y || 0;
    }
  }, [user?.id]); // Only on login/logout

  // 1. GRID GENERATION (The Memoized Vision)
  const { visionGrid, nodesInVision } = useMemo(() => {
    if (!user) return { visionGrid: [], nodesInVision: [] };

    const cx = user.world_x || 0;
    const cy = user.world_y || 0;
    
    const minX = cx - 12;
    const maxX = cx + 12;
    const minY = cy - 14;
    const maxY = cy + 14;

    // Map tile data by coordinate for quick lookup (multi-layer support)
    const tileMap = new Map<string, any[]>();
    
    // Process all relevant chunks from cache
    // We search chunks that could possibly contain these coordinates
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

    // Sort all layer lists once
    tileMap.forEach(layers => {
      layers.sort((a, b) => (Number(a.layer) || 0) - (Number(b.layer) || 0));
    });

    const grid = [];
    const visibleNodesList: any[] = [];

    // Expanded Grid (e.g., 21x27) to cover 9:16 screen with buffer
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

    // Process visible nodes for independent rendering
    (nodes || []).forEach(n => {
      if (n.x >= minX - 2 && n.x <= maxX + 2 && n.y >= minY - 2 && n.y <= maxY + 2) {
        const isUnlocked = unlocked.has(`${Math.floor(n.x)},${Math.floor(n.y)}`) || (n.x === 0 && n.y === 0);
        visibleNodesList.push({ ...n, isVisible: isUnlocked });
      }
    });

    return { visionGrid: grid, nodesInVision: visibleNodesList };
  }, [user?.world_x, user?.world_y, unlocked, nodes, chunksVersion]);

  // 2. REFRESH DATA (Fetching Chunks/Nodes/Discoveries)
  const refreshVision = useCallback(async (cx: number, cy: number, force: boolean = false) => {
    if (!user?.id) return;

    // Calculate required chunks
    const minChunkX = Math.floor((cx - 12) / CHUNK_SIZE);
    const maxChunkX = Math.floor((cx + 12) / CHUNK_SIZE);
    const minChunkY = Math.floor((cy - 14) / CHUNK_SIZE);
    const maxChunkY = Math.floor((cy + 14) / CHUNK_SIZE);

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
    promises.push(supabase.from('player_discoveries').select('x, y').eq('user_id', user.id));
    
    if (force || (nodes || []).length === 0) {
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
    let discoveriesRes = results[0]; // Always first
    let nodesRes, newChunksRes;

    let resultIndex = 1;
    if (force || (nodes || []).length === 0) {
      nodesRes = results[resultIndex++];
    } else {
      nodesRes = { data: nodes || [] }; // Use cached nodes
    }

    if (missingChunks.length > 0) {
      newChunksRes = results[resultIndex];
    } else {
      newChunksRes = []; // No chunks to fetch
    }

    // Update Discoveries
    if (discoveriesRes?.data) {
      setUnlocked(new Set(discoveriesRes.data.map((d: any) => `${d.x},${d.y}`)));
    }

    // Update Nodes
    if (nodesRes?.data) {
      setNodes(nodesRes.data.map((n: any) => ({
        ...n,
        x: Number(n.global_x ?? n.x ?? 0),
        y: Number(n.global_y ?? n.y ?? 0)
      })));
    }

    // Update Chunks
    if (Array.isArray(newChunksRes)) {
      newChunksRes.forEach((res, index) => {
        const key = missingChunks[index];
        chunkCache.current.set(key, res.data ? { ...res.data, tile_data: res.data.tile_data || [] } : { tile_data: [] });
        inFlightChunks.current.delete(key);
      });
      setChunksVersion(v => v + 1); // Trigger re-memo
    }
  }, [user?.id, nodes.length]);

  // ⚡️ 2. AUTO-HUNT (The "Skip" Option)
  const fastTravel = async (stepsAvailable: number) => {
    if (!user) return;
    const tilesToMove = Math.floor(stepsAvailable / MOVE_COST);
    
    if (tilesToMove < 1) {
       // Not enough for a full move, just bank it
       await bankSteps(stepsAvailable);
       return;
    }

    // Simulate moving South automatically (since Y+ is South now)
    let ny = (user.world_y || 0) + tilesToMove;
    const nx = user.world_x || 0;

    const report = {
      tilesTraveled: tilesToMove,
      xpGained: tilesToMove * 50, // Simple XP formula
      itemsFound: Math.random() > 0.5 ? ['Mana Crystal'] : []
    };

    const now = new Date().toISOString();

    // Update DB (Move Player + Clear Time)
    await supabase.from('profiles').update({ 
      world_y: ny, 
      last_sync_time: now 
    }).eq('id', user.id);

    setUser({ ...user, world_y: ny, last_sync_time: now });
    setAutoTravelReport(report);
  };

  // 🎮 3. MANUAL BANK (The "Store" Option)
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

  // 4. MANUAL MOVE (Triggered by UI thread loop)
  const onTileEnter = useCallback(async (nx: number, ny: number) => {
    if (!user) return;
    if ((user.steps_banked || 0) < MOVE_COST) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setMoving(true);
    if (moveTimeout.current) clearTimeout(moveTimeout.current);
    moveTimeout.current = setTimeout(() => {
      setMoving(false);
      moveTimeout.current = null;
    }, 150);

    currentX.current = nx;
    currentY.current = ny;

    try {
      const newBank = (user.steps_banked || 0) - MOVE_COST;
      
      setUser((prev: any) => {
        if (!prev) return null;
        return { 
          ...prev, 
          world_x: nx, 
          world_y: ny, 
          steps_banked: newBank 
        };
      });
      
      supabase.from('profiles').update({ world_x: nx, world_y: ny, steps_banked: newBank }).eq('id', user.id).then();

      const node = (nodes || []).find(n => n.x === nx && n.y === ny);
      if (node) {
        supabase.from('player_discoveries').upsert({ user_id: user.id, x: nx, y: ny }).then();
        supabase.from('discovered_locations').select('node_id').match({ user_id: user.id, node_id: node.id }).maybeSingle().then(({ data: existing }) => {
          if (!existing) {
            supabase.from('discovered_locations').upsert([{ user_id: user.id, node_id: node.id }], { onConflict: 'user_id,node_id' }).then();
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
        const mapIdToUse = currentMapId || (user as any).current_map_id;
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

      refreshVision(nx, ny);

    } catch (e) { console.error(e); }
  }, [user?.id, nodes, user?.steps_banked]);

  return { onTileEnter, move: () => {}, refreshVision, visionGrid, nodesInVision, loading: moving, fastTravel, bankSteps, autoTravelReport, setAutoTravelReport, checkpointAlert, setCheckpointAlert };
};
