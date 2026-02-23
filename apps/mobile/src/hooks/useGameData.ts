// Converted React Native hooks file
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { AppState } from 'react-native';
import { ShopItem, UserCosmetic } from '@/types/user';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

interface GameData {
  score: number;
  level: number;
  // Add other game data properties as needed
}

const defaultGameData: GameData = {
  score: 0,
  level: 1,
};

export const useGameData = () => {
  const { user, setUser } = useAuth();
  const [gameData, setGameData] = useState<GameData>(defaultGameData);
  const [shopItems, setShopItems] = useState<ShopItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const GAME_DATA_KEY = 'gameData'; // Key for storing game data in AsyncStorage

  // Load game data from AsyncStorage on component mount and app focus
  const loadGameData = useCallback(async () => {
    try {
      const storedData = await AsyncStorage.getItem(GAME_DATA_KEY);
      if (storedData) {
        setGameData(JSON.parse(storedData));
      } else {
        // If no data is found, initialize with default values
        setGameData(defaultGameData);
        await AsyncStorage.setItem(GAME_DATA_KEY, JSON.stringify(defaultGameData));
      }
    } catch (error) {
      console.error('Failed to load game data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchShopItems = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('shop_items')
        .select('*');

      if (error) throw error;
      if (data) {
        setShopItems(data as ShopItem[]);
      }
    } catch (error) {
      console.error('Error fetching shop items:', error);
    }
  }, []);

  // Calculate equipped items derived from user cosmetics
  const equippedItems = useMemo(() => {
    if (!user || !user.cosmetics) return [];
    
    // Enrich cosmetics with shop_item data if missing (though usually user.cosmetics has it joined or we map it)
    return user.cosmetics.filter(c => c.equipped).map(c => {
      // Ensure shop_items is present. If it was a simple join, it might be there.
      // If not, we try to find it in shopItems state.
      if (c.shop_items) return c;
      const foundItem = shopItems.find(si => si.id === c.shop_item_id);
      return { ...c, shop_items: foundItem || ({} as ShopItem) };
    });
  }, [user, shopItems]);

  // Calculate total stats from equipped items
  const totalStats = useMemo(() => {
    const stats: Record<string, number> = {};
    
    equippedItems.forEach(item => {
      const shopItem = item.shop_items;
      if (!shopItem) return;

      // Handle 'bonuses' array
      if (shopItem.bonuses && Array.isArray(shopItem.bonuses)) {
        shopItem.bonuses.forEach((bonus: any) => {
           // Normalize keys if needed? The types seem to be 'str', 'spd' etc.
           stats[bonus.type] = (stats[bonus.type] || 0) + bonus.value;
        });
      }
      
      // Handle legacy 'bonus_type' and 'bonus_value'
      if (shopItem.bonus_type && shopItem.bonus_value) {
        stats[shopItem.bonus_type] = (stats[shopItem.bonus_type] || 0) + shopItem.bonus_value;
      }
    });
    
    return stats;
  }, [equippedItems]);

  const refreshGameData = useCallback(async () => {
    setLoading(true);
    await Promise.all([loadGameData(), fetchShopItems()]);
    // Optionally refresh user data too via useAuth's mechanism if available, 
    // but useAuth handles its own state usually.
    setLoading(false);
  }, [loadGameData, fetchShopItems]);

  // Initial load
  useEffect(() => {
    refreshGameData();
  }, [refreshGameData]);

  // Save game data to AsyncStorage whenever it changes
  useEffect(() => {
    const saveGameData = async () => {
      try {
        await AsyncStorage.setItem(GAME_DATA_KEY, JSON.stringify(gameData));
      } catch (error) {
        console.error('Failed to save game data:', error);
      }
    };
    saveGameData();
  }, [gameData]);

  // Handle app state changes
  useEffect(() => {
    const handleAppStateChange = (nextAppState: 'active' | 'background' | 'inactive') => {
      if (nextAppState === 'active') {
        refreshGameData();
      }
    };
    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => {
      subscription.remove();
    };
  }, [refreshGameData]);

  const updateGameData = (newData: Partial<GameData>) => {
    setGameData((prevData) => ({ ...prevData, ...newData }));
  };

  const resetGameData = async () => {
    try {
      await AsyncStorage.removeItem(GAME_DATA_KEY);
      setGameData(defaultGameData);
    } catch (error) {
      console.error('Failed to reset game data:', error);
    }
  };

  return {
    gameData,
    loading,
    updateGameData,
    resetGameData,
    shopItems,
    equippedItems,
    totalStats,
    refreshGameData
  };
};
