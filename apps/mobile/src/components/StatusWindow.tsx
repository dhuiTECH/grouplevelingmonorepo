import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { theme } from '@/constants/theme';

interface StatusWindowProps {
  currentHp: number;
  maxHp: number;
  currentMp: number;
  maxMp: number;
  level: number;
  exp: number;
  maxExp?: number;
}

export const StatusWindow: React.FC<StatusWindowProps> = ({
  currentHp,
  maxHp,
  currentMp,
  maxMp,
  level,
  exp,
  maxExp = 100
}) => {
  const hpPercentage = Math.min(Math.max(currentHp / maxHp, 0), 1) * 100;
  const mpPercentage = Math.min(Math.max(currentMp / maxMp, 0), 1) * 100;
  const expPercentage = Math.min(Math.max(exp / maxExp, 0), 1) * 100;

  return (
    <View style={styles.container}>
      <View style={styles.levelRow}>
        <Text style={styles.levelText}>LVL {level}</Text>
        <View style={styles.expBarContainer}>
            <View style={[styles.bar, styles.expBar, { width: `${expPercentage}%` }]} />
        </View>
      </View>
      
      <View style={styles.statRow}>
        <Text style={styles.statLabel}>HP</Text>
        <View style={styles.barBackground}>
          <View style={[styles.bar, styles.hpBar, { width: `${hpPercentage}%` }]} />
          <Text style={styles.barText}>{currentHp}/{maxHp}</Text>
        </View>
      </View>

      <View style={styles.statRow}>
        <Text style={styles.statLabel}>MP</Text>
        <View style={styles.barBackground}>
          <View style={[styles.bar, styles.mpBar, { width: `${mpPercentage}%` }]} />
          <Text style={styles.barText}>{currentMp}/{maxMp}</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.cyan,
    width: '100%',
  },
  levelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  levelText: {
    color: theme.colors.text,
    fontWeight: 'bold',
    marginRight: 8,
    fontSize: 14,
    width: 50,
  },
  expBarContainer: {
    flex: 1,
    height: 4,
    backgroundColor: theme.darkGray,
    borderRadius: 2,
    overflow: 'hidden',
  },
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  statLabel: {
    color: theme.colors.textSecondary,
    width: 30,
    fontSize: 12,
    fontWeight: 'bold',
  },
  barBackground: {
    flex: 1,
    height: 12,
    backgroundColor: theme.darkGray,
    borderRadius: 6,
    overflow: 'hidden',
    position: 'relative',
    justifyContent: 'center',
  },
  bar: {
    height: '100%',
    position: 'absolute',
    left: 0,
    top: 0,
  },
  hpBar: {
    backgroundColor: theme.colors.red,
  },
  mpBar: {
    backgroundColor: theme.colors.cyan,
  },
  expBar: {
    backgroundColor: '#ffd700', // Gold
  },
  barText: {
    color: '#fff',
    fontSize: 8,
    fontWeight: 'bold',
    textAlign: 'center',
    width: '100%',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 1,
    zIndex: 1,
  },
});
