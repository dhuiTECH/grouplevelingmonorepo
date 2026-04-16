import React, { useState, useEffect, useCallback, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState } from 'react-native';
import { ShopItem, UserCosmetic } from '@/types/user';
import { useAuth } from '@/contexts/AuthContext';
import { useGameDataStore } from '@/store/useGameDataStore';

interface GameData {
  score: number;
  level: number;
}

const defaultGameData: GameData = {
  score: 0,
  level: 1,
};

export const useGameData = () => {
  const { user, setUser } = useAuth();
  const [gameData, setGameData] = useState<GameData>(defaultGameData);
  const storeShopItems = useGameDataStore((s) => s.shopItems);
  const shopItems = storeShopItems as ShopItem[];
  const [loading, setLoading] = useState<boolean>(true);

  const GAME_DATA_KEY = 'gameData';

  const loadGameData = useCallback(async () => {
    try {
      const storedData = await AsyncStorage.getItem(GAME_DATA_KEY);
      if (storedData) {
        setGameData(JSON.parse(storedData));
      } else {
        setGameData(defaultGameData);
        await AsyncStorage.setItem(GAME_DATA_KEY, JSON.stringify(defaultGameData));
      }
    } catch (error) {
      console.error('Failed to load game data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const equippedItems = useMemo(() => {
    if (!user || !user.cosmetics) return [];
    
    return user.cosmetics.filter(c => c.equipped).map(c => {
      if (c.shop_items) return c;
      const foundItem = shopItems.find(si => si.id === c.shop_item_id);
      return { ...c, shop_items: foundItem || ({} as ShopItem) };
    });
  }, [user, shopItems]);

  const totalStats = useMemo(() => {
    const stats: Record<string, number> = {};
    
    equippedItems.forEach(item => {
      const shopItem = item.shop_items;
      if (!shopItem) return;

      if (shopItem.bonuses && Array.isArray(shopItem.bonuses)) {
        shopItem.bonuses.forEach((bonus: any) => {
           stats[bonus.type] = (stats[bonus.type] || 0) + bonus.value;
        });
      }
      
      if (shopItem.bonus_type && shopItem.bonus_value) {
        stats[shopItem.bonus_type] = (stats[shopItem.bonus_type] || 0) + shopItem.bonus_value;
      }
    });
    
    return stats;
  }, [equippedItems]);

  const refreshGameData = useCallback(async () => {
    setLoading(true);
    await loadGameData();
    setLoading(false);
  }, [loadGameData]);

  useEffect(() => {
    loadGameData();
  }, [loadGameData]);

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
