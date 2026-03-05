import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  ImageBackground,
  ScrollView,
} from 'react-native';
import { Image } from 'expo-image';
import Animated, {
  useAnimatedStyle,
  withTiming,
  withRepeat,
  withSequence,
  FadeIn,
  FadeOut,
  ZoomIn,
  SlideInDown,
} from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
  import { ChevronRight, FastForward } from 'lucide-react-native';
import { Audio } from 'expo-av';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width, height } = Dimensions.get('window');

export interface DialogueLine {
  npc_name?: string;
  text: string;
  image_url?: string;
  // Optional per-line voiced delivery uploaded via map editor
  voice_line_url?: string;
}

export interface ActionButton {
  label: string;
  target_event: string;
  payload?: any;
}

export interface DialogueSceneProps {
  visible: boolean;
  nodeName: string;
  backgroundUrl?: any;
  npcSpriteUrl?: any;
  dialogueScript: DialogueLine[];
  onClose: () => void;
  onBattleStart?: () => void;
  onAction?: (event: string, payload?: any) => void;
  actionButtons?: ActionButton[];
  interactionType?: 'DIALOGUE' | 'BATTLE' | 'SHOP' | string;
  typingSpeed?: number;
  // Spritesheet support
  isSpritesheet?: boolean;
  frameCount?: number;
  frameSize?: number;
}

