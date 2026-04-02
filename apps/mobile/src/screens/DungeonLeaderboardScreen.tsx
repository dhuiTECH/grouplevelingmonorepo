import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, SafeAreaView, ActivityIndicator, RefreshControl } from 'react-native';
import { useRoute, useNavigation, useFocusEffect } from '@react-navigation/native';
import { supabase } from '@/lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import LayeredAvatar from '@/components/LayeredAvatar';
import { useGameData } from '@/hooks/useGameData';
import { User } from '@/types/user';
import { useAuth } from '@/contexts/AuthContext';
import { OptimizedAvatarModal } from '@/components/modals/OptimizedAvatarModal';

export default function DungeonLeaderboardScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation();
  const { dungeon } = route.params || {};
  const { shopItems } = useGameData();
  const { user: currentUser } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [rankings, setRankings] = useState<any[]>([]);
  const [selectedAvatar, setSelectedAvatar] = useState<User | null>(null);

  const fetchLeaderboard = useCallback(async () => {
    try {
      setLoading(true);
      let leaderboardQuery = supabase.from('best_dungeon_times').select('*');
      if (dungeon?.id) {
        leaderboardQuery = leaderboardQuery.eq('dungeon_id', dungeon.id);
      } else {
        leaderboardQuery = leaderboardQuery.eq('dungeon_tier', dungeon?.tier || '5k');
      }
      const { data, error } = await leaderboardQuery
        .order('leaderboard_score', { ascending: false })
        .limit(20);

      if (error) throw error;
      
      if (data && data.length > 0) {
        // Fetch cosmetics for these users so LayeredAvatar displays correctly
        const userIds = [...new Set(data.map(d => d.user_id))];
        const { data: profilesWithCosmetics } = await supabase
          .from('profiles')
          .select(`
            id,
            cosmetics:user_cosmetics(
              *,
              shop_items:shop_item_id(*)
            )
          `)
          .in('id', userIds);
          
        const profileMap = new Map(profilesWithCosmetics?.map(p => [p.id, p]));
        
        const mergedData = data.map(d => ({
          ...d,
          cosmetics: profileMap.get(d.user_id)?.cosmetics || []
        }));
        
        setRankings(mergedData);
      } else {
        setRankings([]);
      }
    } catch (err) {
      console.error('Error fetching leaderboard:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [dungeon?.tier, dungeon?.id]);

  // Fetch on mount and whenever screen comes back into focus (e.g. after completing a run)
  useFocusEffect(
    useCallback(() => {
      if (dungeon?.tier || dungeon?.id) fetchLeaderboard();
    }, [dungeon?.tier, dungeon?.id, fetchLeaderboard])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchLeaderboard();
  }, [fetchLeaderboard]);

  const formatTime = (totalSeconds: number) => {
    const s = Math.max(0, Math.floor(Number(totalSeconds) || 0));
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const formatScore = (raw: unknown) => {
    const n = Number(raw);
    if (!Number.isFinite(n)) return '—';
    return n >= 100 ? n.toFixed(0) : n.toFixed(1);
  };

  const renderRankItem = ({ item, index }: { item: any, index: number }) => {
    // Construct user object for LayeredAvatar
    const profile = {
      ...item,
      name: item.hunter_name || 'Unknown',
      cosmetics: item.cosmetics || []
    };
    
    return (
      <View style={styles.rankItem}>
        <Text style={[styles.rankNumber, index < 3 && styles.topRankText]}>
          {index + 1}
        </Text>
        
        <TouchableOpacity 
          style={styles.avatarContainer}
          onPress={() => setSelectedAvatar(profile as any)}
        >
          <LayeredAvatar 
            user={profile} 
            size={40} 
            allShopItems={shopItems} 
            onAvatarClick={() => setSelectedAvatar(profile as any)}
          />
        </TouchableOpacity>

        <View style={styles.hunterInfo}>
          <Text style={styles.hunterName}>{profile.hunter_name || 'Hunter'}</Text>
          <Text style={styles.hunterTitle}>{profile.current_title || 'Novice'}</Text>
        </View>

        <View style={styles.statsColumn}>
          <Text style={styles.scoreValue}>{formatScore(item.leaderboard_score)}</Text>
          <Text style={styles.scoreLabel}>SCORE</Text>
          <Text style={styles.subStat}>
            {formatTime(item.best_time_seconds)} · {Math.round(Number(item.best_elevation_gain_meters) || 0)}m elev
          </Text>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#020617', '#0f172a']}
        style={StyleSheet.absoluteFill}
      />
      
      <SafeAreaView style={{ flex: 1 }}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="chevron-back" size={24} color="#fff" />
          </TouchableOpacity>
          <View>
            <Text style={styles.headerTitle}>LEADERBOARD</Text>
            <Text style={styles.headerSubtitle}>{dungeon?.name?.toUpperCase() || 'DUNGEON'}</Text>
          </View>
        </View>

        {loading ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color="#06b6d4" />
          </View>
        ) : (
          <FlatList
            data={rankings}
            renderItem={renderRankItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            getItemLayout={(_data, index) => ({ length: 74, offset: 74 * index, index })}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#06b6d4" />
            }
            ListEmptyComponent={
              <View style={styles.centerContainer}>
                <Text style={styles.emptyText}>NO RECORDS FOUND</Text>
              </View>
            }
          />
        )}
      </SafeAreaView>

      {/* Player Detail Modal */}
      {currentUser && (
        <OptimizedAvatarModal
          visible={!!selectedAvatar}
          onClose={() => setSelectedAvatar(null)}
          user={selectedAvatar}
          currentUser={currentUser}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#020617',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    gap: 15,
  },
  backButton: {
    padding: 8,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 20,
  },
  headerTitle: {
    color: '#06b6d4',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 2,
  },
  headerSubtitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '900',
    fontStyle: 'italic',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  listContent: {
    padding: 20,
  },
  rankItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    padding: 12,
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(34, 211, 238, 0.1)',
  },
  rankNumber: {
    color: '#64748b',
    fontSize: 18,
    fontWeight: '900',
    width: 30,
    fontStyle: 'italic',
  },
  topRankText: {
    color: '#fbbf24',
  },
  avatarContainer: {
    marginRight: 12,
  },
  hunterInfo: {
    flex: 1,
  },
  hunterName: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  hunterTitle: {
    color: '#64748b',
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  statsColumn: {
    alignItems: 'flex-end',
    maxWidth: '46%',
  },
  scoreValue: {
    color: '#22d3ee',
    fontSize: 16,
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
  },
  scoreLabel: {
    color: '#64748b',
    fontSize: 8,
    fontWeight: 'bold',
  },
  subStat: {
    color: '#94a3b8',
    fontSize: 9,
    fontWeight: '600',
    marginTop: 4,
    textAlign: 'right',
  },
  emptyText: {
    color: '#64748b',
    fontSize: 12,
    fontWeight: 'bold',
    letterSpacing: 2,
  },
});
