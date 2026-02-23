import { Audio } from 'expo-av';

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
    await Audio.setAudioModeAsync({
      playsInSilentModeIOS: false,
      allowsRecordingIOS: false,
      staysActiveInBackground: false,
      interruptionModeIOS: 0,
      shouldDuckAndroid: true,
      interruptionModeAndroid: 2,
      playThroughEarpieceAndroid: false,
    });

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
