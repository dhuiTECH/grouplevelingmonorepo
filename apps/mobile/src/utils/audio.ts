import { Audio } from 'expo-av';

/**
 * Call `initializeGlobalAudioMode()` once at the app root (e.g. `App.tsx` or `_layout.tsx`)
 * so SFX never pay the cost of `setAudioModeAsync` on every play.
 */
let hasInitializedAudioMode = false;

export async function initializeGlobalAudioMode(): Promise<void> {
  if (hasInitializedAudioMode) return;
  await Audio.setAudioModeAsync({
    playsInSilentModeIOS: true,
    allowsRecordingIOS: false,
    staysActiveInBackground: false,
    interruptionModeIOS: 1,
    shouldDuckAndroid: true,
    interruptionModeAndroid: 2,
    playThroughEarpieceAndroid: false,
  });
  hasInitializedAudioMode = true;
}

let getMuted = (): boolean => false;

export function setAudioMuteGetter(fn: () => boolean): void {
  getMuted = fn;
}

export function getAudioMuted(): boolean {
  return getMuted();
}

const SOUND_FILES: Record<string, any> = {
  click: require('../../assets/sounds/click.mp3'),
  clickA: require('../../assets/sounds/clickA.mp3'),
  levelUp: require('../../assets/sounds/level-up.mp3'),
  equip: require('../../assets/sounds/equip.mp3'),
  error: require('../../assets/sounds/error.mp3'),
  loginSuccess: require('../../assets/sounds/loginsuccess.mp3'),
  purchaseSuccess: require('../../assets/sounds/purchasesuccess.mp3'),
  activation: require('../../assets/sounds/activation.mp3'),
  tap: require('../../assets/sounds/tap.mp3'),
  swipe: require('../../assets/sounds/swipe.mp3'),
  nyxGreeting: require('../../assets/shop/nyx1.mp3'),
  nyxPurchase: require('../../assets/shop/nyx2.mp3'),
  worldMapFootstep: require('../../assets/sounds/walkingsound.wav'),
};

let activeVoiceSound: Audio.Sound | null = null;

export type SoundKey = keyof typeof SOUND_FILES;

export const stopActiveVoice = async () => {
  if (activeVoiceSound) {
    try {
      await activeVoiceSound.stopAsync();
      await activeVoiceSound.unloadAsync();
    } catch (error) {
      console.log('[Hunter Audio] Error stopping voice:', error);
    }
    activeVoiceSound = null;
  }
};

export const playHunterSound = async (soundKey: SoundKey, force: boolean = false) => {
  if (!force && getMuted()) return;
  
  // If it's a voice sound, stop any currently playing voice first
  const isVoice = soundKey === 'nyxGreeting' || soundKey === 'nyxPurchase';
  if (isVoice) {
    await stopActiveVoice();
  }

  try {
    const { sound } = await Audio.Sound.createAsync(
      SOUND_FILES[soundKey],
      { shouldPlay: true }
    );
    
    if (isVoice) {
      activeVoiceSound = sound;
    }

    // Unload from memory once finished to keep the system fast
    sound.setOnPlaybackStatusUpdate((status) => {
      if (status.isLoaded && status.didJustFinish) {
        sound.unloadAsync();
        if (isVoice && activeVoiceSound === sound) {
          activeVoiceSound = null;
        }
      }
    });
  } catch (error) {
    console.log(`[Hunter Audio] Failed to play ${soundKey}:`, error);
  }
};

const WALK_FOOTSTEP_VOL = 0.28;
const RUN_FOOTSTEP_VOL = 0.36;
const FOOTSTEP_POOL_SIZE = 3;

let footstepPool: Audio.Sound[] = [];
let footstepIndex = 0;
let isLoadingPool = false;
let footstepPoolReady: Promise<void> | null = null;

async function ensureWorldMapFootstepPool(): Promise<void> {
  if (footstepPool.length === FOOTSTEP_POOL_SIZE) return;
  if (!footstepPoolReady) {
    isLoadingPool = true;
    footstepPoolReady = (async () => {
      const loaded = await Promise.all(
        Array.from({ length: FOOTSTEP_POOL_SIZE }, () =>
          Audio.Sound.createAsync(SOUND_FILES.worldMapFootstep, {
            shouldPlay: false,
            isLooping: false,
            volume: WALK_FOOTSTEP_VOL,
          }),
        ),
      );
      footstepPool = loaded.map((r) => r.sound);
    })().finally(() => {
      isLoadingPool = false;
      footstepPoolReady = null;
    });
  }
  try {
    await footstepPoolReady;
  } catch (e) {
    console.warn('[WorldMap] Footstep pool load failed:', e);
    throw e;
  }
}

/**
 * World-map tile step: round-robin pool of 3 `Audio.Sound` instances (overlap without stacking one decoder).
 */
export async function playWorldMapFootstep(running: boolean): Promise<void> {
  if (getMuted()) return;

  try {
    await initializeGlobalAudioMode();
  } catch (e) {
    console.warn('[WorldMap] Footstep: audio mode not ready', e);
    return;
  }

  try {
    await ensureWorldMapFootstepPool();
    const sound = footstepPool[footstepIndex];
    footstepIndex = (footstepIndex + 1) % FOOTSTEP_POOL_SIZE;
    if (!sound) {
      console.warn('[WorldMap] Footstep play skipped: empty pool slot');
      return;
    }
    const vol = running ? RUN_FOOTSTEP_VOL : WALK_FOOTSTEP_VOL;
    // `replayAsync` uses the native replay path; combined `setStatusAsync({ positionMillis, shouldPlay, volume })`
    // can reject on some Android/iOS builds while the asset is otherwise valid.
    await sound.replayAsync({ volume: vol });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.warn('[WorldMap] Footstep play failed:', msg, error);
    footstepPool = [];
    footstepIndex = 0;
  }
}
