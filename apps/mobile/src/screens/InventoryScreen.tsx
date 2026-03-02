import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Modal,
  Dimensions,
  Platform,
  TextInput,
} from 'react-native';
import { Image } from 'expo-image';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { MotiView, AnimatePresence } from 'moti';
import * as Haptics from 'expo-haptics';
import { playHunterSound } from '@/utils/audio';
import { useAudio } from '@/contexts/AudioContext';

// Import existing icons
import { LockIcon } from '@/components/icons/LockIcon';
import { XIcon } from '@/components/icons/XIcon';
import { Edit2 } from 'lucide-react-native';

// Custom components and types
import { User, ShopItem, UserCosmetic } from '@/types/user';
import { calculateLevel, getRank, calculateDerivedStats, calculateCombatPower } from '@/utils/stats';
import { RANK_COLORS } from '@/constants/gameConstants';
import LayeredAvatar from '@/components/LayeredAvatar';
import { PetLayeredAvatar } from '@/components/PetLayeredAvatar';
import { ShopItemMedia } from '@/components/ShopItemMedia';
import { SkillLoadout } from '@/components/SkillLoadout';
import { StatusWindowModal } from '@/components/modals/StatusWindowModal';
import { useAuth } from '@/contexts/AuthContext';
import { useActivePet } from '@/contexts/ActivePetContext';
import { useNotification } from '@/contexts/NotificationContext';
import { useGameData } from '@/hooks/useGameData';
import { useApi } from '@/hooks/useApi';
import { usePets } from '@/hooks/usePets';
import { PetList } from '@/components/PetList';
import { supabase } from '@/lib/supabase';

const { width } = Dimensions.get('window');

