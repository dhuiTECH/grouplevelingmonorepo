import { useEffect, useRef } from 'react';
import { Audio } from 'expo-av';
import { getAudioMuted } from '@/utils/audio';
import { SharedValue, useAnimatedReaction, runOnJS } from 'react-native-reanimated';

export function useWalkingSound(isMoving: SharedValue<boolean>) {
  const soundRef = useRef<Audio.Sound | null>(null);

  // Define the actual audio logic separately
  const toggleSound = async (active: boolean) => {
    try {
      if (active && !getAudioMuted()) {
        if (!soundRef.current) {
          const { sound } = await Audio.Sound.createAsync(
            require('../../assets/sounds/walkingsound.mp3'),
            { shouldPlay: true, isLooping: true, volume: 0.7 }
          );
          soundRef.current = sound;
        } else {
          const status = await soundRef.current.getStatusAsync();
          if (status.isLoaded && !status.isPlaying) await soundRef.current.playAsync();
        }
      } else if (soundRef.current) {
        const status = await soundRef.current.getStatusAsync();
        if (status.isLoaded && status.isPlaying) await soundRef.current.stopAsync();
      }
    } catch (e) {
      console.warn('[WorldMap] walking sound error:', e);
    }
  };

  // Reanimated listens to the UI thread shared value directly! No React re-renders.
  useAnimatedReaction(
    () => isMoving.value,
    (moving, prev) => {
      // If the value changes, trigger the JS function to play/stop sound
      if (moving !== prev) runOnJS(toggleSound)(moving);
    }
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (soundRef.current) {
        soundRef.current.stopAsync().catch(() => {});
        soundRef.current.unloadAsync().catch(() => {});
        soundRef.current = null;
      }
    };
  }, []);
}
