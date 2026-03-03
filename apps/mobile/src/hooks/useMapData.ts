import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

export function useMapData(userId: string | undefined) {
  const [activeMapId, setActiveMapId] = useState<string | null>(null);
  const [mapSettings, setMapSettings] = useState<any>(null);
  const [loadingMap, setLoadingMap] = useState(true);
  const [mapError, setMapError] = useState<string | null>(null);
  const [allShopItems, setAllShopItems] = useState<any[]>([]);

  useEffect(() => {
    const fetchShopItems = async () => {
      const { data, error } = await supabase.from('shop_items').select('*');
      if (!error && data) setAllShopItems(data);
    };
    fetchShopItems();
  }, []);

  const loadData = useCallback(async () => {
    setLoadingMap(true);
    setMapError(null);
    try {
      const [mapRes, settingsRes] = await Promise.all([
        supabase.from('maps').select('id').eq('is_active', true).single(),
        supabase.from('world_map_settings').select('*').eq('id', 1).single(),
      ]);
      if (mapRes.data) setActiveMapId(mapRes.data.id);
      if (settingsRes.data) setMapSettings(settingsRes.data);
    } catch (err) {
      console.error('Error loading world data:', err);
      setMapError('Failed to load world data. Check connection.');
    } finally {
      setLoadingMap(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [userId]);

  return {
    activeMapId,
    setActiveMapId,
    mapSettings,
    loadingMap,
    mapError,
    allShopItems,
    loadData,
  };
}
