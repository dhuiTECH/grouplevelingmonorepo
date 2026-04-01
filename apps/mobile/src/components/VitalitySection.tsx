import React, { memo } from 'react';
import { View, Text, StyleSheet, Image, Dimensions, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { calculateDerivedStats } from '@/utils/stats';
import LayeredAvatar from './LayeredAvatar';
import { useGameData } from '@/hooks/useGameData';

const { width } = Dimensions.get('window');

interface VitalitySectionProps {
  user: any;
  level: number;
  setSelectedAvatar: (u: any) => void;
}

const VitalitySection = memo(({ user, level, setSelectedAvatar }: VitalitySectionProps) => {
  const stats = calculateDerivedStats(user);
  const maxHP = user.max_hp || stats.maxHP;
  const maxMP = user.max_mp || stats.maxMP;
  const hpPercent = ((user.current_hp || 0) / maxHP) * 100;
  const mpPercent = ((user.current_mp || 0) / maxMP) * 100;
  
  // XP Calculation
  const currentLevelStart = Math.pow(level - 1, 2) * 100;
  const nextLevelStart = Math.pow(level, 2) * 100;
  const expPercent = ((user.exp - currentLevelStart) / (nextLevelStart - currentLevelStart)) * 100;

  const { shopItems } = useGameData();

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['rgba(15, 23, 42, 0.9)', 'rgba(30, 41, 59, 0.6)']}
        style={styles.card}
      >
        <View style={styles.content}>
          {/* Bars Container */}
          <View style={styles.barsContainer}>
            
            {/* HP Bar */}
            <View style={styles.barWrapper}>
              <View style={styles.barHeader}>
                <View style={styles.labelContainer}>
                  <View style={[styles.indicator, { backgroundColor: '#ef4444', shadowColor: '#ef4444' }]} />
                  <Text style={styles.barLabelText}>HP</Text>
                </View>
                <Text style={styles.barValueText}>{Math.floor(user.current_hp || 0)} / {maxHP}</Text>
              </View>
              <View style={styles.barBackground}>
                <LinearGradient
                  colors={['#b91c1c', '#ef4444']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={[styles.barFill, { width: `${hpPercent}%` }]}
                >
                  <View style={styles.barGlowRed} />
                </LinearGradient>
              </View>
            </View>

            {/* MP Bar */}
            <View style={styles.barWrapper}>
              <View style={styles.barHeader}>
                <View style={styles.labelContainer}>
                  <View style={[styles.indicator, { backgroundColor: '#3b82f6', shadowColor: '#3b82f6' }]} />
                  <Text style={styles.barLabelText}>MP</Text>
                </View>
                <Text style={styles.barValueText}>{Math.floor(user.current_mp || 0)} / {maxMP}</Text>
              </View>
              <View style={styles.barBackground}>
                <LinearGradient
                  colors={['#1d4ed8', '#3b82f6']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={[styles.barFill, { width: `${mpPercent}%` }]}
                >
                  <View style={styles.barGlowBlue} />
                </LinearGradient>
              </View>
            </View>

            {/* EXP Bar */}
            <View style={styles.barWrapper}>
              <View style={styles.barHeader}>
                <View style={styles.labelContainer}>
                  <Image source={require('../../assets/expcrystal.png')} style={styles.xpIcon} />
                  <Text style={[styles.barLabelText, { color: '#22d3ee' }]}>EXP</Text>
                </View>
                <View style={styles.xpInfo}>
                  <Text style={styles.levelText}>Lv. {level}</Text>
                  <Text style={styles.expText}>{user.exp} / {nextLevelStart}</Text>
                </View>
              </View>
              <View style={[styles.barBackground, { height: 4 }]}>
                <LinearGradient
                  colors={['#0e7490', '#22d3ee']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={[styles.barFill, { width: `${expPercent}%` }]}
                >
                  <View style={styles.barGlowCyan} />
                </LinearGradient>
              </View>
            </View>
          </View>

          {/* Avatar Container */}
          <View style={styles.avatarContainer}>
            <View style={styles.avatarFrame}>
              <LayeredAvatar 
                user={user} 
                size={90} 
                onAvatarClick={() => setSelectedAvatar(user)}
                square={true}
                allShopItems={shopItems}
              />
            </View>
          </View>
        </View>
      </LinearGradient>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  card: {
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(6, 182, 212, 0.1)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
  },
  barsContainer: {
    flex: 1,
    gap: 16,
  },
  barWrapper: {
    gap: 6,
  },
  barHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  labelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  indicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 6,
    elevation: 5,
  },
  barLabelText: {
    fontSize: 12,
    fontWeight: '900',
    color: '#e2e8f0',
    letterSpacing: 1,
    fontFamily: 'Exo2-Regular',
  },
  barValueText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#94a3b8',
    fontFamily: 'Exo2-Regular',
  },
  barBackground: {
    height: 10, // Slightly taller
    backgroundColor: '#0f172a',
    borderRadius: 5,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  barFill: {
    height: '100%',
    position: 'relative',
    borderRadius: 5,
  },
  barGlowRed: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: 10,
    backgroundColor: 'rgba(239, 68, 68, 0.6)',
    shadowColor: '#ef4444',
    shadowOpacity: 1,
    shadowRadius: 10,
  },
  barGlowBlue: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: 10,
    backgroundColor: 'rgba(59, 130, 246, 0.6)',
    shadowColor: '#3b82f6',
    shadowOpacity: 1,
    shadowRadius: 10,
  },
  barGlowCyan: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: 10,
    backgroundColor: 'rgba(34, 211, 238, 0.6)',
    shadowColor: '#22d3ee',
    shadowOpacity: 1,
    shadowRadius: 10,
  },
  xpIcon: {
    width: 16,
    height: 16,
    tintColor: '#22d3ee',
  },
  xpInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  levelText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#3b82f6',
    fontFamily: 'Exo2-Regular',
  },
  expText: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#64748b',
    fontStyle: 'italic',
    fontFamily: 'Exo2-Regular',
  },
  avatarContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarFrame: {
    width: 90,
    height: 90,
    borderWidth: 1,
    borderColor: 'rgba(6, 182, 212, 0.25)',
    // Must match LayeredAvatar square mode (borderRadius 16 at size 90)
    borderRadius: 16,
    backgroundColor: 'rgba(15, 23, 42, 0.98)',
    shadowColor: '#06b6d4',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
    elevation: 10,
    overflow: 'hidden',
  },
});

export default VitalitySection;