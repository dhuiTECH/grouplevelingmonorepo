import { useState, useCallback, useRef } from 'react';
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
  const [loading, setLoading] = useState(false);
  const [visionGrid, setVisionGrid] = useState<any[]>([]); 
  const [nodesInVision, setNodesInVision] = useState<any[]>([]);
  const [autoTravelReport, setAutoTravelReport] = useState<any | null>(null);
  const [checkpointAlert, setCheckpointAlert] = useState<any | null>(null);

  // 0. CHUNK CACHE (Prevents redundant DB calls)
  const chunkCache = useRef<Map<string, any>>(new Map());
  const inFlightChunks = useRef<Set<string>>(new Set());
  const nodesCache = useRef<any[]>([]);
  const lastX = useRef<number | null>(null);
  const lastY = useRef<number | null>(null);

  // 1. REFRESH VISION (The Grid Logic)
  const refreshVision = useCallback(async (cx: number, cy: number, force: boolean = false) => {
    if (!user?.id) return;

    // Skip if we haven't moved and already have data, UNLESS forced
    if (!force && cx === lastX.current && cy === lastY.current && visionGrid.length > 0) return;
    lastX.current = cx;
    lastY.current = cy;

    // Calculate required chunks for current vision (expanded grid for large props)
    const minX = cx - 12;
    const maxX = cx + 12;
    const minY = cy - 14;
    const maxY = cy + 14;

    const minChunkX = Math.floor(minX / CHUNK_SIZE);
    const maxChunkX = Math.floor(maxX / CHUNK_SIZE);
    const minChunkY = Math.floor(minY / CHUNK_SIZE);
    const maxChunkY = Math.floor(maxY / CHUNK_SIZE);

    const neededChunks: string[] = [];
    for (let x = minChunkX; x <= maxChunkX; x++) {
      for (let y = minChunkY; y <= maxChunkY; y++) {
        neededChunks.push(`${x},${y}`);
      }
    }

    const missingChunks = neededChunks.filter(key => 
      force || (!chunkCache.current.has(key) && !inFlightChunks.current.has(key))
    );

    // 1. Fetch data if needed
    const promises: Promise<any>[] = [];
    
    // Always fetch discoveries to keep fog updated (lightweight)
    promises.push(supabase.from('player_discoveries').select('x, y').eq('user_id', user.id));

    // Only fetch nodes once or periodically (nodes are usually few)
    if (force || nodesCache.current.length === 0) {
      promises.push(supabase.from('world_map_nodes').select('*'));
    } else {
      promises.push(Promise.resolve({ data: nodesCache.current }));
    }

    // We no longer fetch custom_tiles here because the global TileContext handles it.
    // This makes useExploration significantly lighter.

    // Only fetch missing chunks
    if (missingChunks.length > 0) {
      // Mark chunks as in-flight
      missingChunks.forEach(key => inFlightChunks.current.add(key));
      
      const chunkQueries = missingChunks.map(key => {
        const [x, y] = key.split(',').map(Number);
        return supabase.from('map_chunks')
          .select('*')
          .eq('chunk_x', x)
          .eq('chunk_y', y)
          .maybeSingle();
      });
      promises.push(Promise.all(chunkQueries));
    } else {
      promises.push(Promise.resolve([]));
    }

    const [discoveriesRes, nodesRes, newChunksRes] = await Promise.all(promises);

    // Clear in-flight status
    if (missingChunks.length > 0) {
      missingChunks.forEach(key => inFlightChunks.current.delete(key));
    }

    const unlocked = discoveriesRes.data;
    if (nodesRes.data && (force || nodesCache.current.length === 0)) {
      nodesCache.current = nodesRes.data.map((n: any) => ({
        ...n,
        x: Number(n.global_x ?? n.x ?? 0),
        y: Number(n.global_y ?? n.y ?? 0)
      }));
    }
    const nodes = nodesCache.current;

    // Store newly fetched chunks in cache
    if (Array.isArray(newChunksRes)) {
      newChunksRes.forEach((res, index) => {
        const key = missingChunks[index];
        if (res.data) {
          chunkCache.current.set(key, res.data);
        } else {
          // Store empty placeholder to avoid re-fetching non-existent chunks
          chunkCache.current.set(key, { tile_data: [] });
        }
      });
    }

    const unlockedSet = new Set(unlocked?.map(d => `${d.x},${d.y}`));
    
    // Map tile data by coordinate for quick lookup (multi-layer support)
    const tileMap = new Map<string, any[]>();
    
    // Process all needed chunks from cache
    neededChunks.forEach(key => {
      const chunk = chunkCache.current.get(key);
      if (chunk && Array.isArray(chunk.tile_data)) {
        chunk.tile_data.forEach((t: any) => {
          // We NO LONGER enrich data here.
          // SkiaTile will do an O(1) lookup in the TileContext when rendering.
          // This keeps visionGrid extremely lightweight.

          const tKey = `${t.x},${t.y}`;
          const layers = tileMap.get(tKey) || [];
          layers.push(t);
          // Sort layers: lower numbers (water/ground) first, higher (props) last
          // Layer -1 (Water), 0 (Ground), 1 (Roads), 2 (Props)
          layers.sort((a, b) => (Number(a.layer) || 0) - (Number(b.layer) || 0));
          tileMap.set(tKey, layers);
        });
      }
    });

    const grid = [];
    const visibleNodesList: any[] = [];

    // Filter nodes that are within the vision range (expanded buffer)
    const activeNodes = nodes?.filter(n => 
      n.x >= minX - 2 && n.x <= maxX + 2 && 
      n.y >= minY - 2 && n.y <= maxY + 2
    ) || [];

    // Expanded Grid (e.g., 21x27) to cover 9:16 screen with buffer for large props
    for (let dy = 13; dy >= -13; dy--) {
      for (let dx = -10; dx <= 10; dx++) {
        const tx = cx + dx;
        const ty = cy + dy;
        const key = `${tx},${ty}`;
        
        const isUnlocked = unlockedSet.has(key) || (tx === 0 && ty === 0);
        const isCurrent = (dx === 0 && dy === 0);
        
        // Only attach nodes that are EXACTLY on this integer cell for the legacy grid loop
        // But for display, we'll use the separate visibleNodesList
        const nodeAtSpot = activeNodes.find(n => n.x === tx && n.y === ty);
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
    activeNodes.forEach(n => {
      const isUnlocked = unlockedSet.has(`${Math.floor(n.x)},${Math.floor(n.y)}`) || (n.x === 0 && n.y === 0);
      visibleNodesList.push({
        ...n,
        isVisible: isUnlocked
      });
    });

    setVisionGrid(grid);
    setNodesInVision(visibleNodesList);
  }, [user?.id]);

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

  // 4. MANUAL MOVE (D-Pad)
  const move = async (dir: 'N' | 'S' | 'E' | 'W' | 'NE' | 'NW' | 'SE' | 'SW') => {
    if (loading || !user) return;

    if ((user.steps_banked || 0) < MOVE_COST) {
      alert("Not enough Stamina!");
      return;
    }

    setLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    let nx = user.world_x || 0;
    let ny = user.world_y || 0;
    
    // Y-Axis (Inverted: South is Y+, North is Y-)
    if (dir.includes('N')) ny -= 1;
    if (dir.includes('S')) ny += 1;
    
    // X-Axis
    if (dir.includes('E')) nx += 1;
    if (dir.includes('W')) nx -= 1;

    // --- COLLISION DETECTION ---
    const currentCell = visionGrid.find(cell => cell.x === user.world_x && cell.y === user.world_y);
    const targetCell = visionGrid.find(cell => cell.x === nx && cell.y === ny);
    
    // Calculate the boundary position (edge) between current and target
    const bx = (user.world_x + nx) / 2;
    const by = (user.world_y + ny) / 2;

    if (targetCell) {
      // 1. Check for Cell-level collision (integer coordinate)
      const hasCellBlock = targetCell.tiles?.some((t: any) => (t.isWalkable === false || t.is_walkable === false));
      
      // 2. Check for Edge-level collision (half-integer coordinate - legacy)
      const hasLegacyEdgeBlock = visionGrid.some(cell => 
        cell.tiles?.some((t: any) => t.x === bx && t.y === by && (t.isWalkable === false || t.is_walkable === false))
      );

      // 3. Directional Edge Collision (New bitmask system: N=1, E=2, S=4, W=8)
      let isEdgeBlocked = false;
      if (currentCell?.tiles || targetCell?.tiles) {
        if (dir.includes('N')) {
          const exitBlocked = currentCell?.tiles?.some((t: any) => t.edgeBlocks && (t.edgeBlocks & 1));
          const enterBlocked = targetCell?.tiles?.some((t: any) => t.edgeBlocks && (t.edgeBlocks & 4));
          if (exitBlocked || enterBlocked) isEdgeBlocked = true;
        }
        if (dir.includes('S')) {
          const exitBlocked = currentCell?.tiles?.some((t: any) => t.edgeBlocks && (t.edgeBlocks & 4));
          const enterBlocked = targetCell?.tiles?.some((t: any) => t.edgeBlocks && (t.edgeBlocks & 1));
          if (exitBlocked || enterBlocked) isEdgeBlocked = true;
        }
        if (dir.includes('E')) {
          const exitBlocked = currentCell?.tiles?.some((t: any) => t.edgeBlocks && (t.edgeBlocks & 2));
          const enterBlocked = targetCell?.tiles?.some((t: any) => t.edgeBlocks && (t.edgeBlocks & 8));
          if (exitBlocked || enterBlocked) isEdgeBlocked = true;
        }
        if (dir.includes('W')) {
          const exitBlocked = currentCell?.tiles?.some((t: any) => t.edgeBlocks && (t.edgeBlocks & 8));
          const enterBlocked = targetCell?.tiles?.some((t: any) => t.edgeBlocks && (t.edgeBlocks & 2));
          if (exitBlocked || enterBlocked) isEdgeBlocked = true;
        }
      }

      if (hasCellBlock || hasLegacyEdgeBlock || isEdgeBlocked) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        setLoading(false);
        return;
      }

      // Check ground/water layer
      const baseTiles = targetCell.tiles?.filter((t: any) => {
        const layer = t.layer !== undefined && t.layer !== null ? Number(t.layer) : 0;
        return layer <= 0;
      });
      const groundTile = baseTiles?.sort((a: any, b: any) => (Number(b.layer) || 0) - (Number(a.layer) || 0))[0];
      
      if (!groundTile || (Number(groundTile.layer) < 0 || groundTile.type === 'water')) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        setLoading(false);
        return; 
      }
    } else {
        // If the cell isn't loaded yet, don't let them walk there
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        setLoading(false);
        return;
    }
    // ---------------------------

    try {
      const newBank = (user.steps_banked || 0) - MOVE_COST;
      
      // Update Position & Deduct Bank
      setUser({ ...user, world_x: nx, world_y: ny, steps_banked: newBank });
      await supabase.from('profiles').update({ world_x: nx, world_y: ny, steps_banked: newBank }).eq('id', user.id);

      // Check for Checkpoint
      const { data: node } = await supabase.from('world_map_nodes').select('*').match({ x: nx, y: ny }).single();
      if (node) {
        // 1. Reveal Fog
        await supabase.from('player_discoveries').upsert({ user_id: user.id, x: nx, y: ny });
        
        // 2. Check if already discovered for travel menu
        const { data: existingDiscovery } = await supabase
          .from('discovered_locations')
          .select('node_id')
          .match({ user_id: user.id, node_id: node.id })
          .maybeSingle();

        // 3. Add to Travel Menu (discovered_locations) if not there
        const { error: locError } = await supabase
          .from('discovered_locations')
          .upsert([{ 
            user_id: user.id, 
            node_id: node.id 
          }], { onConflict: 'user_id,node_id' });

        // ONLY pop up the scene if this is a NEW discovery
        if (!locError && !existingDiscovery) {
           setCheckpointAlert(node); 
           Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
        
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
        // NO NODE, CHECK FOR RANDOM ENCOUNTER
        const roll = Math.random();
        const mapIdToUse = currentMapId || (user as any).current_map_id;
        
        if (roll < 0.05 && mapIdToUse && mapIdToUse !== 'undefined') { // 5% chance
          const { data: encounters, error } = await supabase
            .from('encounter_pool')
            .select('*')
            .eq('map_id', mapIdToUse) 
            .lte('spawn_chance', roll);
          
          if (error) {
            console.error("Error fetching encounters:", error);
          } else if (encounters && encounters.length > 0) {
            const randomEncounter = encounters[Math.floor(Math.random() * encounters.length)];
            
            // DISPATCHER
            if (randomEncounter.event_type === 'LOOT' && randomEncounter.metadata?.display_mode === 'TEXT') {
              Toast.show({
                type: 'info',
                text1: `Found ${randomEncounter.metadata.rewards.coins} Coins!`,
              });
            } else if (randomEncounter.metadata?.visuals?.layout === 'SIDE_VIEW') {
              setEncounter(randomEncounter);
              setInteractionVisible(true);
            }
          }
        }
      }
      await refreshVision(nx, ny, false);

    } catch (e) { console.log(e); } finally { setLoading(false); }
  };

  return { move, refreshVision, visionGrid, nodesInVision, loading, fastTravel, bankSteps, autoTravelReport, setAutoTravelReport, checkpointAlert, setCheckpointAlert };
};
