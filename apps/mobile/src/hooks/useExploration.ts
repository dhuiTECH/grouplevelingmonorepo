import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import * as Haptics from 'expo-haptics';

const MOVE_COST = 100; // 100 Steps = 1 Tile

export const useExploration = (
  setEncounter: (encounter: any | null) => void, 
  setInteractionVisible: (visible: boolean) => void,
  setActiveRaid: (raid: any | null) => void,
  setRaidModalVisible: (visible: boolean) => void,
  currentMapId?: string | null
) => {
  const { user, setUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [visionGrid, setVisionGrid] = useState<any[]>([]); 
  const [autoTravelReport, setAutoTravelReport] = useState<any | null>(null);
  const [checkpointAlert, setCheckpointAlert] = useState<any | null>(null);

  // 1. REFRESH VISION (The Grid Logic)
  const refreshVision = useCallback(async (cx: number, cy: number) => {
    if (!user?.id) return;

    const { data: unlocked } = await supabase.from('player_discoveries').select('x, y').eq('user_id', user.id);
    const { data: nodes } = await supabase.from('world_map_nodes').select('*');
    
    const unlockedSet = new Set(unlocked?.map(d => `${d.x},${d.y}`));
    const grid = [];

    // 5x5 Grid
    for (let dy = 2; dy >= -2; dy--) {
      for (let dx = -2; dx <= 2; dx++) {
        const tx = cx + dx;
        const ty = cy + dy;
        const key = `${tx},${ty}`;
        
        const isUnlocked = unlockedSet.has(key) || (tx === 0 && ty === 0);
        const isCurrent = (dx === 0 && dy === 0);
        const node = nodes?.find(n => n.x === tx && n.y === ty);

        grid.push({ x: tx, y: ty, isVisible: isCurrent || isUnlocked, node });
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

    // Simulate moving North automatically
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
    
    // Y-Axis
    if (dir.includes('N')) ny += 1;
    if (dir.includes('S')) ny -= 1;
    
    // X-Axis
    if (dir.includes('E')) nx += 1;
    if (dir.includes('W')) nx -= 1;

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
      await refreshVision(nx, ny);

    } catch (e) { console.log(e); } finally { setLoading(false); }
  };

  return { move, refreshVision, visionGrid, loading, fastTravel, bankSteps, autoTravelReport, setAutoTravelReport, checkpointAlert, setCheckpointAlert };
};
