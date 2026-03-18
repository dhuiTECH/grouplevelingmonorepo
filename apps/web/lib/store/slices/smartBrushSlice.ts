import { StateCreator } from 'zustand';
import { supabase } from '../../supabase';
import { MapState, SmartBrushSlice } from '../types';

export const createSmartBrushSlice: StateCreator<
  MapState,
  [],
  [],
  SmartBrushSlice
> = (set, get) => ({
  isSmartMode: false,
  smartBrushLock: false,
  selectedSmartType: 'off',
  selectedBlockCol: 0,
  selectedBlockRow: 0,
  smartBrushLayer: 0,
  terrainOffsets: {
    grass: { flat: [0, 0], raised: [0, 192] },
    dirt: { flat: [0, 384], raised: [0, 576] }
  },
  isRaiseMode: false,
  isFoamEnabled: true,
  autoTileSheetUrl: null,
  dirtSheetUrl: null,
  waterSheetUrl: null,
  dirtv2SheetUrl: null,
  waterv2SheetUrl: null,
  selectedWaterBaseId: null,
  selectedFoamStripId: null,
  collisionMode: 'full',
  edgeDirection: 4,

  setSmartMode: (isSmartMode) => set({ isSmartMode }),
  setSmartBrushLock: (smartBrushLock) => set({ smartBrushLock }),
  setSelectedSmartType: (selectedSmartType) => set({ selectedSmartType, isSmartMode: selectedSmartType !== 'off' }),
  setSelectedBlock: (selectedBlockCol, selectedBlockRow) => set({ selectedBlockCol, selectedBlockRow }),
  setSmartBrushLayer: (smartBrushLayer) => set({ smartBrushLayer }),
  setRaiseMode: (enabled) => set({ isRaiseMode: enabled }),
  setFoamEnabled: (isFoamEnabled) => set({ isFoamEnabled }),
  setCollisionMode: (collisionMode) => set({ collisionMode }),
  setEdgeDirection: (edgeDirection) => set({ edgeDirection }),

  setAutoTileSheetUrl: async (url) => {
    set({ autoTileSheetUrl: url });
    
    try {
      console.log("Attempting to save new tilesheet URL to database...", url);
      
      const { data, error } = await supabase
        .from('world_map_settings')
        .upsert({ id: 1, autotile_sheet_url: url }, { onConflict: 'id' })
        .select(); // Added .select() to force a response back from the database

      if (error) {
        console.error("🔥 Supabase Upsert Error:", error.message);
        console.error("🔥 Error Details:", error.details);
        console.error("🔥 Error Hint:", error.hint);
        console.error("🔥 Full Error Object:", error);
      } else {
        console.log("✅ Database successfully updated! Response:", data);
      }
    } catch (err) {
      console.error("💥 Critical Network or Execution Error:", err);
    }
  },
  setDirtSheetUrl: async (url) => {
    set({ dirtSheetUrl: url });
    await supabase.from('world_map_settings').upsert({ id: 1, dirt_sheet_url: url }, { onConflict: 'id' });
  },
  setWaterSheetUrl: async (url) => {
    set({ waterSheetUrl: url });
    await supabase.from('world_map_settings').upsert({ id: 1, water_sheet_url: url }, { onConflict: 'id' });
  },
  setDirtv2SheetUrl: async (url) => {
    set({ dirtv2SheetUrl: url });
    await supabase.from('world_map_settings').upsert({ id: 1, dirtv2_sheet_url: url }, { onConflict: 'id' });
  },
  setWaterv2SheetUrl: async (url) => {
    set({ waterv2SheetUrl: url });
    await supabase.from('world_map_settings').upsert({ id: 1, waterv2_sheet_url: url }, { onConflict: 'id' });
  },
  setSelectedWaterBaseId: async (id) => {
    set({ selectedWaterBaseId: id });
    const tile = get().customTiles.find(t => t.id === id);
    if (tile) {
      await supabase.from('world_map_settings').upsert({ id: 1, water_base_url: tile.url }, { onConflict: 'id' });
    }
  },
  setSelectedFoamStripId: async (id) => {
    set({ selectedFoamStripId: id });
    const tile = get().customTiles.find(t => t.id === id);
    if (tile) {
      await supabase.from('world_map_settings').upsert({ 
        id: 1, 
        foam_sheet_url: tile.url,
        foam_is_spritesheet: tile.isSpritesheet || false,
        foam_frame_count: tile.frameCount || 1,
        foam_frame_width: tile.frameWidth || 48,
        foam_frame_height: tile.frameHeight || 48,
        foam_animation_speed: String(tile.animationSpeed || 0.8)
      }, { onConflict: 'id' });
    }
  },

  waterBaseTile: () => get().customTiles.find(t => t.id === get().selectedWaterBaseId),
  foamStripTile: () => get().customTiles.find(t => t.id === get().selectedFoamStripId),
});
