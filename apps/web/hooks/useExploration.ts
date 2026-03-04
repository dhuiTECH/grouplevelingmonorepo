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
  imageUrl?: string;
  type?: string;
  isFallback?: boolean;
  isSpritesheet?: boolean;
  frameCount?: number;
  frameWidth?: number;
  frameHeight?: number;
  animationSpeed?: number;
}

const GRID_RADIUS = 2; // 5x5 grid: from -2 to +2 around player
const CHUNK_SIZE = 16;
const MOVE_COST = 100;
export const DEFAULT_LAND_COLOR = '#6b705c'; // Greenish-brown

function buildVisionGrid(
  centerX: number,
  centerY: number,
  nodes: WorldMapNode[],
  tilesData: any[] = []
): VisionTile[] {
  const tiles: VisionTile[] = [];
  for (let dy = -GRID_RADIUS; dy <= GRID_RADIUS; dy++) {
    for (let dx = -GRID_RADIUS; dx <= GRID_RADIUS; dx++) {
      const x = centerX + dx;
      const y = centerY + dy;
      const node = nodes.find((n) => n.x === x && n.y === y) ?? null;
      const tile = tilesData.find((t) => t.x === x && t.y === y) ?? null;
      
      tiles.push({ 
        x, 
        y, 
        node, 
        imageUrl: tile?.imageUrl || tile?.image_url, 
        type: tile?.type || tile?.tile_type || 'land',
        isFallback: !tile,
        isSpritesheet: tile?.isSpritesheet,
        frameCount: tile?.frameCount,
        frameWidth: tile?.frameWidth,
        frameHeight: tile?.frameHeight,
        animationSpeed: tile?.animationSpeed
      });
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

  const [worldTiles, setWorldTiles] = useState<any[]>([]);

  const wx = user?.world_x ?? 0;
  const wy = user?.world_y ?? 0;

  const refreshVision = useCallback(
    (centerX: number, centerY: number) => {
      setVisionGrid(buildVisionGrid(centerX, centerY, nodes, worldTiles));
    },
    [nodes, worldTiles]
  );

  const fetchChunks = async (x: number, y: number) => {
    const cx = Math.floor(x / CHUNK_SIZE);
    const cy = Math.floor(y / CHUNK_SIZE);

    // Fetch 9 chunks (3x3 grid)
    const { data: chunks } = await supabase
      .from('map_chunks')
      .select('tile_data')
      .gte('chunk_x', cx - 1)
      .lte('chunk_x', cx + 1)
      .gte('chunk_y', cy - 1)
      .lte('chunk_y', cy + 1);

    if (chunks) {
      const tiles: any[] = [];
      chunks.forEach(c => {
        if (Array.isArray(c.tile_data)) {
          tiles.push(...c.tile_data);
        }
      });
      
      setWorldTiles(prev => {
        const map = new Map(prev.map(t => [`${t.x},${t.y},${t.layer || 0}`, t]));
        tiles.forEach(t => map.set(`${t.x},${t.y},${t.layer || 0}`, t));
        return Array.from(map.values());
      });
    }
  };

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        // Fetch all nodes with global coordinates
        const { data: nodesData, error: nodesError } = await supabase
          .from('world_map_nodes')
          .select('id, name, type, x, y, global_x, global_y, map_id, icon_url, interaction_type, interaction_data, modal_image_url');

        if (nodesError) {
          console.error('Error fetching nodes:', nodesError);
        } else {
          const processedNodes = (nodesData as any[]).map(n => ({
            ...n,
            x: n.global_x ?? n.x,
            y: n.global_y ?? n.y
          }));

          // Fetch quests for these nodes
          const { data: questsData } = await supabase
            .from('quests')
            .select('*')
            .in('node_id', processedNodes.map(n => n.id));

          setAvailableQuests(questsData || []);

          // Fetch user's quests
          if (user?.id) {
            const { data: uQuestsData } = await supabase
              .from('user_quests')
              .select('*')
              .eq('user_id', user.id);
            
            setUserQuests(uQuestsData || []);

            // Map quest status to nodes
            const mappedNodes = processedNodes.map(node => {
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
            setNodes(processedNodes);
          }
        }

        // Fetch initial chunks
        await fetchChunks(wx, wy);

      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user?.id]); // Re-load when user changes

  useEffect(() => {
    if (!loading) {
      refreshVision(wx, wy);
      fetchChunks(wx, wy); // Fetch chunks as player moves
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

      // Full-block collision: any tile at destination with isWalkable === false
      const destinationTiles = worldTiles.filter((t: any) => t.x === newX && t.y === newY);
      const isFullBlocked = destinationTiles.some((t: any) => t.isWalkable === false);
      if (isFullBlocked) return;

      // Edge-block collision (bitmask N=1, E=2, S=4, W=8): two-sided check
      const currentTiles = worldTiles.filter((t: any) => t.x === wx && t.y === wy);
      const currentEdgeBlocks = currentTiles.reduce((acc: number, t: any) => acc | (t.edgeBlocks ?? 0), 0);
      const destEdgeBlocks = destinationTiles.reduce((acc: number, t: any) => acc | (t.edgeBlocks ?? 0), 0);
      const blockedByEdge =
        (direction === 'N' && ((currentEdgeBlocks & 1) || (destEdgeBlocks & 4))) ||
        (direction === 'S' && ((currentEdgeBlocks & 4) || (destEdgeBlocks & 1))) ||
        (direction === 'E' && ((currentEdgeBlocks & 2) || (destEdgeBlocks & 8))) ||
        (direction === 'W' && ((currentEdgeBlocks & 8) || (destEdgeBlocks & 2)));
      if (blockedByEdge) return;

      const stepsBanked = user.steps_banked ?? 0;
      if (stepsBanked < MOVE_COST) return;
      const newSteps = stepsBanked - MOVE_COST;

      await updatePosition(newX, newY, newSteps);
      refreshVision(newX, newY);

      const node = nodes.find((n) => n.x === newX && n.y === newY);
      if (node) onEncounter(node);
    },
    [user, wx, wy, worldTiles, nodes, updatePosition, refreshVision, onEncounter]
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
    worldTiles,
    loading,
    userQuests,
    availableQuests,
  };
}
