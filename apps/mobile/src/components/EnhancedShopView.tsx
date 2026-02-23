import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Modal,
  Dimensions,
  ImageBackground,
  Platform,
  Alert
} from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { MotiView } from 'moti';
import { ShopItemMedia } from './ShopItemMedia';
import { ItemCard } from './shop/ItemCard';
import GachaScreen from './GachaScreen';
import { User, ShopItem } from '@/types/user';
import { api } from '@/api/shop';
import { RANK_COLORS, RARITY_COLORS } from '@/constants/gameConstants';
import { playHunterSound, stopActiveVoice } from '@/utils/audio';
import { XIcon } from './icons/XIcon';
import { SystemPanelBackground } from './shop/SystemPanelBackground';
import Svg, { Path } from 'react-native-svg';

// Stat Icons converted to RN Svg
const StatHeart = () => (
  <Svg width={14} height={14} viewBox="0 0 24 24" fill="currentColor" color="#F87171">
    <Path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
  </Svg>
);

const StatShield = () => (
  <Svg width={14} height={14} viewBox="0 0 24 24" fill="currentColor" color="#60A5FA">
    <Path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z"/>
  </Svg>
);

const StatSpeed = () => (
  <Svg width={14} height={14} viewBox="0 0 24 24" fill="currentColor" color="#FACC15">
    <Path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
  </Svg>
);

// ===========================
// ASSETS CONFIGURATION
// ===========================
const ASSETS = {
  // CURRENCY ICONS
  coinIcon: require('../../assets/coinicon.png'),
  gemIcon: require('../../assets/gemicon.png'),

  // TAB ICONS
  iconHunter: require('../../assets/shop/weapons.png'),
  iconMagic: require('../../assets/shop/cosmetics.png'),
  iconGacha: require('../../assets/icons/gachagates.png'),

  // NPCs
  hunterNPC: require('../../assets/shop/Leo1.png'),
  leoHappy: require('../../assets/shop/Leo2.png'),
  magicNPC: require('../../assets/shop/Nyx1.png'),
  nyxHappy: require('../../assets/shop/Nyx2.png'),
  gachaNPC: require('../../assets/special instances.png'), // Placeholder or use a gacha specific one

  // BACKGROUNDS
  hunterBG: require('../../assets/shop/hunterarmory.webp'),
  magicBG: require('../../assets/shop/arcaneemporium.webp'),
  gachaBG: require('../../assets/stone-bg.jpg'),
  
  // PLACEHOLDER
  itemPlaceholder: require('../../assets/shop/allitems.png'),
};

// ===========================
// DATA & THEMES
// ===========================
const TAB_THEMES = {
  HUNTER: {
    title: "Hunter's Armory",
    npcName: "Leo",
    npcImage: ASSETS.hunterNPC,
    backgroundImage: ASSETS.hunterBG,
    tabIcon: ASSETS.iconHunter,
    welcomeText: "Welcome! I sell the best gear for your next hunt.",
    accentColor: '#00BFFF', // Light Blue
  },
  MAGIC: {
    title: "Arcane Emporium",
    npcName: "Nyx",
    npcImage: ASSETS.magicNPC,
    backgroundImage: ASSETS.magicBG,
    tabIcon: ASSETS.iconMagic,
    welcomeText: "Welcome! I sell powerful potions and artifacts.",
    accentColor: '#C71585', // Medium Violet Red
  },
  GACHA: {
    title: "Mystic Summons",
    npcName: "Gacha Spirit",
    npcImage: ASSETS.gachaNPC,
    backgroundImage: ASSETS.gachaBG,
    tabIcon: ASSETS.iconGacha,
    welcomeText: "Test your luck. What fate awaits you?",
    accentColor: '#FFD700', // Gold
  },
};

const { width } = Dimensions.get('window');
const GRID_GAP = 8;
const GRID_PADDING = 8;
const CARD_WIDTH = (width - (GRID_PADDING * 2) - (GRID_GAP * 2)) / 3;

