'use client';

import { useState, useEffect, useCallback } from 'react';
import { User } from '@/lib/types';
import { supabase } from '@/lib/supabase';

export interface WorldMapNode {
  id: string;
  name: string;
  type?: string;
  x: number;
  y: number;
  map_id: string | null;
  icon_url?: string | null;
  interaction_type?: string | null;
  interaction_data?: Record<string, unknown> | null;
  modal_image_url?: string | null;
  has_quest?: boolean;
  quest_status?: 'available' | 'active' | 'completed' | 'claimed';
}

export interface VisionTile {
  x: number;
  y: number;
  node: WorldMapNode | null;
}

const GRID_RADIUS = 2; // 5x5 grid: from -2 to +2 around player

function buildVisionGrid(
  centerX: number,
  centerY: number,
  nodes: WorldMapNode[]
): VisionTile[] {
  const tiles: VisionTile[] = [];
  for (let dy = -GRID_RADIUS; dy <= GRID_RADIUS; dy++) {
    for (let dx = -GRID_RADIUS; dx <= GRID_RADIUS; dx++) {
      const x = centerX + dx;
      const y = centerY + dy;
      const node = nodes.find((n) => n.x === x && n.y === y) ?? null;
      tiles.push({ x, y, node });
    }
  }
  return tiles;
}

