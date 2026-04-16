import type { SupabaseClient } from '@supabase/supabase-js';
import { useGameDataStore } from '@/store/useGameDataStore';

export const CHEST_VS_SCENE_CHEST_PROBABILITY = 0.7;

export type ChestTier = 'small' | 'silver' | 'medium' | 'large';

export function rollBaseChestTier(): ChestTier {
  const rarityRoll = Math.random();
  if (rarityRoll > 0.95) return 'large';
  if (rarityRoll > 0.8) return 'medium';
  if (rarityRoll > 0.5) return 'silver';
  return 'small';
}

export interface RandomSceneNodeEvent {
  type: 'BATTLE' | 'SCENE';
  data: Record<string, unknown>;
}

export async function fetchRandomSceneEvent(
  supabase: SupabaseClient
): Promise<RandomSceneNodeEvent | null> {
  const cachedNodes = useGameDataStore.getState().worldMapNodes;
  let nodes: any[] | null = null;
  if (cachedNodes.length > 0) {
    nodes = cachedNodes.filter((n: any) => n.is_random_event);
  } else {
    const { data } = await supabase.from('world_map_nodes').select('*').eq('is_random_event', true);
    nodes = data;
    if (data && data.length > 0) {
      useGameDataStore.getState().setAll({ worldMapNodes: data });
    }
  }
  if (!nodes?.length) return null;
  const node = nodes[Math.floor(Math.random() * nodes.length)] as Record<string, unknown>;
  return {
    type: node.interaction_type === 'BATTLE' ? 'BATTLE' : 'SCENE',
    data: node,
  };
}
