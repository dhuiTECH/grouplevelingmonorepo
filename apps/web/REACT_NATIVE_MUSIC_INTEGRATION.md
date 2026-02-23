# Music System Integration Guide for React Native

This guide explains how to integrate the dynamic music system into your React Native (Expo) app using Supabase.

## 1. Prerequisites

Ensure you have the following packages installed in your React Native project:

```bash
npx expo install expo-av @supabase/supabase-js
```

## 2. Supabase Setup

Make sure your Supabase client is initialized correctly in your app (e.g., `lib/supabase.ts`).

```typescript
import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';

// Helper to use Expo SecureStore for Supabase auth persistence
const ExpoSecureStoreAdapter = {
  getItem: (key: string) => {
    return SecureStore.getItemAsync(key);
  },
  setItem: (key: string, value: string) => {
    SecureStore.setItemAsync(key, value);
  },
  removeItem: (key: string) => {
    SecureStore.deleteItemAsync(key);
  },
};

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: ExpoSecureStoreAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
```

## 3. The `useGameMusic` Hook

Create a reusable hook `hooks/useGameMusic.ts` to fetch and play music based on category or specific nodes.

```typescript
import { useState, useEffect, useRef } from 'react';
import { Audio } from 'expo-av';
import { supabase } from '../lib/supabase'; // Adjust import path

type MusicCategory = 'battle' | 'world' | 'menu' | 'shop' | 'dungeon' | 'other';

interface GameTrack {
  id: string;
  name: string;
  file_url: string;
  category: MusicCategory;
}

export function useGameMusic(
  options: { 
    category?: MusicCategory; 
    nodeId?: string | null; 
    mapId?: string | null;
  }, 
  shouldPlay: boolean = true
) {
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [track, setTrack] = useState<GameTrack | null>(null);
  const soundRef = useRef<Audio.Sound | null>(null);

  // 1. Fetch the active track based on priority: Node > Map > Category
  useEffect(() => {
    let isMounted = true;

    async function fetchTrack() {
      try {
        let musicId = null;

        // A. Check Node Specific Music
        if (options.nodeId) {
          const { data: node } = await supabase
            .from('world_map_nodes')
            .select('music_id')
            .eq('id', options.nodeId)
            .single();
          if (node?.music_id) musicId = node.music_id;
        }

        // B. Check Map Specific Music (if no node music found)
        if (!musicId && options.mapId) {
          const { data: map } = await supabase
            .from('maps')
            .select('music_id')
            .eq('id', options.mapId)
            .single();
          if (map?.music_id) musicId = map.music_id;
        }

        // C. Fetch Track Data
        let query = supabase.from('game_music').select('*');
        
        if (musicId) {
          query = query.eq('id', musicId);
        } else if (options.category) {
          // Fallback to latest track in category
          query = query.eq('category', options.category).order('created_at', { ascending: false }).limit(1);
        } else {
          return; // No criteria provided
        }

        const { data, error } = await query.maybeSingle();

        if (error) {
          console.error('Error fetching music:', error);
          return;
        }

        if (isMounted && data) {
          // Only update if it's a different track to prevent reloading same audio
          setTrack(prev => prev?.id === data.id ? prev : data);
        }
      } catch (err) {
        console.error('Music fetch error:', err);
      }
    }

    fetchTrack();

    return () => {
      isMounted = false;
    };
  }, [options.category, options.nodeId, options.mapId]);

  // 2. Play/Pause logic
  useEffect(() => {
    if (!track || !shouldPlay) {
      if (soundRef.current) {
        soundRef.current.stopAsync();
      }
      return;
    }

    async function playMusic() {
      try {
        // Unload previous sound if exists
        if (soundRef.current) {
          await soundRef.current.unloadAsync();
        }

        console.log('Loading music:', track?.name);
        
        // Configure audio for background playback (iOS requirement)
        await Audio.setAudioModeAsync({
          playsInSilentModeIOS: true,
          staysActiveInBackground: true,
          shouldDuckAndroid: true,
          playThroughEarpieceAndroid: false,
        });

        const { sound: newSound } = await Audio.Sound.createAsync(
          { uri: track.file_url },
          { shouldPlay: true, isLooping: true, volume: 0.5 }
        );

        soundRef.current = newSound;
        setSound(newSound);
      } catch (error) {
        console.error('Failed to play sound:', error);
      }
    }

    playMusic();

    return () => {
      // Cleanup on unmount or track change
      if (soundRef.current) {
        soundRef.current.unloadAsync();
        soundRef.current = null;
      }
    };
  }, [track?.id, shouldPlay]); // Dependency on track ID ensures reload only on change

  return { track, sound };
}
```

## 4. NPC Speech Sound Hook

Add a helper to play NPC speech sounds when dialog opens.

```typescript
export function playSpeechSound(url: string | null) {
  if (!url) return;
  
  Audio.Sound.createAsync(
    { uri: url },
    { shouldPlay: true, volume: 1.0 }
  ).then(({ sound }) => {
    // Optional: unload after playing if it's a one-shot
    sound.setOnPlaybackStatusUpdate(status => {
      if (status.isLoaded && status.didJustFinish) {
        sound.unloadAsync();
      }
    });
  }).catch(err => console.error('Failed to play speech:', err));
}
```

## 5. Usage Examples

### A. Main Menu (Category Based)
```tsx
import { useGameMusic } from '../hooks/useGameMusic';

export default function MainMenu() {
  useGameMusic({ category: 'menu' }); 
  return <View>...</View>;
}
```

### B. World Map (Map Based)
```tsx
export default function WorldMap({ currentMapId }) {
  // Plays specific map music if assigned, otherwise falls back to 'world' category
  useGameMusic({ category: 'world', mapId: currentMapId }); 
  return <View>...</View>;
}
```

### C. Node Interaction (Node Specific)
```tsx
export default function InteractionModal({ node, isVisible }) {
  // Prioritizes node-specific music
  useGameMusic({ nodeId: node.id }, isVisible);

  useEffect(() => {
    if (isVisible && node.speech_sound_url) {
      playSpeechSound(node.speech_sound_url);
    }
  }, [isVisible]);

  return <View>...</View>;
}
```
