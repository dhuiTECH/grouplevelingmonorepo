import { useEffect, useRef } from 'react';
import { Audio } from 'expo-av';
import { getAudioMuted } from '@/utils/audio';
import { SharedValue, useAnimatedReaction, runOnJS } from 'react-native-reanimated';

export function useWalkingSound(activeDirection: SharedValue<'UP' | 'DOWN' | 'LEFT' | 'RIGHT' | null>) {
  const soundRef = useRef<Audio.Sound | null>(null);

  // Instant execution without status checking lag
  const handleAudioState = async (isPressing: boolean) => {
    if (!soundRef.current) return;
    
    try {
      if (isPressing && !getAudioMuted()) {
        await soundRef.current.playAsync();
      } else {
        await soundRef.current.pauseAsync();
      }
    } catch (e: any) {
      // Ignore normal interruption warnings
      if (!e?.message?.includes('interrupted')) {
        console.warn('[WorldMap] walking sound error:', e);
      }
    }
  };

  useAnimatedReaction(
    () => activeDirection.value !== null,
    (isPressing, prev) => {
      // Only fire JS if the exact state of "pressing" vs "not pressing" changes
      if (isPressing !== prev) {
        runOnJS(handleAudioState)(isPressing);
      }
    }
  );

  // Pre-load and Cleanup
  useEffect(() => {
    let mounted = true;

    async function preload() {
      try {
        const { sound } = await Audio.Sound.createAsync(
          require('../../assets/sounds/walkingsound.mp3'),
          { shouldPlay: false, isLooping: true, volume: 0.3 }
        );
        if (mounted) {
          soundRef.current = sound;
        } else {
          await sound.unloadAsync();
        }
      } catch (e) {
        console.warn('[WorldMap] Failed to pre-load walking sound:', e);
      }
    }

    preload();

    return () => {
      mounted = false;
      if (soundRef.current) {
        const s = soundRef.current;
        soundRef.current = null;
        s.stopAsync().then(() => s.unloadAsync()).catch(() => {});
      }
    };
  }, []);
}