export function DialogueScene({
  visible,
  nodeName,
  backgroundUrl,
  npcSpriteUrl,
  dialogueScript,
  onClose,
  onBattleStart,
  onAction,
  actionButtons = [],
  interactionType,
  typingSpeed = 25,
  isSpritesheet = false,
  frameCount = 1,
  frameSize = 512,
}: DialogueSceneProps) {
  const insets = useSafeAreaInsets();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [displayedText, setDisplayedText] = useState('');
  const [isTypingComplete, setIsTypingComplete] = useState(false);
  const [typeSound, setTypeSound] = useState<Audio.Sound | null>(null);
  const [voiceSound, setVoiceSound] = useState<Audio.Sound | null>(null);
  const voiceCacheRef = useRef<Record<string, Audio.Sound | null>>({});

  const [currentFrame, setCurrentFrame] = useState(0);
  
  // Use ref to track typing index to avoid closure staleness
  const typingIndexRef = useRef(0);
  const fullTextRef = useRef('');

  // Spritesheet Animation Loop
  useEffect(() => {
    if (!isSpritesheet || frameCount <= 1) return;
    const interval = setInterval(() => {
      setCurrentFrame((prev) => (prev + 1) % frameCount);
    }, 150);
    return () => clearInterval(interval);
  }, [isSpritesheet, frameCount]);

  const currentLine = dialogueScript?.[currentIndex] || { text: '' };
  
  // Resolve which portrait to show
  const currentPortrait = currentLine?.image_url ? { uri: currentLine.image_url } : npcSpriteUrl;

  // 1. Initialize typewriter Audio (clicky text sound)
  useEffect(() => {
    let soundObj: Audio.Sound | null = null;
    const loadSound = async () => {
      try {
        // Only load if visible
        if (!visible) return;

        const { sound } = await Audio.Sound.createAsync(
          require('../../assets/sounds/tap.mp3')
        );
        soundObj = sound;
        setTypeSound(sound);
      } catch (err) {
        console.log('Failed to load type sound', err);
      }
    };
    loadSound();
    return () => {
      if (soundObj) {
        soundObj.unloadAsync();
      }
    };
  }, [visible]);

  // 1b. Per-line Voiceover (if voice_line_url is present)
  useEffect(() => {
    let isCancelled = false;

    const setupVoice = async () => {
      if (!visible) return;

      // Stop any currently playing voice, but don't unload cached sounds
      if (voiceSound) {
        try {
          await voiceSound.stopAsync();
        } catch {
          // ignore
        }
      }

      const url = currentLine?.voice_line_url;
      if (!url) return;

      // Use cached sound if available
      const cached = voiceCacheRef.current[url];
      if (cached) {
        if (isCancelled) return;
        setVoiceSound(cached);
        try {
          await cached.setPositionAsync(0);
          await cached.playAsync();
        } catch (err) {
          console.log('Failed to play cached voice line', err);
        }
        return;
      }

      // Otherwise, load and cache the sound once
      try {
        const { sound } = await Audio.Sound.createAsync(
          { uri: url },
          { shouldPlay: true }
        );
        if (isCancelled) {
          try {
            await sound.unloadAsync();
          } catch {
            // ignore
          }
          return;
        }
        voiceCacheRef.current[url] = sound;
        setVoiceSound(sound);
      } catch (err) {
        console.log('Failed to load voice line', err);
        voiceCacheRef.current[url] = null;
      }
    };

    setupVoice();

    return () => {
      isCancelled = true;
    };
  }, [visible, currentIndex, currentLine?.voice_line_url]);

  // 2. Typewriter Effect - Fixed to avoid undefined
  useEffect(() => {
    if (!visible || !dialogueScript || dialogueScript.length === 0) return;

    // Reset refs and state
    typingIndexRef.current = 0;
    fullTextRef.current = currentLine.text || '';
    setDisplayedText('');
    setIsTypingComplete(false);
    
    let charsTypedSinceHaptic = 0;
    let isActive = true;

    const interval = setInterval(() => {
      if (!isActive) return;
      
      const fullText = fullTextRef.current;
      const currentIdx = typingIndexRef.current;
      
      if (currentIdx < fullText.length) {
        const char = fullText[currentIdx];
        // Only append if char is defined
        if (char !== undefined) {
          setDisplayedText((prev) => prev + char);
        }
        typingIndexRef.current = currentIdx + 1;
        charsTypedSinceHaptic++;

        // Audio blip (skip if a voice line is playing to avoid noise stacking)
        if (typeSound && !currentLine.voice_line_url) {
           typeSound.setPositionAsync(0);
           typeSound.playAsync();
        }

        // Haptic feedback every 3 characters
        if (charsTypedSinceHaptic >= 3) {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          charsTypedSinceHaptic = 0;
        }

      } else {
        if (isActive) {
          setIsTypingComplete(true);
          clearInterval(interval);
        }
      }
    }, typingSpeed);

    return () => {
      isActive = false;
      clearInterval(interval);
    };
  }, [currentIndex, visible, currentLine.text, typeSound, typingSpeed, dialogueScript]);

  // 3. Interaction Handling
  const handleDialogueTap = () => {
    // State 1: Still typing -> Reveal full text immediately
    if (!isTypingComplete) {
      setDisplayedText(currentLine.text || '');
      setIsTypingComplete(true);
      return;
    }
    
    // State 2: Complete -> Next line or End Action
    if (currentIndex < dialogueScript.length - 1) {
      // Move to next line
      setCurrentIndex((prev) => prev + 1);
    } else {
      // On last line - close the dialogue (action buttons are separate options)
      handleComplete();
    }
  };

  const handleComplete = () => {
    if (interactionType === 'BATTLE' && onBattleStart) {
      onBattleStart();
    } else {
      onClose();
    }
  };

  const skipDialogue = () => {
    // For casual users: Close everything immediately
    onClose();
  };

  // 4. Breathing Animation for NPC Sprite
  const breathingStyle = useAnimatedStyle(() => {
    return {
      transform: [
        {
          scaleY: withRepeat(
            withSequence(
              withTiming(1.015, { duration: 3000 }),
              withTiming(1, { duration: 3000 })
            ),
            -1,
            true
          ),
        },
      ],
      transformOrigin: 'bottom',
    };
  });

  if (!visible || !dialogueScript || dialogueScript.length === 0) return null;

  const isLastLine = currentIndex === dialogueScript.length - 1;
  const showFightButton = isTypingComplete && isLastLine && interactionType === 'BATTLE';

  return (
    <Animated.View
      entering={FadeIn}
      exiting={FadeOut}
      style={[StyleSheet.absoluteFill, { zIndex: 9999 }]}
    >
      <ImageBackground
        source={backgroundUrl || require('../../assets/stone-bg.jpg')}
        style={styles.container}
        resizeMode="cover"
      >
        <BlurView intensity={30} style={StyleSheet.absoluteFill} tint="dark" />

        {/* NPC Sprite (Large Background) */}
        {!!npcSpriteUrl && (
          <Animated.View
            entering={FadeIn.delay(300)}
            style={[styles.spriteContainer, breathingStyle]}
            pointerEvents="none"
          >
            {isSpritesheet ? (
              <View style={[styles.spriteFrame, { width: frameSize, height: frameSize, overflow: 'hidden' }]}>
                <Image
                  source={npcSpriteUrl}
                  style={{
                    width: frameSize * frameCount,
                    height: frameSize,
                    transform: [{ translateX: -currentFrame * frameSize }]
                  }}
                  contentFit="cover"
                />
              </View>
            ) : (
              <Image
                source={npcSpriteUrl}
                style={styles.sprite}
                contentFit="contain"
              />
            )}
          </Animated.View>
        )}

        {/* Skip Button (Top Right) */}
        <View style={styles.header}>
          <TouchableOpacity onPress={skipDialogue} style={styles.skipBtnTop}>
            <Text style={styles.skipTextTop}>SKIP</Text><FastForward color="rgba(255,255,255,0.7)" size={14} />
          </TouchableOpacity>
        </View>

        {/* Dialogue Box Area */}
        <Animated.View
          entering={ZoomIn.duration(400).springify().damping(15)}
          style={styles.dialogueWrapper}
        >
          <BlurView intensity={80} tint="dark" style={styles.dialogueBox}>
            <TouchableOpacity 
              activeOpacity={1} 
              onPress={handleDialogueTap} 
              style={styles.touchableArea}
            >
              <View style={styles.dialogueContentRow}>
                
                {/* Portrait Frame */}
                {!!currentPortrait && (
                  <View style={styles.portraitFrame}>
                     <Image 
                        source={currentPortrait} 
                        style={styles.portraitImage}
                        contentFit="cover"
                     />
                  </View>
                )}

                {/* Text Area */}
                <View style={styles.textArea}>
                  {/* NPC Name Tag */}
                  {!!(currentLine?.npc_name || nodeName) && (
                    <View style={styles.nameTag}>
                      <Text style={styles.nameText}>
                        {currentLine?.npc_name || nodeName}
                      </Text>
                    </View>
                  )}
                  
                  {/* Typewriter Text */}
                  <ScrollView 
                    style={styles.contentArea}
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={true}
                    keyboardShouldPersistTaps="handled"
                  >
                    <Text style={styles.dialogueText}>{displayedText}</Text>
                  </ScrollView>
                  
                  {/* Action Buttons - Outside ScrollView so they're always visible */}
                  {isTypingComplete && isLastLine && actionButtons.length > 0 && (
                    <View style={styles.actionButtonsRow}>
                      {actionButtons.map((btn, idx) => (
                        <TouchableOpacity
                          key={idx}
                          style={styles.actionBtn}
                          onPress={() => onAction?.(btn.target_event, btn.payload)}
                        >
                          <Text style={styles.actionBtnText}>
                            {btn.label || btn.target_event.replace('_', ' ')}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </View>
              </View>

              {/* Controls */}
              <View style={styles.footer}>
                <View style={{ flex: 1 }} />
                
                {/* Always show button when not on last line, or when on last line (even with action buttons) */}
                <TouchableOpacity
                  onPress={handleDialogueTap}
                  style={[styles.nextBtn, showFightButton && styles.battleBtn]}
                >
                  <Text style={styles.nextText}>
                    {!isTypingComplete
                      ? 'REVEAL'
                      : isLastLine
                      ? interactionType === 'BATTLE'
                        ? 'FIGHT'
                        : 'CLOSE'
                      : 'NEXT'}
                  </Text>
                  {!showFightButton && <ChevronRight color="white" size={20} />}
                </TouchableOpacity>
              </View>

              {/* Progress Bar */}
              <View style={styles.progressBarBg}>
                <Animated.View
                  style={[
                    styles.progressBarFill,
                    { width: `${((currentIndex + 1) / dialogueScript.length) * 100}%` },
                  ]}
                />
              </View>

            </TouchableOpacity>
          </BlurView>
        </Animated.View>
      </ImageBackground>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#020617', // Fallback
  },
  spriteContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: height * 0.14,
    alignItems: 'center',
    justifyContent: 'flex-end',
    height: height * 0.65,
  },
  sprite: {
    width: width,
    height: '100%',
  },
  spriteFrame: {
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  header: {
    position: 'absolute',
    top: 40,
    right: 20,
    zIndex: 10,
  },
  skipBtnTop: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.8)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: 'rgba(0, 229, 255, 0.5)',
    gap: 6,
  },
  skipTextTop: {
    color: '#00e5ff',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 2,
  },
  dialogueWrapper: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 12,
    paddingBottom: 24, // Safe area buffer
  },
  dialogueBox: {
    minHeight: 180,
    maxHeight: height * 0.6,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: 'rgba(0, 229, 255, 0.5)',
    overflow: 'hidden',
    backgroundColor: 'rgba(2, 6, 23, 0.95)',
  },
  touchableArea: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
  },
  dialogueContentRow: {
    flexDirection: 'row',
    flex: 1,
    minHeight: 100,
    gap: 12,
  },
  portraitFrame: {
    width: 64, // Slightly smaller portrait for more text room
    height: 64,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'rgba(0, 229, 255, 0.7)',
    backgroundColor: '#0f172a',
    overflow: 'hidden',
    shadowColor: '#00e5ff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 12,
  },
  portraitImage: {
    width: '100%',
    height: '100%',
  },
  textArea: {
    flex: 1,
    minHeight: 80,
  },
  nameTag: {
    backgroundColor: 'rgba(0, 229, 255, 0.2)',
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: 'rgba(0, 229, 255, 0.5)',
    marginBottom: 6,
  },
  nameText: {
    color: '#00e5ff',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 2,
    textTransform: 'uppercase',
    fontFamily: 'Exo2-Bold',
  },
  contentArea: {
    flex: 1,
    marginTop: 4,
    maxHeight: height * 0.35,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 8,
  },
  dialogueText: {
    color: '#f8fafc',
    fontSize: 16,
    fontWeight: '500',
    lineHeight: 24,
  },
  actionButtonsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 12,
    marginBottom: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 229, 255, 0.2)',
  },
  actionBtn: {
    backgroundColor: 'rgba(0, 229, 255, 0.3)',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: 'rgba(0, 229, 255, 0.8)',
    shadowColor: '#00e5ff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 4,
  },
  actionBtnText: {
    color: '#00e5ff',
    fontSize: 14,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginTop: 12,
    minHeight: 44,
  },
  nextBtn: {
    backgroundColor: 'rgba(0, 119, 182, 0.8)',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#00e5ff',
  },
  battleBtn: {
    backgroundColor: 'rgba(208, 0, 0, 0.9)',
    borderColor: '#ff4d4d',
    shadowColor: '#ff0000',
    shadowRadius: 10,
    shadowOpacity: 0.6,
  },
  nextText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 2,
    fontFamily: 'Montserrat-SemiBold',
  },
  progressBarBg: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#00e5ff',
  },
});
