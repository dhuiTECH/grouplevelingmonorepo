import { supabase } from '@/lib/supabase';
import { ShopItem } from '@/types/user';

export const api = {
  // Get all active shop items
  getShopItems: async (): Promise<ShopItem[]> => {
    try {
      const { data: shopItems, error } = await supabase
        .from('shop_items')
        .select('*')
        .eq('is_active', true)
        .eq('is_sellable', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return shopItems as ShopItem[];
    } catch (error: any) {
      console.error('Shop items fetch error:', error.message);
      throw error;
    }
  },

  // Purchase an item
  purchaseItem: async (
    userId: string,
    shopItemId: string,
    currency: 'coins' | 'gems' | 'both' = 'coins'
  ): Promise<{ success: boolean; message?: string; newBalance?: number; newCoinBalance?: number; newGemBalance?: number; cosmetic?: any }> => {
    try {
      if (!userId || !shopItemId) {
        throw new Error('Missing requirements');
      }

      // 1. Get shop item details
      const { data: shopItem, error: itemError } = await supabase
        .from('shop_items')
        .select('*')
        .eq('id', shopItemId)
        .single();

      if (itemError || !shopItem) {
        throw new Error('Shop item not found or inactive');
      }

      // 2. Get hunter's profile (WITH GENDER)
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id, coins, gems, gender')
        .eq('id', userId)
        .single();

      if (profileError || !profile) {
        throw new Error('Hunter profile not found');
      }

      // 3. SAFE OWNERSHIP CHECK
      const { data: existingCosmetic, error: checkError } = await supabase
        .from('user_cosmetics')
        .select('id')
        .eq('hunter_id', userId)
        .eq('shop_item_id', shopItemId)
        .maybeSingle();

      if (checkError) {
        console.error('❌ Check Ownership Error:', checkError);
        throw new Error('System verification failed');
      }

      if (existingCosmetic) {
        throw new Error('You already own this item');
      }

      // 4. Check Balance
      const currentCoins = Number(profile.coins || 0);
      const currentGems = Number(profile.gems || 0);
      const coinPrice = Number(shopItem.price ?? 0);
      const gemPrice = Number(shopItem.gem_price ?? 0);

      // If "both" but item only has one price, treat as single currency
      const effectiveCurrency: 'coins' | 'gems' | 'both' =
        currency === 'both' && coinPrice > 0 && gemPrice > 0
          ? 'both'
          : currency === 'both' && gemPrice > 0
            ? 'gems'
            : currency === 'both'
              ? 'coins'
              : currency;

      if (effectiveCurrency === 'both') {
        if (currentCoins < coinPrice) throw new Error('Insufficient coins');
        if (currentGems < gemPrice) throw new Error('Insufficient gems');
      } else if (effectiveCurrency === 'gems') {
        if (currentGems < gemPrice) throw new Error('Insufficient gems');
      } else {
        if (currentCoins < coinPrice) throw new Error('Insufficient coins');
      }

      // 5. Process Transaction (Deduct Currency)
      let updateData: any = {};
      let newCoinBalance = currentCoins;
      let newGemBalance = currentGems;

      if (effectiveCurrency === 'both') {
        updateData = {
          coins: currentCoins - coinPrice,
          gems: currentGems - gemPrice
        };
        newCoinBalance = updateData.coins;
        newGemBalance = updateData.gems;
      } else if (effectiveCurrency === 'gems') {
        updateData = { gems: currentGems - gemPrice };
        newGemBalance = updateData.gems;
      } else {
        updateData = { coins: currentCoins - coinPrice };
        newCoinBalance = updateData.coins;
      }

      const { error: updateError } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('id', userId);

      if (updateError) {
        console.error('❌ PROFILE UPDATE FAILED:', updateError);
        throw new Error('Failed to deduct currency: ' + (updateError.message ?? ''));
      }

      // 6. Grant Item
      const { data: newCosmetic, error: insertError } = await supabase
        .from('user_cosmetics')
        .insert([{
          hunter_id: userId,
          shop_item_id: shopItemId,
          equipped: false
        }])
        .select(`
          id,
          equipped,
          acquired_at,
          shop_item_id,
          shop_items:shop_item_id (*)
        `)
        .single();

      if (insertError) {
        console.error('❌ DATABASE INSERT FAILED:', insertError);

        // Rollback currency
        await supabase
          .from('profiles')
          .update({
            coins: currentCoins,
            gems: currentGems
          })
          .eq('id', userId);

        throw new Error('Failed to add item to inventory: ' + insertError.message);
      }

      return {
        success: true,
        cosmetic: newCosmetic,
        newBalance: effectiveCurrency === 'gems' ? newGemBalance : newCoinBalance,
        newCoinBalance,
        newGemBalance
      };

    } catch (error: any) {
      console.error('Purchase error:', error?.message ?? error);
      return { success: false, message: error?.message ?? 'Purchase failed' };
    }
  },

  // Perform Summon (Gacha)
  performSummon: async (userId: string, poolType: string = 'gate', useGems: boolean = false) => {
    try {
      if (!userId) throw new Error('User ID is required');

      // Determine cost (just for client-side check, RPC handles real check)
      // cost = useGems ? 10 : 500;

      const { data, error } = await supabase.rpc('perform_summon', {
        p_user_id: userId,
        p_cost: useGems ? 10 : 500, // Should match server logic
        p_use_gems: useGems,
        p_pool_type: poolType
      });

      if (error) {
        console.error('RPC Error:', error);
        throw new Error(error.message);
      }

      return data;
    } catch (error: any) {
      console.error('Summon error:', error.message);
      throw error;
    }
  }
};
