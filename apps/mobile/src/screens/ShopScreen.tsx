import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, 
  StyleSheet, 
  Alert, 
  SafeAreaView, 
  Platform,
  ActivityIndicator,
  Text,
  TouchableOpacity,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { supabase } from '@/lib/supabase';
import { playHunterSound } from '@/utils/audio';
import { useAuth } from '@/contexts/AuthContext';
import { useNotification } from '@/contexts/NotificationContext';
import { useGameData } from '@/hooks/useGameData';
import { useTutorial } from '@/context/TutorialContext';
import { api } from '@/api/shop';
import EnhancedShopView from '@/components/EnhancedShopView';
import { BlacksmithUI } from '@/components/crafting/BlacksmithUI';
import { ShopItem } from '@/types/user';

export const ShopScreen: React.FC<{ route: any }> = ({ route }) => {
  // Guard against undefined params (e.g. from Tab Navigator)
  const currentNodeId = route?.params?.currentNodeId;
  const insets = useSafeAreaInsets();
  const { user, setUser } = useAuth();
  const { showNotification } = useNotification();
  const { refreshGameData } = useGameData();
  const { step } = useTutorial();

  const tutorialMainTab =
    step === 'NAV_SHOP' ? 'hunter' :
    step === 'NAV_SHOP_MAGIC' ? 'magic' :
    step === 'NAV_SHOP_GACHA' ? 'gacha' : undefined;

  const [loading, setLoading] = useState(true);
  const [allItems, setAllItems] = useState<ShopItem[]>([]);
  const [shopMode, setShopMode] = useState<'merchant' | 'blacksmith'>('merchant');

  const fetchItems = useCallback(async (nodeId: string | undefined) => {
    try {
      setLoading(true);
      // 1. Fetch the Global/Standard items
      const { data: globalItems } = await supabase
        .from('shop_items')
        .select('*')
        .eq('is_global', true)
        .eq('is_sellable', true)
        .order('created_at', { ascending: false });

      let exclusives: any[] = [];
      
      // 2. If a specific node is passed (e.g. traveling merchant), fetch exclusives
      if (nodeId) {
        const { data: exclusiveLinks } = await supabase
          .from('shop_exclusives')
          .select('shop_items(*)')
          .eq('shop_id', nodeId);
          
        exclusives = (exclusiveLinks?.map(link => link.shop_items) || [])
          .filter((item: any) => item && item.is_sellable !== false);
      }

      // 3. Combine them for your UI
      const combined = [...(globalItems || []), ...exclusives];
      
      // Sort by recently added
      combined.sort((a, b) => {
        const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
        const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
        return dateB - dateA;
      });

      setAllItems(combined);
    } catch (error) {
      console.error('Failed to fetch shop items:', error);
      Alert.alert('System Error', 'Failed to synchronize with Hunter Trading Post.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Always fetch items, even if currentNodeId is undefined (shows global items only)
    fetchItems(currentNodeId);
  }, [fetchItems, currentNodeId]);

  const handleBuyItem = async (item: ShopItem, currency: 'coins' | 'gems' | 'both' = 'coins') => {
    if (!user) return;

    playHunterSound('click');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

    try {
      const result = await api.purchaseItem(user.id, item.id, currency);

      if (result.success) {
        playHunterSound('purchasesuccess');
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

        const updatedUser = { ...user };
        if (result.newCoinBalance !== undefined) updatedUser.coins = result.newCoinBalance;
        if (result.newGemBalance !== undefined) updatedUser.gems = result.newGemBalance;
        // Add new cosmetic so the shop list excludes it immediately (no refetch delay)
        if (result.cosmetic) {
          const newCosmetic = {
            ...result.cosmetic,
            created_at: (result.cosmetic as any).acquired_at ?? new Date().toISOString(),
          };
          updatedUser.cosmetics = [...(user.cosmetics || []), newCosmetic];
        }

        setUser(updatedUser);
        refreshGameData();

        showNotification('Added to Inventory (avatars/backgrounds in top right).', 'success');
      } else {
        playHunterSound('error');
        showNotification(result.message || 'Purchase failed', 'error');
      }
    } catch (error: any) {
      console.error('Purchase error:', error);
      showNotification(error?.message || 'The transaction could not be completed.', 'error');
    }
  };

  if (loading && allItems.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <LinearGradient
          colors={['#020617', '#0f172a', '#020617']}
          style={StyleSheet.absoluteFill}
        />
        <ActivityIndicator size="large" color="#22d3ee" />
        <Text style={styles.loadingText}>ACCESSING_DATABASE...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#020617', '#0f172a', '#020617']}
        style={StyleSheet.absoluteFill}
      />
      
      <SafeAreaView style={{ flex: 1, paddingTop: Platform.OS === 'android' ? insets.top : 0 }}>
        {user && (
          <>
            <View style={shopModeStyles.modeRow}>
              <TouchableOpacity
                style={[shopModeStyles.modeBtn, shopMode === 'merchant' && shopModeStyles.modeBtnActive]}
                onPress={() => {
                  playHunterSound('click');
                  setShopMode('merchant');
                }}
              >
                <Text style={[shopModeStyles.modeBtnText, shopMode === 'merchant' && shopModeStyles.modeBtnTextActive]}>
                  Merchant
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[shopModeStyles.modeBtn, shopMode === 'blacksmith' && shopModeStyles.modeBtnActive]}
                onPress={() => {
                  playHunterSound('click');
                  setShopMode('blacksmith');
                }}
              >
                <Text style={[shopModeStyles.modeBtnText, shopMode === 'blacksmith' && shopModeStyles.modeBtnTextActive]}>
                  Blacksmith
                </Text>
              </TouchableOpacity>
            </View>
            <View style={{ flex: 1 }}>
              {shopMode === 'merchant' ? (
                <EnhancedShopView
                  user={user}
                  shopItems={allItems}
                  setUser={setUser}
                  handleBuyItem={handleBuyItem}
                  isLoading={loading}
                  tutorialMainTab={tutorialMainTab}
                />
              ) : (
                <BlacksmithUI user={user} setUser={setUser} refreshGameData={refreshGameData} />
              )}
            </View>
          </>
        )}
      </SafeAreaView>
    </View>
  );
};

const shopModeStyles = StyleSheet.create({
  modeRow: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 10,
  },
  modeBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#334155',
    alignItems: 'center',
  },
  modeBtnActive: {
    borderColor: '#22d3ee',
    backgroundColor: '#0c4a6e33',
  },
  modeBtnText: {
    color: '#94a3b8',
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  modeBtnTextActive: {
    color: '#22d3ee',
  },
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#020617',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#020617',
  },
  loadingText: {
    color: '#22d3ee',
    marginTop: 12,
    fontWeight: 'bold',
    letterSpacing: 2,
  },
});

export default ShopScreen;