// ===========================
// COMPONENT: Shop Hero Section
// ===========================
const ShopHero = ({ theme, overrideImage, overrideText }: { theme: any, overrideImage?: any, overrideText?: string }) => {
  const [displayText, setDisplayText] = useState('');
  const textToType = overrideText || theme.welcomeText;

  useEffect(() => {
    setDisplayText('');
    let index = 0;
    const timer = setInterval(() => {
      if (index < textToType.length) {
        setDisplayText(textToType.substring(0, index + 1));
        index++;
      } else {
        clearInterval(timer);
      }
    }, 30);
    return () => clearInterval(timer);
  }, [textToType]);

  return (
    <View style={styles.heroContainer}>
      <ImageBackground
        source={theme.backgroundImage}
        style={styles.heroBackground}
        imageStyle={{ opacity: 0.6 }}
        resizeMode="cover"
      >
        {/* Character Sprite - Background Layer */}
        <View style={styles.heroCharacterContainer}>
          <Image
            source={overrideImage || theme.npcImage}
            style={styles.heroCharacter}
            contentFit="contain"
          />
        </View>

        {/* Dialogue Content - Foreground Layer */}
        <LinearGradient
          colors={['transparent', 'rgba(19, 21, 36, 0.4)', 'rgba(19, 21, 36, 0.7)']}
          style={styles.dialogueOverlay}
        >
          <View style={styles.npcNameTagContainer}>
            <View style={styles.npcNameTag}>
              <Text style={styles.npcNameText}>{theme.npcName}</Text>
            </View>
          </View>
          
          <Text style={styles.dialogueText}>
            {displayText}
          </Text>
        </LinearGradient>
      </ImageBackground>
    </View>
  );
};

// ===========================
// COMPONENT: Enhanced Item Card (REPLACED BY ItemCard)
// ===========================

// ===========================
// MAIN SCREEN COMPONENT
// ===========================
interface ShopViewProps {
  user: User;
  shopItems: ShopItem[];
  setUser: (user: User) => void;
  handleBuyItem: (item: ShopItem, currency?: 'coins' | 'gems' | 'both') => void;
  isLoading?: boolean;
  tutorialMainTab?: 'hunter' | 'magic' | 'gacha';
}

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

