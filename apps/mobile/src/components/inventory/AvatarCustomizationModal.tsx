import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, Modal } from 'react-native';
import { Image } from 'expo-image';
import { XIcon } from '@/components/icons/XIcon';
import type { User, UserCosmetic } from '@/types/user';
import { RANK_COLORS } from '@/constants/gameConstants';
import { SystemWindowHeader } from '@/components/ui/SystemWindowHeader';
import { inventoryModalsStyles as styles } from '@/components/inventory/InventoryModals.styles';
import { useInventoryEquipPeek } from '@/hooks/useInventoryEquipPeek';

interface AvatarCustomizationModalProps {
  visible: boolean;
  onClose: () => void;
  user: User;
  onEquipCosmetic: (cosmeticId: string, equipped: boolean) => void;
  onSelectItem: (selection: { item: NonNullable<UserCosmetic['shop_items']>; cosmeticItem: UserCosmetic }) => void;
  renderItemDetailsNested: () => React.ReactNode;
}

export function AvatarCustomizationModal({
  visible,
  onClose,
  user,
  onEquipCosmetic,
  onSelectItem,
  renderItemDetailsNested,
}: AvatarCustomizationModalProps) {
  const { rootOpacity, triggerPeek } = useInventoryEquipPeek();
  const avatarCosmetics =
    user.cosmetics?.filter((cosmetic: UserCosmetic) => cosmetic.shop_items?.slot === 'avatar') || [];

  return (
    <Modal animationType="fade" transparent visible={visible} onRequestClose={onClose}>
      <View style={[styles.modalOverlay, { opacity: rootOpacity }]}>
        <View style={styles.customizationModalContent}>
          <TouchableOpacity
            onPress={onClose}
            style={styles.closeModalButtonAbsolute}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            accessibilityRole="button"
            accessibilityLabel="Close"
          >
            <XIcon size={15} color="rgba(0, 210, 255, 0.85)" />
          </TouchableOpacity>
          <SystemWindowHeader
            title="AVATAR"
            compact
            containerStyle={{ marginBottom: 8, paddingBottom: 4, width: '100%' }}
          />
          <Text style={styles.customizationModalSubHeader}>Choose your hunter&apos;s appearance</Text>

          {avatarCosmetics.length === 0 ? (
            <View style={styles.emptyCustomizationPanel}>
              <Text style={styles.emptyCustomizationEmoji}>🎭</Text>
              <Text style={styles.emptyCustomizationText}>No holographic avatars in inventory</Text>
              <Text style={styles.emptyCustomizationSubText}>Acquire new forms from the Hunter Shop</Text>
            </View>
          ) : (
            <ScrollView contentContainerStyle={styles.customizationGridContainer} showsVerticalScrollIndicator={false}>
              <View style={styles.customizationGrid}>
                {avatarCosmetics.map((cosmetic: UserCosmetic) => {
                  const item = cosmetic.shop_items!;
                  const isEquipped = cosmetic.equipped;
                  const rarityColor =
                    RANK_COLORS[(item.rarity || 'c').charAt(0).toUpperCase()] || '#9ca3af';

                  return (
                    <TouchableOpacity
                      key={cosmetic.id}
                      style={[
                        styles.customizationItemCard,
                        isEquipped ? styles.customizationItemCardEquipped : null,
                      ]}
                      onPress={() => onSelectItem({ item, cosmeticItem: cosmetic })}
                    >
                      <View style={styles.customizationItemImageWrapper}>
                        <View
                          style={[
                            styles.customizationItemPulse,
                            { backgroundColor: isEquipped ? rarityColor : 'transparent' },
                          ]}
                        />
                        <Image
                          source={{ uri: item.image_url }}
                          style={[styles.customizationItemImage, { borderColor: rarityColor }]}
                          contentFit="cover"
                          cachePolicy="memory-disk"
                        />
                      </View>
                      <Text style={styles.customizationItemName}>{item.name}</Text>
                      <Text style={styles.customizationItemRarity}>{item.rarity || 'common'} class</Text>
                      <TouchableOpacity
                        onPress={(e) => {
                          e.stopPropagation();
                          onEquipCosmetic(cosmetic.id, !cosmetic.equipped);
                          triggerPeek();
                        }}
                        style={[
                          styles.customizationEquipButton,
                          isEquipped ? styles.customizationUnequipButton : styles.customizationEquipButtonActive,
                        ]}
                      >
                        <Text style={styles.customizationEquipButtonText}>
                          {isEquipped ? 'UNEQUIP' : 'CHANGE AVATAR'}
                        </Text>
                      </TouchableOpacity>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>
          )}
          {renderItemDetailsNested()}
        </View>
      </View>
    </Modal>
  );
}