export const InventoryScreen: React.FC = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { user, setUser, isLoading } = useAuth();
  const { showNotification } = useNotification();
  const { shopItems, equippedItems, refreshGameData } = useGameData();
  const { fetchData } = useApi();
  const { pets, renamePet, loading, updatePetMetadata } = usePets();
  const { activePetId, setActivePetId } = useActivePet();
  const { playTrack } = useAudio();

  useFocusEffect(
    useCallback(() => {
      playTrack('Dashboard');
    }, [playTrack])
  );

  const [inventoryFilter, setInventoryFilter] = useState<'all' | 'equipped' | 'weapons' | 'armor' | 'accessories' | 'magics' | 'pets' | 'other'>('all');
  const [inventorySortAZ, setInventorySortAZ] = useState(false);
  const [selectedInventoryItem, setSelectedInventoryItem] = useState<{ item: ShopItem; cosmeticItem: UserCosmetic } | null>(null);
  const [showStatusWindow, setShowStatusWindow] = useState(false);
  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const [showBackgroundModal, setShowBackgroundModal] = useState(false);
  const [selectedAvatar, setSelectedAvatar] = useState<User | null>(null);
  const [viewMode, setViewMode] = useState<'avatar' | 'pet'>('avatar');
  
  // Pet Renaming State
  const [isRenamingPet, setIsRenamingPet] = useState(false);
  const [petNewName, setPetNewName] = useState('');

  const activePet = pets.find(p => p.id === activePetId) || (pets.length > 0 ? pets[0] : null);

  const handleRenamePet = useCallback(async () => {
    const targetPetId = activePet?.id || activePetId;
    if (!targetPetId || !petNewName.trim()) {
      setIsRenamingPet(false);
      return;
    }
    try {
      await renamePet(targetPetId, petNewName.trim());
      showNotification('Pet renamed successfully', 'success');
    } catch (error) {
      showNotification('Failed to rename pet', 'error');
    } finally {
      setIsRenamingPet(false);
    }
  }, [activePet?.id, activePetId, petNewName, renamePet, showNotification]);

  if (isLoading) {
    return (
      <View style={styles.container}>
        <SafeAreaView style={[styles.container, { paddingTop: insets.top, justifyContent: 'center' }]}>
          <Text style={styles.loadingText}>INITIALIZING_SYSTEM...</Text>
        </SafeAreaView>
      </View>
    );
  }

  if (!user) {
    return (
      <View style={styles.container}>
        <SafeAreaView style={[styles.container, { paddingTop: insets.top, alignItems: 'center', justifyContent: 'center' }]}>
          <Text style={[styles.loadingText, { marginBottom: 20 }]}>ACCESS_RESTRICTED. HUNTER_LICENSE_REQUIRED.</Text>
          <TouchableOpacity 
            style={{ 
              backgroundColor: 'rgba(6, 182, 212, 0.2)', 
              paddingHorizontal: 24, 
              paddingVertical: 12, 
              borderRadius: 4,
              borderWidth: 1,
              borderColor: '#06b6d4'
            }}
            onPress={() => navigation.navigate('Login' as any)}
          >
            <Text style={{ color: '#06b6d4', fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1 }}>LOGIN_SYSTEM</Text>
          </TouchableOpacity>
        </SafeAreaView>
      </View>
    );
  }

  const level = calculateLevel(user.exp || 0);
  const playerRank = getRank(level);

  // Helper to check if item gender matches user gender
  const isGenderCompatible = useCallback((itemGender: string | string[] | undefined, userGender: string | undefined) => {
    if (!itemGender || itemGender === 'unisex') return true;
    if (!userGender) return true; // If user has no gender set, allow all
    
    if (Array.isArray(itemGender)) {
      return itemGender.includes(userGender) || itemGender.includes('unisex');
    }
    return itemGender === userGender || itemGender === 'unisex';
  }, []);

  // Max accessories allowed
  const MAX_ACCESSORIES = 6;

  // Check if slot is an avatar/body replacement slot (for equip rules)
  const isAvatarSlot = useCallback((slot: string | undefined) => {
    const s = slot?.toLowerCase();
    return s === 'avatar' || s === 'fullbody' || s === 'skin' || s === 'character';
  }, []);

  // Creator / avatar-builder slots: only shown in Avatar Customization, never in main inventory
  const CREATOR_SLOTS = ['base_body', 'face_eyes', 'face_mouth', 'hair'] as const;
  const isCreatorSlot = useCallback((slot: string | undefined) => {
    const s = slot?.toLowerCase();
    return CREATOR_SLOTS.includes(s as any);
  }, []);

  // Get the effective gender from an item (returns 'male', 'female', or null for unisex)
  const getItemGender = useCallback((itemGender: string | string[] | undefined): string | null => {
    if (!itemGender || itemGender === 'unisex') return null;
    if (Array.isArray(itemGender)) {
      // If item supports multiple genders including unisex, treat as unisex
      if (itemGender.includes('unisex')) return null;
      // If only one gender in array, use that
      if (itemGender.length === 1) return itemGender[0];
      return null; // Multiple genders means it's compatible with both
    }
    return itemGender;
  }, []);

  const handleEquipCosmetic = useCallback(async (cosmeticId: string, equipped: boolean) => {
    if (!user) return;
    
    const targetCosmetic = user.cosmetics?.find(c => c.id === cosmeticId);
    
    if (!targetCosmetic) return;

    const targetSlot = targetCosmetic.shop_items?.slot?.toLowerCase();
    const targetItemGender = targetCosmetic.shop_items?.gender;
    const imageUrl = targetCosmetic.shop_items?.image_url;

    // --- PET BACKGROUND EQUIP LOGIC ---
    if (viewMode === 'pet' && targetSlot === 'background') {
      // Use the derived activePet (which includes fallback logic) to ensure we get an ID if one exists
      const targetPetId = activePet?.id || activePetId;

      if (!targetPetId) {
        showNotification('No active pet selected', 'error');
        return;
      }

      playHunterSound(equipped ? 'equip' : 'click');
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      try {
        // Prepare metadata: keep existing, set/unset equipped_background
        const currentPet = pets.find(p => p.id === targetPetId);
        const newMetadata = { 
          ...(currentPet?.metadata || {}), 
          equipped_background: equipped ? imageUrl : null 
        };

        await updatePetMetadata(targetPetId, newMetadata);
        
        showNotification(equipped ? 'Pet background updated' : 'Pet background removed', 'success');
        return; // Exit early, don't run player equipment logic
      } catch (error) {
        console.error('Error updating pet background:', error);
        showNotification('Failed to update pet background', 'error');
        return;
      }
    }

    const previousCosmetics = user.cosmetics;
    const previousGender = user.gender;
    
    // Determine if this is an avatar change that affects gender
    const isAvatarChange = equipped && isAvatarSlot(targetSlot);
    const avatarGender = isAvatarChange ? getItemGender(targetItemGender) : null;
    const newUserGender = avatarGender || user.gender; // Use avatar's gender or keep current
    
    // Gender check for non-avatar items: Can't equip items that don't match user's gender
    if (equipped && !isAvatarSlot(targetSlot) && !isGenderCompatible(targetItemGender, user.gender)) {
      playHunterSound('error');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      showNotification('Cannot equip: gender mismatch', 'error');
      return;
    }

    // Level requirement check
    if (equipped && targetCosmetic.shop_items?.min_level && user.level < targetCosmetic.shop_items.min_level) {
      playHunterSound('error');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      showNotification(`Level ${targetCosmetic.shop_items.min_level} required`, 'error');
      return;
    }

    // Class requirement check
    if (equipped && targetCosmetic.shop_items?.class_req && targetCosmetic.shop_items.class_req !== 'All' && user.current_class !== targetCosmetic.shop_items.class_req) {
      playHunterSound('error');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      showNotification(`${targetCosmetic.shop_items.class_req} class required`, 'error');
      return;
    }

    playHunterSound(equipped ? 'equip' : 'click');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    // Determine which items to unequip
    let itemsToUnequip: string[] = [];
    
    if (equipped) {
      // Check slot exclusivity rules
      if (targetSlot === 'accessory') {
        // Accessories: allow up to MAX_ACCESSORIES
        const currentlyEquippedAccessories = user.cosmetics?.filter(
          c => c.equipped && c.shop_items?.slot?.toLowerCase() === 'accessory' && c.id !== cosmeticId
        ) || [];
        
        if (currentlyEquippedAccessories.length >= MAX_ACCESSORIES) {
          playHunterSound('error');
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          showNotification(`Max ${MAX_ACCESSORIES} accessories allowed`, 'error');
          return;
        }
      } else {
        // All other slots: only one item allowed - unequip others in same slot
        const otherItemsInSlot = user.cosmetics?.filter(
          c => c.equipped && c.shop_items?.slot?.toLowerCase() === targetSlot && c.id !== cosmeticId
        ) || [];
        
        itemsToUnequip = otherItemsInSlot.map(c => c.id);
      }
      
      // If equipping an avatar with a specific gender, unequip incompatible items
      if (isAvatarChange && avatarGender) {
        const incompatibleItems = user.cosmetics?.filter(c => {
          if (!c.equipped || c.id === cosmeticId) return false;
          // Don't unequip avatar slot items (they're handled by slot exclusivity)
          if (isAvatarSlot(c.shop_items?.slot)) return false;
          // Check if item is compatible with the new gender
          return !isGenderCompatible(c.shop_items?.gender, avatarGender);
        }) || [];
        
        itemsToUnequip = [...new Set([...itemsToUnequip, ...incompatibleItems.map(c => c.id)])];
      }
    }

    // Optimistic Update
    let updatedCosmetics = user.cosmetics?.map(c => {
      if (c.id === cosmeticId) return { ...c, equipped };
      if (itemsToUnequip.includes(c.id)) return { ...c, equipped: false };
      return c;
    }) || [];
    
    setUser({ ...user, gender: newUserGender, cosmetics: updatedCosmetics });

    try {
      // Update target item
      const { error } = await supabase
        .from('user_cosmetics')
        .update({ equipped })
        .eq('id', cosmeticId);

      if (error) throw error;
      
      // Unequip other items in the same slot (enforce exclusivity in DB)
      if (itemsToUnequip.length > 0) {
        const { error: unequipError } = await supabase
          .from('user_cosmetics')
          .update({ equipped: false })
          .in('id', itemsToUnequip);
          
        if (unequipError) console.error('Error unequipping other items:', unequipError);
      }
      
      // Update user's gender in profile if avatar changed it
      if (isAvatarChange && avatarGender && avatarGender !== previousGender) {
        const { error: genderError } = await supabase
          .from('profiles')
          .update({ gender: avatarGender })
          .eq('id', user.id);
          
        if (genderError) console.error('Error updating gender:', genderError);
      }
      
      refreshGameData();
      const itemName = targetCosmetic.shop_items?.name || 'Item';
      showNotification(
        equipped ? `${itemName} equipped` : `${itemName} unequipped`,
        'success'
      );
    } catch (error) {
      console.error('Error equipping/unequipping cosmetic:', error);
      playHunterSound('error');
      setUser({ ...user, gender: previousGender, cosmetics: previousCosmetics }); // Revert on error
      showNotification('Failed to update equipment', 'error');
    }
  }, [
    user, 
    setUser, 
    refreshGameData, 
    showNotification, 
    isGenderCompatible, 
    isAvatarSlot, 
    getItemGender,
    viewMode,
    activePetId,
    activePet,
    pets,
    updatePetMetadata
  ]);

  const handleUseItem = useCallback(async (cosmeticId: string) => {
    try {
      playHunterSound('click');
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      const { data, error } = await supabase.rpc('use_cosmetic_item', {
        p_cosmetic_id: cosmeticId
      });

      if (error) throw error;

      if (data && data.success) {
        showNotification(data.message || 'Item used successfully', 'success');

        // Optimistic update
        if (user) {
           const updatedCosmetics = (user.cosmetics || []).map(c => {
             if (c.id === cosmeticId) {
               if (data.remaining > 0) {
                 return { ...c, quantity: data.remaining };
               } else {
                 return null; // Will be filtered out
               }
             }
             return c;
           }).filter(Boolean) as UserCosmetic[];
           
           setUser({
             ...user,
             cosmetics: updatedCosmetics,
             current_hp: data.new_hp !== undefined ? data.new_hp : user.current_hp,
             exp: data.new_exp !== undefined ? data.new_exp : user.exp
           });
           
           if (data.remaining === 0) {
              setSelectedInventoryItem(null); // Close modal if item consumed
           }
        }

        refreshGameData(); // Refresh to update inventory/stats
      } else {
        playHunterSound('error');
        showNotification(data?.message || 'Failed to use item', 'error');
      }
    } catch (error) {
      console.error('Error using item:', error);
      playHunterSound('error');
      showNotification('Failed to use item', 'error');
    }
  }, [showNotification, refreshGameData]);

  const getIsEquipped = useCallback((cosmeticItem: UserCosmetic) => {
    if (viewMode === 'pet') {
      const itemUrl = cosmeticItem.shop_items?.image_url;
      return activePet?.metadata?.equipped_background === itemUrl;
    }
    return cosmeticItem.equipped;
  }, [viewMode, activePet?.metadata?.equipped_background, activePet]);

  const getFilteredInventoryItems = useCallback(() => {
    let filtered = (user.cosmetics || []).filter((cosmeticItem: UserCosmetic) => {
      const item = cosmeticItem.shop_items || shopItems.find(shopItem => shopItem.id === cosmeticItem.shop_item_id);
      const slot = item?.slot?.toLowerCase();
      
      if (!slot) return true;

      // PET MODE FILTERING: Only show Backgrounds when viewing Pet
      if (viewMode === 'pet') {
        return slot === 'background';
      }

      // AVATAR MODE FILTERING (Standard): Hide backgrounds and avatar creator items
      if (slot === 'background' || slot === 'avatar') return false;
      if (isCreatorSlot(slot)) return false; 
      
      return true;
    });

    if (inventoryFilter !== 'all' && viewMode !== 'pet') {
      // Standard filters only apply in Avatar mode
      filtered = filtered.filter((cosmeticItem: UserCosmetic) => {
        const item = cosmeticItem.shop_items || shopItems.find(shopItem => shopItem.id === cosmeticItem.shop_item_id);
        switch (inventoryFilter) {
          case 'equipped':
            return cosmeticItem.equipped === true;
          case 'weapons':
            return item?.slot === 'weapon';
          case 'armor':
            return item?.slot === 'body';
          case 'accessories':
            return (!['weapon', 'body', 'background', 'magic effects', 'avatar', 'fullbody', 'skin', 'character', 'other', 'pet', 'misc', 'consumable'].includes(item?.slot || '') && !item?.item_effects) || ['face', 'eyes'].includes(item?.slot || '');
          case 'magics':
            return item?.slot === 'magic effects';
          case 'pets':
            return item?.slot === 'pet';
          case 'other':
            return ['other', 'misc', 'consumable'].includes(item?.slot || '');
          default:
            return true;
        }
      });
    }

    if (inventorySortAZ) {
      return filtered.sort((a: UserCosmetic, b: UserCosmetic) => {
        const itemA = a.shop_items || shopItems.find(shopItem => shopItem.id === a.shop_item_id);
        const itemB = b.shop_items || shopItems.find(shopItem => shopItem.id === b.shop_item_id);
        const nameA = itemA?.name || '';
        const nameB = itemB?.name || '';
        return nameA.localeCompare(nameB);
      });
    } else {
      return filtered.sort((a: UserCosmetic, b: UserCosmetic) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }
  }, [user, inventoryFilter, inventorySortAZ, shopItems, isCreatorSlot, viewMode]);

  const getFullDescription = useCallback((item: ShopItem) => {
    if (item.bonuses && Array.isArray(item.bonuses) && item.bonuses.length > 0) {
      return 'BONUSES: ' + item.bonuses.map((bonus: any) => {
        const typeName = bonus.type === 'str' ? 'STR' :
                        bonus.type === 'spd' ? 'SPD' :
                        bonus.type === 'end' ? 'END' :
                        bonus.type === 'int' ? 'INT' :
                        bonus.type === 'lck' ? 'LCK' :
                        bonus.type === 'per' ? 'PER' :
                        bonus.type === 'wil' ? 'WIL' :
                        bonus.type === 'attack_damage' ? 'ATK DMG' :
                        bonus.type === 'crit_percentage' ? 'CRIT %' :
                        bonus.type === 'crit_damage' ? 'CRIT DMG' :
                        bonus.type === 'intelligence' ? 'INT' :
                        bonus.type.replace('_', ' ').toUpperCase();
        const suffix = bonus.type.includes('percentage') || bonus.type === 'xp_boost' ? '%' :
                     bonus.type === 'crit_damage' ? 'x' : '';
        return `${typeName} +${bonus.value}${suffix}`;
      }).join(', ');
    } else if (item.bonus_type) {
      const typeName = item.bonus_type === 'str' ? 'STR' :
                     item.bonus_type === 'spd' ? 'SPD' :
                     item.bonus_type === 'end' ? 'END' :
                     item.bonus_type === 'int' ? 'INT' :
                     item.bonus_type === 'lck' ? 'LCK' :
                     item.bonus_type === 'per' ? 'PER' :
                     item.bonus_type === 'wil' ? 'WIL' :
                     item.bonus_type === 'attack_damage' ? 'ATK DMG' :
                     item.bonus_type === 'crit_percentage' ? 'CRIT %' :
                     item.bonus_type === 'crit_damage' ? 'CRIT DMG' :
                     item.bonus_type === 'intelligence' ? 'INT' :
                     item.bonus_type.replace('_', ' ').toUpperCase();
      const suffix = item.bonus_type.includes('percentage') || item.bonus_type === 'xp_boost' ? '%' :
                   item.bonus_type === 'crit_damage' ? 'x' : '';
      return `BONUS: ${typeName} +${item.bonus_value}${suffix}`;
    }
    return '';
  }, []);

  const renderItemDetailModal = (isNested: boolean = false) => {
    if (!selectedInventoryItem) return null;
    const { item, cosmeticItem } = selectedInventoryItem;
    
    const content = (
      <View style={isNested ? [styles.modalOverlay, { backgroundColor: 'rgba(0,0,0,0.8)', position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 1000 }] : styles.modalOverlay}>
        <View style={styles.itemDetailModalContent}>
          <TouchableOpacity onPress={() => setSelectedInventoryItem(null)} style={styles.closeModalButton}>
            <XIcon size={24} color="#9ca3af" />
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
                  <Text style={styles.requirementBadgeText}>👤 {Array.isArray(item.gender) ? item.gender.join('/') : item.gender} Only</Text>
                </View>
              )}
            </View>
          ) : null}

          <Text style={styles.itemDetailDescription}>{item.description || 'Visual item'}</Text>

          {((item.bonuses && Array.isArray(item.bonuses) && item.bonuses.length > 0) ||
            item.bonus_type) && (
            <Text style={styles.itemDetailBonuses}>
              {getFullDescription(item)}
            </Text>
          )}

          {item.is_animated && (
            <Text style={styles.itemDetailAnimated}>✨ ANIMATED EFFECT</Text>
          )}

          <Text style={styles.itemDetailRarity}>{item.rarity || 'common'} rarity</Text>

          <Text style={styles.itemDetailEquippedStatus}>
            {cosmeticItem.equipped ? (
              <Text style={{ color: '#34d399' }}>✅ EQUIPPED</Text>
            ) : (
              <Text style={{ color: '#6b7280' }}>❌ NOT EQUIPPED</Text>
            )}
          </Text>

          <TouchableOpacity
            onPress={() => setSelectedInventoryItem(null)}
            style={styles.closeButtonPrimary}
          >
            <Text style={styles.closeButtonPrimaryText}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    );

    if (isNested) return content;

    return (
      <Modal
        animationType="fade"
        transparent={true}
        visible={!!selectedInventoryItem}
        onRequestClose={() => setSelectedInventoryItem(null)}
      >
        {content}
      </Modal>
    );
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#020617', '#0f172a', '#020617']}
        style={StyleSheet.absoluteFill}
      />
      
      <SafeAreaView style={{ flex: 1, paddingTop: Platform.OS === 'android' ? insets.top : 0 }}>
        {/* HUD Header */}
        <View style={styles.hudHeader}>
          <View style={styles.hudLeft}>
            <Text style={styles.hudName}>{user.name || 'UNKNOWN'}</Text>
            <View style={styles.hudStatsRow}>
              <Text style={styles.hudStatText}>
                LV. <Text style={styles.hudLevelValue}>{level}</Text>
              </Text>
              <Text style={styles.hudStatText}>
                CP <Text style={styles.hudCPValue}>{calculateCombatPower(user).toLocaleString()}</Text>
              </Text>
            </View>
          </View>

          <View style={styles.hudCenter}>
            <View style={styles.headerCurrencyContainer}>
              {/* Status Window Button */}
              <TouchableOpacity 
                onPress={() => setShowStatusWindow(true)} 
                style={styles.statsBtn}
              >
                <Image source={require('../../assets/stats.png')} style={styles.statsIcon} contentFit="contain" />
              </TouchableOpacity>

              {/* Gold */}
              <View style={styles.currencyPillYellow}>
                <Image source={require('../../assets/coinicon.png')} style={styles.currencyIcon} contentFit="contain" />
                <Text style={styles.currencyTextYellow}>{(user.coins || 0).toLocaleString()}</Text>
              </View>

              {/* Gems */}
              <View style={styles.currencyPillPurple}>
                <Image source={require('../../assets/gemicon.png')} style={styles.currencyIcon} contentFit="contain" />
                <Text style={styles.currencyTextPurple}>{(user.gems || 0).toLocaleString()}</Text>
              </View>
            </View>
          </View>
          
          <View style={styles.hudRight}>
            <Text style={styles.hudLabel}>RANK</Text>
            <Text style={[styles.hudValue, styles.rankValue, { color: RANK_COLORS[playerRank] || '#fff' }]}>{playerRank}</Text>
          </View>
        </View>

        <ScrollView
          style={styles.scrollViewContent}
          contentContainerStyle={{ paddingBottom: 220 + insets.bottom }}
          showsVerticalScrollIndicator={false}
        >
          <MotiView 
            from={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            style={styles.avatarSection}
          >
            <View style={styles.avatarContainer}>
              {/* Layered Avatar - Always mounted to preserve state/images */}
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
                  size={width < 640 ? width * 0.7 : 224} 
                  square 
                  onAvatarClick={() => setSelectedAvatar(user)} 
                  allShopItems={shopItems}
                />
              </MotiView>

              {/* Pet View */}
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
                  <PetLayeredAvatar
                    petDetails={activePet.pet_details}
                    size={width < 640 ? width * 0.7 : 224}
                    square
                    hideBackground={false}
                    background={activePet.metadata?.equipped_background}
                  />
                ) : (
                  <View style={styles.noPetPlaceholder}>
                    <Text style={styles.noPetText}>NO_ACTIVE_PET</Text>
                  </View>
                )}
              </MotiView>

              <View style={styles.avatarButtonsContainer}>
                <TouchableOpacity
                  onPress={() => {
                    playHunterSound('click');
                    setShowAvatarModal(true);
                  }}
                  style={styles.avatarButton}
                >
                  <Image source={require('../../assets/changeavatar.png')} style={styles.avatarButtonIcon} contentFit="contain" />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => {
                    playHunterSound('click');
                    setShowBackgroundModal(true);
                  }}
                  style={styles.backgroundButton}
                >
                  <Image source={require('../../assets/backgroundicon.png')} style={styles.avatarButtonIcon} contentFit="contain" />
                </TouchableOpacity>
                {/* Pet View Toggle */}
                <TouchableOpacity
                  onPress={() => {
                    playHunterSound('swipe');
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    setViewMode(viewMode === 'avatar' ? 'pet' : 'avatar');
                  }}
                  style={[
                    styles.swapButton,
                    viewMode === 'pet' ? styles.swapButtonActive : null
                  ]}
                >
                  <Text style={styles.swapButtonIcon}>{viewMode === 'avatar' ? '🐾' : '👤'}</Text>
                </TouchableOpacity>
              </View>
            </View>
            
            {viewMode === 'pet' && (
              <View style={styles.statsContainer}>
                <View style={styles.statItem}>
                  <View style={styles.statValueContainer}>
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
                      onChangeText={setPetNewName}
                      autoFocus={true}
                      onSubmitEditing={handleRenamePet}
                      onBlur={handleRenamePet}
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
                        <TouchableOpacity 
                          onPress={() => {
                            setPetNewName(activePet.nickname || activePet.pet_details?.name || '');
                            setIsRenamingPet(true);
                          }}
                          hitSlop={10}
                        >
                          <Edit2 size={14} color="rgba(34, 211, 238, 0.5)" />
                        </TouchableOpacity>
                      )}
                    </View>
                  )}
                </View>
              </View>
            )}
          </MotiView>

        {/* Equipped Items Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionHeader, { color: RANK_COLORS['C'] }]}>
            ⚔️ EQUIPPED ITEMS
          </Text>
          <View style={styles.equippedGrid}>
            {['weapon', 'body', 'back', 'hands', 'feet'].map(slot => {
              const equippedItem = (equippedItems || []).find((cosmetic: UserCosmetic) => cosmetic.shop_items?.slot === slot);
              const rarity = equippedItem?.shop_items?.rarity?.toLowerCase() || 'common';
              const rarityColor = RANK_COLORS[rarity.charAt(0).toUpperCase()] || '#9ca3af';
              
              return (
                <TouchableOpacity 
                  key={slot}
                  style={[
                    styles.equippedSlot,
                    equippedItem 
                      ? { borderColor: rarityColor, backgroundColor: 'rgba(15, 23, 42, 0.8)', shadowColor: rarityColor, shadowOpacity: 0.15, shadowRadius: 10 } 
                      : styles.emptySlot,
                  ]}
                  onPress={() => equippedItem && setSelectedInventoryItem({ item: equippedItem.shop_items, cosmeticItem: equippedItem })}
                >
                  {equippedItem ? (
                    <View style={styles.equippedItemContent}>
                      <View 
                        style={[
                          styles.radiatingEnergy,
                          { 
                            backgroundColor: 
                            rarity === 'uncommon' ? 'rgba(34, 197, 94, 0.15)' :
                            rarity === 'rare' ? 'rgba(59, 130, 246, 0.25)' :
                            rarity === 'epic' ? 'rgba(168, 85, 247, 0.35)' :
                            rarity === 'legendary' ? 'rgba(255, 255, 0, 0.35)' :
                            rarity === 'monarch' ? 'rgba(255, 215, 0, 0.6)' :
                            'transparent'
                          }
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
                    {slot === 'weapon' ? 'weapon' :
                     slot === 'body' ? 'armor' :
                     slot === 'feet' ? 'feet' :
                     slot === 'hands' ? 'hands' :
                     slot === 'back' ? 'back' :
                     slot}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Equipped Accessories Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionHeader, { color: RANK_COLORS['B'] }]}>
            💍 EQUIPPED ACCESSORIES
          </Text>
          <View style={styles.equippedGrid}>
            {['magic effects', 'eyes', 'head', 'face', 'accessory'].map((slot, index) => {
              if (slot === 'accessory') {
                const allAccessories = (equippedItems || []).filter((cosmetic: UserCosmetic) => {
                  const itemSlot = cosmetic.shop_items?.slot;
                  return ['accessory', 'jewelry', 'charms', 'scarves', 'earrings'].includes(itemSlot || '');
                });

                return (
                  <View key="multi-accessory" style={styles.multiAccessorySlot}>
                    <View style={styles.multiAccessoryGrid}>
                      {Array.from({ length: 6 }, (_, accessoryIndex) => {
                        const equippedAccessory = allAccessories[accessoryIndex];
                        const rarity = equippedAccessory?.shop_items?.rarity?.toLowerCase() || 'common';
                        
                        return (
                          <TouchableOpacity 
                            key={accessoryIndex}
                            style={[
                              styles.miniAccessorySlot,
                              equippedAccessory ? { borderColor: RANK_COLORS[rarity.charAt(0).toUpperCase()], shadowColor: RANK_COLORS[rarity.charAt(0).toUpperCase()], shadowOpacity: 0.2 } : {},
                            ]}
                            onPress={() => equippedAccessory && setSelectedInventoryItem({ item: equippedAccessory.shop_items, cosmeticItem: equippedAccessory })}
                          >
                            {equippedAccessory ? (
                              <View style={styles.equippedItemContent}>
                                <View 
                                  style={[
                                    styles.radiatingEnergyMicro,
                                    { 
                                      backgroundColor: 
                                      rarity === 'uncommon' ? 'rgba(34, 197, 94, 0.2)' :
                                      rarity === 'rare' ? 'rgba(59, 130, 246, 0.3)' :
                                      rarity === 'epic' ? 'rgba(168, 85, 247, 0.4)' :
                                      rarity === 'legendary' ? 'rgba(255, 255, 0, 0.4)' :
                                      rarity === 'monarch' ? 'rgba(255, 215, 0, 0.7)' :
                                      'transparent'
                                    }
                                  ]}
                                />
                                <View style={styles.miniAccessoryMediaContainer}>
                                  <ShopItemMedia item={equippedAccessory.shop_items} style={styles.miniAccessoryMedia} />
                                </View>
                              </View>
                            ) : (
                              <LockIcon size={6} color="#4b5563" />
                            )}
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                    <Text style={styles.slotLabel}>Multi-Accessory</Text>
                  </View>
                );
              }

              const equippedItem = (equippedItems || []).find((cosmetic: UserCosmetic) => cosmetic.shop_items?.slot === slot);
              const rarity = equippedItem?.shop_items?.rarity?.toLowerCase() || 'common';
              const rarityColor = RANK_COLORS[rarity.charAt(0).toUpperCase()] || '#9ca3af';

              return (
                <TouchableOpacity 
                  key={slot}
                  style={[
                    styles.equippedSlot,
                    equippedItem 
                      ? { borderColor: rarityColor, backgroundColor: 'rgba(15, 23, 42, 0.8)', shadowColor: rarityColor, shadowOpacity: 0.2 } 
                      : styles.emptySlot,
                  ]}
                  onPress={() => equippedItem && setSelectedInventoryItem({ item: equippedItem.shop_items, cosmeticItem: equippedItem })}
                >
                  {equippedItem ? (
                    <View style={styles.equippedItemContent}>
                      <View 
                        style={[
                          styles.radiatingEnergy,
                          { 
                            backgroundColor: 
                            rarity === 'uncommon' ? 'rgba(34, 197, 94, 0.15)' :
                            rarity === 'rare' ? 'rgba(59, 130, 246, 0.25)' :
                            rarity === 'epic' ? 'rgba(168, 85, 247, 0.35)' :
                            rarity === 'legendary' ? 'rgba(255, 255, 0, 0.35)' :
                            rarity === 'monarch' ? 'rgba(255, 215, 0, 0.6)' :
                            'transparent'
                          }
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
                    {slot === 'magic effects' ? 'aura' :
                     slot === 'eyes' ? 'eyes' :
                     slot === 'head' ? 'Head' :
                     slot === 'face' ? 'face' :
                     slot}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Combat Loadout Section */}
        <SkillLoadout />

        {/* Inventory Section */}
        <View style={styles.section}>
          <View style={styles.inventoryHeader}>
            <Image source={require('../../assets/inventory.png')} style={styles.inventoryIcon} contentFit="contain" />
            <Text style={[styles.inventoryHeaderText, { color: RANK_COLORS['A'] }]}>
              Inventory
            </Text>
          </View>

          <View style={styles.filterBar}>
            {viewMode === 'pet' ? (
              <View style={styles.filterTabsContainer}>
                <TouchableOpacity style={[styles.filterTab, styles.filterTabActive]}>
                  <Text style={[styles.filterTabText, styles.filterTabTextActive]}>
                    BACKGROUNDS
                  </Text>
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
                {[ 
                  { id: 'all', label: 'All', icon: '📦' },
                  { id: 'equipped', label: 'Equipped', icon: '✨' },
                  { id: 'weapons', label: 'Weapons', icon: '⚔️' },
                  { id: 'armor', label: 'Armor', icon: '🛡️' },
                  { id: 'accessories', label: 'Accessories', icon: '💍' },
                  { id: 'magics', label: 'Magics', icon: '🔮' },
                  { id: 'pets', label: 'Pets', icon: '🐾' },
                  { id: 'other', label: 'Other', icon: '🎒' }
                ].map(tab => (
                  <TouchableOpacity
                    key={tab.id}
                    onPress={() => setInventoryFilter(tab.id as any)}
                    style={[
                      styles.filterTab,
                      inventoryFilter === tab.id ? styles.filterTabActive : null,
                    ]}
                  >
                    <Text style={[styles.filterTabText, inventoryFilter === tab.id && styles.filterTabTextActive]}>
                      {tab.label}
                    </Text>
                    {inventoryFilter === tab.id && <View style={styles.activeTabIndicator} />}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
            <TouchableOpacity
              onPress={() => setInventorySortAZ(!inventorySortAZ)}
              style={[
                styles.sortButton,
                inventorySortAZ ? styles.sortButtonActive : null,
              ]}
            >
              <Text style={styles.sortButtonText}>{inventorySortAZ ? 'AZ' : 'Recent'}</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.inventoryGrid}>
            {inventoryFilter === 'pets' && viewMode !== 'pet' ? (
              <PetList 
                pets={pets}
                loading={loading}
                onSelect={(pet) => {
                setActivePetId(pet.id);
                setViewMode('pet');
                playHunterSound('click');
              }} />
            ) : getFilteredInventoryItems().length === 0 ? (
              <Text style={styles.noItemsText}>
                {viewMode === 'pet' ? 'No backgrounds available for pet customization...' : 'No items in this category...'}
              </Text>
            ) : (
              getFilteredInventoryItems().map((cosmeticItem: UserCosmetic) => {
                const item = cosmeticItem.shop_items || shopItems.find(shopItem => shopItem.id === cosmeticItem.shop_item_id);
                if (!item) return null;
                const rarity = item.rarity?.toLowerCase() || 'common';
                const rarityColor = RANK_COLORS[rarity.charAt(0).toUpperCase()] || '#9ca3af';
                const isEquipped = getIsEquipped(cosmeticItem);

                return (
                  <TouchableOpacity
                    key={cosmeticItem.id}
                    style={[
                      styles.inventoryItemCard,
                      isEquipped ? styles.inventoryItemCardEquipped : null,
                    ]}
                    onPress={() => setSelectedInventoryItem({ item, cosmeticItem })}
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
                            rarity === 'uncommon' ? 'rgba(34, 197, 94, 0.2)' :
                            rarity === 'rare' ? 'rgba(59, 130, 246, 0.3)' :
                            rarity === 'epic' ? 'rgba(168, 85, 247, 0.4)' :
                            rarity === 'legendary' ? 'rgba(255, 255, 0, 0.4)' :
                            rarity === 'monarch' ? 'rgba(255, 215, 0, 0.7)' :
                            'transparent'
                          }
                        ]}
                      />
                      
                      <View style={styles.inventoryItemMediaContainer}>
                        <ShopItemMedia item={item} style={[styles.inventoryItemMedia, { borderRadius: 2 }]} />
                      </View>
                    </View>

                    <Text style={styles.inventoryItemName}>
                      {item.name}
                    </Text>

                    <TouchableOpacity
                      onPress={(e) => {
                        e.stopPropagation();
                        if (item.slot === 'consumable') {
                          handleUseItem(cosmeticItem.id);
                        } else {
                          // Pass boolean for equip state; logic handles pet vs player mode
                          handleEquipCosmetic(cosmeticItem.id, !isEquipped);
                        }
                      }}
                      style={[
                        styles.equipUnequipButton,
                        isEquipped ? styles.unequipButton : styles.equipButton,
                        (item.slot === 'consumable') && { borderColor: '#22c55e', backgroundColor: 'rgba(34, 197, 94, 0.2)' }
                      ]}
                    >
                      <Text style={styles.equipUnequipButtonText}>
                        {item.slot === 'consumable' 
                          ? 'USE' 
                          : isEquipped ? 'UNEQUIP' : 'EQUIP'}
                      </Text>
                    </TouchableOpacity>
                  </TouchableOpacity>
                );
              })
            )}
          </View>
        </View>
        <View style={{ height: 200 }} />
      </ScrollView>
      </SafeAreaView>

      {renderItemDetailModal(false)}

      {/* Avatar Customization Modal */}
      {showAvatarModal && (
        <Modal
          animationType="fade"
          transparent={true}
          visible={showAvatarModal}
          onRequestClose={() => setShowAvatarModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.customizationModalContent}>
              <TouchableOpacity onPress={() => setShowAvatarModal(false)} style={styles.closeModalButtonAbsolute}>
                <XIcon size={24} color="#9ca3af" />
              </TouchableOpacity>
              <View style={styles.customizationModalHeaderContainer}>
                <Text style={styles.customizationModalHeader}>Avatar Customization</Text>
              </View>
              <Text style={styles.customizationModalSubHeader}>Choose your hunter's appearance</Text>

              {(user.cosmetics?.filter((cosmetic: UserCosmetic) => cosmetic.shop_items?.slot === 'avatar').length === 0) ? (
                <View style={styles.emptyCustomizationPanel}>
                  <Text style={styles.emptyCustomizationEmoji}>🎭</Text>
                  <Text style={styles.emptyCustomizationText}>No holographic avatars in inventory</Text>
                  <Text style={styles.emptyCustomizationSubText}>Acquire new forms from the Hunter Shop</Text>
                </View>
              ) : (
                <ScrollView contentContainerStyle={styles.customizationGridContainer} showsVerticalScrollIndicator={false}>
                  <View style={styles.customizationGrid}>
                    {user.cosmetics?.filter((cosmetic: UserCosmetic) => cosmetic.shop_items?.slot === 'avatar').map((cosmetic: UserCosmetic) => {
                      const item = cosmetic.shop_items;
                      const isEquipped = cosmetic.equipped;
                      const rarityColor = RANK_COLORS[item.rarity.charAt(0).toUpperCase()] || '#9ca3af';

                      return (
                        <TouchableOpacity
                          key={cosmetic.id}
                          style={[
                            styles.customizationItemCard,
                            isEquipped ? styles.customizationItemCardEquipped : null,
                          ]}
                          onPress={() => setSelectedInventoryItem({ item, cosmeticItem: cosmetic })}
                        >
                          <View style={styles.customizationItemImageWrapper}>
                            <View style={[styles.customizationItemPulse, { backgroundColor: isEquipped ? rarityColor : 'transparent' }]} />
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
                              handleEquipCosmetic(cosmetic.id, !cosmetic.equipped);
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
              {renderItemDetailModal(true)}
            </View>
          </View>
        </Modal>
      )}

      {showBackgroundModal && (
        <Modal
          animationType="fade"
          transparent={true}
          visible={showBackgroundModal}
          onRequestClose={() => setShowBackgroundModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.customizationModalContent}>
              <TouchableOpacity onPress={() => setShowBackgroundModal(false)} style={styles.closeModalButtonAbsolute}>
                <XIcon size={24} color="#9ca3af" />
              </TouchableOpacity>
              <View style={styles.customizationModalHeaderContainer}>
                <Text style={styles.customizationModalHeader}>Background Customization</Text>
              </View>
              <Text style={styles.customizationModalSubHeader}>Choose your hunter's background</Text>

              {(user.cosmetics?.filter((cosmetic: UserCosmetic) => cosmetic.shop_items?.slot === 'background').length === 0) ? (
                <View style={styles.emptyCustomizationPanel}>
                  <Text style={styles.emptyCustomizationEmoji}>🏞️</Text>
                  <Text style={styles.emptyCustomizationText}>No holographic backgrounds in inventory</Text>
                  <Text style={styles.emptyCustomizationSubText}>Acquire new backgrounds from the Hunter Shop</Text>
                </View>
              ) : (
                <ScrollView contentContainerStyle={styles.customizationGridContainer} showsVerticalScrollIndicator={false}>
                  <View style={styles.customizationGrid}>
                    {user.cosmetics?.filter((cosmetic: UserCosmetic) => cosmetic.shop_items?.slot === 'background').map((cosmetic: UserCosmetic) => {
                      const item = cosmetic.shop_items;
                      const isEquipped = cosmetic.equipped;
                      const rarityColor = RANK_COLORS[item.rarity.charAt(0).toUpperCase()] || '#9ca3af';

                      return (
                        <TouchableOpacity
                          key={cosmetic.id}
                          style={[
                            styles.customizationItemCard,
                            isEquipped ? styles.customizationItemCardEquipped : null,
                          ]}
                          onPress={() => setSelectedInventoryItem({ item, cosmeticItem: cosmetic })}
                        >
                          <View style={styles.customizationItemImageWrapper}>
                            <View style={[styles.customizationItemPulse, { backgroundColor: isEquipped ? rarityColor : 'transparent', borderRadius: 8 }]} />
                            <ShopItemMedia
                              item={item}
                              style={[styles.customizationItemImage, { borderColor: rarityColor, borderRadius: 8 }]} 
                            />
                          </View>
                          <Text style={styles.customizationItemName}>{item.name}</Text>
                          <Text style={styles.customizationItemRarity}>{item.rarity || 'common'} class</Text>
                          <TouchableOpacity
                            onPress={(e) => {
                              e.stopPropagation();
                              handleEquipCosmetic(cosmetic.id, !cosmetic.equipped);
                            }}
                            style={[
                              styles.customizationEquipButton,
                              isEquipped ? styles.customizationUnequipButton : styles.customizationEquipButtonActive,
                            ]}
                          >
                            <Text style={styles.customizationEquipButtonText}>
                              {isEquipped ? 'UNEQUIP' : 'CHANGE BG'}
                            </Text>
                          </TouchableOpacity>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </ScrollView>
              )}
              {renderItemDetailModal(true)}
            </View>
          </View>
        </Modal>
      )}

      {/* Status Window Modal */}
      <StatusWindowModal
        visible={showStatusWindow}
        onClose={() => setShowStatusWindow(false)}
        user={user}
        setUser={setUser}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#020617',
  },
  hudHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(34, 211, 238, 0.3)',
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
  },
  hudLeft: {
    flexDirection: 'column',
    justifyContent: 'center',
    gap: 2,
  },
  hudName: {
    color: '#fff', 
    fontSize: 14,
    fontWeight: 'bold',
    lineHeight: 16,
    fontFamily: 'Exo2-Regular',
  },
  hudStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  hudStatText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#94a3b8',
    fontFamily: 'Exo2-Regular',
  },
  hudLevelValue: {
    color: '#22d3ee',
  },
  hudCPValue: {
    color: '#fbbf24',
  },
  hudRight: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    paddingHorizontal: 12,
    borderRadius: 9999,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    height: 28,
    flexDirection: 'row',
    gap: 6,
  },
  hudCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hudLabel: {
    color: 'rgba(34, 211, 238, 0.8)',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1.5,
    fontFamily: 'Exo2-Regular',
  },
  hudValue: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '900',
    fontFamily: 'Exo2-Regular',
    textTransform: 'uppercase',
    fontStyle: 'italic',
  },
  rankValue: {
    fontSize: 14,
    fontWeight: '900',
  },
  statValueContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 2,
  },
  statValuePrefix: {
    fontSize: 12,
    fontWeight: '900',
    color: '#22d3ee',
    fontStyle: 'italic',
  },
  headerCurrencyContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statsBtn: {
    borderWidth: 1,
    borderColor: 'rgba(6, 182, 212, 0.5)',
    height: 28,
    paddingHorizontal: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(6, 182, 212, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 4,
  },
  statsIcon: {
    width: 14,
    height: 14,
  },
  currencyPillPurple: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(88, 28, 135, 0.3)',
    borderWidth: 1,
    borderColor: 'rgba(168, 85, 247, 0.4)',
    borderRadius: 9999,
    paddingHorizontal: 10,
    height: 28,
    gap: 4,
  },
  currencyTextPurple: {
    color: '#e9d5ff',
    fontSize: 11,
    fontWeight: '900',
  },
  currencyPillYellow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(113, 63, 18, 0.3)',
    borderWidth: 1,
    borderColor: 'rgba(234, 179, 8, 0.4)',
    borderRadius: 9999,
    paddingHorizontal: 10,
    height: 28,
    gap: 4,
  },
  currencyTextYellow: {
    color: '#fef08a',
    fontSize: 11,
    fontWeight: '900',
  },
  currencyIcon: {
    width: 12,
    height: 12,
  },
  scrollViewContent: {
    flexGrow: 1,
  },
  loadingText: {
    color: '#22d3ee',
    textAlign: 'center',
    marginTop: 50,
    fontSize: 12,
    fontWeight: 'bold',
    letterSpacing: 2,
  },
  // Avatar Section
  avatarSection: {
    flexDirection: 'column',
    alignItems: 'center',
    paddingVertical: 30,
  },
  avatarContainer: {
    position: 'relative',
    width: width < 640 ? width * 0.7 : 224,
    height: width < 640 ? width * 0.7 : 224,
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 25,
    alignSelf: 'center',
  },
  absoluteView: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarButtonsContainer: {
    position: 'absolute',
    top: 0,
    right: -53,
    flexDirection: 'column',
    gap: 12,
  },
  avatarButton: {
    padding: 10,
    backgroundColor: 'rgba(6, 182, 212, 0.2)',
    borderColor: '#06b6d4',
    borderWidth: 1,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backgroundButton: {
    padding: 10,
    backgroundColor: 'rgba(6, 182, 212, 0.2)',
    borderColor: '#06b6d4',
    borderWidth: 1,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  swapButton: {
    padding: 10,
    backgroundColor: 'rgba(6, 182, 212, 0.2)',
    borderColor: '#06b6d4',
    borderWidth: 1,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  swapButtonActive: {
    backgroundColor: 'rgba(6, 182, 212, 0.3)',
    borderColor: '#06b6d4',
  },
  swapButtonIcon: {
    fontSize: 18,
  },
  petAvatarContainer: {
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(15, 23, 42, 0.8)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(6, 182, 212, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  petAvatarImage: {
    width: '80%',
    height: '80%',
  },
  noPetPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  noPetText: {
    color: 'rgba(6, 182, 212, 0.5)',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 2,
  },
  avatarButtonIcon: {
    width: 20,
    height: 20,
    resizeMode: 'contain',
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 16, // Reduced gap
    marginTop: 24,
    backgroundColor: 'rgba(15, 23, 42, 0.9)',
    paddingHorizontal: 20, // Reduced padding
    paddingVertical: 12, // Reduced padding
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(34, 211, 238, 0.2)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5,
    alignItems: 'center', // Center items vertically
    justifyContent: 'center', // Center content
  },
  statItem: {
    alignItems: 'center',
    flexDirection: 'row', // Horizontal layout for label and value
    gap: 8,
  },
  statLabel: {
    fontSize: 9,
    color: 'rgba(34, 211, 238, 0.7)',
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 0, // Removed bottom margin for row layout
  },
  statValue: {
    fontSize: 16, // Significantly reduced
    fontWeight: '900',
    color: '#fff',
    fontFamily: 'Exo2-Regular',
    textShadowColor: 'rgba(34, 211, 238, 0.3)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 5, // Reduced shadow
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignSelf: 'center',
  },
  renameInput: {
    backgroundColor: 'rgba(15, 23, 42, 0.7)',
    borderColor: '#06b6d4',
    borderWidth: 1,
    borderRadius: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
    color: '#fff',
    fontSize: 16,
  },
  // Section General
  section: {
    marginHorizontal: 16,
    marginBottom: 30,
  },
  sectionHeader: {
    fontSize: 10,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 3,
    marginBottom: 16,
    paddingVertical: 10,
    backgroundColor: 'rgba(34, 211, 238, 0.1)',
    borderLeftWidth: 4,
    borderLeftColor: '#22d3ee',
    paddingHorizontal: 15,
    fontFamily: 'Exo2-Regular',
  },

  // Equipped Items Grid
  equippedGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 8,
  },
  equippedSlot: {
    flex: 1,
    aspectRatio: 1,
    minWidth: width < 640 ? '18%' : '19%',
    maxWidth: width < 640 ? '19%' : '19%',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
    borderRadius: 4,
    borderWidth: 1,
    position: 'relative',
    overflow: 'hidden',
    backgroundColor: 'rgba(15, 23, 42, 0.9)',
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  emptySlot: {
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    borderColor: 'rgba(255, 255, 255, 0.05)',
    borderStyle: 'dashed',
  },
  equippedItemContent: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radiatingEnergy: {
    position: 'absolute',
    width: '130%', 
    height: '130%', 
    borderRadius: 9999, 
    opacity: 0.15,
  },
  equippedItemMediaContainer: {
    position: 'relative',
    zIndex: 10,
    width: 40, 
    height: 40, 
  },
  equippedItemMedia: {
    width: '100%',
    height: '100%',
    resizeMode: 'contain',
  },
  slotLabel: {
    position: 'absolute',
    bottom: 4,
    fontSize: 6,
    fontWeight: '900',
    textTransform: 'uppercase',
    color: '#6b7280', // gray-500
    letterSpacing: 0.5,
    fontFamily: 'Exo2-Regular',
  },

  // Multi-Accessory Slot
  multiAccessorySlot: {
    flex: 1,
    aspectRatio: 1,
    minWidth: width < 640 ? '18%' : '19%',
    maxWidth: width < 640 ? '19%' : '19%',
    flexDirection: 'column',
    padding: 8,
    backgroundColor: 'rgba(15, 23, 42, 0.8)', // slate-900/80
    borderColor: 'rgba(168, 85, 247, 0.5)', // purple-500/50
    borderWidth: 1,
    borderRadius: 2,
    position: 'relative',
    overflow: 'hidden',
    shadowColor: 'rgba(168, 85, 247, 0.15)',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 15,
    elevation: 3,
  },
  multiAccessoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    width: '100%',
    height: 'auto',
    marginBottom: 8,
  },
  miniAccessorySlot: {
    width: '31%', 
    aspectRatio: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)', 
    borderColor: 'rgba(255, 255, 255, 0.05)', 
    borderWidth: 1,
    borderRadius: 2,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  radiatingEnergyMicro: {
    position: 'absolute',
    width: '116%', 
    height: '116%', 
    borderRadius: 9999, 
    opacity: 0.4,
  },
  miniAccessoryMediaContainer: {
    position: 'relative',
    zIndex: 10,
    width: '100%',
    height: '100%',
    padding: 2, 
  },
  miniAccessoryMedia: {
    width: '100%',
    height: '100%',
    resizeMode: 'contain',
  },

  // Inventory Section
  inventoryHeader: {
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    backgroundColor: 'rgba(15, 23, 42, 0.7)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 12,
    borderRadius: 4,
  },
  inventoryHeaderText: {
    fontSize: 10,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    fontFamily: 'Exo2-Regular',
  },
  inventoryIcon: {
    width: 20,
    height: 20,
    resizeMode: 'contain',
  },
  filterBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    height: 48,
  },
  filterTabsContainer: {
    paddingHorizontal: 12,
    alignItems: 'center',
    gap: 20,
    flexGrow: 1,
  },
  filterTab: {
    paddingVertical: 12,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterTabActive: {
    // No background change, indicator handles it
  },
  filterTabText: {
    fontSize: 10,
    fontWeight: '900',
    textTransform: 'uppercase',
    color: 'rgba(255, 255, 255, 0.5)',
    letterSpacing: 1,
    fontFamily: 'Exo2-Regular',
  },
  filterTabTextActive: {
    color: '#fbbf24', // Amber-400
    textShadowColor: 'rgba(251, 191, 36, 0.5)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },
  activeTabIndicator: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: '#fbbf24',
    borderRadius: 2,
    shadowColor: '#fbbf24',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 4,
  },
  sortButton: {
    paddingHorizontal: 12,
    borderLeftWidth: 1,
    borderLeftColor: 'rgba(255, 255, 255, 0.1)',
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
  },
  sortButtonActive: {
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
  },
  sortButtonText: {
    fontSize: 9,
    fontWeight: '900',
    textTransform: 'uppercase',
    color: '#60a5fa', // Blue-400
    letterSpacing: 1,
  },
  inventoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
    gap: 12,
  },
  noItemsText: {
    fontSize: 10,
    color: '#6b7280', 
    fontStyle: 'italic',
    flex: 1,
    textAlign: 'center',
    marginTop: 20,
  },
  inventoryItemCard: {
    width: width < 640 ? '31%' : '23%',
    aspectRatio: 0.75,
    padding: 10,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(51, 65, 85, 0.5)', 
    backgroundColor: '#0f172a',
    overflow: 'hidden',
    position: 'relative',
  },
  inventoryItemCardEquipped: {
    borderColor: 'rgba(34, 197, 94, 0.4)',
    backgroundColor: 'rgba(15, 23, 42, 1)',
    borderWidth: 1.5,
  },
  inventoryItemMediaWrapper: {
    position: 'relative',
    width: 48,
    height: 48,
    marginBottom: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radiatingEnergyLarge: {
    position: 'absolute',
    width: '150%', 
    height: '150%', 
    borderRadius: 9999,
    opacity: 0.2,
  },
  inventoryItemMediaContainer: {
    position: 'relative',
    zIndex: 10,
    width: '100%',
    height: '100%',
    padding: 4,
  },
  inventoryItemMedia: {
    width: '100%',
    height: '100%',
    resizeMode: 'contain',
  },
  inventoryItemName: {
    fontSize: 10,
    fontWeight: '900',
    textTransform: 'uppercase',
    textAlign: 'center',
    lineHeight: 13,
    color: '#f8fafc',
    marginBottom: 10,
    letterSpacing: 0.5,
  },
  equipUnequipButton: {
    width: '100%',
    paddingVertical: 4,
    borderRadius: 2,
    marginTop: 'auto',
  },
  equipButton: {
    backgroundColor: 'rgba(22, 101, 52, 0.4)',
    borderWidth: 1,
    borderColor: '#16a34a',
  },
  unequipButton: {
    backgroundColor: 'rgba(127, 29, 29, 0.4)',
    borderWidth: 1.5,
    borderColor: '#991b1b',
  },
  equipUnequipButtonText: {
    fontSize: 7,
    fontWeight: '900',
    textTransform: 'uppercase',
    textAlign: 'center',
    color: '#fff',
    letterSpacing: 1,
  },

  // Modals General
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)', 
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },

  // Item Detail Modal
  itemDetailModalContent: {
    backgroundColor: 'rgba(15, 23, 42, 0.9)', 
    borderColor: 'rgba(255, 255, 255, 0.1)', 
    borderWidth: 1,
    borderRadius: 8,
    padding: 16,
    maxWidth: width * 0.9, 
    width: '100%',
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10,
    alignItems: 'center',
    borderBottomWidth: 4, 
    borderBottomColor: '#0f172a', 
    transform: [{ skewX: '-2deg' }], 
  },
  closeModalButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    zIndex: 1,
    padding: 8,
  },
  itemDetailImageWrapper: {
    width: 64,
    height: 64,
    borderRadius: 8,
    backgroundColor: '#1f2937', 
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.3)', 
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    marginBottom: 12,
  },
  itemDetailImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'contain',
  },
  itemDetailName: {
    fontSize: 20,
    // fontFamily: 'Avenir-Heavy',
    fontWeight: '900',
    fontStyle: 'italic',
    color: '#fff',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: -0.5,
  },
  itemDetailSlot: {
    fontSize: 12,
    color: '#a78bfa', 
    // fontFamily: 'Avenir-Heavy',
    fontWeight: 'bold',
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  itemRequirementsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 12,
  },
  requirementBadgeYellow: {
    backgroundColor: 'rgba(202, 138, 4, 0.4)', 
    borderRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(202, 138, 4, 0.6)', 
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  requirementBadgeBlue: {
    backgroundColor: 'rgba(37, 99, 235, 0.4)', 
    borderRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(37, 99, 235, 0.6)', 
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  requirementBadgePink: {
    backgroundColor: 'rgba(236, 72, 153, 0.4)', 
    borderRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(236, 72, 153, 0.6)', 
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  requirementBadgeText: {
    fontSize: 12,
    // fontFamily: 'Avenir-Heavy',
    fontWeight: '900',
    textTransform: 'uppercase',
    color: '#fff',
  },
  itemDetailDescription: {
    fontSize: 14,
    color: '#3b82f6', 
    marginBottom: 12,
    lineHeight: 20,
    textAlign: 'center',
  },
  itemDetailBonuses: {
    fontSize: 12,
    color: '#34d399', 
    // fontFamily: 'Avenir-Heavy',
    fontWeight: 'bold',
    marginBottom: 12,
    textAlign: 'center',
  },
  itemDetailAnimated: {
    fontSize: 12,
    color: '#06b6d4', 
    // fontFamily: 'Avenir-Heavy',
    fontWeight: 'bold',
    marginBottom: 12,
    textAlign: 'center',
  },
  itemDetailRarity: {
    fontSize: 12,
    color: '#fbbf24', 
    // fontFamily: 'Avenir-Heavy',
    fontWeight: 'bold',
    textTransform: 'uppercase',
    marginBottom: 12,
    textAlign: 'center',
  },
  itemDetailEquippedStatus: {
    fontSize: 12,
    // fontFamily: 'Avenir-Heavy',
    fontWeight: 'bold',
    marginBottom: 12,
    textAlign: 'center',
  },
  closeButtonPrimary: {
    width: '100%',
    paddingVertical: 12,
    backgroundColor: '#4b5563', 
    borderRadius: 4,
    borderBottomWidth: 4,
    borderBottomColor: '#1f2937', 
    marginTop: 12,
    overflow: 'hidden',
  },
  closeButtonPrimaryText: {
    fontSize: 12,
    // fontFamily: 'Avenir-Heavy',
    fontWeight: '900',
    textTransform: 'uppercase',
    textAlign: 'center',
    color: '#fff',
  },
  // Customization Modals (Avatar & Background)
  customizationModalContent: {
    backgroundColor: 'rgba(15, 23, 42, 0.95)', 
    borderColor: 'rgba(255, 255, 255, 0.1)', 
    borderWidth: 1,
    borderRadius: 16,
    paddingVertical: 24,
    paddingHorizontal: 24,
    maxWidth: width * 0.9, 
    width: '100%',
    maxHeight: '90%',
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 30,
    elevation: 10,
    alignItems: 'center',
  },
  closeModalButtonAbsolute: {
    position: 'absolute',
    top: 8,
    right: 8,
    zIndex: 210,
    padding: 12,
    backgroundColor: 'rgba(15, 23, 42, 0.6)', 
    borderRadius: 9999,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)', 
  },
  customizationModalHeaderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 4,
  },
  customizationModalHeader: {
    fontSize: 20,
    // fontFamily: 'Avenir-Heavy',
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    color: '#eab308', 
    textShadowColor: 'rgba(234,179,8,0.8)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },
  customizationModalIcon: {
    width: 42,
    height: 42,
    flexShrink: 0,
  },
  customizationModalSubHeader: {
    fontSize: 10,
    color: '#6b7280', 
    // fontFamily: 'Avenir-Heavy',
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 2,
    marginBottom: 24,
  },
  emptyCustomizationPanel: {
    backgroundColor: 'rgba(15, 23, 42, 0.7)', 
    borderColor: '#4b5563', 
    borderWidth: 1,
    borderStyle: 'dashed',
    padding: 40,
    alignItems: 'center',
    borderRadius: 8,
  },
  emptyCustomizationEmoji: {
    fontSize: 40,
    marginBottom: 12,
    opacity: 0.5,
  },
  emptyCustomizationText: {
    fontSize: 14,
    color: '#9ca3af', 
    // fontFamily: 'Avenir-Heavy',
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  emptyCustomizationSubText: {
    fontSize: 10,
    color: '#6b7280', 
    marginTop: 4,
    // fontFamily: 'Avenir-Heavy',
    textTransform: 'uppercase',
  },
  customizationGridContainer: {
    flexGrow: 1,
    paddingBottom: 20,
  },
  customizationGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
    gap: 16,
    paddingHorizontal: 10,
  },
  customizationItemCard: {
    width: width < 640 ? '46%' : '30%', 
    paddingVertical: 16,
    paddingHorizontal: 12,
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)', 
    backgroundColor: 'rgba(15, 23, 42, 0.95)', 
    position: 'relative',
  },
  customizationItemCardEquipped: {
    backgroundColor: 'rgba(15, 23, 42, 1)', 
    shadowColor: 'rgba(34, 197, 94, 0.2)', 
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 20,
    borderColor: 'rgba(34, 197, 94, 0.5)', 
    borderWidth: 1.5,
  },
  customizationItemImageWrapper: {
    position: 'relative',
    width: 80,
    height: 80,
    marginBottom: 12,
    borderRadius: 9999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  customizationItemPulse: {
    position: 'absolute',
    inset: 0,
    borderRadius: 9999,
    opacity: 0.2,
  },
  customizationItemImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
    borderRadius: 9999,
    borderWidth: 2,
    borderColor: 'rgba(234,179,8,0.5)', 
    position: 'relative',
    zIndex: 10,
  },
  customizationItemName: {
    fontSize: 12,
    // fontFamily: 'Avenir-Heavy',
    fontWeight: '900',
    textTransform: 'uppercase',
    color: '#eab308', 
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  customizationItemRarity: {
    fontSize: 8,
    color: '#6b7280', 
    // fontFamily: 'Avenir-Heavy',
    fontWeight: 'bold',
    textTransform: 'uppercase',
    marginBottom: 12,
    lineHeight: 12,
  },
  customizationEquipButton: {
    width: '100%',
    paddingVertical: 8,
    borderRadius: 4,
  },
  customizationUnequipButton: {
    backgroundColor: 'rgba(127, 29, 29, 0.4)',
    borderWidth: 1.5,
    borderColor: '#991b1b',
  },
  customizationEquipButtonActive: {
    backgroundColor: '#16a34a', 
    // color: '#fff',
    shadowColor: 'rgba(34, 197, 94, 0.3)', 
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 10,
    elevation: 5,
  },
  customizationEquipButtonText: {
    fontSize: 9,
    // fontFamily: 'Avenir-Heavy',
    fontWeight: '900',
    textTransform: 'uppercase',
    textAlign: 'center',
    color: '#fff',
  },
  quantityBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 4,
    borderRadius: 4,
    zIndex: 20,
  },
  quantityText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
});

export default InventoryScreen;
