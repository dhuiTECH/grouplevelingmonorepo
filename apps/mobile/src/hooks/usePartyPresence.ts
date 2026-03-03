import { useState, useEffect, useRef } from 'react';
import * as Haptics from 'expo-haptics';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

interface PartyMember {
  id: string;
  hunter_name: string;
  world_x: number;
  world_y: number;
  avatar_url?: string | null;
  base_body_url?: string | null;
  base_body_silhouette_url?: string | null;
  base_body_tint_hex?: string | null;
  gender?: string | null;
  cosmetics?: any[];
  lastSeen: number;
}

export const usePartyPresence = () => {
  const { user } = useAuth();
  const [partyMembersOnline, setPartyMembersOnline] = useState<Map<string, PartyMember>>(new Map());
  const presenceChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // Subscribe to presence channel for the current party
  useEffect(() => {
    if (!user?.current_party_id || !user?.id) return;

    const channel = supabase.channel(`party-presence:${user.current_party_id}`, {
      config: {
        presence: {
          key: user.id,
        },
      },
    });

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const membersMap = new Map<string, PartyMember>();

        Object.entries(state).forEach(([key, presences]) => {
          if (key !== user.id && presences && presences.length > 0) {
            const latest = presences[presences.length - 1] as any;
            if (latest.world_x !== undefined && latest.world_y !== undefined) {
              membersMap.set(key, {
                id: key,
                hunter_name: latest.hunter_name || 'Unknown',
                world_x: latest.world_x,
                world_y: latest.world_y,
                avatar_url: latest.avatar_url,
                base_body_url: latest.base_body_url,
                base_body_silhouette_url: latest.base_body_silhouette_url,
                base_body_tint_hex: latest.base_body_tint_hex,
                gender: latest.gender,
                cosmetics: latest.cosmetics,
                lastSeen: Date.now(),
              });
            }
          }
        });

        setPartyMembersOnline(membersMap);
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        console.log('Party member joined:', key, newPresences);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      })
      .on('presence', { event: 'leave' }, ({ key }) => {
        console.log('Party member left:', key);
        setPartyMembersOnline(prev => {
          const next = new Map(prev);
          next.delete(key);
          return next;
        });
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({
            id: user.id,
            hunter_name: user.hunter_name,
            world_x: user.world_x || 0,
            world_y: user.world_y || 0,
            avatar_url: user.avatar_url,
            base_body_url: user.base_body_url,
            base_body_silhouette_url: user.base_body_silhouette_url,
            base_body_tint_hex: user.base_body_tint_hex,
            gender: user.gender,
            cosmetics: user.cosmetics,
          });
        }
      });

  presenceChannelRef.current = channel;

    return () => {
      channel.unsubscribe();
      presenceChannelRef.current = null;
    };
  }, [user?.current_party_id, user?.id]);

  // Broadcast position updates when moving
  useEffect(() => {
    if (!presenceChannelRef.current || !user?.current_party_id || !user?.id) return;

    presenceChannelRef.current.track({
      id: user.id,
      hunter_name: user.hunter_name,
      world_x: user.world_x || 0,
      world_y: user.world_y || 0,
      avatar_url: user.avatar_url,
      base_body_url: user.base_body_url,
      base_body_silhouette_url: user.base_body_silhouette_url,
      base_body_tint_hex: user.base_body_tint_hex,
      gender: user.gender,
      cosmetics: user.cosmetics,
    });
  }, [user?.world_x, user?.world_y, user?.current_party_id, user?.id]);

  return { partyMembersOnline };
};

