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
    const minX = cx - 10;
    const maxX = cx + 10;
    const minY = cy - 12;
    const maxY = cy + 12;

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

    const missingChunks = neededChunks.filter(key => !chunkCache.current.has(key) && !inFlightChunks.current.has(key));

    // 1. Fetch data if needed
    const promises: Promise<any>[] = [];
    
    // Always fetch discoveries to keep fog updated (lightweight)
    promises.push(supabase.from('player_discoveries').select('x, y').eq('user_id', user.id));

    // Only fetch nodes once or periodically (nodes are usually few)
    if (nodesCache.current.length === 0) {
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
    if (nodesRes.data && nodesCache.current.length === 0) {
      nodesCache.current = nodesRes.data;
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

    // Expanded Grid (e.g., 15x21) to cover 9:16 screen with buffer for large props
    for (let dy = 10; dy >= -10; dy--) {
      for (let dx = -7; dx <= 7; dx++) {
        const tx = cx + dx;
        const ty = cy + dy;
        const key = `${tx},${ty}`;
        
        const isUnlocked = unlockedSet.has(key) || (tx === 0 && ty === 0);
        const isCurrent = (dx === 0 && dy === 0);
        const node = nodes?.find(n => n.x === tx && n.y === ty);
        const spotTiles = tileMap.get(key) || [];

        grid.push({ 
          x: tx, 
          y: ty, 
          isVisible: isCurrent || isUnlocked, 
          node,
          tiles: spotTiles
        });
      }
    }
    setVisionGrid(grid);
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
    // Check if the target tile (nx, ny) is walkable.
    // Water is generally Layer -1. We can find if the cell exists in visionGrid.
    const targetCell = visionGrid.find(cell => cell.x === nx && cell.y === ny);
    if (targetCell) {
      // Find the highest layer tile at this coordinate (excluding props that might just be visual)
      // Actually, we want to know what the BASE ground tile is (Layer 0 or Layer -1)
      const baseTiles = targetCell.tiles?.filter((t: any) => {
        // Assume missing layer is 0
        const layer = t.layer !== undefined && t.layer !== null ? Number(t.layer) : 0;
        return layer <= 0;
      });
      
      const groundTile = baseTiles?.sort((a: any, b: any) => (Number(b.layer) || 0) - (Number(a.layer) || 0))[0];
      
      // If there is no ground tile, or the ground tile is water (Layer -1), block movement.
      if (!groundTile || (Number(groundTile.layer) < 0 || groundTile.type === 'water')) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        setLoading(false); // Make sure to reset loading!
        return; 
      }
      
      // Also check if ANY tile at this location is explicitly marked non-walkable
      const hasBlockingTile = targetCell.tiles?.some((t: any) => t.isWalkable === false);
      if (hasBlockingTile) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        setLoading(false); // Make sure to reset loading!
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
        
        // 2. Add to Travel Menu (discovered_locations)
        const { error: locError } = await supabase
          .from('discovered_locations')
          .upsert([{ 
            user_id: user.id, 
            node_id: node.id 
          }], { onConflict: 'user_id,node_id' });

        if (!locError) {
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

  return { move, refreshVision, visionGrid, loading, fastTravel, bankSteps, autoTravelReport, setAutoTravelReport, checkpointAlert, setCheckpointAlert };
};
