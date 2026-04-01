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

const POOLED_KEYS: SoundKey[] = ['tap', 'swipe', 'click', 'clickA'];
const POOL_SIZE = 2;
const soundPool: Record<string, Audio.Sound[]> = {};
const soundPoolIdx: Record<string, number> = {};
let poolReady: Promise<void> | null = null;

async function ensureSoundPool(): Promise<void> {
  if (Object.keys(soundPool).length >= POOLED_KEYS.length) return;
  if (!poolReady) {
    poolReady = (async () => {
      await initializeGlobalAudioMode();
      await Promise.all(
        POOLED_KEYS.map(async (key) => {
          if (soundPool[key]?.length) return;
          const instances = await Promise.all(
            Array.from({ length: POOL_SIZE }, () =>
              Audio.Sound.createAsync(SOUND_FILES[key], { shouldPlay: false }),
            ),
          );
          soundPool[key] = instances.map((r) => r.sound);
          soundPoolIdx[key] = 0;
        }),
      );
    })().catch((e) => {
      console.warn('[Audio] Pool init failed:', e);
    }).finally(() => {
      if (Object.keys(soundPool).length < POOLED_KEYS.length) {
        poolReady = null;
      }
    });
  }
  await poolReady;
}

export function preloadBattleSounds(): void {
  ensureSoundPool().catch(() => {});
}

export const playHunterSound = async (soundKey: SoundKey, force: boolean = false) => {
  if (!force && getMuted()) return;

  const isVoice = soundKey === 'nyxGreeting' || soundKey === 'nyxPurchase';
  if (isVoice) {
    await stopActiveVoice();
  }

  if ((POOLED_KEYS as string[]).includes(soundKey as string)) {
    try {
      await ensureSoundPool();
      const pool = soundPool[soundKey as string];
      if (pool?.length) {
        const idx = soundPoolIdx[soundKey as string] ?? 0;
        soundPoolIdx[soundKey as string] = (idx + 1) % pool.length;
        await pool[idx].replayAsync();
        return;
      }
    } catch (e) {
      console.warn(`[Hunter Audio] Pool play failed for ${soundKey}, falling back`, e);
    }
  }

  try {
    const { sound } = await Audio.Sound.createAsync(
      SOUND_FILES[soundKey],
      { shouldPlay: true }
    );
    
    if (isVoice) {
      activeVoiceSound = sound;
    }

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

const SFX_POOL_SIZE = 2;
const sfxSoundCache: Record<string, Audio.Sound[]> = {};
const sfxSoundIdx: Record<string, number> = {};

export async function preloadSfxUrl(uri: string): Promise<void> {
  const key = uri.trim();
  if (!key || sfxSoundCache[key]?.length) return;
  try {
    const instances = await Promise.all(
      Array.from({ length: SFX_POOL_SIZE }, () =>
        Audio.Sound.createAsync({ uri: key }, { shouldPlay: false }),
      ),
    );
    sfxSoundCache[key] = instances.map((r) => r.sound);
    sfxSoundIdx[key] = 0;
  } catch (e) {
    console.warn('[Audio] SFX preload failed:', key, e);
  }
}

export function getCachedSfxSound(uri: string): Audio.Sound | null {
  const key = uri.trim();
  const pool = sfxSoundCache[key];
  if (!pool?.length) return null;
  const idx = sfxSoundIdx[key] ?? 0;
  sfxSoundIdx[key] = (idx + 1) % pool.length;
  return pool[idx];
}

export async function unloadSfxCache(): Promise<void> {
  const keys = Object.keys(sfxSoundCache);
  for (const key of keys) {
    const pool = sfxSoundCache[key];
    if (pool) {
      for (const s of pool) {
        try { await s.unloadAsync(); } catch (_) {}
      }
    }
    delete sfxSoundCache[key];
    delete sfxSoundIdx[key];
  }
}

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