export function useExploration(
  user: User | null,
  setUser: (u: User | ((prev: User) => User)) => void,
  onEncounter: (node: WorldMapNode) => void
) {
  const [activeMapUrl, setActiveMapUrl] = useState<string | null>(null);
  const [activeMapId, setActiveMapId] = useState<string | null>(null);
  const [nodes, setNodes] = useState<WorldMapNode[]>([]);
  const [visionGrid, setVisionGrid] = useState<VisionTile[]>([]);
  const [loading, setLoading] = useState(true);
  const [userQuests, setUserQuests] = useState<any[]>([]);
  const [availableQuests, setAvailableQuests] = useState<any[]>([]);

  const wx = user?.world_x ?? 0;
  const wy = user?.world_y ?? 0;

  const refreshVision = useCallback(
    (centerX: number, centerY: number) => {
      setVisionGrid(buildVisionGrid(centerX, centerY, nodes));
    },
    [nodes]
  );

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const { data: mapData, error: mapError } = await supabase
          .from('maps')
          .select('id, image_url')
          .eq('is_active', true)
          .maybeSingle();

        if (mapError) {
          console.error('Error fetching active map:', mapError);
          setLoading(false);
          return;
        }

        if (mapData) {
          setActiveMapId(mapData.id);
          setActiveMapUrl(mapData.image_url ?? null);
        } else {
          setActiveMapId(null);
          setActiveMapUrl(null);
        }

        if (mapData?.id) {
          const { data: nodesData, error: nodesError } = await supabase
            .from('world_map_nodes')
            .select('id, name, type, x, y, map_id, icon_url, interaction_type, interaction_data, modal_image_url')
            .eq('map_id', mapData.id);

          if (nodesError) {
            console.error('Error fetching nodes:', nodesError);
          } else {
            // Fetch quests for these nodes
            const { data: questsData, error: questsError } = await supabase
              .from('quests')
              .select('*')
              .in('node_id', (nodesData as any[]).map(n => n.id));

            setAvailableQuests(questsData || []);

            // Fetch user's quests
            if (user?.id) {
              const { data: uQuestsData, error: uQuestsError } = await supabase
                .from('user_quests')
                .select('*')
                .eq('user_id', user.id);
              
              setUserQuests(uQuestsData || []);

              // Map quest status to nodes
              const mappedNodes = (nodesData as WorldMapNode[]).map(node => {
                const nodeQuest = (questsData || []).find(q => q.node_id === node.id);
                const userQuest = (uQuestsData || []).find(uq => uq.quest_id === nodeQuest?.id);
                
                if (nodeQuest && userQuest?.status !== 'claimed') {
                  return {
                    ...node,
                    has_quest: true,
                    quest_status: userQuest ? (userQuest.status === 'completed' ? 'completed' : 'active') : 'available'
                  } as WorldMapNode;
                }
                return {
                  ...node,
                  has_quest: false
                };
              });
              setNodes(mappedNodes);
            } else {
              setNodes((nodesData as WorldMapNode[]) ?? []);
            }
          }
        } else {
          setNodes([]);
        }
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  useEffect(() => {
    if (!loading) {
      refreshVision(wx, wy);
    }
  }, [wx, wy, nodes, loading, refreshVision]);

  const updatePosition = useCallback(
    async (newX: number, newY: number, newStepsBanked: number) => {
      if (!user?.id) return;
      const res = await fetch('/api/user', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: user.id,
          world_x: newX,
          world_y: newY,
          steps_banked: newStepsBanked,
        }),
      });
      if (!res.ok) return;
      setUser((prev) => ({
        ...prev,
        world_x: newX,
        world_y: newY,
        steps_banked: newStepsBanked,
      }));
    },
    [user?.id, setUser]
  );

  const move = useCallback(
    async (direction: 'N' | 'S' | 'E' | 'W') => {
      if (!user) return;
      let newX = wx;
      let newY = wy;
      if (direction === 'N') newY = wy + 1;
      else if (direction === 'S') newY = wy - 1;
      else if (direction === 'E') newX = wx + 1;
      else if (direction === 'W') newX = wx - 1;

      const stepsBanked = user.steps_banked ?? 0;
      const cost = 100;
      if (stepsBanked < cost) return;
      const newSteps = stepsBanked - cost;

      await updatePosition(newX, newY, newSteps);
      refreshVision(newX, newY);

      const node = nodes.find((n) => n.x === newX && n.y === newY);
      if (node) onEncounter(node);
    },
    [user, wx, wy, nodes, updatePosition, refreshVision, onEncounter]
  );

  const fastTravel = useCallback(
    async (targetX: number, targetY: number, cost: number) => {
      if (!user) return;
      const stepsBanked = user.steps_banked ?? 0;
      if (stepsBanked < cost) return;
      const newSteps = stepsBanked - cost;
      await updatePosition(targetX, targetY, newSteps);
      refreshVision(targetX, targetY);
      const node = nodes.find((n) => n.x === targetX && n.y === targetY);
      if (node) onEncounter(node);
    },
    [user, nodes, updatePosition, refreshVision, onEncounter]
  );

  const bankSteps = useCallback(
    async (steps: number) => {
      if (!user?.id) return;
      const current = user.steps_banked ?? 0;
      const newSteps = current + steps;
      const res = await fetch('/api/user', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: user.id, steps_banked: newSteps }),
      });
      if (!res.ok) return;
      setUser((prev) => ({ ...prev, steps_banked: newSteps }));
    },
    [user?.id, user?.steps_banked, setUser]
  );

  const acceptQuest = useCallback(
    async (questId: string) => {
      if (!user?.id) return;
      const { error } = await supabase
        .from('user_quests')
        .insert({ user_id: user.id, quest_id: questId, status: 'active' });
      
      if (error) {
        console.error('Error accepting quest:', error);
        return;
      }
      
      // Refresh user quests
      const { data } = await supabase
        .from('user_quests')
        .select('*')
        .eq('user_id', user.id);
      
      setUserQuests(data || []);
      
      // Re-map nodes to update status
      setNodes(prevNodes => prevNodes.map(node => {
        const nodeQuest = availableQuests.find(q => q.node_id === node.id && q.id === questId);
        if (nodeQuest) {
          return { ...node, quest_status: 'active' };
        }
        return node;
      }));
    },
    [user?.id, availableQuests]
  );

  const claimQuestReward = useCallback(
    async (questId: string) => {
      if (!user?.id) return;
      
      // Get quest rewards
      const quest = availableQuests.find(q => q.id === questId);
      if (!quest) return;

      const { error } = await supabase
        .from('user_quests')
        .update({ status: 'claimed', completed_at: new Date().toISOString() })
        .eq('user_id', user.id)
        .eq('quest_id', questId);
      
      if (error) {
        console.error('Error claiming quest reward:', error);
        return;
      }

      // Apply rewards and persist to profile
      const rewards = quest.rewards as { exp?: number; coins?: number; gems?: number } | undefined;
      if (rewards) {
        const updates: Partial<User> = {};
        if (rewards.exp) updates.exp = (user.exp || 0) + rewards.exp;
        if (rewards.coins) updates.coins = (user.coins || 0) + rewards.coins;
        if (rewards.gems) updates.gems = (user.gems || 0) + rewards.gems;

        if (Object.keys(updates).length > 0) {
          const res = await fetch('/api/user', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: user.id, ...updates }),
          });
          if (res.ok) setUser((prev) => (prev ? { ...prev, ...updates } : prev));
        }
      }
      
      // Refresh user quests
      const { data } = await supabase
        .from('user_quests')
        .select('*')
        .eq('user_id', user.id);
      
      setUserQuests(data || []);
      
      // Re-map nodes
      setNodes(prevNodes => prevNodes.map(node => {
        const nodeQuest = availableQuests.find(q => q.node_id === node.id && q.id === questId);
        if (nodeQuest) {
          return { ...node, quest_status: 'claimed', has_quest: false };
        }
        return node;
      }));
    },
    [user, availableQuests, setUser, updatePosition]
  );

  return {
    visionGrid,
    move,
    refreshVision,
    fastTravel,
    bankSteps,
    acceptQuest,
    claimQuestReward,
    activeMapUrl,
    activeMapId,
    nodes,
    loading,
    userQuests,
    availableQuests,
  };
}
