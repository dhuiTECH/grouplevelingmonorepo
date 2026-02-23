import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
// import { usePets } from '@/hooks/usePets';
import { useNavigation } from '@react-navigation/native';
import { UserPet } from '@/types/pet';
import { RANK_COLORS } from '@/constants/gameConstants';
import { PetLayeredAvatar } from '@/components/PetLayeredAvatar';

export function PetList({ onSelect, pets, loading }: { onSelect?: (pet: UserPet) => void, pets: UserPet[], loading?: boolean }) {
  const navigation = useNavigation<any>();

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#06b6d4" />
        <Text style={styles.loadingText}>FETCHING_COMPANIONS...</Text>
      </View>
    );
  }

  if (pets.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>NO_PETS_FOUND</Text>
        <Text style={styles.emptySubText}>Explore dungeons to find companions.</Text>
      </View>
    );
  }

  return (
    <View style={styles.listContent}>
      <View style={styles.gridContainer}>
        {pets.map((item) => {
          const rarity = item.pet_details?.rarity?.toLowerCase() || 'common';
          const rarityColor = RANK_COLORS[rarity.charAt(0).toUpperCase()] || '#9ca3af';

          return (
            <TouchableOpacity
              key={item.id}
              style={[styles.petCard, { borderColor: rarityColor }]}
              onPress={() => {
                if (onSelect) {
                  onSelect(item);
                } else {
                  navigation.navigate('PetDetail', { pet: item });
                }
              }}
            >
              <View style={styles.imageContainer}>
                <PetLayeredAvatar petDetails={item.pet_details} size={80} square hideBackground />
              </View>
              <View style={styles.infoContainer}>
                <Text style={styles.petName}>{item.nickname || item.pet_details?.name}</Text>
                <Text style={styles.petLevel}>LVL {item.level}</Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  loadingText: {
    color: '#06b6d4',
    marginTop: 10,
    fontSize: 12,
    fontWeight: 'bold',
    letterSpacing: 2,
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    color: 'rgba(255, 255, 255, 0.4)',
    fontSize: 14,
    fontWeight: 'bold',
    letterSpacing: 2,
  },
  emptySubText: {
    color: 'rgba(255, 255, 255, 0.2)',
    fontSize: 10,
    marginTop: 4,
  },
  listContent: {
    padding: 10,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  petCard: {
    width: '48%',
    backgroundColor: 'rgba(15, 23, 42, 0.8)',
    borderRadius: 8,
    borderWidth: 1,
    padding: 12,
    alignItems: 'center',
    marginBottom: 10,
  },
  imageContainer: {
    width: 80,
    height: 80,
    marginBottom: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoContainer: {
    alignItems: 'center',
    width: '100%',
  },
  petName: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
    marginBottom: 4,
    textAlign: 'center',
  },
  petLevel: {
    color: '#06b6d4',
    fontSize: 10,
    fontWeight: 'bold',
  },
});
