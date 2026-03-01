import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

export interface CustomTileMetadata {
  id: string;
  name: string;
  url: string;
  type?: string;
  is_spritesheet: boolean;
  frame_count: number;
  frame_width: number;
  frame_height: number;
  animation_speed: number;
  layer: number;
  is_walkable: boolean;
  snap_to_grid: boolean;
  is_autofill: boolean;
  is_autotile: boolean;
  category?: string;
  smartType?: string;
  rotation?: number;
}

interface TileContextType {
  tileLibrary: Map<string, CustomTileMetadata>;
  isLoading: boolean;
  getTileMetadata: (imageUrl: string) => CustomTileMetadata | undefined;
  refreshLibrary: () => Promise<void>;
}

const TileContext = createContext<TileContextType | undefined>(undefined);

export const TileProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [tileLibrary, setTileLibrary] = useState<Map<string, CustomTileMetadata>>(new Map());
  const [isLoading, setIsLoading] = useState(true);

  const refreshLibrary = useCallback(async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase.from('custom_tiles').select('*');
      
      if (error) throw error;

      if (data && Array.isArray(data)) {
        const library = new Map<string, CustomTileMetadata>();
        data.forEach((t: any) => {
          // Normalize URL (strip query params for matching)
          const cleanUrl = t.url?.split('?')[0];
          if (cleanUrl) {
            library.set(cleanUrl, {
              ...t,
              // Ensure numeric values are numbers
              frame_count: Number(t.frame_count || 1),
              frame_width: Number(t.frame_width || 48),
              frame_height: Number(t.frame_height || 48),
              animation_speed: Number(t.animation_speed || 1),
            });
          }
        });
        setTileLibrary(library);
      }
    } catch (err) {
      console.error('[TileContext] Failed to load tile library:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshLibrary();
  }, [refreshLibrary]);

  const getTileMetadata = useCallback((imageUrl: string) => {
    if (!imageUrl) return undefined;
    const cleanUrl = imageUrl.split('?')[0];
    return tileLibrary.get(cleanUrl);
  }, [tileLibrary]);

  return (
    <TileContext.Provider value={{ tileLibrary, isLoading, getTileMetadata, refreshLibrary }}>
      {children}
    </TileContext.Provider>
  );
};

export const useTileLibrary = () => {
  const context = useContext(TileContext);
  if (context === undefined) {
    throw new Error('useTileLibrary must be used within a TileProvider');
  }
  return context;
};
