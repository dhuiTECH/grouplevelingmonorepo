import { useEffect, useState, useRef } from "react";
import { Audio } from 'expo-av';
import { supabase } from '../lib/supabase';
import { useAudio } from '@/contexts/AudioContext';

export function useBattleMusic(encounter: any, enabled: boolean = true) {
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const soundRef = useRef<Audio.Sound | null>(null);
  const { isMuted } = useAudio();

  useEffect(() => {
    if (!enabled || !encounter) return;
    let isMounted = true;

    async function loadAndPlay() {
      try {
        const sounds = encounter.metadata?.sounds || {};
        const musicType = sounds.battle_music_type;
        const musicOverrideUrl = sounds.battle_music_url || encounter.metadata?.music_url || encounter.metadata?.bgm_url || encounter.metadata?.music || encounter.metadata?.bgm; // Support fallback keys
        let finalUrl = musicOverrideUrl;

        // If no custom URL, but we have a preset type (e.g. "battle_1"), fetch it from DB
        if (!finalUrl && musicType) {
          const { data: preset } = await supabase
            .from('battle_music_presets')
            .select('file_url')
            .eq('id', musicType)
            .single();

          if (preset?.file_url) {
            finalUrl = preset.file_url;
          }
        }

        // If still no URL, fallback to a default or return
        if (!finalUrl) {
          console.log('No battle music found for:', musicType);
          return;
        }

        // Play the music
        if (soundRef.current) {
          await soundRef.current.unloadAsync();
        }

        const { sound: newSound } = await Audio.Sound.createAsync(
          { uri: finalUrl },
          { shouldPlay: !isMuted, isLooping: true, volume: 0.5 }
        );

        if (isMounted) {
          soundRef.current = newSound;
          setSound(newSound);
        } else {
          newSound.unloadAsync();
        }
      } catch (error) {
        console.error('Error playing battle music:', error);
      }
    }

    loadAndPlay();

    return () => {
      isMounted = false;
      if (soundRef.current) {
        soundRef.current.unloadAsync();
      }
    };
  }, [encounter?.id, enabled]); 

  // Handle mute changes dynamically
  useEffect(() => {
    if (sound) {
      if (isMuted) {
        sound.pauseAsync();
      } else {
        sound.playAsync();
      }
    }
  }, [isMuted, sound]);

  return sound;
}
