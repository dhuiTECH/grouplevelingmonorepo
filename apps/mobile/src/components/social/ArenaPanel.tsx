import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Swords, Trophy, BarChart2, Gift } from 'lucide-react-native';

const ArenaPanel: React.FC = () => {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>HUNTER ARENA</Text>
      </View>

      <View style={styles.arenaContainer}>
        {/* Placeholder Content */}
        <View style={styles.placeholderGrid}>
          <View style={styles.placeholderItem}>
            <Swords size={32} color="rgba(34, 211, 238, 0.4)" />
            <Text style={styles.placeholderTitle}>PVP BATTLES</Text>
            <Text style={styles.placeholderDesc}>1V1 COMBAT</Text>
          </View>
          <View style={styles.placeholderItem}>
            <Trophy size={32} color="rgba(34, 211, 238, 0.4)" />
            <Text style={styles.placeholderTitle}>TOURNAMENTS</Text>
            <Text style={styles.placeholderDesc}>COMPETITIVE EVENTS</Text>
          </View>
          <View style={styles.placeholderItem}>
            <BarChart2 size={32} color="rgba(34, 211, 238, 0.4)" />
            <Text style={styles.placeholderTitle}>RANKINGS</Text>
            <Text style={styles.placeholderDesc}>CLIMB THE LADDER</Text>
          </View>
          <View style={styles.placeholderItem}>
            <Gift size={32} color="rgba(34, 211, 238, 0.4)" />
            <Text style={styles.placeholderTitle}>REWARDS</Text>
            <Text style={styles.placeholderDesc}>EXCLUSIVE LOOT</Text>
          </View>
        </View>

        {/* Coming Soon Overlay */}
        <View style={styles.overlay}>
          <View style={styles.overlayIcon}>
            <Text style={{ fontSize: 48 }}>🏟️</Text>
          </View>
          <Text style={styles.overlayTitle}>ARENA COMING SOON</Text>
          <Text style={styles.overlayDesc}>
            Epic battles and tournaments await! The arena will feature competitive PvP combat, ranked matches, and tournament events.
          </Text>
          <View style={styles.statusBadge}>
            <Text style={styles.statusText}>STAY TUNED FOR UPDATES</Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingBottom: 40,
  },
  header: {
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 10,
    fontWeight: '900',
    color: '#22d3ee',
    letterSpacing: 2,
  },
  arenaContainer: {
    position: 'relative',
    minHeight: 400,
  },
  placeholderGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  placeholderItem: {
    width: '48%',
    backgroundColor: 'rgba(15, 23, 42, 0.4)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 8,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderTitle: {
    fontSize: 10,
    fontWeight: '900',
    color: '#22d3ee',
    marginTop: 12,
  },
  placeholderDesc: {
    fontSize: 8,
    color: '#64748b',
    fontWeight: 'bold',
    marginTop: 4,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(34, 211, 238, 0.2)',
  },
  overlayIcon: {
    marginBottom: 20,
  },
  overlayTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#22d3ee',
    textAlign: 'center',
    letterSpacing: 1,
  },
  overlayDesc: {
    fontSize: 12,
    color: '#94a3b8',
    textAlign: 'center',
    lineHeight: 18,
    marginTop: 12,
    marginBottom: 24,
  },
  statusBadge: {
    borderWidth: 1,
    borderColor: 'rgba(34, 211, 238, 0.4)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 9,
    fontWeight: '900',
    color: 'rgba(34, 211, 238, 0.6)',
    letterSpacing: 2,
  },
});

export default ArenaPanel;
