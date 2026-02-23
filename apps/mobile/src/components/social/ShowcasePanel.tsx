import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions, RefreshControl } from 'react-native';
import { RefreshCw, Crown, Loader2, ThumbsUp, ThumbsDown } from 'lucide-react-native';
import { MotiView } from 'moti';
import LayeredAvatar from '@/components/LayeredAvatar';
import { User } from '@/types/user';
import { useGameData } from '@/hooks/useGameData';

const { width } = Dimensions.get('window');
const SHOWCASE_AVATAR_SIZE = 100;

interface ShowcasePanelProps {
  user: User;
  showcaseHunters: any[];
  daysUntilReset: number;
  userHasVoted: boolean;
  isLoading: boolean;
  loadShowcaseHunters: () => void;
  handleShowcaseVote: (targetId: string, voteType: 'resonate' | 'interfere') => void;
  setSelectedAvatar: (user: any) => void;
  onRefresh: () => void;
}

const ShowcasePanel: React.FC<ShowcasePanelProps> = ({
  user,
  showcaseHunters,
  daysUntilReset,
  userHasVoted,
  isLoading,
  loadShowcaseHunters,
  handleShowcaseVote,
  setSelectedAvatar,
  onRefresh
}) => {
  const { shopItems } = useGameData();

  return (
    <ScrollView 
      style={styles.container} 
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl 
          refreshing={isLoading} 
          onRefresh={onRefresh} 
          tintColor="#22d3ee"
        />
      }
    >
      <View style={styles.header}>
        <Text style={styles.headerTitle}>STYLE MONARCH SHOWCASE</Text>
        <View style={styles.headerRight}>
          <Text style={styles.resetTimer}>RESET: {daysUntilReset}D</Text>
          <TouchableOpacity 
            onPress={loadShowcaseHunters} 
            disabled={isLoading}
            style={styles.refreshButton}
          >
            {isLoading ? (
              <Loader2 size={14} color="#22d3ee" />
            ) : (
              <RefreshCw size={14} color="#22d3ee" />
            )}
          </TouchableOpacity>
        </View>
      </View>

      {isLoading && showcaseHunters.length === 0 ? (
        <View style={styles.loaderContainer}>
          <Loader2 size={32} color="#22d3ee" />
          <Text style={styles.loaderText}>SCANNING STYLE DATA...</Text>
        </View>
      ) : (
        <View style={styles.hunterList}>
          {showcaseHunters.map((hunter, idx) => {
            const isMonarch = idx === 0;
            const isOwnCard = hunter.id === user.id;

            return (
              <MotiView
                key={hunter.id}
                from={{ opacity: 0, translateY: 20 }}
                animate={{ opacity: 1, translateY: 0 }}
                transition={{ delay: idx * 100 }}
                style={[
                  styles.hunterCard,
                  isMonarch && styles.monarchCard
                ]}
              >
                {isMonarch && (
                  <View style={styles.monarchBadge}>
                    <Crown size={10} color="#000" />
                    <Text style={styles.monarchBadgeText}>STYLE MONARCH</Text>
                  </View>
                )}

                <View style={styles.cardContent}>
                  <Text style={[
                    styles.rankText,
                    isMonarch ? styles.monarchRank : styles.normalRank
                  ]}>
                    #{idx + 1}
                  </Text>

                  <View style={styles.avatarSection}>
                    <View style={[
                      styles.avatarContainer,
                      isMonarch && styles.monarchAvatarContainer
                    ]}>
                      {isMonarch && (
                        <MotiView
                          from={{ opacity: 0.3, scale: 1 }}
                          animate={{ opacity: 0.6, scale: 1.2 }}
                          transition={{ loop: true, type: 'timing', duration: 2000 }}
                          style={styles.monarchGlow}
                          pointerEvents="none"
                        />
                      )}
                      <LayeredAvatar 
                        user={hunter} 
                        size={SHOWCASE_AVATAR_SIZE} 
                        square
                        style={{ borderRadius: 8 }}
                        onAvatarClick={() => setSelectedAvatar(hunter)} 
                        allShopItems={shopItems}
                      />
                    </View>
                  </View>

                  <View style={styles.infoSection}>
                    <View style={styles.nameRow}>
                      <Text style={styles.hunterName} numberOfLines={1} ellipsizeMode="tail">
                        {hunter.hunter_name || hunter.name}
                      </Text>

                      {isOwnCard ? (
                        <View style={styles.ownCardBadge}>
                          <Text style={styles.ownCardText}>YOUR CARD</Text>
                        </View>
                      ) : (
                        <View style={styles.voteButtonsRow}>
                          <View style={styles.voteButtons}>
                            <TouchableOpacity
                              onPress={() => handleShowcaseVote(hunter.id, 'resonate')}
                              disabled={userHasVoted}
                              style={[
                                styles.voteButton,
                                styles.yayButton,
                                userHasVoted && styles.disabledVoteButton,
                                hunter.userVote === 'resonate' && styles.activeYayButton
                              ]}
                            >
                              <ThumbsUp size={12} color={hunter.userVote === 'resonate' ? '#fff' : '#4ade80'} />
                              <Text style={[
                                styles.voteButtonText,
                                { color: hunter.userVote === 'resonate' ? '#fff' : '#4ade80' }
                              ]}>
                                {hunter.resonance_count || 0}
                              </Text>
                            </TouchableOpacity>
                            
                            <TouchableOpacity
                              onPress={() => handleShowcaseVote(hunter.id, 'interfere')}
                              disabled={userHasVoted}
                              style={[
                                styles.voteButton,
                                styles.nayButton,
                                userHasVoted && styles.disabledVoteButton,
                                hunter.userVote === 'interfere' && styles.activeNayButton
                              ]}
                            >
                              <ThumbsDown size={12} color={hunter.userVote === 'interfere' ? '#fff' : '#f87171'} />
                              <Text style={[
                                styles.voteButtonText,
                                { color: hunter.userVote === 'interfere' ? '#fff' : '#f87171' }
                              ]}>
                                {hunter.interference_count || 0}
                              </Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                      )}
                    </View>

                    <View style={styles.scoreContainer}>
                      <View style={styles.progressBar}>
                        <View 
                          style={[
                            styles.progressFill,
                            isMonarch ? styles.monarchProgressFill : styles.normalProgressFill,
                            { width: `${Math.min(100, (hunter.showcase_score || 0) / 10)}%` }
                          ]} 
                        />
                      </View>
                      <Text style={styles.scoreText}>SCORE: {hunter.showcase_score || 0}</Text>
                    </View>
                  </View>
                </View>
              </MotiView>
            );
          })}
        </View>
      )}
      
      <View style={{ height: 40 }} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 10,
    fontWeight: '900',
    color: '#22d3ee',
    letterSpacing: 2,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  resetTimer: {
    fontSize: 9,
    fontWeight: 'bold',
    color: 'rgba(34, 211, 238, 0.6)',
  },
  refreshButton: {
    padding: 6,
    backgroundColor: 'rgba(34, 211, 238, 0.1)',
    borderRadius: 4,
  },
  loaderContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  loaderText: {
    fontSize: 9,
    fontWeight: '900',
    color: '#22d3ee',
    letterSpacing: 2,
    marginTop: 12,
  },
  hunterList: {
    gap: 12,
  },
  hunterCard: {
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    padding: 16,
    position: 'relative',
    overflow: 'hidden',
  },
  monarchCard: {
    borderColor: 'rgba(251, 191, 36, 0.5)',
    backgroundColor: 'rgba(251, 191, 36, 0.05)',
    shadowColor: '#fbbf24',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 15,
    elevation: 5,
  },
  monarchBadge: {
    position: 'absolute',
    top: 0,
    left: 0,
    backgroundColor: '#fbbf24',
    paddingHorizontal: 8,
    paddingVertical: 2,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderBottomRightRadius: 4,
    zIndex: 10,
  },
  monarchBadgeText: {
    fontSize: 7,
    fontWeight: '900',
    color: '#000',
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  rankText: {
    fontSize: 24,
    fontWeight: '900',
    fontStyle: 'italic',
    width: 40,
  },
  monarchRank: {
    color: '#fbbf24',
  },
  normalRank: {
    color: 'rgba(34, 211, 238, 0.4)',
  },
  avatarSection: {
    justifyContent: 'center',
  },
  avatarContainer: {
    width: SHOWCASE_AVATAR_SIZE,
    height: SHOWCASE_AVATAR_SIZE,
    borderRadius: 8,
    backgroundColor: 'rgba(15, 23, 42, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  monarchAvatarContainer: {
    borderColor: '#fbbf24',
    borderWidth: 2,
  },
  monarchGlow: {
    position: 'absolute',
    width: '150%',
    height: '150%',
    borderRadius: 8,
    backgroundColor: '#fbbf24',
  },
  infoSection: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: 6,
    marginBottom: 8,
  },
  hunterName: {
    fontSize: 16,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: -0.5,
    width: '100%',
  },
  ownCardBadge: {
    backgroundColor: 'rgba(71, 85, 105, 0.4)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  ownCardText: {
    fontSize: 8,
    fontWeight: '900',
    color: '#94a3b8',
  },
  voteButtonsRow: {
    width: '100%',
    alignItems: 'flex-end',
  },
  voteButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  voteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
  },
  yayButton: {
    backgroundColor: 'rgba(74, 222, 128, 0.1)',
    borderColor: 'rgba(74, 222, 128, 0.3)',
  },
  nayButton: {
    backgroundColor: 'rgba(248, 113, 113, 0.1)',
    borderColor: 'rgba(248, 113, 113, 0.3)',
  },
  activeYayButton: {
    backgroundColor: '#16a34a',
    borderColor: '#4ade80',
  },
  activeNayButton: {
    backgroundColor: '#dc2626',
    borderColor: '#f87171',
  },
  disabledVoteButton: {
    opacity: 0.5,
  },
  voteButtonText: {
    fontSize: 9,
    fontWeight: 'bold',
  },
  scoreContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  progressBar: {
    flex: 1,
    height: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  monarchProgressFill: {
    backgroundColor: '#fbbf24',
  },
  normalProgressFill: {
    backgroundColor: '#3b82f6',
  },
  scoreText: {
    fontSize: 8,
    fontWeight: '900',
    color: 'rgba(255, 255, 255, 0.4)',
    letterSpacing: 1,
  },
});

export default ShowcasePanel;
