"use client";

import { useEffect, useRef } from "react";

/**
 * Global battle music presets.
 *
 * NOTE:
 * - These URLs are placeholders. Upload the real MP3 files either:
 *   - To your Supabase `game-assets` bucket under `encounters/music/`, or
 *   - To your Next.js `public/sounds/Game Music/` folder.
 * - Then update these paths to match the actual public URLs.
 */
export const BATTLE_MUSIC_MAP: Record<string, string> = {
  battle_1: "https://eydnmdgxyqrwfrecoylb.supabase.co/storage/v1/object/public/game-assets/battle-presets/battle_1_1770859825032_Battle_Theme_1__standard_.mp3?t=1770859825473",
  battle_2: "/sounds/Game Music/Battle_Theme_2.mp3",
  battle_3: "https://eydnmdgxyqrwfrecoylb.supabase.co/storage/v1/object/public/game-assets/battle-presets/battle_3_1770861853336_Battle_Theme_3_Boss.mp3?t=1770861854086",
  battle_4: "/sounds/Game Music/Battle_Theme_4.mp3",
  battle_5: "/sounds/Game Music/Battle_Theme_5.mp3",
};

interface BattleMusicSource {
  metadata?: {
    sounds?: {
      battle_music_type?: string | null;
      battle_music_url?: string | null;
      [key: string]: unknown;
    };
    [key: string]: unknown;
  } | null;
  [key: string]: unknown;
}

/**
 * Hook: useBattleMusic
 *
 * Usage (in your battle screen component):
 *
 *   useBattleMusic(activeEncounter, isBattleActive);
 *
 * - Reads `metadata.sounds.battle_music_url` and `metadata.sounds.battle_music_type`.
 * - If a custom URL is present, it will be used.
 * - Otherwise, it falls back to the preset map `BATTLE_MUSIC_MAP`.
 * - Loops the track for the duration of the battle and stops on cleanup.
 */
export function useBattleMusic(encounter: BattleMusicSource | null, enabled: boolean = true) {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (!enabled || !encounter) return;
    if (typeof window === "undefined") return;

    const sounds = encounter.metadata?.sounds || {};
    const musicType = (sounds.battle_music_type as string | undefined) || "";
    const musicOverrideUrl = (sounds.battle_music_url as string | undefined) || "";

    const presetUrl = musicType ? BATTLE_MUSIC_MAP[musicType] : undefined;
    const musicUrl = musicOverrideUrl || presetUrl;

    if (!musicUrl) return;

    const audio = new Audio(musicUrl);
    audio.loop = true;
    audio.volume = 0.4;

    audioRef.current = audio;

    const tryPlay = () => {
      audio
        .play()
        .catch(() => {
          // Autoplay might be blocked; rely on user interaction
        });
    };

    // Try immediate playback
    tryPlay();

    // Fallback: start on first interaction if blocked
    const startOnInteraction = () => {
      tryPlay();
      window.removeEventListener("click", startOnInteraction);
      window.removeEventListener("keydown", startOnInteraction);
      window.removeEventListener("touchstart", startOnInteraction);
    };

    window.addEventListener("click", startOnInteraction);
    window.addEventListener("keydown", startOnInteraction);
    window.addEventListener("touchstart", startOnInteraction);

    return () => {
      window.removeEventListener("click", startOnInteraction);
      window.removeEventListener("keydown", startOnInteraction);
      window.removeEventListener("touchstart", startOnInteraction);
      try {
        audio.pause();
        audio.currentTime = 0;
      } catch {
        // ignore
      }
      audioRef.current = null;
    };
  }, [encounter, enabled]);
}

