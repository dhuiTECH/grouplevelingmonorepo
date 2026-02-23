import { Audio } from 'expo-av';
import { getAudioMuted } from './audio';

let currentSound: Audio.Sound | null = null;

const voiceOverMap: { [key: string]: any } = {
  Assassin: require('../../assets/sounds/ClassVoiceOvers/assassin.mp3'),
  Fighter: require('../../assets/sounds/ClassVoiceOvers/fighter.mp3'),
  Healer: require('../../assets/sounds/ClassVoiceOvers/healer.mp3'),
  Mage: require('../../assets/sounds/ClassVoiceOvers/mage.mp3'),
  Ranger: require('../../assets/sounds/ClassVoiceOvers/ranger.mp3'),
  Tanker: require('../../assets/sounds/ClassVoiceOvers/tanker.mp3'),
};

export const playClassVoiceOver = async (classId: string) => {
  if (getAudioMuted()) return;
  const soundFile = voiceOverMap[classId];
  if (!soundFile) {
    console.warn(`Voice-over not found for class: ${classId}`);
    return;
  }

  if (currentSound) {
    try {
      await currentSound.stopAsync();
      await currentSound.unloadAsync();
    } catch (e) {
      console.error("Error stopping/unloading sound:", e);
    }
    currentSound = null;
  }

  try {
    const { sound } = await Audio.Sound.createAsync(soundFile);
    currentSound = sound;
    await sound.playAsync();
  } catch (e) {
    console.error("Error playing sound:", e);
  }
};

export const stopClassVoiceOver = async () => {
  if (currentSound) {
    try {
      await currentSound.stopAsync();
      await currentSound.unloadAsync();
    } catch (e) {
      console.error("Error stopping/unloading sound:", e);
    }
    currentSound = null;
  }
};