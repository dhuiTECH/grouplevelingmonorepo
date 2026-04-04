import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import LayeredAvatar from '@/components/LayeredAvatar';
import { supabase } from '@/lib/supabase';
import type { ShopItem, User } from '@/types/user';

const AVATAR_ROW_SIZE = 48;
/** Solid fill under rounded corners (matches row card) — removes hairline gaps at anti-aliased corners */
const AVATAR_PLATE_BG = '#0f172a';

export interface ClearedGateRow {
  id: string;
  user_id: string;
  duration_seconds: number;
  distance_meters: number;
  created_at: string;
  dungeon: { id?: string; name?: string; tier?: string } | null;
  /** Minimal profile + cosmetics for LayeredAvatar */
  runner: (Partial<User> & { id: string; cosmetics?: User['cosmetics'] }) | null;
  kudosCount: number;
  kudosGivenByMe: boolean;
}

function formatRunDuration(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m.toString().padStart(2, '0')}:${r.toString().padStart(2, '0')}`;
}

function formatPaceMinPerKm(durationSeconds: number, distanceMeters: number): string {
  const km = distanceMeters / 1000;
  if (km <= 0) return '—';
  const paceSec = durationSeconds / km;
  const pm = Math.floor(paceSec / 60);
  const ps = Math.floor(paceSec % 60);
  return `${pm}:${ps.toString().padStart(2, '0')} /km`;
}

function formatSpeedKmh(distanceMeters: number, durationSeconds: number): string {
  if (durationSeconds <= 0) return '—';
  const kmh = (distanceMeters / 1000) / (durationSeconds / 3600);
  return `${kmh.toFixed(1)} km/h`;
}

interface ClearedGatesSectionProps {
  currentUserId: string;
  shopItems: ShopItem[];
  onAvatarPress?: (u: Partial<User> & { id: string }) => void;
  refreshKey?: number;
}

export function ClearedGatesSection({
  currentUserId,
  shopItems,
  onAvatarPress,
  refreshKey = 0,
}: ClearedGatesSectionProps) {
  const [rows, setRows] = useState<ClearedGateRow[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchFeed = useCallback(async () => {
    if (!currentUserId) {
      setRows([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const { data: friendships, error: fErr } = await supabase
        .from('friendships')
        .select('user_id_1, user_id_2, status')
        .or(`user_id_1.eq.${currentUserId},user_id_2.eq.${currentUserId}`);

      if (fErr) {
        console.error('[ClearedGates] friendships', fErr);
        setRows([]);
        return;
      }

      const friendIds: string[] = [];
      friendships?.forEach((f: { user_id_1: string; user_id_2: string; status: string }) => {
        if (f.status !== 'accepted') return;
        friendIds.push(f.user_id_1 === currentUserId ? f.user_id_2 : f.user_id_1);
      });

      const feedUserIds = [...new Set([...friendIds, currentUserId])];

      const { data: runs, error: rErr } = await supabase
        .from('dungeon_runs')
        .select(
          `
          id,
          user_id,
          dungeon_id,
          distance_meters,
          duration_seconds,
          elevation_gain_meters,
          time_to_target_seconds,
          completed,
          created_at,
          dungeons ( id, name, tier, target_distance_meters )
        `
        )
        .in('user_id', feedUserIds)
        .eq('completed', true)
        .order('created_at', { ascending: false })
        .limit(40);

      if (rErr || !runs?.length) {
        setRows([]);
        return;
      }

      const runnerIds = [...new Set(runs.map((r: { user_id: string }) => r.user_id))];

      const { data: profiles, error: pErr } = await supabase
        .from('profiles')
        .select(
          `
          id,
          hunter_name,
          current_title,
          gender,
          user_cosmetics (
            *,
            shop_items:shop_item_id (*)
          )
        `
        )
        .in('id', runnerIds);

      if (pErr) console.error('[ClearedGates] profiles', pErr);

      const profileMap = new Map(
        (profiles || []).map((p: Record<string, unknown>) => [p.id as string, p])
      );

      const runIds = runs.map((r: { id: string }) => r.id);
      const { data: kudosRows } = await supabase
        .from('dungeon_run_kudos')
        .select('dungeon_run_id, from_user_id')
        .in('dungeon_run_id', runIds);

      const kudosCount = new Map<string, number>();
      const myKudos = new Set<string>();
      kudosRows?.forEach((k: { dungeon_run_id: string; from_user_id: string }) => {
        kudosCount.set(k.dungeon_run_id, (kudosCount.get(k.dungeon_run_id) ?? 0) + 1);
        if (k.from_user_id === currentUserId) myKudos.add(k.dungeon_run_id);
      });

      const enriched: ClearedGateRow[] = runs.map((run: Record<string, unknown>) => {
        const p = profileMap.get(run.user_id as string) as Record<string, unknown> | undefined;
        const uc = (p?.user_cosmetics as unknown[]) || [];
        const runnerUser: ClearedGateRow['runner'] = p
          ? {
              id: p.id as string,
              hunter_name: p.hunter_name as string,
              name: (p.hunter_name as string) || '',
              current_title: p.current_title as string | undefined,
              gender: p.gender as User['gender'],
              cosmetics: uc as User['cosmetics'],
            }
          : null;

        return {
          id: run.id as string,
          user_id: run.user_id as string,
          duration_seconds: run.duration_seconds as number,
          distance_meters: run.distance_meters as number,
          created_at: run.created_at as string,
          dungeon: run.dungeons as ClearedGateRow['dungeon'],
          runner: runnerUser,
          kudosCount: kudosCount.get(run.id as string) ?? 0,
          kudosGivenByMe: myKudos.has(run.id as string),
        };
      });

      setRows(enriched);
    } catch (e) {
      console.error('[ClearedGates]', e);
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [currentUserId]);

  React.useEffect(() => {
    fetchFeed();
  }, [fetchFeed, refreshKey]);

  const toggleKudos = async (row: ClearedGateRow) => {
    if (row.user_id === currentUserId) return;

    if (row.kudosGivenByMe) {
      const { error } = await supabase
        .from('dungeon_run_kudos')
        .delete()
        .eq('dungeon_run_id', row.id)
        .eq('from_user_id', currentUserId);
      if (error) console.error('[ClearedGates] kudos delete', error);
    } else {
      const { error } = await supabase.from('dungeon_run_kudos').insert({
        dungeon_run_id: row.id,
        from_user_id: currentUserId,
      });
      if (error) console.error('[ClearedGates] kudos insert', error);
    }
    await fetchFeed();
  };

  if (loading) {
    return (
      <View style={styles.loadingWrap}>
        <ActivityIndicator color="#06b6d4" />
        <Text style={styles.loadingText}>LOADING CLEARS…</Text>
      </View>
    );
  }

  if (rows.length === 0) {
    return (
      <View style={styles.emptyCard}>
        <Text style={styles.emptyTitle}>NO CLEARS YET</Text>
        <Text style={styles.emptySub}>Finish a run or add friends to see activity.</Text>
      </View>
    );
  }

  return (
    <View style={styles.list}>
      {rows.map((row) => {
        const runner = row.runner;
        if (!runner) return null;
        const isOwn = row.user_id === currentUserId;
        const dungeonName = row.dungeon?.name || 'SPECIAL INSTANCE';
        const dur = row.duration_seconds ?? 0;
        const dist = row.distance_meters ?? 0;

        return (
          <View key={row.id} style={styles.row}>
            <LayeredAvatar
              user={runner as User}
              size={AVATAR_ROW_SIZE}
              allShopItems={shopItems}
              square
              onAvatarClick={onAvatarPress ? () => onAvatarPress(runner) : undefined}
              style={styles.avatarPlate}
            />

            <View style={styles.mid}>
              <View style={styles.nameRow}>
                <Text style={styles.name} numberOfLines={1}>
                  {(runner.hunter_name || runner.name || 'HUNTER').toUpperCase()}
                </Text>
                {isOwn && <Text style={styles.youBadge}> YOU</Text>}
              </View>
              <Text style={styles.dungeon} numberOfLines={1}>
                {dungeonName.toUpperCase()}
              </Text>
              <View style={styles.statsRow}>
                <Text style={styles.stat}>TIME {formatRunDuration(dur)}</Text>
                <Text style={styles.stat}>{formatPaceMinPerKm(dur, dist)}</Text>
                <Text style={styles.stat}>{formatSpeedKmh(dist, dur)}</Text>
              </View>
            </View>

            <View style={styles.kudosCol}>
              {!isOwn ? (
                <TouchableOpacity
                  style={[styles.kudosBtn, row.kudosGivenByMe && styles.kudosBtnActive]}
                  onPress={() => toggleKudos(row)}
                  activeOpacity={0.8}
                >
                  <Ionicons
                    name="thumbs-up"
                    size={16}
                    color={row.kudosGivenByMe ? '#67e8f9' : '#64748b'}
                  />
                  <Text style={[styles.kudosCount, row.kudosGivenByMe && styles.kudosCountActive]}>
                    {row.kudosCount}
                  </Text>
                </TouchableOpacity>
              ) : (
                <View style={styles.kudosReadonly}>
                  <Ionicons name="thumbs-up" size={16} color="#475569" />
                  <Text style={styles.kudosCountMuted}>{row.kudosCount}</Text>
                </View>
              )}
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  loadingWrap: {
    paddingVertical: 24,
    alignItems: 'center',
    gap: 8,
  },
  loadingText: {
    color: '#64748b',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1.2,
    fontFamily: 'Exo2-Regular',
  },
  emptyCard: {
    marginHorizontal: 16,
    padding: 20,
    borderRadius: 16,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  emptyTitle: {
    color: '#94a3b8',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1,
    textAlign: 'center',
    fontFamily: 'Exo2-Regular',
  },
  emptySub: {
    color: '#64748b',
    fontSize: 8,
    marginTop: 8,
    textAlign: 'center',
    fontFamily: 'Exo2-Regular',
  },
  list: {
    paddingHorizontal: 16,
    gap: 10,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: 16,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  /** Single surface: border + opaque plate on LayeredAvatar root (no nested clip = no corner void) */
  avatarPlate: {
    backgroundColor: AVATAR_PLATE_BG,
    borderWidth: 1,
    borderColor: 'rgba(6, 182, 212, 0.35)',
    overflow: 'hidden',
  },
  mid: {
    flex: 1,
    minWidth: 0,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  name: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.5,
    flex: 1,
    fontFamily: 'Exo2-Regular',
  },
  youBadge: {
    color: '#22d3ee',
    fontSize: 7,
    fontWeight: '900',
    fontFamily: 'Exo2-Regular',
  },
  dungeon: {
    color: '#60a5fa',
    fontSize: 8,
    fontWeight: '800',
    marginTop: 2,
    letterSpacing: 0.5,
    fontFamily: 'Exo2-Regular',
  },
  statsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  stat: {
    color: '#94a3b8',
    fontSize: 8,
    fontWeight: '700',
    fontFamily: 'Exo2-Regular',
  },
  kudosCol: {
    alignItems: 'center',
    justifyContent: 'flex-start',
    minWidth: 44,
  },
  kudosBtn: {
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(30, 41, 59, 0.9)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  kudosBtnActive: {
    backgroundColor: 'rgba(6, 182, 212, 0.15)',
    borderColor: 'rgba(6, 182, 212, 0.4)',
  },
  kudosCount: {
    color: '#94a3b8',
    fontSize: 9,
    fontWeight: '900',
    marginTop: 2,
    fontFamily: 'Exo2-Regular',
  },
  kudosCountActive: {
    color: '#67e8f9',
  },
  kudosReadonly: {
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  kudosCountMuted: {
    color: '#64748b',
    fontSize: 9,
    fontWeight: '900',
    marginTop: 2,
    fontFamily: 'Exo2-Regular',
  },
});
