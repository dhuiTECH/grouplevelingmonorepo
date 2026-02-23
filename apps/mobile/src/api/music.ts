import { supabase } from '@/lib/supabase';

/**
 * game_music table: name + file_url.
 * Track names used in the app:
 * - "Dashboard" → Dashboard screen, Inventory tab, Social tab
 * - "Onboarding Screen - Before Tutorial Overlay" → Onboarding (before tutorial overlay)
 * - "Beginning Map" → First world map (WorldMapScreen)
 */
export interface GameMusic {
  id: string;
  name: string;
  file_url: string;
  created_at?: string;
}

export async function fetchGameMusic(): Promise<GameMusic[]> {
  try {
    const { data, error } = await supabase
      .from('game_music')
      .select('*');

    if (error) {
      console.warn('[MusicAPI] Failed to fetch music tracks:', error);
      return [];
    }

    return data || [];
  } catch (e) {
    console.warn('[MusicAPI] Exception fetching music:', e);
    return [];
  }
}
