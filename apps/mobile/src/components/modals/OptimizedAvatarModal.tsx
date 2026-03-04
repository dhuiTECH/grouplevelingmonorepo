import React, { useEffect, useState, useRef } from 'react';
import { Modal, View, TouchableOpacity, Text, Dimensions, StyleSheet, ScrollView, NativeSyntheticEvent, NativeScrollEvent, ActivityIndicator } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { PlayerCallingCard } from '@/components/PlayerCallingCard';
import { LayeredAvatar } from '@/components/LayeredAvatar';
import { OptimizedPetAvatar } from '@/components/OptimizedPetAvatar';
import { User } from '@/types/user';
import { UserPet } from '@/types/pet';
import { supabase } from '@/lib/supabase';
import { useGameData } from '@/hooks/useGameData';

interface OptimizedAvatarModalProps {
  visible: boolean;
  onClose: () => void;
  user: User | null;
  currentUser?: User | null;
}

export const OptimizedAvatarModal: React.FC<OptimizedAvatarModalProps> = ({ 
  visible, 
  onClose, 
  user,
  currentUser 
}) => {
  const [pets, setPets] = useState<UserPet[]>([]);
  const [loadingPets, setLoadingPets] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [petAction, setPetAction] = useState<'idle' | 'enter'>('idle');
  const scrollViewRef = useRef<ScrollView>(null);
  const { shopItems } = useGameData();

  useEffect(() => {
    if (user?.id && visible) {
      fetchUserPets(user.id);
      setActiveIndex(0); // Reset to avatar on open
      setPetAction('idle');
    }
  }, [user?.id, visible]);

  // Trigger a one-shot "enter" animation whenever a pet page becomes active.
  useEffect(() => {
    if (!visible) return;
    if (activeIndex > 0 && pets.length >= activeIndex) {
      setPetAction('enter');
    } else {
      setPetAction('idle');
    }
  }, [activeIndex, pets.length, visible]);

  const fetchUserPets = async (userId: string) => {
    setLoadingPets(true);
    try {
      const { data, error } = await supabase
        .from('user_pets')
        .select(`
          *,
          pet_details:encounter_pool(*)
        `)
        .eq('user_id', userId);
      
      if (!error && data) {
        setPets(data as UserPet[]);
      }
    } catch (e) {
      console.error('Error fetching user pets:', e);
    } finally {
      setLoadingPets(false);
    }
  };

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const slideSize = event.nativeEvent.layoutMeasurement.width;
    const index = event.nativeEvent.contentOffset.x / slideSize;
    const roundIndex = Math.round(index);
    if (roundIndex !== activeIndex) {
      setActiveIndex(roundIndex);
    }
  };

  if (!user) return null;

  const windowWidth = Dimensions.get('window').width;
  // const windowHeight = Dimensions.get('window').height; // Unused
  const avatarSize = windowWidth < 640 ? Math.min(windowWidth - 32, 450) : 512;
  const containerWidth = avatarSize; 

  // Check if this is the user's own avatar
  const isOwnCard = currentUser?.id === user.id;

  // Pages: 1 (Avatar) + Pets
  const totalPages = 1 + pets.length;

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={true}
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <BlurView intensity={50} tint="dark" style={styles.backdrop}>
        <View style={[styles.modalContent, { width: avatarSize, height: avatarSize, borderWidth: 0 }]}>
          
          {/* Header with Calling Card and Close Button */}
          <View style={styles.header} pointerEvents="box-none">
            <View pointerEvents="auto" style={{ flex: 1, marginRight: 10 }}>
              <PlayerCallingCard 
                user={user} 
                size="sm"
                isOwnCard={isOwnCard}
              />
            </View>
            
            <TouchableOpacity 
              onPress={onClose} 
              style={styles.closeButton}
              activeOpacity={0.8}
            >
              <Text style={styles.closeButtonText}>CLOSE</Text>
            </TouchableOpacity>
          </View>

          {/* Swipeable Container */}
          <View style={styles.swiperContainer}>
            <ScrollView
              ref={scrollViewRef}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onScroll={handleScroll}
              scrollEventThrottle={16}
              style={{ flex: 1 }}
              snapToInterval={avatarSize}
              snapToAlignment="center"
              decelerationRate="fast"
              disableIntervalMomentum={true}
            >
              {/* PAGE 1: User Avatar */}
              <View style={[styles.page, { width: containerWidth }]}>
                <LayeredAvatar 
                  user={user} 
                  size={avatarSize}
                  square={true}
                  allShopItems={shopItems}
                />
              </View>

              {/* PAGE 2+: Pets */}
              {pets.map((pet, index) => {
                const pageIndex = index + 1; // 0 = avatar, 1+ = pets
                const isActivePetPage = activeIndex === pageIndex;
                return (
                  <View key={pet.id} style={[styles.page, { width: containerWidth }]}>
                    {/* Using OptimizedPetAvatar with large size */}
                    <View style={{ width: avatarSize, height: avatarSize, justifyContent: 'center', alignItems: 'center' }}>
                      <OptimizedPetAvatar
                        petDetails={pet.pet_details}
                        size={avatarSize}
                        square={true}
                        background={pet.metadata?.equipped_background || null}
                        action={isActivePetPage ? petAction : 'idle'}
                        onEnterComplete={() => setPetAction('idle')}
                      />
                    </View>
                    
                    {/* Gradient Scrim */}
                    <LinearGradient
                      colors={['transparent', 'rgba(0,0,0,0.8)']}
                      style={styles.textScrim}
                      pointerEvents="none"
                    />

                    <View style={styles.petNameContainer}>
                      <Text style={styles.petNameText}>
                        {pet.nickname || pet.pet_details?.name || 'Unknown Pet'}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </ScrollView>

            {/* Pagination Indicators */}
            {totalPages > 1 && (
              <View style={styles.pagination}>
                {Array.from({ length: totalPages }).map((_, i) => (
                  <View 
                    key={i} 
                    style={[
                      styles.dot, 
                      i === activeIndex ? styles.activeDot : styles.inactiveDot
                    ]} 
                  />
                ))}
              </View>
            )}
          </View>

        </View>
      </BlurView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.95)',
  },
  modalContent: {
    position: 'relative',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#020617',
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 12,
    zIndex: 50,
  },
  closeButton: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.2)',
  },
  closeButtonText: {
    color: '#ef4444',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 2,
  },
  swiperContainer: {
    flex: 1,
  },
  page: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  pagination: {
    position: 'absolute',
    bottom: 20,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    zIndex: 60,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  activeDot: {
    backgroundColor: '#fff',
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  inactiveDot: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  textScrim: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 120, // Enough to cover text and dots
    zIndex: 90,
  },
  petNameContainer: {
    position: 'absolute',
    bottom: 50, // Moved up to avoid overlap
    width: '100%',
    alignItems: 'center',
    zIndex: 100, // Ensure it's on top
    elevation: 5,
  },
  petNameText: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 14,
    fontWeight: '700',
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
});

export default OptimizedAvatarModal;
