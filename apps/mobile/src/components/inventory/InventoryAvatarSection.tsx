import React from 'react';
import { View, Text, TouchableOpacity, TextInput, Dimensions } from 'react-native';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import { MotiView } from 'moti';
import { Edit2 } from 'lucide-react-native';
import { playHunterSound } from '@/utils/audio';
import type { User, ShopItem } from '@/types/user';
import LayeredAvatar from '@/components/LayeredAvatar';
import { OptimizedPetAvatar } from '@/components/OptimizedPetAvatar';
import { inventoryAvatarStyles as styles } from '@/components/inventory/InventoryAvatar.styles';

const { width } = Dimensions.get('window');

interface PetSummary {
  id: string;
  nickname?: string | null;
  pet_details?: { name?: string | null } | null;
  metadata?: { equipped_background?: string | null } | null;
  level?: number;
}

interface InventoryAvatarSectionProps {
  user: User;
  shopItems: ShopItem[];
  viewMode: 'avatar' | 'pet';
  onViewModeChange: (mode: 'avatar' | 'pet') => void;
  petAction: 'idle' | 'enter';
  onPetActionSet: (a: 'idle' | 'enter') => void;
  activePet: PetSummary | null;
  isRenamingPet: boolean;
  petNewName: string;
  onPetNewNameChange: (name: string) => void;
  onStartRenamePet: () => void;
  onRenamePetSubmit: () => void;
  onOpenEquipmentModal: () => void;
  onOpenAvatarModal: () => void;
  onOpenBackgroundModal: () => void;
  onAvatarClick?: (u: User) => void;
}

export function InventoryAvatarSection({
  user,
  shopItems,
  viewMode,
  onViewModeChange,
  petAction,
  onPetActionSet,
  activePet,
  isRenamingPet,
  petNewName,
  onPetNewNameChange,
  onStartRenamePet,
  onRenamePetSubmit,
  onOpenEquipmentModal,
  onOpenAvatarModal,
  onOpenBackgroundModal,
  onAvatarClick,
}: InventoryAvatarSectionProps) {
  const avatarSize = width < 640 ? width * 0.7 : 224;

  return (
    <MotiView
      from={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      style={styles.avatarSection}
    >
      <View style={styles.avatarContainer}>
        <MotiView
          animate={{
            opacity: viewMode === 'avatar' ? 1 : 0,
            scale: viewMode === 'avatar' ? 1 : 0.9,
          }}
          transition={{ type: 'timing', duration: 300 }}
          style={[styles.absoluteView, { zIndex: viewMode === 'avatar' ? 1 : 0 }]}
          pointerEvents={viewMode === 'avatar' ? 'auto' : 'none'}
        >
          <LayeredAvatar
            user={user}
            size={avatarSize}
            square
            onAvatarClick={onAvatarClick}
            allShopItems={shopItems}
          />
        </MotiView>

        <MotiView
          animate={{
            opacity: viewMode === 'pet' ? 1 : 0,
            scale: viewMode === 'pet' ? 1 : 0.9,
          }}
          transition={{ type: 'timing', duration: 300 }}
          style={[styles.petAvatarContainer, styles.absoluteView, { zIndex: viewMode === 'pet' ? 1 : 0 }]}
          pointerEvents={viewMode === 'pet' ? 'auto' : 'none'}
        >
          {activePet ? (
            <OptimizedPetAvatar
              petDetails={activePet.pet_details as any}
              size={avatarSize}
              square
              hideBackground={false}
              background={activePet.metadata?.equipped_background}
              action={petAction}
              onEnterComplete={() => onPetActionSet('idle')}
            />
          ) : (
            <View style={styles.noPetPlaceholder}>
              <Text style={styles.noPetText}>NO_ACTIVE_PET</Text>
            </View>
          )}
        </MotiView>

        <View style={styles.avatarButtonsContainerLeft}>
          <TouchableOpacity onPress={onOpenEquipmentModal} style={styles.avatarButton}>
            <Image
              source={require('../../../assets/equipped.png')}
              style={styles.avatarButtonIcon}
              contentFit="contain"
            />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => {
              playHunterSound('swipe');
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              const newMode = viewMode === 'avatar' ? 'pet' : 'avatar';
              onViewModeChange(newMode);
              if (newMode === 'pet') {
                onPetActionSet('enter');
              }
            }}
            style={[styles.swapButton, viewMode === 'pet' ? styles.swapButtonActive : null]}
          >
            <Text style={styles.swapButtonIcon}>{viewMode === 'avatar' ? '🐾' : '👤'}</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.avatarButtonsContainerRight}>
          <TouchableOpacity onPress={onOpenAvatarModal} style={styles.avatarButton}>
            <Image
              source={require('../../../assets/changeavatar.png')}
              style={styles.avatarButtonIcon}
              contentFit="contain"
            />
          </TouchableOpacity>
          <TouchableOpacity onPress={onOpenBackgroundModal} style={styles.backgroundButton}>
            <Image
              source={require('../../../assets/backgroundicon.png')}
              style={styles.avatarButtonIcon}
              contentFit="contain"
            />
          </TouchableOpacity>
        </View>
      </View>

      {viewMode === 'pet' && (
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 2 }}>
              <Text style={styles.statValuePrefix}>LV.</Text>
              <Text style={styles.statValue}>{activePet?.level || 0}</Text>
            </View>
          </View>
          <View style={styles.statDivider} />
          <View style={[styles.statItem, { alignItems: 'center' }]}>
            <Text style={styles.statLabel}>NAME</Text>
            {isRenamingPet ? (
              <TextInput
                value={petNewName}
                onChangeText={onPetNewNameChange}
                autoFocus
                onSubmitEditing={onRenamePetSubmit}
                onBlur={onRenamePetSubmit}
                style={[styles.statValue, styles.renameInput, { minWidth: 100, textAlign: 'center' }]}
                maxLength={20}
                selectTextOnFocus
                returnKeyType="done"
              />
            ) : (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={[styles.statValue, { color: '#06b6d4' }]} numberOfLines={1}>
                  {activePet?.nickname || activePet?.pet_details?.name || 'NONE'}
                </Text>
                {activePet && (
                  <TouchableOpacity onPress={onStartRenamePet} hitSlop={10}>
                    <Edit2 size={14} color="rgba(34, 211, 238, 0.5)" />
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>
        </View>
      )}
    </MotiView>
  );
}
