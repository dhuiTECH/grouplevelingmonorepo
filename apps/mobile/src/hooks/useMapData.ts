import { useState, useEffect, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "@/lib/supabase";

const MAP_DATA_CACHE_KEY = "world_map_bootstrap_v1";

function normalizeMapSettings(settings: any) {
  if (!settings) return null;
  return {
    ...settings,
    cleanAutotileSheetUrl: settings.autotile_sheet_url
      ? settings.autotile_sheet_url.split("?")[0]
      : undefined,
    cleanDirtSheetUrl: settings.dirt_sheet_url
      ? settings.dirt_sheet_url.split("?")[0]
      : undefined,
    cleanWaterSheetUrl: settings.water_sheet_url
      ? settings.water_sheet_url.split("?")[0]
      : undefined,
    cleanFoamSheetUrl: settings.foam_sheet_url
      ? settings.foam_sheet_url.split("?")[0]
      : undefined,
  };
}

export function useMapData(userId: string | undefined) {
  const [activeMapId, setActiveMapId] = useState<string | null>(null);
  const [mapSettings, setMapSettings] = useState<any>(null);
  const [loadingMap, setLoadingMap] = useState(true);
  const [mapError, setMapError] = useState<string | null>(null);
  const [allShopItems, setAllShopItems] = useState<any[]>([]);

  const hydrateFromCache = useCallback(async () => {
    try {
      const raw = await AsyncStorage.getItem(MAP_DATA_CACHE_KEY);
      if (!raw) return false;
      const parsed = JSON.parse(raw);
      if (parsed?.activeMapId) setActiveMapId(parsed.activeMapId);
      if (parsed?.mapSettings) setMapSettings(parsed.mapSettings);
      if (Array.isArray(parsed?.allShopItems)) setAllShopItems(parsed.allShopItems);
      return Boolean(parsed?.activeMapId && parsed?.mapSettings);
    } catch (e) {
      console.warn("[useMapData] cache hydrate failed:", e);
      return false;
    }
  }, []);

  const persistCache = useCallback(
    async (next: { activeMapId: string | null; mapSettings: any; allShopItems: any[] }) => {
      try {
        await AsyncStorage.setItem(MAP_DATA_CACHE_KEY, JSON.stringify(next));
      } catch (e) {
        console.warn("[useMapData] cache persist failed:", e);
      }
    },
    [],
  );

  const loadData = useCallback(async () => {
    setMapError(null);
    setLoadingMap(true);

    const hydrated = await hydrateFromCache();
    if (hydrated) {
      // Local-first render path: keep map responsive, refresh in background.
      setLoadingMap(false);
    }

    try {
      const [mapRes, settingsRes, shopRes] = await Promise.all([
        supabase.from("maps").select("id").eq("is_active", true).single(),
        supabase.from("world_map_settings").select("*").eq("id", 1).single(),
        supabase.from("shop_items").select("*"),
      ]);

      const nextActiveMapId = mapRes.data?.id ?? null;
      const nextMapSettings = normalizeMapSettings(settingsRes.data);
      const nextShopItems = shopRes.data ?? [];

      if (nextActiveMapId) setActiveMapId(nextActiveMapId);
      if (nextMapSettings) setMapSettings(nextMapSettings);
      setAllShopItems(nextShopItems);

      await persistCache({
        activeMapId: nextActiveMapId,
        mapSettings: nextMapSettings,
        allShopItems: nextShopItems,
      });
    } catch (err) {
      console.error("Error loading world data:", err);
      if (!hydrated) {
        setMapError("Failed to load world data. Check connection.");
      }
    } finally {
      setLoadingMap(false);
    }
  }, [hydrateFromCache, persistCache]);

  useEffect(() => {
    void loadData();
  }, [userId, loadData]);

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
