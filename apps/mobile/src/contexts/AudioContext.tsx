import React, { createContext, useContext, useState, useRef, useEffect, useCallback, ReactNode } from 'react';
import { Audio } from 'expo-av';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { setAudioMuteGetter } from '@/utils/audio';
import { fetchGameMusic } from '@/api/music';

// All background music now comes from Supabase; no local fallback track.

const MUTE_STORAGE_KEY = '@app/music_muted';
const BGM_DISABLED_KEY = '@app/bgm_disabled_after_tutorial';

/** Resolve Supabase game_music.name → file_url (exact, trim, then case-insensitive). */
function findTrackUrl(
  map: Record<string, string>,
  trackName: string,
): string | undefined {
  if (map[trackName]) return map[trackName];
  const trimmed = trackName.trim();
  if (map[trimmed]) return map[trimmed];
  const key = Object.keys(map).find(
    (k) => k.trim().toLowerCase() === trimmed.toLowerCase(),
  );
  if (key) return map[key];
  return undefined;
}

interface AudioContextType {
  isMuted: boolean;
  setMuted: (value: boolean) => Promise<void>;
  startBackgroundMusic: () => Promise<void>;
  stopBackgroundMusic: () => Promise<void>;
  playTrack: (trackName: string) => Promise<void>;
  /** Clears the tutorial-time BGM lock so normal tracks can play again (call when tutorial is done or already completed). */
  clearBgmDisabledForGameplay: () => Promise<void>;
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
  /** Set when playTrack ran before the Supabase registry finished loading (no retry otherwise). */
  const pendingTrackNameRef = useRef<string | null>(null);

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
          // Respect the iPhone Ring/Silent switch; do not play over silent mode.
          playsInSilentModeIOS: false,
          allowsRecordingIOS: false,
          staysActiveInBackground: false,
          interruptionModeIOS: 1,
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
            if (t.name && t.file_url) {
              map[t.name] = t.file_url;
              const trimmed = t.name.trim();
              if (trimmed) map[trimmed] = t.file_url;
            }
          });
          musicRegistryRef.current = map;
          registryVersionRef.current += 1;
          console.log('[AudioContext] Music registry loaded:', Object.keys(map));

          // Retry a track that was requested while the registry was still empty (e.g. WorldMap on cold start).
          const pending = pendingTrackNameRef.current;
          if (pending && findTrackUrl(map, pending) && isMounted) {
            pendingTrackNameRef.current = null;
            currentTrackNameRef.current = null;
            playTrack(pending);
          }

          // If a screen already requested a track before registry loaded (e.g. Dashboard on first load),
          // we might be playing a local fallback. Call playTrack again to upgrade to the remote URL.
          const requestedTrack = currentTrackNameRef.current;
          if (requestedTrack && findTrackUrl(map, requestedTrack) && isMounted) {
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

  const clearBgmDisabledForGameplay = useCallback(async () => {
    await AsyncStorage.removeItem(BGM_DISABLED_KEY);
    bgmDisabledRef.current = false;
    const sound = bgmRef.current;
    if (!sound || isMutedRef.current) return;
    try {
      const status = await sound.getStatusAsync();
      if (status.isLoaded && !status.isPlaying) await sound.playAsync();
    } catch (e) {
      console.warn('[AudioContext] clearBgmDisabledForGameplay resume failed:', e);
    }
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
    if (loadingTrackNameRef.current === trackName) return;

    // Same track requested again (e.g. tab focus): resume if paused/stopped; reload if refs are stale.
    if (currentTrackNameRef.current === trackName) {
      const sound = bgmRef.current;
      if (sound) {
        try {
          const status = await sound.getStatusAsync();
          if (status.isLoaded && !isMutedRef.current && !bgmDisabledRef.current) {
            if (!status.isPlaying) await sound.playAsync();
          }
        } catch (e) {
          console.warn("[AudioContext] Same-track resume failed:", e);
        }
        return;
      }
      currentTrackNameRef.current = null;
    }

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
    let remoteUrl = findTrackUrl(musicRegistryRef.current, trackName);

    // Support direct URLs (e.g. from metadata)
    if (!remoteUrl && (trackName.startsWith('http') || trackName.startsWith('file://'))) {
      remoteUrl = trackName;
    }

    // If there's still no URL for this track, bail out (no legacy local fallback)
    if (!remoteUrl) {
      const registry = musicRegistryRef.current;
      const keys = Object.keys(registry);
      if (keys.length === 0) {
        pendingTrackNameRef.current = trackName;
        console.warn(
          `[AudioContext] Music registry not ready; queued '${trackName}' for playback when loaded.`,
        );
      } else {
        console.warn(
          `[AudioContext] No URL registered for track '${trackName}'. Known tracks: ${keys.join(', ')}`,
        );
      }
      loadingTrackNameRef.current = null;
      return;
    }

    const source: { uri: string } = { uri: remoteUrl };
    
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
    clearBgmDisabledForGameplay,
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