export default function EnhancedShopView({
  user,
  shopItems,
  setUser,
  handleBuyItem,
  isLoading = false,
  tutorialMainTab
}: ShopViewProps) {
  const [currentTab, setCurrentTab] = useState<'HUNTER' | 'MAGIC' | 'GACHA'>('HUNTER');
  const [activeShopTab, setActiveShopTab] = useState('all');
  const [selectedShopItem, setSelectedShopItem] = useState<ShopItem | null>(null);
  const [npcOverride, setNpcOverride] = useState<{ image?: any, text?: string } | null>(null);

  const stats = useMemo(() => {
    if (!selectedShopItem) return [];
    
    const s: { label: string; value: string; icon: React.ReactNode }[] = [];
    
    // Check for explicit bonuses array first
    if (selectedShopItem.bonuses && Array.isArray(selectedShopItem.bonuses)) {
      selectedShopItem.bonuses.forEach(b => {
        let icon = null;
        let label = '';
        
        const type = b.type.toLowerCase();
        if (type === 'hp' || type === 'health' || type.includes('hp')) { 
            icon = <StatHeart />; 
            label = 'HP %'; 
        }
        else if (type === 'def' || type === 'defense' || type.includes('def')) { 
            icon = <StatShield />; 
            label = 'DEF'; 
        }
        else if (type === 'spd' || type === 'speed') { 
            icon = <StatSpeed />; 
            label = 'SPD'; 
        }
        else { 
            label = type.substring(0, 3).toUpperCase(); 
        }

        s.push({ label, value: `+${b.value}`, icon });
      });
    } 
    // Fallback to bonus_type/bonus_value if no bonuses array
    else if (selectedShopItem.bonus_type && selectedShopItem.bonus_value) {
        let icon = null;
        let label = '';
        const type = selectedShopItem.bonus_type.toLowerCase();

        if (type === 'hp' || type === 'health' || type.includes('hp')) { 
            icon = <StatHeart />; 
            label = 'HP %'; 
        }
        else if (type === 'def' || type === 'defense' || type.includes('def')) { 
            icon = <StatShield />; 
            label = 'DEF'; 
        }
        else if (type === 'spd' || type === 'speed') { 
            icon = <StatSpeed />; 
            label = 'SPD'; 
        }
        else { 
            label = type.substring(0, 3).toUpperCase(); 
        }
        s.push({ label, value: `+${selectedShopItem.bonus_value}`, icon });
    }

    return s;
  }, [selectedShopItem]);

  // Gacha State
  const [isSummoning, setIsSummoning] = useState(false);
  const [summonResult, setSummonResult] = useState<SummonResult | null>(null);

  React.useEffect(() => {
    if (tutorialMainTab) {
        if (tutorialMainTab === 'hunter') setCurrentTab('HUNTER');
        if (tutorialMainTab === 'magic') setCurrentTab('MAGIC');
        if (tutorialMainTab === 'gacha') setCurrentTab('GACHA');
    }
  }, [tutorialMainTab]);

  useEffect(() => {
    if (currentTab === 'MAGIC' && !npcOverride) {
      playHunterSound('nyxGreeting');
    } else {
      stopActiveVoice();
    }
  }, [currentTab]);

  // Stop voice on unmount
  useEffect(() => {
    return () => {
      stopActiveVoice();
    };
  }, []);

  const currentTheme = TAB_THEMES[currentTab];

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
      // Strict check for is_sellable. It must not be false.
      // We accept true, undefined, null as "sellable" unless strictly false.
      // But based on user request, maybe we should treat NULL as TRUE?
      // "If its false it shouldnt be showing up" -> So only explicitly false is bad.
      const isSellable = (item as any).is_sellable !== false;
      
      return !isOwned && !isGachaOnly && isSellable;
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

  const renderTabButton = (tabName: 'HUNTER' | 'MAGIC' | 'GACHA', label: string) => {
    const isActive = currentTab === tabName;
    const theme = TAB_THEMES[tabName];
    
    return (
      <TouchableOpacity
        style={[styles.tabButton, !isActive && styles.tabButtonInactive]}
        onPress={() => {
          setCurrentTab(tabName);
          setNpcOverride(null);
        }}
      >
        {isActive && (
          <LinearGradient
            colors={['rgba(77, 240, 240, 0.25)', 'rgba(77, 240, 240, 0.05)']}
            style={StyleSheet.absoluteFill}
          />
        )}
        <Image 
            source={theme.tabIcon} 
            style={[styles.tabIcon, { tintColor: isActive ? '#4df0f0' : '#888' }]} 
            contentFit="contain"
        />
        <Text style={[styles.tabButtonText, isActive && { color: '#4df0f0' }]}>
          {label}
        </Text>
        {isActive && <View style={styles.tabUnderline} />}
      </TouchableOpacity>
    );
  };

  const rarityColor = RARITY_COLORS[selectedShopItem?.rarity?.toUpperCase()] || RANK_COLORS[selectedShopItem?.rarity?.toUpperCase()] || '#d1d5db';

  return (
    <View style={styles.container}>
      {/* Header Bar with Neon Currency Pill */}
      <View style={styles.headerBar}>
        <Text style={styles.headerTitle}>SHOP</Text>
        <View style={styles.currencyContainer}>
           <View style={styles.currencyItem}>
              <Image source={ASSETS.coinIcon} style={styles.headerIcon} contentFit="contain" />
              <Text style={[styles.currencyText, { color: '#fbbf24' }]}>{(user.coins || 0).toLocaleString()}G</Text>
           </View>
           <View style={[styles.currencyItem, { marginLeft: 15 }]}>
              <Image source={ASSETS.gemIcon} style={styles.headerIcon} contentFit="contain" />
              <Text style={[styles.currencyText, { color: '#67e8f9' }]}>{(user.gems || 0).toLocaleString()}</Text>
           </View>
        </View>
      </View>

      {/* Unified Tabs */}
      <View style={styles.tabContainer}>
        {renderTabButton('HUNTER', 'HUNTER')}
        {renderTabButton('MAGIC', 'MAGIC')}
        {renderTabButton('GACHA', 'GACHA')}
      </View>

      {/* Dynamic Banner */}
      {currentTab !== 'GACHA' && (
        <ShopHero 
          theme={currentTheme} 
          overrideImage={npcOverride?.image}
          overrideText={npcOverride?.text}
        />
      )}

      {/* Content Area */}
      <View style={{ flex: 1 }}>
        {currentTab === 'HUNTER' && (
            <>
            {/* Reworked Category Filters */}
            <View style={styles.filterContainer}>
                <FlatList
                    horizontal
                    data={categories}
                    showsHorizontalScrollIndicator={false}
                    keyExtractor={item => item.id}
                    contentContainerStyle={{ paddingHorizontal: 16, gap: 10 }}
                    renderItem={({ item }) => (
                        <TouchableOpacity 
                            style={[
                                styles.filterButton, 
                                activeShopTab === item.id && styles.filterButtonActive
                            ]}
                            onPress={() => setActiveShopTab(item.id)}
                        >
                            <Image 
                                source={item.icon} 
                                style={[
                                    styles.filterIcon, 
                                    { tintColor: activeShopTab === item.id ? '#131524' : '#888' }
                                ]} 
                                contentFit="contain" 
                            />
                            <Text style={activeShopTab === item.id ? styles.filterButtonTextActive : styles.filterButtonText}>
                                {item.label.toUpperCase()}
                            </Text>
                        </TouchableOpacity>
                    )}
                />
            </View>

            {/* Grid */}
            <FlatList
                data={getHunterShopItems}
                keyExtractor={(item) => item.id}
                numColumns={3}
                contentContainerStyle={styles.gridContentContainer}
                columnWrapperStyle={styles.gridColumnWrapper}
                renderItem={({ item }) => (
                    <ItemCard 
                        item={item} 
                        style={{ width: CARD_WIDTH }}
                        onPress={() => setSelectedShopItem(item)}
                    />
                )}
                ListEmptyComponent={
                    <View style={styles.emptyState}>
                        <Text style={styles.emptyStateText}>No items available in this category.</Text>
                    </View>
                }
            />
            </>
        )}

        {currentTab === 'MAGIC' && (
            <FlatList
                data={getMagicShopItems}
                keyExtractor={(item) => item.id}
                numColumns={3}
                contentContainerStyle={styles.gridContentContainer}
                columnWrapperStyle={styles.gridColumnWrapper}
                renderItem={({ item }) => (
                    <ItemCard 
                        item={item} 
                        style={{ width: CARD_WIDTH }}
                        onPress={() => setSelectedShopItem(item)}
                    />
                )}
                ListEmptyComponent={
                    <View style={styles.emptyState}>
                        <Text style={styles.emptyStateText}>No magic items available.</Text>
                    </View>
                }
            />
        )}

        {currentTab === 'GACHA' && (
            <GachaScreen
                onSummon={handleGachaSummon}
                isSummoning={isSummoning}
                coins={user.coins || 0}
                gems={user.gems || 0}
            />
        )}
      </View>

      {/* Item Details Modal */}
      <Modal
        visible={!!selectedShopItem}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedShopItem(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <SystemPanelBackground />
            {selectedShopItem && (
              <View style={styles.modalInnerContent}>
                <View style={styles.modalTopBar}>
                    <View style={styles.levelBadge}>
                        <Text style={styles.levelText}>Lv.{selectedShopItem.min_level || 1}</Text>
                    </View>
                    <View style={[styles.rarityBadge, { borderColor: rarityColor }]}>
                        <Text style={[styles.rarityText, { color: rarityColor }]}>{selectedShopItem.rarity || 'COMMON'}</Text>
                    </View>
                </View>

                <View style={styles.modalImageWrapper}>
                   <View style={styles.modalImageInnerCircle}>
                      <ShopItemMedia item={selectedShopItem} style={styles.modalImage} resizeMode="contain" />
                   </View>
                </View>
                
                <Text style={styles.modalTitle}>{selectedShopItem.name}</Text>
                <Text style={styles.modalCategory}>{selectedShopItem.slot?.toUpperCase() || 'ITEM'}</Text>
                
                <Text style={styles.modalDescription}>{selectedShopItem.description}</Text>

                <View style={styles.modalStatsBox}>
                    {stats.length > 0 ? (
                        stats.map((stat, idx) => (
                            <View key={idx} style={styles.statRow}>
                                <View style={styles.statLabelContainer}>
                                    {stat.icon}
                                    <Text style={styles.statLabel}>{stat.label}</Text>
                                </View>
                                <Text style={styles.statValue}>{stat.value}</Text>
                            </View>
                        ))
                    ) : (
                        <View style={styles.noStatsContainer}>
                            <Text style={styles.noStatsText}>---</Text>
                        </View>
                    )}
                </View>

                <TouchableOpacity
                  style={styles.buyButton}
                  onPress={() => {
                    handleBuyItem(selectedShopItem, 'both');
                    
                    if (currentTab === 'MAGIC') {
                      setNpcOverride({
                        image: ASSETS.nyxHappy,
                        text: "Thank you for your purchase, you should buy more!"
                      });
                      playHunterSound('nyxPurchase');
                      setTimeout(() => setNpcOverride(null), 5000);
                    } else if (currentTab === 'HUNTER') {
                      setNpcOverride({
                        image: ASSETS.leoHappy,
                        text: "Great choice! This will serve you well."
                      });
                      setTimeout(() => setNpcOverride(null), 5000);
                    }

                    setSelectedShopItem(null);
                  }}
                >
                  <Text style={styles.buyButtonText}>BUY</Text>
                  <View style={styles.buyCostRow}>
                    {selectedShopItem.price > 0 && (
                      <>
                        <Image source={ASSETS.coinIcon} style={styles.buyIcon} contentFit="contain" />
                        <Text style={styles.buyText}>{selectedShopItem.price}</Text>
                      </>
                    )}
                    {(selectedShopItem as any).gem_price > 0 && (
                      <>
                        <Image source={ASSETS.gemIcon} style={styles.buyIcon} contentFit="contain" />
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
              </View>
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
              { borderColor: RARITY_COLORS[summonResult?.item_rarity?.toUpperCase()] || RANK_COLORS[summonResult?.item_rarity?.toUpperCase()] || '#fff' }
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
                <Text style={[styles.revealItemName, { color: RARITY_COLORS[summonResult.item_rarity?.toUpperCase()] || RANK_COLORS[summonResult.item_rarity?.toUpperCase()] }]}>
                  {summonResult.item_name}
                </Text>
                <Text style={[styles.revealRarity, { color: RARITY_COLORS[summonResult.item_rarity?.toUpperCase()] || RANK_COLORS[summonResult.item_rarity?.toUpperCase()] || '#94a3b8' }]}>[{summonResult.item_rarity} CLASS]</Text>
                
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
};

// ===========================
// STYLES
// ===========================
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#131524',
  },
  // --- Header ---
  headerBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  headerTitle: {
      fontSize: 28,
      fontWeight: 'bold',
      color: 'white',
      letterSpacing: 2,
      fontFamily: Platform.OS === 'ios' ? 'System' : 'monospace',
  },
  currencyContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: 'rgba(19, 21, 36, 0.8)',
      paddingHorizontal: 15,
      paddingVertical: 8,
      borderRadius: 20,
      borderWidth: 1.5,
      borderColor: '#4df0f0',
      shadowColor: '#4df0f0',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.8,
      shadowRadius: 10,
      elevation: 5,
  },
  currencyItem: {
      flexDirection: 'row',
      alignItems: 'center',
  },
  headerIcon: {
      width: 20,
      height: 20,
      marginRight: 6,
  },
  currencyText: {
      fontWeight: 'bold',
      fontSize: 16,
  },

  // --- Tabs ---
  tabContainer: {
    flexDirection: 'row',
    marginBottom: 15,
    backgroundColor: 'rgba(30, 33, 50, 0.4)',
    marginHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    overflow: 'hidden',
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    position: 'relative',
  },
  tabButtonInactive: {
    backgroundColor: 'transparent',
  },
  tabUnderline: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: '#4df0f0',
    shadowColor: '#4df0f0',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 10,
    elevation: 2,
  },
  tabIcon: {
      width: 20,
      height: 20,
  },
  tabButtonText: {
    color: '#888',
    fontWeight: '800',
    marginLeft: 8,
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },

  // --- Hero Section ---
  heroContainer: {
    height: 180,
    width: '100%',
    marginBottom: 10,
    overflow: 'hidden',
  },
  heroBackground: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: '#1E2132',
  },
  heroCharacterContainer: {
    position: 'absolute',
    right: -10,
    bottom: 0,
    height: '100%',
    width: '60%',
    alignItems: 'center',
    justifyContent: 'flex-end',
    zIndex: 1,
  },
  heroCharacter: {
    width: '100%',
    height: '100%',
  },
  dialogueOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    paddingTop: 40,
    zIndex: 10,
  },
  npcNameTagContainer: {
    marginBottom: 10,
  },
  npcNameTag: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: '#4df0f0',
    backgroundColor: '#131524',
    alignSelf: 'flex-start',
    shadowColor: '#4df0f0',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 5,
    elevation: 3,
  },
  npcNameText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  dialogueText: {
    color: '#fff',
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '500',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: {width: -1, height: 1},
    textShadowRadius: 10,
    maxWidth: '85%', 
  },

  // --- Filters ---
  filterContainer: {
    flexDirection: 'row',
    marginVertical: 15,
    height: 50,
  },
  filterButton: {
    paddingHorizontal: 15,
    paddingVertical: 10,
    backgroundColor: 'rgba(30, 33, 50, 0.6)',
    borderRadius: 8,
    marginRight: 10,
    minWidth: 80,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  filterButtonActive: {
    backgroundColor: '#4df0f0',
    borderColor: '#4df0f0',
  },
  filterIcon: {
    width: 16,
    height: 16,
  },
  filterButtonTextActive: {
    color: '#131524',
    fontWeight: 'bold',
    fontSize: 12,
  },
  filterButtonText: {
    color: '#888',
    fontWeight: 'bold',
    fontSize: 12,
  },

  // --- Item Card ---
  gridContentContainer: {
    paddingHorizontal: GRID_PADDING,
    paddingBottom: 20,
    gap: GRID_GAP, // Vertical spacing between rows
  },
  gridColumnWrapper: {
    gap: GRID_GAP, // Horizontal spacing between items
    justifyContent: 'flex-start',
  },
  emptyState: {
    padding: 20,
    alignItems: 'center',
  },
  emptyStateText: {
    color: '#64748b',
    fontStyle: 'italic',
  },
  
  // --- Modals ---
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '90%',
    maxWidth: 360,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalInnerContent: {
    width: '100%',
    padding: 24,
    alignItems: 'center',
    zIndex: 10,
  },
  modalTopBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 16,
  },
  levelBadge: {
    backgroundColor: '#050b14',
    borderWidth: 1,
    borderColor: 'rgba(77, 240, 240, 0.6)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    shadowColor: '#4df0f0',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 2,
  },
  levelText: {
    color: '#4df0f0',
    fontSize: 12,
    fontFamily: 'monospace',
    fontWeight: 'bold',
  },
  rarityBadge: {
    backgroundColor: '#1a2c38',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 2,
    borderWidth: 1,
    borderColor: '#2a4555',
  },
  rarityText: {
    fontSize: 10,
    color: '#d1d5db',
    fontWeight: 'bold',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  modalImageWrapper: {
    position: 'relative',
    width: 120,
    height: 120,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  modalImageInnerCircle: {
    zIndex: 10,
    width: 100,
    height: 100,
    backgroundColor: '#050b14',
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#1a3545',
    overflow: 'hidden',
    elevation: 3,
  },
  modalImage: {
    width: 60,
    height: 60,
  },
  modalTitle: {
    color: '#ecfeff',
    fontSize: 22,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    textShadowColor: 'rgba(77, 240, 240, 0.5)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 3,
  },
  modalCategory: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    marginBottom: 16,
    letterSpacing: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
  },
  modalDescription: {
    color: '#94a3b8',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
    paddingHorizontal: 10,
  },
  modalStatsBox: {
    width: '100%',
    backgroundColor: 'rgba(26, 44, 56, 0.5)',
    borderWidth: 1,
    borderColor: '#1a3545',
    borderRadius: 4,
    padding: 12,
    marginBottom: 24,
    gap: 6,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  statLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statLabel: {
    color: 'rgba(165, 243, 252, 0.8)',
    fontSize: 14,
    fontWeight: '600',
  },
  statValue: {
    color: '#ecfeff',
    fontFamily: 'monospace',
    fontSize: 14,
    fontWeight: 'bold',
    letterSpacing: 0.3,
  },
  noStatsContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
  },
  noStatsText: {
    color: '#4b5563',
    fontSize: 14,
    fontStyle: 'italic',
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
