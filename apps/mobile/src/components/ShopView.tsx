import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Modal,
  Dimensions,
  Alert
} from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { MotiView } from 'moti';
import { ShopItemMedia } from './ShopItemMedia';
import GachaScreen from './GachaScreen';
import { User, ShopItem } from '@/types/user';
import { api } from '@/api/shop';
import { RANK_COLORS } from '@/constants/gameConstants';

// Assets
const coinIcon = require('@assets/coinicon.png');
const gemIcon = require('@assets/gemicon.png');
const weaponsIcon = require('@assets/shop/weapons.png');
const cosmeticsIcon = require('@assets/shop/cosmetics.png');
const gachaIcon = require('@assets/expcrystal.png');
import { XIcon } from './icons/XIcon';

const { width } = Dimensions.get('window');

interface SummonResult {
  success: boolean;
  message: string;
  item_id: string;
  item_name: string;
  item_rarity: string;
  image_url: string;
  thumbnail_url?: string;
  is_animated?: boolean;
  animation_config?: any;
  new_balance: number;
  newCoinBalance?: number;
  newGemBalance?: number;
}

interface ShopViewProps {
  user: User;
  shopItems: ShopItem[];
  setUser: (user: User) => void;
  handleBuyItem: (item: ShopItem, currency?: 'coins' | 'gems' | 'both') => void;
  isLoading?: boolean;
  /** When set (e.g. by tutorial), the main tab is controlled by this value. */
  tutorialMainTab?: 'hunter' | 'magic' | 'gacha';
}

