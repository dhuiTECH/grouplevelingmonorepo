import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, Modal } from 'react-native';
import { XIcon } from '@/components/icons/XIcon';
import { LockIcon } from '@/components/icons/LockIcon';
import { ShopItemMedia } from '@/components/ShopItemMedia';
import type { ShopItem, UserCosmetic } from '@/types/user';
import { RANK_COLORS } from '@/constants/gameConstants';
import { SystemWindowHeader } from '@/components/ui/SystemWindowHeader';
import { inventoryModalsStyles as styles } from '@/components/inventory/InventoryModals.styles';
import { useInventoryEquipPeek } from '@/hooks/useInventoryEquipPeek';

interface EquipmentGearModalProps {
  visible: boolean;
  onClose: () => void;
  equippedItems: UserCosmetic[] | undefined;
  equipmentModalSlotKey: string | null;
  setEquipmentModalSlotKey: React.Dispatch<React.SetStateAction<string | null>>;
  equipmentPickerTitle: string;
  equipmentPickerItems: UserCosmetic[];
  shopItems: ShopItem[];
  onSelectInventoryItem: (selection: { item: ShopItem; cosmeticItem: UserCosmetic }) => void;
  onEquipCosmetic: (cosmeticId: string, equipped: boolean) => void;
  renderItemDetailsNested: () => React.ReactNode;
}

