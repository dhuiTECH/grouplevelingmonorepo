import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, ImageBackground, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import GoldTrophyIcon from '../../assets/icons/goldtrophy.png';

interface DungeonViewProps {
  user: any;
  dungeons: any[]; // <--- This comes from Supabase via your parent screen
  activeTab: string;
  onNavigate: (tab: string) => void;
  showNotification: (msg: string, type?: 'success' | 'error') => void;
  setUser: (u: any) => void;
  level: number;
  rank: string;
  onAvatarClick: (u: any) => void;
  selectedDungeon: any;
  setSelectedDungeon: (d: any) => void;
}

const DungeonView: React.FC<DungeonViewProps> = (props) => {
  const { dungeons } = props;
  const navigation = useNavigation<any>();
  const [currentIndex, setCurrentIndex] = useState(0);

  // 1. DETERMINE WHICH DUNGEONS TO SHOW
  const displayDungeons = useMemo(() => {
    if (dungeons && Array.isArray(dungeons) && dungeons.length > 0) {
      return dungeons;
    }
    // Fallback: Default data so the component is always visible (for dev/demo)
    return [
      {
        id: '425dc861-6ce0-4ef3-bde3-79c71ae47f8e',
        name: 'Cave of Shadows',
        difficulty: 'E-Rank', 
        xp_reward: 500,
        coin_reward: 100,
        requirement: '5km',
        boss: 'Shadow Stalker',
        target_distance_meters: 5000,
        image_url: 'https://eydnmdgxyqrwfrecoylb.supabase.co/storage/v1/object/public/Dungeons/dungeon-images/centralpark.jpg',
        tier: '5k',
        description: 'A dark cavern specifically for novice hunters testing their endurance.'
      },
      {
        id: 'd1767643446167',
        name: 'The Sunday Track Raid',
        difficulty: 'E-rank', 
        xp_reward: 500,
        coin_reward: 100,
        requirement: '10km',
        boss: 'Interval Ogre',
        target_distance_meters: 10000,
        image_url: 'https://eydnmdgxyqrwfrecoylb.supabase.co/storage/v1/object/public/Dungeons/dungeon-images/centralpark.jpg',
        tier: '10k',
        description: ''
      },
      {
        id: '803b1360-3f64-421e-a068-a6630fea2c41',
        name: 'Iron Fortress',
        difficulty: 'C-Rank', 
        xp_reward: 1500,
        coin_reward: 300,
        requirement: '15km',
        boss: 'Iron Golem',
        target_distance_meters: 15000,
        image_url: 'https://eydnmdgxyqrwfrecoylb.supabase.co/storage/v1/object/public/Dungeons/dungeon-images/centralpark.jpg',
        tier: '15k',
        description: 'A grueling fortress run that requires steel determination.'
      },
      {
        id: '0ba6b897-f90a-4891-83f6-ece117b7028d',
        name: 'Crystal Citadel',
        difficulty: 'B-Rank', 
        xp_reward: 2500,
        coin_reward: 600,
        requirement: '20km',
        boss: 'Crystal Guardian',
        target_distance_meters: 20000,
        image_url: 'https://eydnmdgxyqrwfrecoylb.supabase.co/storage/v1/object/public/Dungeons/dungeon-images/centralpark.jpg',
        tier: '20k',
        description: 'Only elite hunters can reach the heart of this crystalline maze.'
      },
      {
        id: 'f6314787-9811-4ea7-b06f-f61705f46944',
        name: 'Abyss of Void',
        difficulty: 'S-Rank', 
        xp_reward: 5000,
        coin_reward: 1500,
        requirement: '40km',
        boss: 'Void Dragon',
        target_distance_meters: 40000,
        image_url: 'https://eydnmdgxyqrwfrecoylb.supabase.co/storage/v1/object/public/Dungeons/dungeon-images/centralpark.jpg',
        tier: '40k',
        description: 'The ultimate test. Few enter, even fewer return.'
      }
    ];
  }, [dungeons]);

  const currentDungeon = displayDungeons[currentIndex];

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % displayDungeons.length);
  };

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev - 1 + displayDungeons.length) % displayDungeons.length);
  };

  const handleEnterDungeon = () => {
    if (!currentDungeon) return;
    
    // 2. PASS THE REAL DB ROW TO THE TRACKER
    navigation.navigate('DungeonTracker', { 
      dungeon: currentDungeon 
    });
  };

  const handleShowLeaderboard = () => {
    if (!currentDungeon) return;
    navigation.navigate('DungeonLeaderboard', { 
      dungeon: currentDungeon 
    });
  };

  // Safety check: If data hasn't loaded yet, return null or a loader
  if (!currentDungeon) return null;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Image source={require('../../assets/special instances.png')} style={styles.skullIcon} />
        <Text style={styles.headerTitle}>SPECIAL INSTANCES</Text>
        <View style={styles.pagination}>
          <Text style={styles.paginationText}>{currentIndex + 1}/{displayDungeons.length}</Text>
        </View>
      </View>

      <View style={styles.cardContainer}>
        {/* LEFT ARROW */}
        {displayDungeons.length > 1 && (
          <TouchableOpacity onPress={handlePrev} style={[styles.arrowButton, styles.leftArrow]}>
            <ChevronLeft color="#06b6d4" size={24} />
          </TouchableOpacity>
        )}

        <TouchableOpacity 
          style={styles.dungeonCard}
          onPress={handleEnterDungeon}
          activeOpacity={0.9}
        >
          <ImageBackground 
            source={currentDungeon.image_url ? { uri: currentDungeon.image_url } : require('../../assets/special instances.png')} 
            style={styles.backgroundImage}
            imageStyle={{ borderRadius: 8 }}
          >
            <LinearGradient
              colors={['rgba(2, 6, 23, 0.4)', 'rgba(2, 6, 23, 0.9)']}
              style={StyleSheet.absoluteFill}
            />
            <View style={styles.overlay}>
              <View style={styles.cardHeader}>
                <View style={styles.rankBadge}>
                  {/* Dynamic Difficulty */}
                  <Text style={styles.rankText}>{currentDungeon.difficulty || 'E-RANK'}</Text>
                </View>
                <View style={styles.timeContainer}>
                  <Text style={styles.timeText}>{currentDungeon.tier?.toUpperCase() || '5K'}</Text>
                </View>
              </View>

              <View style={styles.contentMiddle}>
                {/* Dynamic Name */}
                <Text style={styles.dungeonTitle}>{currentDungeon.name.toUpperCase()}</Text>
                
                <View style={styles.rewardsRow}>
                  <View style={styles.rewardItem}>
                    <Image source={require('../../assets/expcrystal.png')} style={styles.rewardIcon} />
                    {/* Dynamic XP */}
                    <Text style={styles.rewardText}>{currentDungeon.xp_reward} XP</Text>
                  </View>
                  <View style={styles.rewardItem}>
                    <Image source={require('../../assets/coinicon.png')} style={styles.rewardIcon} />
                    {/* Dynamic Gold */}
                    <Text style={[styles.rewardText, { color: '#fbbf24' }]}>{currentDungeon.coin_reward}G</Text>
                  </View>
                </View>
              </View>

              <View style={styles.footer}>
                <View style={styles.detailsContainer}>
                  {/* Dynamic Requirements/Boss */}
                  <Text style={styles.detailText}>OBJ: {currentDungeon.requirement || 'UNKNOWN'}</Text>
                <Text style={styles.detailText}>BOSS: {currentDungeon.boss ? currentDungeon.boss.toUpperCase() : 'UNKNOWN'}</Text>
              </View>
              
              <View style={styles.buttonRow}>
                <TouchableOpacity 
                  style={styles.leaderboardButton}
                  onPress={handleShowLeaderboard}
                >
                  <Image source={GoldTrophyIcon} style={styles.leaderboardIcon} />
                </TouchableOpacity>
                {currentDungeon.tier === '5k' && (
                  <TouchableOpacity
                    style={styles.shareCardButton}
                    onPress={() => navigation.navigate('RunComplete', { demo: true })}
                  >
                    <Text style={styles.shareCardButtonText}>SHARE 5K CARD</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity 
                  style={styles.enterButton}
                  onPress={handleEnterDungeon}
                >
                  <Text style={styles.enterButtonText}>ENTER</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
          </ImageBackground>
        </TouchableOpacity>

        {/* RIGHT ARROW */}
        {displayDungeons.length > 1 && (
          <TouchableOpacity onPress={handleNext} style={[styles.arrowButton, styles.rightArrow]}>
            <ChevronRight color="#06b6d4" size={24} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  skullIcon: {
    width: 24,
    height: 24,
    marginRight: 8,
  },
  headerTitle: {
    fontSize: 10,
    fontWeight: '900',
    color: '#ef4444',
    letterSpacing: 4,
    flex: 1,
    fontFamily: 'Exo2-Regular',
  },
  pagination: {
    backgroundColor: 'rgba(6, 182, 212, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  paginationText: {
    color: '#06b6d4',
    fontSize: 10,
    fontWeight: 'bold',
    fontFamily: 'Exo2-Regular',
  },
  cardContainer: {
    position: 'relative',
    justifyContent: 'center',
  },
  dungeonCard: {
    height: 220,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(34, 211, 238, 0.3)',
  },
  arrowButton: {
    position: 'absolute',
    top: '50%',
    marginTop: -20, // Half of button height (approx)
    zIndex: 10,
    backgroundColor: 'rgba(2, 6, 23, 0.8)',
    borderRadius: 20,
    padding: 8,
    borderWidth: 1,
    borderColor: 'rgba(6, 182, 212, 0.3)',
  },
  leftArrow: {
    left: -12,
  },
  rightArrow: {
    right: -12,
  },
  backgroundImage: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    padding: 15,
    justifyContent: 'space-between',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rankBadge: {
    backgroundColor: '#06b6d4',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 2,
  },
  rankText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: 1,
    fontFamily: 'Exo2-Regular',
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timeText: {
    fontSize: 8,
    color: '#22d3ee',
    fontWeight: 'bold',
    letterSpacing: 1,
    fontFamily: 'Exo2-Regular',
  },
  contentMiddle: {
    marginTop: 10,
  },
  dungeonTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: 1,
    textShadowColor: 'rgba(34, 211, 238, 0.5)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
    fontFamily: 'Exo2-Regular',
  },
  rewardsRow: {
    flexDirection: 'row',
    gap: 15,
    marginTop: 5,
  },
  rewardItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  rewardIcon: {
    width: 14,
    height: 14,
  },
  rewardText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: 'rgba(255, 255, 255, 0.7)',
    fontFamily: 'Exo2-Regular',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  buttonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailsContainer: {
    flex: 1,
  },
  detailText: {
    fontSize: 9,
    fontWeight: 'bold',
    color: 'rgba(34, 211, 238, 0.6)',
    letterSpacing: 1,
    marginBottom: 2,
    fontFamily: 'Exo2-Regular',
  },
  shareCardButton: {
    backgroundColor: 'rgba(251, 191, 36, 0.2)',
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#fbbf24',
  },
  shareCardButtonText: {
    color: '#fbbf24',
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 1,
    fontFamily: 'Exo2-Regular',
  },
  enterButton: {
    backgroundColor: 'rgba(6, 182, 212, 0.2)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#06b6d4',
  },
  enterButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 2,
    fontFamily: 'Exo2-Regular',
  },
  leaderboardButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#fbbf24',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
    backgroundColor: 'rgba(15, 23, 42, 0.9)',
  },
  leaderboardIcon: {
    width: 24,
    height: 24,
  },
});

export default DungeonView;