export default function ShopView({
  user,
  shopItems,
  setUser,
  handleBuyItem,
  isLoading = false,
  tutorialMainTab
}: ShopViewProps) {
  const [activeMainTab, setActiveMainTab] = useState<'hunter' | 'magic' | 'gacha'>('hunter');
  const [activeShopTab, setActiveShopTab] = useState('all');

  // When tutorial drives the tab, keep it in sync
  React.useEffect(() => {
    if (tutorialMainTab) setActiveMainTab(tutorialMainTab);
  }, [tutorialMainTab]);
  const [selectedShopItem, setSelectedShopItem] = useState<ShopItem | null>(null);
  
  // Gacha State
  const [isSummoning, setIsSummoning] = useState(false);
  const [summonResult, setSummonResult] = useState<SummonResult | null>(null);

  // --- Filtering Logic ---
  const getBaseShopItems = useMemo(() => {
    if (!shopItems || !shopItems.length) return [];

    const inventoryIds = (user.cosmetics || []).map((cosmetic: any) =>
      String(cosmetic.shop_item_id || cosmetic.shop_items?.id).trim()
    );

    return shopItems.filter(item => {
      const itemId = String(item.id).trim();
      const isOwned = inventoryIds.includes(itemId);
      const isGachaOnly = (item as any).is_gacha_exclusive === true; 
      return !isOwned && !isGachaOnly;
    });
  }, [shopItems, user.cosmetics]);

  const getHunterShopItems = useMemo(() => {
    const baseItems = getBaseShopItems;

    if (activeShopTab === 'all') {
      // Exclude magic items from "All" in Hunter tab
      return baseItems.filter(item => item.slot !== 'magic effects');
    }

    switch (activeShopTab) {
      case 'weapons': return baseItems.filter(item => item.slot === 'weapon');
      case 'armor': return baseItems.filter(item => item.slot === 'body');
      case 'accessories': return baseItems.filter(item => !['weapon', 'body', 'avatar', 'background', 'other', 'magic effects'].includes(item.slot));
      // Removed 'magics' from here since it has its own main tab
      case 'avatar': return baseItems.filter(item => item.slot === 'avatar');
      case 'background': return baseItems.filter(item => item.slot === 'background');
      case 'other': return baseItems.filter(item => item.slot === 'other');
      default: return [];
    }
  }, [getBaseShopItems, activeShopTab]);

  const getMagicShopItems = useMemo(() => {
    return getBaseShopItems.filter(item => item.slot === 'magic effects');
  }, [getBaseShopItems]);

  // --- Gacha Logic ---
  const handleGachaSummon = async (useGems: boolean, poolType: 'gate' | 'gachapon') => {
    // Client-side check
    const cost = useGems ? 10 : 500;
    const balance = useGems ? user.gems || 0 : user.coins || 0;

    if (balance < cost) {
      Alert.alert('Insufficient Funds', `You need ${cost} ${useGems ? 'Gems' : 'Coins'} to summon.`);
      return;
    }

    setIsSummoning(true);

    try {
      const result = await api.performSummon(user.id, poolType, useGems);
      
      if (result.success) {
        setSummonResult(result);
        // Update user balance immediately
        setUser({
          ...user,
          coins: result.newCoinBalance ?? user.coins,
          gems: result.newGemBalance ?? user.gems
        });
      } else {
        Alert.alert('Summon Failed', result.message);
      }
    } catch (error: any) {
      console.error('Gacha Error:', error);
      Alert.alert('Error', error.message || 'An unexpected error occurred.');
    } finally {
      setIsSummoning(false);
    }
  };

  const categories = [
    { id: 'all', label: 'All', icon: require('../../assets/shop/allitems.png') },
    { id: 'weapons', label: 'Weapons', icon: require('../../assets/shop/weapons.png') },
    { id: 'armor', label: 'Armor', icon: require('../../assets/shop/armour.png') },
    { id: 'accessories', label: 'Access.', icon: require('../../assets/shop/accessories.png') },
    { id: 'avatar', label: 'Avatar', icon: require('../../assets/changeavatar.png') },
    { id: 'background', label: 'BG', icon: require('../../assets/backgroundicon.png') },
    { id: 'other', label: 'Other', icon: require('../../assets/shop/other.png') }
  ];

  const renderItemCard = ({ item }: { item: ShopItem }) => {
    const rarityColor = RANK_COLORS[item.rarity?.toUpperCase()] || '#9ca3af';
    
    return (
      <TouchableOpacity
        style={[styles.itemCard, { borderColor: rarityColor }]}
        onPress={() => setSelectedShopItem(item)}
      >
        <View style={styles.itemImageWrapper}>
          <View style={[styles.itemRarityGlow, { backgroundColor: rarityColor }]} />
          <ShopItemMedia item={item} style={styles.itemImage} />
        </View>
        <Text style={styles.itemName} numberOfLines={1}>{item.name}</Text>
        
        <View style={styles.priceRow}>
          {item.price > 0 && (
            <View style={styles.priceTag}>
              <Image source={coinIcon} style={styles.priceIcon} contentFit="contain" />
              <Text style={styles.priceText}>{item.price}</Text>
            </View>
          )}
          {(item as any).gem_price > 0 && (
            <View style={styles.priceTag}>
              <Image source={gemIcon} style={styles.priceIcon} contentFit="contain" />
              <Text style={styles.priceText}>{(item as any).gem_price}</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* Main Tabs Header */}
      <View style={styles.mainTabs}>
        <TouchableOpacity
          onPress={() => setActiveMainTab('hunter')}
          style={[styles.mainTab, activeMainTab === 'hunter' && styles.mainTabActive]}
        >
          <Image source={weaponsIcon} style={styles.mainTabIcon} contentFit="contain" />
          <Text style={[styles.mainTabText, activeMainTab === 'hunter' && styles.mainTabTextActive]}>HUNTER</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setActiveMainTab('magic')}
          style={[styles.mainTab, activeMainTab === 'magic' && styles.mainTabActive]}
        >
          <Image source={cosmeticsIcon} style={styles.mainTabIcon} contentFit="contain" />
          <Text style={[styles.mainTabText, activeMainTab === 'magic' && styles.mainTabTextActive]}>MAGIC</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setActiveMainTab('gacha')}
          style={[styles.mainTab, activeMainTab === 'gacha' && styles.mainTabActive]}
        >
          <Image source={gachaIcon} style={styles.mainTabIcon} contentFit="contain" />
          <Text style={[styles.mainTabText, activeMainTab === 'gacha' && styles.mainTabTextActive]}>GACHA</Text>
        </TouchableOpacity>
      </View>

      {/* Currency Header */}
      <View style={styles.currencyHeader}>
        <Text style={styles.shopTitle}>
          {activeMainTab === 'hunter' ? "HUNTER'S SHOP" : activeMainTab === 'magic' ? "MAGIC SHOP" : "DIMENSIONAL GACHA"}
        </Text>
        <View style={styles.currencyContainer}>
          <View style={styles.currencyBox}>
            <Image source={coinIcon} style={styles.currencyIcon} contentFit="contain" />
            <Text style={[styles.currencyValue, { color: '#fbbf24' }]}>{(user.coins || 0).toLocaleString()}</Text>
          </View>
          <View style={styles.currencyBox}>
            <Image source={gemIcon} style={styles.currencyIcon} contentFit="contain" />
            <Text style={[styles.currencyValue, { color: '#a855f7' }]}>{(user.gems || 0).toLocaleString()}</Text>
          </View>
        </View>
      </View>

      {/* Content Body */}
      {activeMainTab === 'hunter' && (
        <View style={{ flex: 1 }}>
          <View style={styles.subCategoryScroll}>
            <FlatList
              horizontal
              data={categories}
              showsHorizontalScrollIndicator={false}
              keyExtractor={item => item.id}
              contentContainerStyle={{ paddingHorizontal: 10, gap: 8 }}
              renderItem={({ item }) => (
                <TouchableOpacity
                  onPress={() => setActiveShopTab(item.id)}
                  style={[
                    styles.subCategoryTab,
                    activeShopTab === item.id && styles.subCategoryTabActive
                  ]}
                >
                  <Image source={item.icon} style={styles.subCategoryIcon} contentFit="contain" />
                  <Text style={[styles.subCategoryText, activeShopTab === item.id && styles.subCategoryTextActive]}>
                    {item.label}
                  </Text>
                </TouchableOpacity>
              )}
            />
          </View>
          
          <FlatList
            data={getHunterShopItems}
            keyExtractor={item => item.id}
            numColumns={2}
            contentContainerStyle={styles.gridContainer}
            renderItem={renderItemCard}
            columnWrapperStyle={{ gap: 10 }}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateText}>No items available in this category.</Text>
              </View>
            }
          />
        </View>
      )}

      {activeMainTab === 'magic' && (
        <FlatList
          data={getMagicShopItems}
          keyExtractor={item => item.id}
          numColumns={2}
          contentContainerStyle={styles.gridContainer}
          renderItem={renderItemCard}
          columnWrapperStyle={{ gap: 10 }}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>No magic items available.</Text>
            </View>
          }
        />
      )}

      {activeMainTab === 'gacha' && (
        <GachaScreen
          onSummon={handleGachaSummon}
          isSummoning={isSummoning}
          coins={user.coins || 0}
          gems={user.gems || 0}
        />
      )}

      {/* Item Details Modal */}
      <Modal
        visible={!!selectedShopItem}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedShopItem(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {selectedShopItem && (
              <>
                <View style={[
                  styles.modalImageContainer,
                  { borderColor: RANK_COLORS[selectedShopItem.rarity?.toUpperCase()] || '#9ca3af' }
                ]}>
                  <ShopItemMedia item={selectedShopItem} style={styles.modalImage} resizeMode="contain" />
                </View>
                <Text style={styles.modalTitle}>{selectedShopItem.name}</Text>
                <Text style={[styles.modalRarity, { color: RANK_COLORS[selectedShopItem.rarity?.toUpperCase()] }]}>
                  {selectedShopItem.rarity}
                </Text>
                
                <View style={styles.requirementsContainer}>
                  <View style={styles.reqBadge}>
                    <Text style={styles.reqLabel}>MIN LEVEL</Text>
                    <Text style={[styles.reqValue, (user.level || 1) >= (selectedShopItem.min_level || 1) ? styles.reqMet : styles.reqUnmet]}>
                      {selectedShopItem.min_level || 1}
                    </Text>
                  </View>
                  <View style={styles.reqBadge}>
                    <Text style={styles.reqLabel}>CLASS</Text>
                    <Text style={[styles.reqValue, (!selectedShopItem.class_req || selectedShopItem.class_req === 'All' || user.current_class === selectedShopItem.class_req) ? styles.reqMet : styles.reqUnmet]}>
                      {selectedShopItem.class_req || 'ALL'}
                    </Text>
                  </View>
                </View>

                <Text style={styles.modalDescription}>{selectedShopItem.description}</Text>

                <TouchableOpacity
                  style={styles.buyButton}
                  onPress={() => {
                    handleBuyItem(selectedShopItem, 'both');
                    setSelectedShopItem(null);
                  }}
                >
                  <Text style={styles.buyButtonText}>BUY</Text>
                  <View style={styles.buyCostRow}>
                    {selectedShopItem.price > 0 && (
                      <>
                        <Image source={coinIcon} style={styles.buyIcon} contentFit="contain" />
                        <Text style={styles.buyText}>{selectedShopItem.price}</Text>
                      </>
                    )}
                    {(selectedShopItem as any).gem_price > 0 && (
                      <>
                        <Image source={gemIcon} style={styles.buyIcon} contentFit="contain" />
                        <Text style={styles.buyText}>{(selectedShopItem as any).gem_price}</Text>
                      </>
                    )}
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={() => setSelectedShopItem(null)}
                >
                  <XIcon size={20} color="#64748b" />
                  <Text style={styles.closeButtonText}>CLOSE</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* Gacha Reveal Modal */}
      <Modal
        visible={!!summonResult}
        transparent
        animationType="slide"
        onRequestClose={() => setSummonResult(null)}
      >
        <View style={styles.modalOverlay}>
          <MotiView
            from={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            style={[
              styles.revealModalContent,
              { borderColor: RANK_COLORS[summonResult?.item_rarity?.toUpperCase()] || '#fff' }
            ]}
          >
            {summonResult && (
              <>
                <Text style={styles.revealTitle}>SYSTEM ACQUIRED</Text>
                <View style={styles.revealImageContainer}>
                  <ShopItemMedia 
                    item={{
                      image_url: summonResult.image_url,
                      thumbnail_url: summonResult.thumbnail_url,
                      is_animated: summonResult.is_animated,
                      animation_config: summonResult.animation_config,
                      name: summonResult.item_name
                    }} 
                    style={styles.revealImage} 
                    resizeMode="contain"
                  />
                </View>
                <Text style={[styles.revealItemName, { color: RANK_COLORS[summonResult.item_rarity?.toUpperCase()] }]}>
                  {summonResult.item_name}
                </Text>
                <Text style={styles.revealRarity}>[{summonResult.item_rarity} CLASS]</Text>
                
                <TouchableOpacity
                  style={styles.acceptButton}
                  onPress={() => setSummonResult(null)}
                >
                  <Text style={styles.acceptButtonText}>ACCEPT</Text>
                </TouchableOpacity>
              </>
            )}
          </MotiView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  mainTabs: {
    flexDirection: 'row',
    padding: 10,
    gap: 10,
  },
  mainTab: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  mainTabActive: {
    backgroundColor: 'rgba(34, 211, 238, 0.1)',
    borderColor: '#22d3ee',
  },
  mainTabIcon: {
    width: 20,
    height: 20,
    resizeMode: 'contain',
  },
  mainTabText: {
    color: '#94a3b8',
    fontWeight: '900',
    fontSize: 10,
    letterSpacing: 1,
  },
  mainTabTextActive: {
    color: '#22d3ee',
  },
  currencyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  shopTitle: {
    color: '#fff',
    fontWeight: '900',
    fontSize: 14,
    letterSpacing: 2,
  },
  currencyContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  currencyBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.8)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    gap: 4,
  },
  currencyIcon: {
    width: 14,
    height: 14,
  },
  currencyValue: {
    fontSize: 12,
    fontWeight: '900',
  },
  subCategoryScroll: {
    height: 50,
    marginBottom: 10,
  },
  subCategoryTab: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    gap: 6,
  },
  subCategoryTabActive: {
    backgroundColor: '#ca8a04',
    borderColor: '#facc15',
  },
  subCategoryIcon: {
    width: 16,
    height: 16,
    resizeMode: 'contain',
  },
  subCategoryText: {
    color: '#94a3b8',
    fontSize: 10,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  subCategoryTextActive: {
    color: '#000',
  },
  gridContainer: {
    paddingHorizontal: 10,
    paddingBottom: 20,
  },
  itemCard: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.8)',
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    alignItems: 'center',
    maxWidth: (width - 30) / 2, // 2 columns with gaps
  },
  itemImageWrapper: {
    width: 80,
    height: 80,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    position: 'relative',
  },
  itemRarityGlow: {
    position: 'absolute',
    width: 60,
    height: 60,
    borderRadius: 30,
    opacity: 0.2,
  },
  itemImage: {
    width: '100%',
    height: '100%',
  },
  itemName: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: 6,
  },
  priceRow: {
    flexDirection: 'row',
    gap: 6,
  },
  priceTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  priceIcon: {
    width: 10,
    height: 10,
  },
  priceText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  emptyState: {
    padding: 20,
    alignItems: 'center',
  },
  emptyStateText: {
    color: '#64748b',
    fontStyle: 'italic',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#0f172a',
    width: '100%',
    maxWidth: 400,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(34, 211, 238, 0.3)',
    padding: 20,
    alignItems: 'center',
  },
  modalImageContainer: {
    width: 120,
    height: 120,
    borderWidth: 2,
    borderRadius: 8,
    marginBottom: 16,
    padding: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  modalImage: {
    width: '100%',
    height: '100%',
  },
  modalTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '900',
    textTransform: 'uppercase',
    marginBottom: 4,
    textAlign: 'center',
  },
  modalRarity: {
    fontSize: 12,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    marginBottom: 16,
    letterSpacing: 2,
  },
  requirementsContainer: {
    flexDirection: 'row',
    gap: 20,
    marginBottom: 20,
  },
  reqBadge: {
    alignItems: 'center',
  },
  reqLabel: {
    color: '#64748b',
    fontSize: 8,
    fontWeight: '900',
    marginBottom: 2,
  },
  reqValue: {
    fontSize: 14,
    fontWeight: '900',
  },
  reqMet: {
    color: '#22d3ee',
  },
  reqUnmet: {
    color: '#ef4444',
  },
  modalDescription: {
    color: '#94a3b8',
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 18,
  },
  buyButton: {
    backgroundColor: '#16a34a',
    width: '100%',
    padding: 14,
    borderRadius: 6,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  buyButtonText: {
    color: '#fff',
    fontWeight: '900',
    fontSize: 14,
  },
  buyCostRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  buyIcon: {
    width: 14,
    height: 14,
  },
  buyText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  closeButton: {
    padding: 10,
  },
  closeButtonText: {
    color: '#64748b',
    fontWeight: 'bold',
    fontSize: 12,
  },
  // Reveal Modal
  revealModalContent: {
    backgroundColor: '#0f172a',
    width: '100%',
    maxWidth: 350,
    padding: 30,
    borderRadius: 16,
    borderWidth: 2,
    alignItems: 'center',
  },
  revealTitle: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: 2,
    marginBottom: 20,
    textAlign: 'center',
  },
  revealImageContainer: {
    width: 160,
    height: 160,
    marginBottom: 20,
  },
  revealImage: {
    width: '100%',
    height: '100%',
  },
  revealItemName: {
    fontSize: 20,
    fontWeight: '900',
    textTransform: 'uppercase',
    textAlign: 'center',
    marginBottom: 8,
  },
  revealRarity: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 24,
    letterSpacing: 1,
  },
  acceptButton: {
    backgroundColor: '#22d3ee',
    paddingVertical: 12,
    paddingHorizontal: 40,
    borderRadius: 6,
  },
  acceptButtonText: {
    color: '#0f172a',
    fontWeight: '900',
    fontSize: 14,
  },
});
