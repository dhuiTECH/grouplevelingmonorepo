import React from 'react';
import { View, Text, TouchableOpacity, Modal } from 'react-native';
import { XIcon } from '@/components/icons/XIcon';
import { ShopItemMedia } from '@/components/ShopItemMedia';
import type { ShopItem, UserCosmetic } from '@/types/user';
import { getInventoryItemFullDescription } from '@/screens/inventory/inventoryCosmeticUtils';
import { inventoryModalsStyles as styles } from '@/components/inventory/InventoryModals.styles';

interface InventoryItemDetailsModalProps {
  selection: { item: ShopItem; cosmeticItem: UserCosmetic } | null;
  onClose: () => void;
  /** When true, render overlay content without wrapping in Modal (nested inside another modal). */
  isNested?: boolean;
}

export function InventoryItemDetailsModal({
  selection,
  onClose,
  isNested = false,
}: InventoryItemDetailsModalProps) {
  if (!selection) return null;
  const { item, cosmeticItem } = selection;

  const content = (
    <View
      style={
        isNested
          ? [
              styles.modalOverlay,
              {
                backgroundColor: 'rgba(2, 4, 10, 0.88)',
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                zIndex: 1000,
              },
            ]
          : styles.modalOverlay
      }
    >
      <View style={styles.itemDetailModalContent}>
        <TouchableOpacity
          onPress={onClose}
          style={styles.closeModalButton}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          accessibilityRole="button"
          accessibilityLabel="Close"
        >
          <XIcon size={15} color="rgba(0, 210, 255, 0.85)" />
        </TouchableOpacity>
        <View style={styles.itemDetailImageWrapper}>
          <ShopItemMedia item={item} style={styles.itemDetailImage} />
        </View>
        <Text style={styles.itemDetailName}>{item.name}</Text>
        <Text style={styles.itemDetailSlot}>{item.slot?.replace(/_/g, ' ')}</Text>

        {(item.min_level && item.min_level > 1) ||
        (item.class_req && item.class_req !== 'All') ||
        (item.gender &&
          ((Array.isArray(item.gender) && !item.gender.includes('unisex')) ||
            (!Array.isArray(item.gender) && item.gender !== 'unisex'))) ? (
          <View style={styles.itemRequirementsContainer}>
            {item.min_level && item.min_level > 1 && (
              <View style={styles.requirementBadgeYellow}>
                <Text style={styles.requirementBadgeText}>⚡ Lv. {item.min_level} Required</Text>
              </View>
            )}
            {item.class_req && item.class_req !== 'All' && (
              <View style={styles.requirementBadgeBlue}>
                <Text style={styles.requirementBadgeText}>🛡️ {item.class_req} Only</Text>
              </View>
            )}
            {item.gender &&
              ((Array.isArray(item.gender) && !item.gender.includes('unisex')) ||
                (!Array.isArray(item.gender) && item.gender !== 'unisex')) && (
                <View style={styles.requirementBadgePink}>
                  <Text style={styles.requirementBadgeText}>
                    👤 {Array.isArray(item.gender) ? item.gender.join('/') : item.gender} Only
                  </Text>
                </View>
              )}
          </View>
        ) : null}

        <Text style={styles.itemDetailDescription}>{item.description || 'Visual item'}</Text>

        {((item.bonuses && Array.isArray(item.bonuses) && item.bonuses.length > 0) || item.bonus_type) && (
          <Text style={styles.itemDetailBonuses}>{getInventoryItemFullDescription(item)}</Text>
        )}

        {item.is_animated && <Text style={styles.itemDetailAnimated}>✨ ANIMATED EFFECT</Text>}

        <Text style={styles.itemDetailRarity}>{item.rarity || 'common'} rarity</Text>

        <Text style={styles.itemDetailEquippedStatus}>
          {cosmeticItem.equipped ? (
            <Text style={{ color: '#00ffa3', fontFamily: 'Exo2-Bold', letterSpacing: 2 }}>✅ EQUIPPED</Text>
          ) : (
            <Text style={{ color: 'rgba(0, 210, 255, 0.45)', fontFamily: 'Exo2-Regular', letterSpacing: 1 }}>
              ○ NOT EQUIPPED
            </Text>
          )}
        </Text>

        <TouchableOpacity onPress={onClose} style={styles.closeButtonPrimary}>
          <Text style={styles.closeButtonPrimaryText}>Close</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  if (isNested) return content;

  return (
    <Modal animationType="fade" transparent visible={!!selection} onRequestClose={onClose}>
      {content}
    </Modal>
  );
}
