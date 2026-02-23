import React, { createContext, useContext, useState, useRef, useEffect, useCallback, ReactNode } from 'react';
import { Audio } from 'expo-av';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { setAudioMuteGetter } from '@/utils/audio';
import { fetchGameMusic } from '@/api/music';

// Fallback local asset
const DEFAULT_BGM_SOURCE = require('../../assets/sounds/gamemusic/GroupLevelingOSTBeginning.mp3');

const MUTE_STORAGE_KEY = '@app/music_muted';
const BGM_DISABLED_KEY = '@app/bgm_disabled_after_tutorial';

interface AudioContextType {
  isMuted: boolean;
  setMuted: (value: boolean) => Promise<void>;
  startBackgroundMusic: () => Promise<void>;
  stopBackgroundMusic: () => Promise<void>;
  playTrack: (trackName: string) => Promise<void>;
}

const AudioContext = createContext<AudioContextType | undefined>(undefined);

interface AudioProviderProps {
  children: ReactNode;
}

export function AudioProvider({ children }: AudioProviderProps): JSX.Element {
  const [isMuted, setIsMutedState] = useState(false);
  const isMutedRef = useRef(false);
  const bgmRef = useRef<Audio.Sound | null>(null);
  const loadedRef = useRef(false);
  const bgmDisabledRef = useRef(false);
  
  // Dynamic Music Registry
  const musicRegistryRef = useRef<Record<string, string>>({});
  const currentTrackNameRef = useRef<string | null>(null);
  const loadingTrackNameRef = useRef<string | null>(null);
  const registryVersionRef = useRef(0);

  // SFX use this getter to respect mute (reads ref so always current)
  useEffect(() => {
    setAudioMuteGetter(() => isMutedRef.current);
  }, []);

  // Load persisted mute state and fetch music registry
  useEffect(() => {
    let isMounted = true;

    const init = async () => {
      try {
        await Audio.setAudioModeAsync({
          playsInSilentModeIOS: false,
          allowsRecordingIOS: false,
          staysActiveInBackground: false,
          interruptionModeIOS: 0,
          shouldDuckAndroid: true,
          interruptionModeAndroid: 2,
          playThroughEarpieceAndroid: false,
        });

        const stored = await AsyncStorage.getItem(MUTE_STORAGE_KEY);
        const disabledStored = await AsyncStorage.getItem(BGM_DISABLED_KEY);
        const muted = stored === 'true';
        const bgmDisabled = disabledStored === 'true';
        
        if (isMounted) {
          isMutedRef.current = muted;
          setIsMutedState(muted);
          bgmDisabledRef.current = bgmDisabled;
        }

        // Fetch music configuration from Supabase
        const tracks = await fetchGameMusic();
        if (isMounted && tracks.length > 0) {
          const map: Record<string, string> = {};
          tracks.forEach(t => {
            if (t.name && t.file_url) map[t.name] = t.file_url;
          });
          musicRegistryRef.current = map;
          registryVersionRef.current += 1;
          console.log('[AudioContext] Music registry loaded:', Object.keys(map));

          // If a screen already requested a track before registry loaded (e.g. Dashboard on first load),
          // we might be playing a local fallback. Call playTrack again to upgrade to the remote URL.
          const requestedTrack = currentTrackNameRef.current;
          if (requestedTrack && map[requestedTrack] && isMounted) {
            console.log(`[AudioContext] Upgrading track '${requestedTrack}' to remote URL.`);
            // We clear currentTrackNameRef so playTrack doesn't think it's already playing.
            // Note: playTrack will handle unloading the current sound.
            currentTrackNameRef.current = null;
            playTrack(requestedTrack);
          }
        }
      } catch (e) {
        console.warn('[AudioContext] Init failed:', e);
      }
    };

    init();
    
    return () => {
      isMounted = false;
      const s = bgmRef.current;
      if (s) {
        s.unloadAsync().catch(() => {});
        bgmRef.current = null;
        loadedRef.current = false;
      }
    };
  }, []);

  const setMuted = useCallback(async (value: boolean) => {
    await AsyncStorage.setItem(MUTE_STORAGE_KEY, value ? 'true' : 'false');
    isMutedRef.current = value;
    setIsMutedState(value);
    const sound = bgmRef.current;
    if (!sound) return;
    try {
      if (value) {
        await sound.pauseAsync();
      } else {
        await sound.playAsync();
      }
    } catch (e) {
      console.warn('[AudioContext] Pause/resume failed:', e);
    }
  }, []);

  const playTrack = useCallback(async (trackName: string) => {
    // If we're already on this track or already loading it, do nothing
    if (currentTrackNameRef.current === trackName || loadingTrackNameRef.current === trackName) return;
    
    console.log(`[AudioContext] Switching track to: ${trackName}`);
    loadingTrackNameRef.current = trackName;
    const versionWhenStarted = registryVersionRef.current;

    // Unload current
    if (bgmRef.current) {
      try {
        const soundToUnload = bgmRef.current;
        bgmRef.current = null;
        loadedRef.current = false;
        await soundToUnload.unloadAsync();
      } catch (e) { /* ignore */ }
    }

    // Read registry right before creating sound so we use the URL if it just finished loading
    let remoteUrl = musicRegistryRef.current[trackName];

    // Support direct URLs (e.g. from metadata)
    if (!remoteUrl && (trackName.startsWith('http') || trackName.startsWith('file://'))) {
      remoteUrl = trackName;
    }

    const source: { uri: string } | number = remoteUrl ? { uri: remoteUrl } : DEFAULT_BGM_SOURCE;
    
    try {
      const { sound } = await Audio.Sound.createAsync(source as any, {
        shouldPlay: false,
        isLooping: true,
        volume: 1.0,
      });

      if (loadingTrackNameRef.current !== trackName || registryVersionRef.current > versionWhenStarted) {
        sound.unloadAsync().catch(() => {});
        return;
      }

      bgmRef.current = sound;
      currentTrackNameRef.current = trackName;
      loadingTrackNameRef.current = null;
      loadedRef.current = true;

      if (!isMutedRef.current && !bgmDisabledRef.current) {
        await sound.playAsync();
      }
    } catch (e) {
      console.warn(`[AudioContext] Failed to play track ${trackName}:`, e);
      loadingTrackNameRef.current = null;
      
      if (remoteUrl) {
        console.log('[AudioContext] Attempting fallback to local default...');
        try {
          const { sound } = await Audio.Sound.createAsync(DEFAULT_BGM_SOURCE, {
            shouldPlay: !isMutedRef.current && !bgmDisabledRef.current,
            isLooping: true,
            volume: 1.0,
          });
          
          if (currentTrackNameRef.current !== trackName || registryVersionRef.current > versionWhenStarted) {
            sound.unloadAsync().catch(() => {});
            return;
          }
          
          bgmRef.current = sound;
          loadedRef.current = true;
        } catch (e2) {
          console.warn('[AudioContext] Fallback failed too:', e2);
        }
      }
    }
  }, []);

  const startBackgroundMusic = useCallback(async () => {
    if (isMutedRef.current || bgmDisabledRef.current) return;
    
    // If nothing loaded, try playing default or current track
    if (!bgmRef.current) {
      if (currentTrackNameRef.current) {
        await playTrack(currentTrackNameRef.current);
      } else {
        // Just ensure default is loaded
      }
      return;
    }

    const sound = bgmRef.current;
    try {
      const status = await sound.getStatusAsync();
      if (status.isLoaded && status.isPlaying) return;
      await sound.playAsync();
    } catch (e) {
      console.warn('[AudioContext] startBackgroundMusic failed:', e);
    }
  }, [playTrack]);

  const stopBackgroundMusic = useCallback(async () => {
    const sound = bgmRef.current;
    if (!sound) return;
    try {
      await sound.stopAsync();
      // Clear current track name so playTrack will resume/reload if called with same track
      currentTrackNameRef.current = null;
    } catch (e) {
      console.warn('[AudioContext] stopBackgroundMusic failed:', e);
    }
  }, []);

  const value: AudioContextType = {
    isMuted,
    setMuted,
    startBackgroundMusic,
    stopBackgroundMusic,
    playTrack,
  };

  return (
    <AudioContext.Provider value={value}>
      {children}
    </AudioContext.Provider>
  );
}

export function useAudio(): AudioContextType {
  const context = useContext(AudioContext);
  if (context === undefined) {
    throw new Error('useAudio must be used within an AudioProvider');
  }
  return context;
}
