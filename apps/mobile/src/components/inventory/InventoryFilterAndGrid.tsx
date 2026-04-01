import React from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { Image } from 'expo-image';
import type { ShopItem, UserCosmetic } from '@/types/user';
import { RANK_COLORS } from '@/constants/gameConstants';
import { ShopItemMedia } from '@/components/ShopItemMedia';
import { PetList } from '@/components/PetList';
import type { InventoryFilter } from '@/screens/inventory/inventoryTypes';
import { inventoryGridStyles as styles } from '@/components/inventory/InventoryGrid.styles';

const FILTER_TABS: { id: InventoryFilter; label: string; icon: string }[] = [
  { id: 'all', label: 'All', icon: '📦' },
  { id: 'equipped', label: 'Equipped', icon: '✨' },
  { id: 'weapons', label: 'Weapons', icon: '⚔️' },
  { id: 'armor', label: 'Armor', icon: '🛡️' },
  { id: 'accessories', label: 'Accessories', icon: '💍' },
  { id: 'magics', label: 'Magics', icon: '🔮' },
  { id: 'pets', label: 'Pets', icon: '🐾' },
  { id: 'other', label: 'Other', icon: '🎒' },
];

interface InventoryFilterAndGridProps {
  viewMode: 'avatar' | 'pet';
  inventoryFilter: InventoryFilter;
  setInventoryFilter: (f: InventoryFilter) => void;
  inventorySortAZ: boolean;
  setInventorySortAZ: (v: boolean) => void;
  shopItems: ShopItem[];
  pets: { id: string }[];
  petsLoading: boolean;
  onSelectPet: (pet: { id: string }) => void;
  getFilteredInventoryItems: () => UserCosmetic[];
  getIsEquipped: (c: UserCosmetic) => boolean;
  onSelectInventoryItem: (selection: { item: ShopItem; cosmeticItem: UserCosmetic }) => void;
  onEquipCosmetic: (cosmeticId: string, equipped: boolean) => void;
  onUseItem: (cosmeticId: string) => void;
}

export function InventoryFilterAndGrid({
  viewMode,
  inventoryFilter,
  setInventoryFilter,
  inventorySortAZ,
  setInventorySortAZ,
  shopItems,
  pets,
  petsLoading,
  onSelectPet,
  getFilteredInventoryItems,
  getIsEquipped,
  onSelectInventoryItem,
  onEquipCosmetic,
  onUseItem,
}: InventoryFilterAndGridProps) {
  return (
    <View style={styles.section}>
      <View style={styles.inventoryHeader}>
        <Image source={require('../../../assets/inventory.png')} style={styles.inventoryIcon} contentFit="contain" />
        <Text style={[styles.inventoryHeaderText, { color: RANK_COLORS['A'] }]}>Inventory</Text>
      </View>

      <View style={styles.filterBar}>
        {viewMode === 'pet' ? (
          <View style={styles.filterTabsContainer}>
            <TouchableOpacity style={[styles.filterTab, styles.filterTabActive]}>
              <Text style={[styles.filterTabText, styles.filterTabTextActive]}>BACKGROUNDS</Text>
              <View style={styles.activeTabIndicator} />
            </TouchableOpacity>
          </View>
        ) : (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterTabsContainer}
            style={{ flex: 1 }}
          >
            {FILTER_TABS.map((tab) => (
              <TouchableOpacity
                key={tab.id}
                onPress={() => setInventoryFilter(tab.id)}
                style={[styles.filterTab, inventoryFilter === tab.id ? styles.filterTabActive : null]}
              >
                <Text
                  style={[styles.filterTabText, inventoryFilter === tab.id && styles.filterTabTextActive]}
                >
                  {tab.label}
                </Text>
                {inventoryFilter === tab.id && <View style={styles.activeTabIndicator} />}
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}
        <TouchableOpacity
          onPress={() => setInventorySortAZ(!inventorySortAZ)}
          style={[styles.sortButton, inventorySortAZ ? styles.sortButtonActive : null]}
        >
          <Text style={styles.sortButtonText}>{inventorySortAZ ? 'AZ' : 'Recent'}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.inventoryGrid}>
        {inventoryFilter === 'pets' && viewMode !== 'pet' ? (
          <PetList pets={pets as any} loading={petsLoading} onSelect={(pet) => onSelectPet(pet)} />
        ) : getFilteredInventoryItems().length === 0 ? (
          <Text style={styles.noItemsText}>
            {viewMode === 'pet'
              ? 'No backgrounds available for pet customization...'
              : 'No items in this category...'}
          </Text>
        ) : (
          getFilteredInventoryItems().map((cosmeticItem: UserCosmetic) => {
            const item =
              cosmeticItem.shop_items || shopItems.find((shopItem) => shopItem.id === cosmeticItem.shop_item_id);
            if (!item) return null;
            const rarity = item.rarity?.toLowerCase() || 'common';
            const rarityColor = RANK_COLORS[rarity.charAt(0).toUpperCase()] || '#9ca3af';
            const isEquipped = getIsEquipped(cosmeticItem);

            return (
              <TouchableOpacity
                key={cosmeticItem.id}
                style={[styles.inventoryItemCard, isEquipped ? styles.inventoryItemCardEquipped : null]}
                onPress={() => onSelectInventoryItem({ item, cosmeticItem })}
              >
                {cosmeticItem.quantity && cosmeticItem.quantity > 1 && (
                  <View style={styles.quantityBadge}>
                    <Text style={styles.quantityText}>x{cosmeticItem.quantity}</Text>
                  </View>
                )}
                <View style={styles.inventoryItemMediaWrapper}>
                  <View
                    style={[
                      styles.radiatingEnergyLarge,
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
                  <View style={styles.inventoryItemMediaContainer}>
                    <ShopItemMedia item={item} style={[styles.inventoryItemMedia, { borderRadius: 2 }]} />
                  </View>
                </View>

                <Text style={styles.inventoryItemName}>{item.name}</Text>

                <TouchableOpacity
                  onPress={(e) => {
                    e.stopPropagation();
                    if (item.slot === 'consumable') {
                      onUseItem(cosmeticItem.id);
                    } else {
                      onEquipCosmetic(cosmeticItem.id, !isEquipped);
                    }
                  }}
                  style={[
                    styles.equipUnequipButton,
                    isEquipped ? styles.unequipButton : styles.equipButton,
                    item.slot === 'consumable' && {
                      borderColor: '#22c55e',
                      backgroundColor: 'rgba(34, 197, 94, 0.2)',
                    },
                  ]}
                >
                  <Text style={styles.equipUnequipButtonText}>
                    {item.slot === 'consumable' ? 'USE' : isEquipped ? 'UNEQUIP' : 'EQUIP'}
                  </Text>
                </TouchableOpacity>
              </TouchableOpacity>
            );
          })
        )}
      </View>
    </View>
  );
}
