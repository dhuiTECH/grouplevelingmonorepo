import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Modal, View, StyleSheet, Dimensions, Text, TouchableOpacity, ScrollView, ActivityIndicator, Alert } from 'react-native';
import Toast from 'react-native-toast-message';
import { VictoryBanner } from '@/components/VictoryBanner';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { mapNodeIcon, mapNodeBackground } from '@/utils/assetMapper';
import { DialogueScene } from '@/components/DialogueScene';
import { useNavigation } from '@react-navigation/native';
import { Image } from 'expo-image';
import { BlurView } from 'expo-blur';
import { ChevronLeft, ShoppingBag, Coins, Gem } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { ShopItem } from '@/types/user';
import { api } from '@/api/shop';
import { playHunterSound } from '@/utils/audio';
import { claimLoot } from '@/lib/claimLoot';

const { width, height } = Dimensions.get('window');

export const InteractionModal = ({
  visible,
  onClose,
  activeInteraction,
  mapId,
}: {
  visible: boolean;
  onClose: () => void;
  activeInteraction: any;
  mapId?: string | null;
}) => {
  const { user, setUser } = useAuth();
  const navigation = useNavigation<any>();
  const [showVictory, setShowVictory] = useState(false);
  const [partySize, setPartySize] = useState(1);
  const [showShop, setShowShop] = useState(false);
  const [shopItems, setShopItems] = useState<ShopItem[]>([]);
  const [shopLoading, setShopLoading] = useState(false);

  // 1. All Hooks First
  // Defer so first frame paints the dialogue UI (party count only needed for battle nav)
  useEffect(() => {
    if (!visible || !user?.current_party_id) return;
    const t = setTimeout(() => {
      supabase
        .from('party_members')
        .select('*', { count: 'exact', head: true })
        .eq('party_id', user.current_party_id)
        .then(({ count }) => {
          if (count) setPartySize(count);
        });
    }, 0);
    return () => clearTimeout(t);
  }, [visible, user?.current_party_id]);

  const dialogueScript = useMemo(() => {
    if (!activeInteraction) return [];
    if (activeInteraction.interaction_data?.dialogue_script) return activeInteraction.interaction_data.dialogue_script;
    if (activeInteraction.interaction_data?.script) return activeInteraction.interaction_data.script;
    if (activeInteraction.metadata?.dialogue) return activeInteraction.metadata.dialogue;
    return [{
      npc_name: activeInteraction.name || "System",
      text: activeInteraction.interaction_data?.welcome_text || 
            activeInteraction.interaction_data?.dialogue_text ||
            activeInteraction.description || 
            `You encountered a ${activeInteraction.name || 'mysterious event'}.`
    }];
  }, [activeInteraction]);

  const fetchShopItems = useCallback(async () => {
    if (!activeInteraction?.id) return;
    try {
      setShopLoading(true);
      
      // ONLY fetch exclusives for this specific NPC node
      const { data: exclusiveLinks, error } = await supabase
        .from('shop_exclusives')
        .select('shop_items(*)')
        .eq('shop_id', activeInteraction.id);

      if (error) throw error;
        
      const items = (exclusiveLinks?.map(link => link.shop_items) || [])
        .filter((item: any) => item && item.is_sellable !== false);

      items.sort((a, b) => (b.created_at ? new Date(b.created_at).getTime() : 0) - (a.created_at ? new Date(a.created_at).getTime() : 0));
      setShopItems(items);
    } catch (error) {
      console.error('Failed to fetch NPC shop items:', error);
      Alert.alert('Error', 'Failed to load this NPC\'s wares');
    } finally {
      setShopLoading(false);
    }
  }, [activeInteraction?.id]);

  const handleBuyItem = useCallback(async (item: ShopItem, currency: 'coins' | 'gems' | 'both' = 'coins') => {
    if (!user) return;

    playHunterSound('click');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

    try {
      const result = await api.purchaseItem(user.id, item.id, currency);

      if (result.success) {
        playHunterSound('purchasesuccess');
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        
        // Update user balance locally - aligning with API response keys
        setUser({
          ...user,
          coins: result.newCoinBalance ?? user.coins,
          gems: result.newGemBalance ?? user.gems,
        });
        
        Toast.show({
          type: 'success',
          text1: 'Purchase Successful!',
          text2: `Acquired ${item.name}`,
        });
      } else {
        throw new Error(result.message || 'Purchase failed');
      }
    } catch (error: any) {
      playHunterSound('error');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Purchase Failed', error.message || 'Insufficient funds or system error');
    }
  }, [user, setUser]);

  const handleAction = useCallback((event: string, payload?: any) => {
    switch (event) {
      case 'OPEN_SHOP':
        // Open shop modal instead of navigating
        fetchShopItems();
        setShowShop(true);
        break;
      case 'REST_INN':
        supabase.from('profiles').update({ current_hp: user.max_hp }).eq('id', user.id).then(({ error }) => {
          if (!error) {
            onClose();
            Toast.show({ type: 'success', text1: 'Fully Restored!', text2: 'You feel refreshed and ready to hunt.' });
          }
        });
        break;
      case 'BATTLE':
      case 'START_BATTLE':
      case 'MONSTER':
        onClose();
        navigation.navigate('Battle', {
          encounterId: activeInteraction?.encounter_id || activeInteraction?.id,
          isBoss:
            activeInteraction?.interaction_type === 'BOSS_RAID' ||
            activeInteraction?.event_type === 'BOSS',
          partySize: partySize,
          mapId: mapId ?? undefined,
        });
        break;
      case 'GRANT_LOOT': {
        const nodeId = payload?.sourceId ?? activeInteraction?.id ?? 'npc-default';
        const key = `npc-${nodeId}-${Date.now()}`;
        (async () => {
          try {
            const result = await claimLoot('npc', String(nodeId), key);
            if (result.ok) {
              setUser((prev: any) =>
                prev?.id
                  ? {
                      ...prev,
                      exp: result.exp_total ?? prev.exp ?? 0,
                      coins: result.coins_total ?? prev.coins ?? 0,
                      gems: result.gems_total ?? prev.gems ?? 0,
                    }
                  : prev,
              );
              Toast.show({
                type: 'success',
                text1: 'Loot Claimed!',
                text2: `+${result.exp_delta ?? 0} EXP, +${result.coins_delta ?? 0} Coins${result.gems_delta ? `, +${result.gems_delta} Gems` : ''}`,
              });
            }
          } catch {
            Alert.alert('Claim Failed', 'Network error — try again when you have signal.', [
              { text: 'OK' },
              { text: 'Retry', onPress: () => handleAction('GRANT_LOOT', payload) },
            ]);
          }
        })();
        break;
      }
      default:
        onClose();
        break;
    }
  }, [user, onClose, navigation, activeInteraction, partySize, fetchShopItems, mapId]);

  const shopItemRenderer = useCallback((item: ShopItem) => (
    <View key={item.id} style={styles.shopItemCard}>
      <Image source={item.image_url ? { uri: item.image_url } : require('../../../assets/exclamation.png')} style={styles.shopItemImage} contentFit="cover" />
      <View style={styles.shopItemInfo}>
        <Text style={styles.shopItemName}>{item.name}</Text>
        <Text style={styles.shopItemDescription} numberOfLines={2}>{item.description}</Text>
        <View style={styles.shopItemFooter}>
          <View style={styles.priceContainer}>
            {item.gem_price ? <View style={styles.priceRow}><Gem size={14} color="#00e5ff" /><Text style={styles.gemPrice}>{item.gem_price}</Text></View> : null}
            {item.price ? <View style={styles.priceRow}><Coins size={14} color="#ffd700" /><Text style={styles.coinPrice}>{item.price}</Text></View> : null}
          </View>
          <TouchableOpacity style={styles.buyButton} onPress={() => handleBuyItem(item, item.gem_price && !item.price ? 'gems' : 'coins')}>
            <Text style={styles.buyButtonText}>BUY</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  ), [handleBuyItem]);

  // 2. Early Return (Must be after all hooks)
  if (!activeInteraction) {
    return (
      <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
        <View style={styles.overlay} />
      </Modal>
    );
  }

  // 3. Resolve Visuals (Safe after early return)
  const bgUrlStr = activeInteraction.interaction_data?.scene?.scene_background_url || activeInteraction.metadata?.visuals?.bg_url || activeInteraction.modal_image_url || activeInteraction.background_url;
  const bgSource = bgUrlStr ? mapNodeBackground(bgUrlStr) : null;
  const spriteSource = mapNodeIcon(activeInteraction.interaction_data?.scene?.scene_npc_sprite_url || activeInteraction.metadata?.visuals?.npc_sprite_url || activeInteraction.metadata?.visuals?.monster_url || activeInteraction.icon_url);
  const isSpritesheet = activeInteraction.interaction_data?.scene?.npc_is_spritesheet || !!activeInteraction.metadata?.visuals?.spritesheet;
  const frameCount = activeInteraction.interaction_data?.scene?.npc_frame_count || activeInteraction.metadata?.visuals?.spritesheet?.frame_count || 1;
  const frameSize = activeInteraction.interaction_data?.scene?.npc_frame_size || activeInteraction.metadata?.visuals?.spritesheet?.frame_width || 512;

  // 4. Main Return
  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <View style={styles.overlay}>
        {showVictory && <VictoryBanner rewards={activeInteraction.metadata?.rewards || {}} />}
        {showShop && (
          <View style={styles.shopOverlay}>
            <BlurView intensity={90} tint="dark" style={StyleSheet.absoluteFill} />
            <View style={styles.shopContainer}>
              <LinearGradient colors={['rgba(0, 229, 255, 0.3)', 'rgba(0, 119, 182, 0.1)']} style={styles.shopHeader}>
                <TouchableOpacity onPress={() => setShowShop(false)} style={styles.backButton}><ChevronLeft color="#00e5ff" size={24} /><Text style={styles.backButtonText}>Back</Text></TouchableOpacity>
                <View style={styles.shopTitleContainer}><ShoppingBag color="#00e5ff" size={20} /><Text style={styles.shopTitle}>{activeInteraction.name || 'Shop'}</Text></View>
                <View style={styles.balanceContainer}><View style={styles.balanceRow}><Coins size={14} color="#ffd700" /><Text style={styles.balanceText}>{user?.coins || 0}</Text></View><View style={styles.balanceRow}><Gem size={14} color="#00e5ff" /><Text style={styles.balanceText}>{user?.gems || 0}</Text></View></View>
              </LinearGradient>
              {shopLoading ? <View style={styles.shopLoading}><ActivityIndicator size="large" color="#00e5ff" /><Text style={styles.shopLoadingText}>Loading wares...</Text></View> : (
                <ScrollView style={styles.shopScroll} contentContainerStyle={styles.shopScrollContent}>{shopItems.length === 0 ? <View style={styles.emptyShop}><Text style={styles.emptyShopText}>No items available</Text></View> : <View style={styles.shopGrid}>{shopItems.map(shopItemRenderer)}</View>}</ScrollView>
              )}
            </View>
          </View>
        )}
        {!showVictory && !showShop && activeInteraction && (
          <DialogueScene
            key={`scene-${activeInteraction.id || activeInteraction.encounter_id || 'unknown'}`}
            visible={visible}
            nodeName={activeInteraction.name || "System"}
            backgroundUrl={bgSource}
            npcSpriteUrl={spriteSource}
            isSpritesheet={isSpritesheet}
            frameCount={frameCount}
            frameSize={frameSize}
            dialogueScript={dialogueScript}
            actionButtons={activeInteraction.interaction_data?.action_buttons || []}
            onAction={handleAction}
            interactionType={activeInteraction.interaction_type || activeInteraction.event_type || 'DIALOGUE'}
            onClose={onClose}
            onBattleStart={() => {
              onClose();
              navigation.navigate('Battle', {
                encounterId: activeInteraction.encounter_id || activeInteraction.id,
                isBoss: activeInteraction.interaction_type === 'BOSS_RAID',
                partySize: partySize,
                mapId: mapId ?? undefined,
              });
            }}
          />
        )}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backgroundImage: {
    position: 'absolute',
    width: '100%',
    height: '100%',
  },
  playerSprite: {
    position: 'absolute',
    bottom: 20,
    left: 20,
  },
  monsterSprite: {
    position: 'absolute',
    top: 20,
    right: 20,
  },
  winButton: {
    position: 'absolute',
    bottom: 100,
    padding: 20,
    backgroundColor: 'gold',
    borderRadius: 10,
  },
  winButtonText: {
    fontWeight: 'bold',
  },
  // Shop Modal Styles
  shopOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 100,
  },
  shopContainer: {
    flex: 1,
    marginTop: 40,
    marginHorizontal: 16,
    marginBottom: 24,
    backgroundColor: 'rgba(2, 6, 23, 0.95)',
    borderRadius: 20,
    borderWidth: 2,
    borderColor: 'rgba(0, 229, 255, 0.5)',
    overflow: 'hidden',
  },
  shopHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 229, 255, 0.3)',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
  },
  backButtonText: {
    color: '#00e5ff',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 4,
  },
  shopTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  shopTitle: {
    color: '#00e5ff',
    fontSize: 18,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  balanceContainer: {
    alignItems: 'flex-end',
  },
  balanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginVertical: 2,
  },
  balanceText: {
    color: '#f8fafc',
    fontSize: 13,
    fontWeight: '600',
  },
  shopScroll: {
    flex: 1,
  },
  shopScrollContent: {
    padding: 16,
  },
  shopLoading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  shopLoadingText: {
    color: '#00e5ff',
    marginTop: 12,
    fontSize: 14,
  },
  emptyShop: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyShopText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 16,
  },
  shopGrid: {
    gap: 12,
  },
  shopItemCard: {
    flexDirection: 'row',
    backgroundColor: 'rgba(15, 23, 42, 0.8)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(0, 229, 255, 0.3)',
    padding: 12,
    gap: 12,
  },
  shopItemImage: {
    width: 70,
    height: 70,
    borderRadius: 8,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  shopItemInfo: {
    flex: 1,
    justifyContent: 'space-between',
  },
  shopItemName: {
    color: '#f8fafc',
    fontSize: 16,
    fontWeight: 'bold',
  },
  shopItemDescription: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 12,
    marginTop: 2,
  },
  shopItemFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  priceContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  coinPrice: {
    color: '#ffd700',
    fontSize: 14,
    fontWeight: 'bold',
  },
  gemPrice: {
    color: '#00e5ff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  buyButton: {
    backgroundColor: 'rgba(0, 229, 255, 0.25)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: 'rgba(0, 229, 255, 0.6)',
  },
  buyButtonText: {
    color: '#00e5ff',
    fontSize: 12,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
});
