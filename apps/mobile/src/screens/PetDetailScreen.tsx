import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Dimensions,
  Platform
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { 
  useAnimatedStyle, 
  useSharedValue, 
  withSpring, 
  withDelay,
  FadeInDown,
  FadeInRight
} from 'react-native-reanimated';
import { XIcon } from '@/components/icons/XIcon';
import { RANK_COLORS } from '@/constants/gameConstants';
import { usePets } from '@/hooks/usePets';
import { UserPet } from '@/types/pet';
import * as Haptics from 'expo-haptics';
import { OptimizedPetAvatar } from '@/components/OptimizedPetAvatar';

const { width } = Dimensions.get('window');

export function PetDetailScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { levelUpPet } = usePets();
  const pet = route.params?.pet as UserPet;

  const imageScale = useSharedValue(0.5);
  const imageOpacity = useSharedValue(0);

  useEffect(() => {
    imageScale.value = withSpring(1);
    imageOpacity.value = withDelay(200, withSpring(1));
  }, []);

  const animatedImageStyle = useAnimatedStyle(() => ({
    transform: [{ scale: imageScale.value }],
    opacity: imageOpacity.value,
  }));

  if (!pet) return null;

  const rarity = pet.pet_details?.rarity?.toLowerCase() || 'common';
  const rarityColor = RANK_COLORS[rarity.charAt(0).toUpperCase()] || '#9ca3af';

  const expToLevel = pet.level * 100;
  const progress = Math.min(pet.experience / expToLevel, 1);

  const handleLevelUp = async () => {
    if (pet.experience >= expToLevel) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await levelUpPet(pet.id, pet.level + 1, pet.experience - expToLevel);
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#020617', '#0f172a', '#020617']}
        style={StyleSheet.absoluteFill}
      />
      
      <SafeAreaView style={{ flex: 1, paddingTop: Platform.OS === 'android' ? insets.top : 0 }}>
        <View style={styles.header}>
          <TouchableOpacity 
            onPress={() => navigation.goBack()}
            style={styles.closeButton}
          >
            <XIcon size={24} color="#9ca3af" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>PET_PROFILE</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent}>
          <Animated.View style={[styles.imageSection, animatedImageStyle]}>
            <View style={[styles.glowBackground, { backgroundColor: rarityColor, opacity: 0.1 }]} />
            <OptimizedPetAvatar petDetails={pet.pet_details} size={200} square hideBackground={true} forceLegacy={true} />
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(300)} style={styles.infoSection}>
            <Text style={styles.petName}>{pet.nickname || pet.pet_details?.name}</Text>
            <Text style={[styles.petRarity, { color: rarityColor }]}>
              {rarity.toUpperCase()} CLASS COMPANION
            </Text>

            <View style={styles.levelContainer}>
              <View style={styles.levelHeader}>
                <Text style={styles.levelLabel}>LEVEL {pet.level}</Text>
                <Text style={styles.expLabel}>{pet.experience} / {expToLevel} EXP</Text>
              </View>
              <View style={styles.progressBarBg}>
                <View style={[styles.progressBarFill, { width: `${progress * 100}%` }]} />
              </View>
            </View>

            <TouchableOpacity 
              style={[
                styles.levelUpButton, 
                pet.experience < expToLevel && styles.levelUpButtonDisabled
              ]}
              onPress={handleLevelUp}
              disabled={pet.experience < expToLevel}
            >
              <Text style={styles.levelUpText}>
                {pet.experience >= expToLevel ? 'LEVEL UP AVAILABLE' : 'INSUFFICIENT EXPERIENCE'}
              </Text>
            </TouchableOpacity>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(500)} style={styles.statsSection}>
            <Text style={styles.sectionTitle}>BASE_ATTRIBUTES</Text>
            <View style={styles.statsGrid}>
              {Object.entries(pet.pet_details?.base_stats || {}).map(([key, value]: [string, any]) => (
                <View key={key} style={styles.statItem}>
                  <Text style={styles.statKey}>{key.toUpperCase()}</Text>
                  <Text style={styles.statValue}>{value}</Text>
                </View>
              ))}
            </View>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(700)} style={styles.skillsSection}>
            <Text style={styles.sectionTitle}>CURRENT_SKILLS</Text>
            {pet.current_skills && pet.current_skills.length > 0 ? (
              pet.current_skills.map((skill, index) => (
                <View key={index} style={styles.skillItem}>
                  <Text style={styles.skillText}>{skill}</Text>
                </View>
              ))
            ) : (
              <Text style={styles.noSkillsText}>No skills learned yet.</Text>
            )}
          </Animated.View>
        </ScrollView>
      </SafeAreaView>
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
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  headerTitle: {
    color: '#06b6d4',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 2,
  },
  closeButton: {
    padding: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 8,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  imageSection: {
    height: 250,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 20,
  },
  glowBackground: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    blurRadius: 50,
  },
  petImage: {
    width: 200,
    height: 200,
  },
  infoSection: {
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  petName: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '900',
    marginBottom: 4,
  },
  petRarity: {
    fontSize: 12,
    fontWeight: 'bold',
    letterSpacing: 1,
    marginBottom: 20,
  },
  levelContainer: {
    width: '100%',
    marginBottom: 20,
  },
  levelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  levelLabel: {
    color: '#06b6d4',
    fontSize: 14,
    fontWeight: '900',
  },
  expLabel: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 12,
    fontWeight: 'bold',
  },
  progressBarBg: {
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#06b6d4',
  },
  levelUpButton: {
    width: '100%',
    backgroundColor: 'rgba(6, 182, 212, 0.2)',
    borderWidth: 1,
    borderColor: '#06b6d4',
    paddingVertical: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  levelUpButtonDisabled: {
    borderColor: 'rgba(255, 255, 255, 0.1)',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  levelUpText: {
    color: '#fff',
    fontWeight: '900',
    fontSize: 12,
    letterSpacing: 1,
  },
  statsSection: {
    marginTop: 40,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    color: 'rgba(6, 182, 212, 0.6)',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 2,
    marginBottom: 15,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  statItem: {
    width: (width - 60) / 3,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  statKey: {
    color: 'rgba(255, 255, 255, 0.4)',
    fontSize: 8,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statValue: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '900',
  },
  skillsSection: {
    marginTop: 40,
    paddingHorizontal: 20,
  },
  skillItem: {
    backgroundColor: 'rgba(6, 182, 212, 0.05)',
    borderLeftWidth: 3,
    borderLeftColor: '#06b6d4',
    padding: 15,
    marginBottom: 10,
    borderRadius: 4,
  },
  skillText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  noSkillsText: {
    color: 'rgba(255, 255, 255, 0.4)',
    fontSize: 12,
    fontStyle: 'italic',
  },
});
