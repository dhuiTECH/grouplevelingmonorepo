import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS } from './battleTheme';
import { Hexagon } from './Hexagon';

export interface BattleCardProps {
  title: string;
  cost: number;
  isSelected: boolean;
  canAfford: boolean;
  onPress: () => void;
}

export function BattleCard({ title, cost, isSelected, canAfford, onPress }: BattleCardProps) {
  return (
    <TouchableOpacity
      style={[
        styles.card,
        isSelected && { borderColor: COLORS.neonCyan, backgroundColor: 'rgba(34, 211, 238, 0.1)' },
        !canAfford && { opacity: 0.5 },
      ]}
      activeOpacity={0.8}
      onPress={onPress}
      disabled={!canAfford}
    >
      <View style={[styles.cardCorner, { top: 2, left: 2, borderTopWidth: 2, borderLeftWidth: 2, borderColor: isSelected ? COLORS.neonCyan : 'rgba(34, 211, 238, 0.3)' }]} />
      <View style={[styles.cardCorner, { top: 2, right: 2, borderTopWidth: 2, borderRightWidth: 2, borderColor: isSelected ? COLORS.neonCyan : 'rgba(34, 211, 238, 0.3)' }]} />
      <View style={[styles.cardCorner, { bottom: 2, left: 2, borderBottomWidth: 2, borderLeftWidth: 2, borderColor: isSelected ? COLORS.neonCyan : 'rgba(34, 211, 238, 0.3)' }]} />
      <View style={[styles.cardCorner, { bottom: 2, right: 2, borderBottomWidth: 2, borderRightWidth: 2, borderColor: isSelected ? COLORS.neonCyan : 'rgba(34, 211, 238, 0.3)' }]} />
      <LinearGradient
        colors={isSelected ? ['rgba(34, 211, 238, 0.25)', 'rgba(34, 211, 238, 0.05)'] : ['rgba(255, 255, 255, 0.08)', 'rgba(255, 255, 255, 0.02)']}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <View
        style={[
          styles.cardTopHighlight,
          {
            backgroundColor: isSelected ? 'rgba(34, 211, 238, 0.05)' : 'rgba(255, 255, 255, 0.03)',
            borderTopColor: isSelected ? 'rgba(34, 211, 238, 0.6)' : 'rgba(255, 255, 255, 0.3)',
          },
        ]}
      />
      {isSelected && (
        <View style={styles.confirmBadge}>
          <Text style={styles.confirmText}>CONFIRM</Text>
        </View>
      )}
      <Text style={[styles.cardTitle, isSelected && { color: COLORS.neonCyan }]} numberOfLines={2}>
        {title}
      </Text>
      <View style={styles.cardCostRow}>
        {[...Array(cost)].map((_, i) => (
          <View key={i} style={{ marginHorizontal: 1 }}>
            <View style={styles.skillCostHex}>
              <Hexagon size={8} color={COLORS.neonCyan} fill fillOpacity={isSelected || canAfford ? 0.9 : 0.3} />
            </View>
          </View>
        ))}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    height: '100%',
    backgroundColor: 'rgba(15, 23, 42, 0.8)',
    borderWidth: 1,
    borderColor: 'rgba(34, 211, 238, 0.4)',
    borderRadius: 8,
    padding: 6,
    justifyContent: 'space-between',
    overflow: 'hidden',
  },
  cardCorner: {
    position: 'absolute',
    width: 6,
    height: 6,
  },
  cardTopHighlight: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '40%',
    borderTopWidth: 1,
  },
  confirmBadge: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 10,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  confirmText: {
    color: '#facc15',
    fontSize: 7,
    fontWeight: '900',
    textTransform: 'uppercase',
    paddingHorizontal: 6,
    borderRadius: 2,
  },
  cardTitle: {
    color: 'white',
    fontSize: 9,
    fontWeight: 'bold',
    textAlign: 'center',
    marginTop: 12,
  },
  cardCostRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 4,
  },
  skillCostHex: {
    transform: [{ rotate: '90deg' }],
  },
});
