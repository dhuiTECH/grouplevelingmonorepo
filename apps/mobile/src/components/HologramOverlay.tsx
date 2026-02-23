import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { useTutorial } from '@/context/TutorialContext';
import { useAuth } from '@/contexts/AuthContext';
import { useAudio } from '@/contexts/AudioContext';
import { playHunterSound } from '@/utils/audio';
import TypewriterText from './TypewriterText';
import SpriteSheetAnimator from './SpriteSheetAnimator';

const { width, height } = Dimensions.get('window');

export default function HologramOverlay() {
  const { user } = useAuth();
  const { stopBackgroundMusic } = useAudio();
  const { step, nextStep, position, setShowTutorialChest } = useTutorial();
  const [isTypingDone, setIsTypingDone] = useState(false);
  const [skipTyping, setSkipTyping] = useState(false);

  useEffect(() => {
    if (step !== 'IDLE' && step !== 'COMPLETED') {
      stopBackgroundMusic();
    }
  }, [step, stopBackgroundMusic]);

  // Reset typing state whenever the tutorial step (and thus script) changes
  useEffect(() => {
    setIsTypingDone(false);
    setSkipTyping(false);
  }, [step]);

  if (step === 'IDLE' || step === 'COMPLETED') return null;

  const getScript = () => {
    const name = user?.name || 'Hunter';
    switch (step) {
      case 'INTRO_HOME': return `Welcome, ${name}. Let's initialize your interface.`;
      case 'TRAINING_CARD': return "This is your Daily Training Log. Track progress and set goals here.";
      case 'TRAINING_LOG_MODAL': return "Here, deploy missions, track sets, and complete objectives for XP and Coins.";
      case 'TRAINING_LOG_DIET': return "This is your Diet Log. Record intake to track macros. Consistency is key.";
      case 'NAV_SHOP': return "Hunter's Shop. Buy gear, potions, and upgrades.";
      case 'NAV_SHOP_MAGIC': return "Magic Shop. Acquire aura effects here.";
      case 'NAV_SHOP_GACHA': return "Dimensional Gacha. Win exclusive gear and avatars.";
      case 'NAV_INVENTORY': return "Inventory. Equip items and manage loot.";
      case 'NAV_STATS': return "Status Window. Check stats and manage your Skill Tree.";
      case 'NAV_SOCIAL': return "Social Hub. Join Guilds and vote for best-dressed Hunter rewards.";
      case 'NAV_MAP': return "World Map. Real-world steps equal progress. Discover cities, meet Hunters, and challenge monsters.";
      case 'TUTORIAL_END': return "Every S-Rank Hunter started here. One step at a time. You've got this.";
      default: return "";
    }
  };

  // Logic to position dialog
  // For these steps we center the pet + bubble (modal steps or tab steps with no clear highlight)
  const centerSteps: Array<string> = [
    'TRAINING_LOG_MODAL',
    'TRAINING_LOG_DIET',
    'NAV_SHOP',
    'NAV_SHOP_MAGIC',
    'NAV_SHOP_GACHA',
    'NAV_INVENTORY',
    'NAV_STATS',
    'NAV_MAP',
    'TUTORIAL_END',
  ];
  const modalCenterSteps: Array<string> = [
    'TRAINING_LOG_MODAL',
    'TRAINING_LOG_DIET',
    'NAV_STATS',
  ];
  const isCenterStep = centerSteps.includes(step);
  const isModalCenterStep = modalCenterSteps.includes(step);

  // For non-centered steps, flip text to top if highlight is at the bottom
  const isTargetLow = (position?.y || 0) > height / 2;
  const dialogPosition = isCenterStep
    // For modal-based steps, center within the modal using percentage + translate
    ? isModalCenterStep
      ? { top: '50%', transform: [{ translateY: -80 }] }
      // For global overlay steps, center using window height
      : { top: height / 2 - 40 }
    : isTargetLow
      ? { top: 60 }
      : { bottom: 120 };

  return (
    <View style={[StyleSheet.absoluteFill, { zIndex: 10001 }]} pointerEvents="box-none">
      
      {/* 1. Dark Background Dimmer */}
      <View style={[StyleSheet.absoluteFill, { backgroundColor: 'transparent' }]} pointerEvents="none" />

      {/* 2. The Spotlight Border (omit when overlay is inside a modal; position would be wrong) */}
      {position && step !== 'TRAINING_LOG_MODAL' && step !== 'TRAINING_LOG_DIET' && step !== 'NAV_STATS' && step !== 'TUTORIAL_END' && (
        <View 
          style={{
            position: 'absolute',
            top: position.y - 4,
            left: position.x - 4,
            width: position.width + 8,
            height: position.height + 8,
            borderWidth: 2,
            borderColor: '#00ffff',
            borderRadius: 8,
            shadowColor: '#00ffff', shadowOpacity: 0.8, shadowRadius: 10, elevation: 10
          }}
        />
      )}

      {/* 3. The Hologram Pet & Text */}
      <View
        style={[
          {
            position: 'absolute',
            left: 40,
            right: 40,
            alignItems: 'center',
            overflow: 'visible',
          },
          dialogPosition,
        ]}
      >
        
        {/* Animated Pet */}
        <View style={{ transform: [{ scale: 0.5 }], marginBottom: -130, marginTop: -130 }}>
          <SpriteSheetAnimator
            spriteSheet={require('../../assets/pet.png')}
            frameCount={9}
            frameWidth={4483 / 9}
            frameHeight={512}
            fps={9}
          />
        </View>

        <TouchableOpacity
          activeOpacity={1}
          onPress={() => {
            if (!isTypingDone) {
              setSkipTyping(true);
            } else if (step !== 'TUTORIAL_END') {
              playHunterSound('clickA');
              setIsTypingDone(false);
              nextStep();
            }
          }}
        >
          <View style={styles.dialogBox}>
            <View style={styles.dialogTextWrap}>
              <TypewriterText 
                text={getScript()} 
                style={styles.dialogText}
                speed={25}
                skip={skipTyping}
                onComplete={() => setIsTypingDone(true)}
              />
            </View>
            {isTypingDone && (
              step === 'TUTORIAL_END' ? (
                <TouchableOpacity
                  onPress={() => {
                    playHunterSound('clickA');
                    setShowTutorialChest(true);
                  }}
                  style={styles.button}
                >
                  <Text style={styles.buttonText}>OPEN REWARD</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  onPress={() => {
                    playHunterSound('clickA');
                    setIsTypingDone(false);
                    nextStep();
                  }}
                  style={styles.button}
                >
                  <Text style={styles.buttonText}>NEXT &gt;</Text>
                </TouchableOpacity>
              )
            )}
          </View>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  dialogBox: {
    backgroundColor: 'rgba(5, 15, 30, 0.95)',
    borderWidth: 1,
    borderColor: '#00ffff',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    width: '100%',
    overflow: 'visible',
  },
  dialogTextWrap: {
    minHeight: 40,
    overflow: 'visible',
    paddingLeft: 4,
  },
  dialogText: {
    color: '#00ffff',
    fontFamily: 'monospace',
    fontSize: 12,
    lineHeight: 18,
    textShadowColor: 'rgba(0, 255, 255, 0.5)',
    textShadowRadius: 4,
    flexShrink: 0,
    alignSelf: 'flex-start',
    paddingLeft: 2,
  },
  button: {
    alignSelf: 'flex-end',
    marginTop: 10,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: 'rgba(0,255,255,0.3)',
    borderRadius: 4
  },
  buttonText: { color: '#fff', fontWeight: 'bold', fontSize: 12 }
});
