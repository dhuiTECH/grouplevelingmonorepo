import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useGameDataStore } from "@/store/useGameDataStore";
import { useEncounterPoolStore } from "@/store/useEncounterPoolStore";

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
    cleanDirtv2SheetUrl: settings.dirtv2_sheet_url
      ? settings.dirtv2_sheet_url.split("?")[0]
      : undefined,
    cleanWaterv2SheetUrl: settings.waterv2_sheet_url
      ? settings.waterv2_sheet_url.split("?")[0]
      : undefined,
    cleanFoamSheetUrl: settings.foam_sheet_url
      ? settings.foam_sheet_url.split("?")[0]
      : undefined,
  };
}

export function useMapData(userId: string | undefined) {
  const storeActiveMapId = useGameDataStore((s) => s.activeMapId);
  const storeMapSettings = useGameDataStore((s) => s.worldMapSettings);
  const storeShopItems = useGameDataStore((s) => s.shopItems);
  const storeHydrated = useGameDataStore((s) => s._hasHydrated);

  const [activeMapId, setActiveMapId] = useState<string | null>(storeActiveMapId);
  const [mapSettings, setMapSettings] = useState<any>(
    storeMapSettings ? normalizeMapSettings(storeMapSettings) : null,
  );
  const [loadingMap, setLoadingMap] = useState(!storeHydrated);
  const [mapError, setMapError] = useState<string | null>(null);
  const [allShopItems, setAllShopItems] = useState<any[]>(storeShopItems);

  useEffect(() => {
    if (!storeHydrated) return;
    if (storeActiveMapId && !activeMapId) setActiveMapId(storeActiveMapId);
    if (storeMapSettings && !mapSettings) setMapSettings(normalizeMapSettings(storeMapSettings));
    if (storeShopItems.length > 0 && allShopItems.length === 0) setAllShopItems(storeShopItems);
    setLoadingMap(false);
  }, [storeHydrated, storeActiveMapId, storeMapSettings, storeShopItems]);

  const backgroundRefresh = useCallback(async () => {
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
      if (nextShopItems.length > 0) setAllShopItems(nextShopItems);

      useGameDataStore.getState().setAll({
        activeMapId: nextActiveMapId,
        worldMapSettings: settingsRes.data,
        shopItems: nextShopItems,
      });

      if (nextActiveMapId) {
        Promise.resolve(
          supabase
            .from("encounter_pool")
            .select("*")
            .or(`map_id.eq.${nextActiveMapId},map_id.is.null`),
        )
          .then(({ data }) => {
            if (data) {
              useEncounterPoolStore.getState().setPoolForMap(nextActiveMapId, data);
            }
          })
          .catch((err: any) => {
            console.warn("[useMapData] encounter pool background refresh failed:", err);
          });
      }
    } catch (err) {
      console.warn("[useMapData] background refresh failed:", err);
    }
  }, []);

  const loadData = useCallback(async () => {
    setMapError(null);

    if (storeHydrated && storeActiveMapId && storeMapSettings) {
      setActiveMapId(storeActiveMapId);
      setMapSettings(normalizeMapSettings(storeMapSettings));
      setAllShopItems(storeShopItems);
      setLoadingMap(false);
    } else {
      setLoadingMap(true);
      try {
        await backgroundRefresh();
      } catch (err) {
        console.error("Error loading world data:", err);
        setMapError("Failed to load world data. Check connection.");
      } finally {
        setLoadingMap(false);
      }
    }
  }, [storeHydrated, storeActiveMapId, storeMapSettings, storeShopItems, backgroundRefresh]);

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