export function EquipmentGearModal({
  visible,
  onClose,
  equippedItems,
  equipmentModalSlotKey,
  setEquipmentModalSlotKey,
  equipmentPickerTitle,
  equipmentPickerItems,
  shopItems,
  onSelectInventoryItem,
  onEquipCosmetic,
  renderItemDetailsNested,
}: EquipmentGearModalProps) {
  const { rootOpacity, triggerPeek } = useInventoryEquipPeek();

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
            title="GEAR"
            compact
            containerStyle={{ marginBottom: 8, paddingBottom: 4, width: '100%' }}
          />
          <Text style={styles.customizationModalSubHeader}>
            Tap a slot to equip from inventory, or manage items below
          </Text>

          <ScrollView
            contentContainerStyle={styles.customizationGridContainer}
            showsVerticalScrollIndicator={false}
            style={{ width: '100%' }}
          >
            <View style={[styles.section, { marginHorizontal: 0 }]}>
              <Text style={[styles.sectionHeader, { color: RANK_COLORS['C'] }]}>⚔️ EQUIPPED ITEMS</Text>
              <View style={styles.equippedGrid}>
                {['weapon', 'body', 'back', 'hands', 'feet'].map((slot) => {
                  const equippedItem = (equippedItems || []).find(
                    (cosmetic: UserCosmetic) => cosmetic.shop_items?.slot === slot
                  );
                  const rarity = equippedItem?.shop_items?.rarity?.toLowerCase() || 'common';
                  const rarityColor = RANK_COLORS[rarity.charAt(0).toUpperCase()] || '#9ca3af';
                  const isSlotPicker = equipmentModalSlotKey === slot;

                  return (
                    <TouchableOpacity
                      key={slot}
                      style={[
                        styles.equippedSlot,
                        equippedItem
                          ? !isSlotPicker
                            ? {
                                borderColor: rarityColor,
                                backgroundColor: 'rgba(15, 23, 42, 0.8)',
                                shadowColor: rarityColor,
                                shadowOpacity: 0.15,
                                shadowRadius: 10,
                              }
                            : { backgroundColor: 'rgba(15, 23, 42, 0.8)' }
                          : styles.emptySlot,
                        isSlotPicker ? styles.equipmentSlotSelected : null,
                      ]}
                      onPress={() =>
                        setEquipmentModalSlotKey((prev) => (prev === slot ? null : slot))
                      }
                      onLongPress={() => {
                        if (equippedItem) {
                          onSelectInventoryItem({
                            item: equippedItem.shop_items,
                            cosmeticItem: equippedItem,
                          });
                        }
                      }}
                    >
                      {equippedItem ? (
                        <View style={styles.equippedItemContent}>
                          <View
                            style={[
                              styles.radiatingEnergy,
                              {
                                backgroundColor:
                                  rarity === 'uncommon'
                                    ? 'rgba(34, 197, 94, 0.15)'
                                    : rarity === 'rare'
                                      ? 'rgba(59, 130, 246, 0.25)'
                                      : rarity === 'epic'
                                        ? 'rgba(168, 85, 247, 0.35)'
                                        : rarity === 'legendary'
                                          ? 'rgba(255, 255, 0, 0.35)'
                                          : rarity === 'monarch'
                                            ? 'rgba(255, 215, 0, 0.6)'
                                            : 'transparent',
                              },
                            ]}
                          />
                          <View style={styles.equippedItemMediaContainer}>
                            <ShopItemMedia item={equippedItem.shop_items} style={styles.equippedItemMedia} />
                          </View>
                        </View>
                      ) : (
                        <LockIcon size={16} color="#6b7280" />
                      )}
                      <Text style={styles.slotLabel}>
                        {slot === 'weapon'
                          ? 'weapon'
                          : slot === 'body'
                            ? 'armor'
                            : slot === 'feet'
                              ? 'feet'
                              : slot === 'hands'
                                ? 'hands'
                                : slot === 'back'
                                  ? 'back'
                                  : slot}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            <View style={[styles.section, { marginHorizontal: 0 }]}>
              <Text style={[styles.sectionHeader, { color: RANK_COLORS['B'] }]}>💍 EQUIPPED ACCESSORIES</Text>
              <View style={styles.equippedAccessoryRow}>
                {['magic effects', 'eyes', 'head', 'face', 'shoulder', 'accessory'].map((slot) => {
                  if (slot === 'accessory') {
                    const allAccessories = (equippedItems || []).filter((cosmetic: UserCosmetic) => {
                      const itemSlot = cosmetic.shop_items?.slot;
                      return ['accessory', 'jewelry', 'charms', 'scarves', 'earrings'].includes(
                        itemSlot || ''
                      );
                    });

                    const isMultiPicker = equipmentModalSlotKey === 'multi-accessory';

                    return (
                      <TouchableOpacity
                        key="multi-accessory"
                        activeOpacity={0.9}
                        style={[
                          styles.equippedAccessoryMultiSlot,
                          isMultiPicker ? styles.equipmentSlotSelected : null,
                        ]}
                        onPress={() =>
                          setEquipmentModalSlotKey((prev) =>
                            prev === 'multi-accessory' ? null : 'multi-accessory'
                          )
                        }
                      >
                        <View style={styles.equippedAccessoryMultiGrid}>
                          {Array.from({ length: 6 }, (_, accessoryIndex) => {
                            const equippedAccessory = allAccessories[accessoryIndex];
                            const rarity = equippedAccessory?.shop_items?.rarity?.toLowerCase() || 'common';

                            return (
                              <View
                                key={accessoryIndex}
                                style={[
                                  styles.equippedAccessoryMiniSlot,
                                  equippedAccessory
                                    ? {
                                        borderColor: RANK_COLORS[rarity.charAt(0).toUpperCase()],
                                        shadowColor: RANK_COLORS[rarity.charAt(0).toUpperCase()],
                                        shadowOpacity: 0.2,
                                      }
                                    : {},
                                ]}
                              >
                                {equippedAccessory ? (
                                  <View style={styles.equippedItemContent}>
                                    <View
                                      style={[
                                        styles.radiatingEnergyMicro,
                                        {
                                          backgroundColor:
                                            rarity === 'uncommon'
                                              ? 'rgba(34, 197, 94, 0.2)'
                                              : rarity === 'rare'
                                                ? 'rgba(59, 130, 246, 0.3)'
                                                : rarity === 'epic'
                                                  ? 'rgba(168, 85, 247, 0.4)'
                                                  : rarity === 'legendary'
                                                    ? 'rgba(255, 255, 0, 0.4)'
                                                    : rarity === 'monarch'
                                                      ? 'rgba(255, 215, 0, 0.7)'
                                                      : 'transparent',
                                        },
                                      ]}
                                    />
                                    <View style={styles.miniAccessoryMediaContainer}>
                                      <ShopItemMedia
                                        item={equippedAccessory.shop_items}
                                        style={styles.miniAccessoryMedia}
                                      />
                                    </View>
                                  </View>
                                ) : (
                                  <LockIcon size={5} color="#4b5563" />
                                )}
                              </View>
                            );
                          })}
                        </View>
                        <Text style={styles.equippedAccessorySlotLabel}>multi</Text>
                      </TouchableOpacity>
                    );
                  }

                  const equippedItem = (equippedItems || []).find(
                    (cosmetic: UserCosmetic) => cosmetic.shop_items?.slot === slot
                  );
                  const rarity = equippedItem?.shop_items?.rarity?.toLowerCase() || 'common';
                  const rarityColor = RANK_COLORS[rarity.charAt(0).toUpperCase()] || '#9ca3af';
                  const isAccessorySlotPicker = equipmentModalSlotKey === slot;

                  return (
                    <TouchableOpacity
                      key={slot}
                      style={[
                        styles.equippedAccessorySlot,
                        equippedItem
                          ? !isAccessorySlotPicker
                            ? {
                                borderColor: rarityColor,
                                backgroundColor: 'rgba(15, 23, 42, 0.8)',
                                shadowColor: rarityColor,
                                shadowOpacity: 0.2,
                              }
                            : { backgroundColor: 'rgba(15, 23, 42, 0.8)' }
                          : styles.emptySlot,
                        isAccessorySlotPicker ? styles.equipmentSlotSelected : null,
                      ]}
                      onPress={() =>
                        setEquipmentModalSlotKey((prev) => (prev === slot ? null : slot))
                      }
                      onLongPress={() => {
                        if (equippedItem) {
                          onSelectInventoryItem({
                            item: equippedItem.shop_items,
                            cosmeticItem: equippedItem,
                          });
                        }
                      }}
                    >
                      {equippedItem ? (
                        <View style={styles.equippedItemContent}>
                          <View
                            style={[
                              styles.radiatingEnergy,
                              {
                                backgroundColor:
                                  rarity === 'uncommon'
                                    ? 'rgba(34, 197, 94, 0.15)'
                                    : rarity === 'rare'
                                      ? 'rgba(59, 130, 246, 0.25)'
                                      : rarity === 'epic'
                                        ? 'rgba(168, 85, 247, 0.35)'
                                        : rarity === 'legendary'
                                          ? 'rgba(255, 255, 0, 0.35)'
                                          : rarity === 'monarch'
                                            ? 'rgba(255, 215, 0, 0.6)'
                                            : 'transparent',
                              },
                            ]}
                          />
                          <View style={styles.equippedAccessoryItemMediaContainer}>
                            <ShopItemMedia
                              item={equippedItem.shop_items}
                              style={styles.equippedAccessoryItemMedia}
                            />
                          </View>
                        </View>
                      ) : (
                        <LockIcon size={12} color="#6b7280" />
                      )}
                      <Text style={styles.equippedAccessorySlotLabel}>
                        {slot === 'magic effects'
                          ? 'aura'
                          : slot === 'eyes'
                            ? 'eyes'
                            : slot === 'head'
                              ? 'head'
                              : slot === 'face'
                                ? 'face'
                                : slot === 'shoulder'
                                  ? 'shldr'
                                  : slot}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {equipmentModalSlotKey ? (
              <View style={[styles.section, { marginHorizontal: 0, marginTop: 8 }]}>
                <View style={styles.equipmentPickerHeaderRow}>
                  <Text style={styles.equipmentPickerTitle}>{equipmentPickerTitle}</Text>
                  <TouchableOpacity onPress={() => setEquipmentModalSlotKey(null)} hitSlop={8}>
                    <Text style={styles.equipmentPickerClear}>Clear</Text>
                  </TouchableOpacity>
                </View>
                {equipmentPickerItems.length === 0 ? (
                  <Text style={styles.equipmentPickerEmpty}>No items in inventory for this slot.</Text>
                ) : (
                  <View style={styles.equipmentPickerList}>
                    {equipmentPickerItems.map((cosmeticItem) => {
                      const item =
                        cosmeticItem.shop_items ||
                        shopItems.find((s) => s.id === cosmeticItem.shop_item_id);
                      if (!item) return null;
                      const isEquipped = cosmeticItem.equipped;
                      const rarity = item.rarity?.toLowerCase() || 'common';
                      const rarityColor = RANK_COLORS[rarity.charAt(0).toUpperCase()] || '#9ca3af';

                      return (
                        <View key={cosmeticItem.id} style={styles.equipmentPickerRow}>
                          <TouchableOpacity
                            style={styles.equipmentPickerRowMediaWrap}
                            onPress={() => onSelectInventoryItem({ item, cosmeticItem })}
                          >
                            <View
                              style={[
                                styles.equipmentPickerGlow,
                                {
                                  backgroundColor:
                                    rarity === 'uncommon'
                                      ? 'rgba(34, 197, 94, 0.15)'
                                      : rarity === 'rare'
                                        ? 'rgba(59, 130, 246, 0.2)'
                                        : rarity === 'epic'
                                          ? 'rgba(168, 85, 247, 0.25)'
                                          : rarity === 'legendary'
                                            ? 'rgba(255, 255, 0, 0.25)'
                                            : rarity === 'monarch'
                                              ? 'rgba(255, 215, 0, 0.35)'
                                              : 'transparent',
                                },
                              ]}
                            />
                            <ShopItemMedia item={item} style={styles.equipmentPickerRowMedia} />
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={styles.equipmentPickerRowInfo}
                            onPress={() => onSelectInventoryItem({ item, cosmeticItem })}
                          >
                            <Text style={styles.equipmentPickerRowName} numberOfLines={2}>
                              {item.name}
                            </Text>
                            <Text style={[styles.equipmentPickerRowRarity, { color: rarityColor }]}>
                              {item.rarity || 'common'}
                            </Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            onPress={() => {
                              onEquipCosmetic(cosmeticItem.id, !isEquipped);
                              triggerPeek();
                            }}
                            style={[
                              styles.equipmentPickerEquipBtn,
                              isEquipped
                                ? styles.equipmentPickerUnequipBtn
                                : styles.equipmentPickerEquipBtnActive,
                            ]}
                          >
                            <Text style={styles.equipmentPickerEquipBtnText}>
                              {isEquipped ? 'UNEQUIP' : 'EQUIP'}
                            </Text>
                          </TouchableOpacity>
                        </View>
                      );
                    })}
                  </View>
                )}
              </View>
            ) : null}
          </ScrollView>
          {renderItemDetailsNested()}
        </View>
      </View>
    </Modal>
  );
}
