import React, { useEffect, useState, useRef, useId } from 'react';
import { View, StyleSheet, Image, Text, TouchableWithoutFeedback, Pressable } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withRepeat,
  withSequence,
  withDelay,
  Easing,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import Svg, { Path, Line, Rect, Defs, Pattern } from 'react-native-svg';
import { BlurView } from 'expo-blur';
import { Audio } from 'expo-av';
import { LinearGradient as ExpoLinearGradient } from 'expo-linear-gradient';

// Constants matching the reference layout
const MODAL_WIDTH = 380;
const MODAL_HEIGHT = 580;

const chestImages = {
  small: require('../../../assets/icons/smallchestmodal.png'),
  silver: require('../../../assets/icons/silverchestmodal.png'),
  medium: require('../../../assets/icons/mediumchestmodal.png'),
  large: require('../../../assets/icons/largechestmodal.png'),
};

const rewardIcons = {
  exp: require('../../../assets/expcrystal.png'),
  coin: require('../../../assets/coinicon.png'),
  // Fallbacks for potential missing assets
  gems: require('../../../assets/expcrystal.png'), 
  weapon: require('../../../assets/coinicon.png'),
};

const chestShakingSound = require('../../../assets/sounds/chestshaking.mp3');

interface ChestOpeningModalProps {
  isOpen: boolean;
  chestType: 'small' | 'silver' | 'medium' | 'large';
  onAnimationComplete: () => void;
}

const AnimatedView = Animated.createAnimatedComponent(View);

export const ChestOpeningModal: React.FC<ChestOpeningModalProps> = ({
  isOpen,
  chestType,
  onAnimationComplete,
}) => {
  const scanlinePatternId = `chest-scan-${useId().replace(/:/g, '_')}`;
  const [phase, setPhase] = useState<'idle' | 'opening' | 'opened'>('idle');
  const [sound, setSound] = useState<Audio.Sound>();
  const shakingSoundRef = useRef<Audio.Sound | null>(null);

  // Phase as shared value so worklets can read it (React state not available on UI thread)
  const phaseShared = useSharedValue(0); // 0=idle, 1=opening, 2=opened

  // Shared Values for Animations
  // Boot
  const bootOpacity = useSharedValue(0);
  const bootScale = useSharedValue(0.95);
  const bootTranslateY = useSharedValue(10);

  // Chest Idle
  const chestIdleTranslateY = useSharedValue(0);
  const chestIdleScale = useSharedValue(1);
  const chestIdleRotate = useSharedValue(0);

  // Chest Opening (Charge & Explosion)
  const chestChargeScale = useSharedValue(1);
  const chestChargeTranslate = useSharedValue(0); // Shake
  const chestOpacity = useSharedValue(1);
  const coreBurnOpacity = useSharedValue(0);
  
  // Flash & Effects
  const flashScale = useSharedValue(0.1);
  const flashOpacity = useSharedValue(0);
  const shockwaveScale = useSharedValue(0.5);
  const shockwaveOpacity = useSharedValue(0);
  const beamScaleY = useSharedValue(0);
  const beamOpacity = useSharedValue(0);

  // Loot Items (4 items)
  const loot1TranslateY = useSharedValue(100);
  const loot1Opacity = useSharedValue(0);
  const loot1Float = useSharedValue(0);

  const loot2TranslateY = useSharedValue(100);
  const loot2Opacity = useSharedValue(0);
  const loot2Float = useSharedValue(0);

  const loot3TranslateY = useSharedValue(100);
  const loot3Opacity = useSharedValue(0);
  const loot3Float = useSharedValue(0);

  const loot4TranslateY = useSharedValue(100);
  const loot4Opacity = useSharedValue(0);
  const loot4Float = useSharedValue(0);

  // Reset animations when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setPhase('idle');
      phaseShared.value = 0;

      // Boot Sequence
      bootOpacity.value = 0;
      bootScale.value = 0.95;
      bootTranslateY.value = 10;
      
      bootOpacity.value = withTiming(1, { duration: 600, easing: Easing.bezier(0.16, 1, 0.3, 1) });
      bootScale.value = withTiming(1, { duration: 600, easing: Easing.bezier(0.16, 1, 0.3, 1) });
      bootTranslateY.value = withTiming(0, { duration: 600, easing: Easing.bezier(0.16, 1, 0.3, 1) });

      // Start Chest Idle Loop (shake only; no floating up/down or scale)
      chestIdleTranslateY.value = 0;
      chestIdleScale.value = 1;
      chestIdleRotate.value = withRepeat(
        withSequence(
          withTiming(-2, { duration: 50, easing: Easing.linear }),
          withTiming(2, { duration: 50, easing: Easing.linear }),
          withTiming(-2, { duration: 50, easing: Easing.linear }),
          withTiming(2, { duration: 50, easing: Easing.linear }),
          withTiming(0, { duration: 200, easing: Easing.linear }) // Pause
        ),
        -1,
        true
      );

      // Reset other values
      chestChargeScale.value = 1;
      chestChargeTranslate.value = 0;
      chestOpacity.value = 1;
      coreBurnOpacity.value = 0;
      flashScale.value = 0.1;
      flashOpacity.value = 0;
      shockwaveScale.value = 0.5;
      shockwaveOpacity.value = 0;
      beamScaleY.value = 0;
      beamOpacity.value = 0;

      [loot1TranslateY, loot2TranslateY, loot3TranslateY, loot4TranslateY].forEach(v => v.value = 100);
      [loot1Opacity, loot2Opacity, loot3Opacity, loot4Opacity].forEach(v => v.value = 0);
      [loot1Float, loot2Float, loot3Float, loot4Float].forEach(v => v.value = 0);

      // Play chest shaking sound on loop while idle
      (async () => {
        try {
          const { sound: shakeSound } = await Audio.Sound.createAsync(
            chestShakingSound,
            { isLooping: true }
          );
          shakingSoundRef.current = shakeSound;
          await shakeSound.playAsync();
        } catch (error) {
          console.log('Error playing chest shaking sound:', error);
        }
      })();
    } else {
      // Stop and cleanup shaking sound
      if (shakingSoundRef.current) {
        shakingSoundRef.current.stopAsync().then(() => shakingSoundRef.current?.unloadAsync());
        shakingSoundRef.current = null;
      }
      // Cleanup opening sound
      if (sound) {
        sound.unloadAsync();
      }
    }
  }, [isOpen]);

  const runOpenSequence = async () => {
    if (phase !== 'idle') return;

    setPhase('opening');
    phaseShared.value = 1;

    // Stop shaking sound (was looping until tap to open)
    if (shakingSoundRef.current) {
      try {
        await shakingSoundRef.current.stopAsync();
        await shakingSoundRef.current.unloadAsync();
      } catch (_) {
        /* ignore */
      }
      shakingSoundRef.current = null;
    }

    // Play glowing chest sound (right when tap to open / chest starts glowing)
    try {
      const { sound: glowSound } = await Audio.Sound.createAsync(
        require('../../../assets/sounds/glowingchestsound.mp3')
      );
      await glowSound.playAsync();
      glowSound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          glowSound.unloadAsync().catch(() => {});
        }
      });
    } catch (error) {
      console.warn('[ChestModal] glow sound:', error);
    }

    try {
      const { sound: newSound } = await Audio.Sound.createAsync(
        require('../../../assets/sounds/chestopening.mp3')
      );
      setSound(newSound);
      await newSound.playAsync();
    } catch (error) {
      console.warn('[ChestModal] open sound:', error);
    }

    // 1. Violent Charge Up (0 -> 800ms)
    // Shake effect
    chestChargeTranslate.value = withSequence(
      withTiming(-2, { duration: 80 }),
      withTiming(2, { duration: 80 }),
      withTiming(-3, { duration: 80 }),
      withTiming(3, { duration: 80 }),
      withTiming(-2, { duration: 80 }),
      withTiming(0, { duration: 80 })
    );
    
    // Scale up then collapse
    chestChargeScale.value = withSequence(
      withTiming(1.2, { duration: 500, easing: Easing.in(Easing.ease) }),
      withTiming(1.4, { duration: 250, easing: Easing.out(Easing.ease) }),
      withTiming(0.5, { duration: 50, easing: Easing.linear }) // Collapse
    );

    // Core Burn
    coreBurnOpacity.value = withTiming(1, { duration: 500 });

    // Fade out chest at end of charge
    chestOpacity.value = withDelay(750, withTiming(0, { duration: 50 }));

    // 2. Super Flash & Explosion (Start at ~600ms)
    const flashDelay = 600;
    flashOpacity.value = withDelay(flashDelay, withSequence(
        withTiming(0.6, { duration: 100 }),
        withTiming(0, { duration: 800 })
    ));
    flashScale.value = withDelay(flashDelay, withTiming(3, { duration: 900, easing: Easing.bezier(0.16, 1, 0.3, 1) }));

    // Shockwave
    const shockDelay = 650;
    shockwaveOpacity.value = withDelay(shockDelay, withSequence(withTiming(1, { duration: 0 }), withTiming(0, { duration: 600 })));
    shockwaveScale.value = withDelay(shockDelay, withTiming(8, { duration: 600, easing: Easing.out(Easing.ease) }));

    // Beam
    const beamDelay = 600;
    beamOpacity.value = withDelay(beamDelay, withSequence(withTiming(1, { duration: 100 }), withTiming(0, { duration: 1100 })));
    beamScaleY.value = withDelay(beamDelay, withSequence(withTiming(1.2, { duration: 300 }), withTiming(1, { duration: 900 })));

    // 3. Loot Reveal (Phase 'opened') - Trigger shortly after explosion
    setTimeout(() => {
      setPhase('opened');
      phaseShared.value = 2;
      animateLoot();
    }, 900);
  };

  /** No withSpring completion callbacks — chaining animations in callbacks is fragile on Reanimated 4 / native. */
  const animateLoot = () => {
    const floatLoop = () =>
      withRepeat(
        withSequence(
          withTiming(-6, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
          withTiming(0, { duration: 1500, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        true
      );

    loot1Opacity.value = withDelay(100, withTiming(1, { duration: 600 }));
    loot1TranslateY.value = withDelay(100, withSpring(0, { damping: 12 }));
    loot1Float.value = withDelay(900, floatLoop());

    loot2Opacity.value = withDelay(250, withTiming(1, { duration: 600 }));
    loot2TranslateY.value = withDelay(250, withSpring(0, { damping: 12 }));
    loot2Float.value = withDelay(1100, floatLoop());

    loot3Opacity.value = withDelay(400, withTiming(1, { duration: 600 }));
    loot3TranslateY.value = withDelay(400, withSpring(0, { damping: 12 }));
    loot3Float.value = withDelay(1300, floatLoop());

    loot4Opacity.value = withDelay(550, withTiming(1, { duration: 600 }));
    loot4TranslateY.value = withDelay(550, withSpring(0, { damping: 12 }));
    loot4Float.value = withDelay(1500, floatLoop());
  };

  const handleOpen = () => {
    if (phase !== 'idle') return;
    requestAnimationFrame(() => {
      void runOpenSequence();
    });
  };

  const handleClaim = () => {
    requestAnimationFrame(() => {
      onAnimationComplete();
    });
  };

  // --- Animated Styles ---
  const bootStyle = useAnimatedStyle(() => ({
    opacity: bootOpacity.value,
    transform: [{ scale: bootScale.value }, { translateY: bootTranslateY.value }]
  }));

  const chestStyle = useAnimatedStyle(() => {
    'worklet';
    const isIdle = phaseShared.value === 0;
    const isOpening = phaseShared.value === 1;
    return {
      opacity: chestOpacity.value,
      transform: [
        { translateY: isIdle ? chestIdleTranslateY.value : 0 },
        { scale: isIdle ? chestIdleScale.value : chestChargeScale.value },
        { rotate: isIdle ? `${chestIdleRotate.value}deg` : '0deg' },
        { translateX: isOpening ? chestChargeTranslate.value : 0 }
      ]
    };
  });

  const coreBurnStyle = useAnimatedStyle(() => ({
    opacity: coreBurnOpacity.value,
  }));

  const flashStyle = useAnimatedStyle(() => ({
    opacity: flashOpacity.value,
    transform: [{ scale: flashScale.value }]
  }));

  // Do not animate borderWidth — it triggers native crashes on some Android devices with Reanimated.
  const shockwaveStyle = useAnimatedStyle(() => ({
    opacity: shockwaveOpacity.value,
    transform: [{ scale: shockwaveScale.value }],
  }));

  const beamStyle = useAnimatedStyle(() => ({
    opacity: beamOpacity.value,
    transform: [{ scaleY: beamScaleY.value }, { scaleX: interpolate(beamScaleY.value, [0, 1.2], [0.2, 2]) }]
  }));

  const loot1Style = useAnimatedStyle(() => ({
    opacity: loot1Opacity.value,
    transform: [
      { translateY: loot1TranslateY.value + loot1Float.value },
      { scale: interpolate(loot1TranslateY.value, [100, -10, 0], [0.2, 1.1, 1], Extrapolation.CLAMP) }
    ]
  }));

  const loot2Style = useAnimatedStyle(() => ({
    opacity: loot2Opacity.value,
    transform: [
      { translateY: loot2TranslateY.value + loot2Float.value },
      { scale: interpolate(loot2TranslateY.value, [100, -10, 0], [0.2, 1.1, 1], Extrapolation.CLAMP) }
    ]
  }));

  const loot3Style = useAnimatedStyle(() => ({
    opacity: loot3Opacity.value,
    transform: [
      { translateY: loot3TranslateY.value + loot3Float.value },
      { scale: interpolate(loot3TranslateY.value, [100, -10, 0], [0.2, 1.1, 1], Extrapolation.CLAMP) }
    ]
  }));

  const loot4Style = useAnimatedStyle(() => ({
    opacity: loot4Opacity.value,
    transform: [
      { translateY: loot4TranslateY.value + loot4Float.value },
      { scale: interpolate(loot4TranslateY.value, [100, -10, 0], [0.2, 1.1, 1], Extrapolation.CLAMP) }
    ]
  }));

  if (!isOpen) return null;

  return (
    <View style={styles.overlay}>
      {/* Background Dimmer - plain View when opened to avoid BlurView crash on layout change */}
      <View style={[StyleSheet.absoluteFill, { backgroundColor: phase === 'opened' ? 'rgba(2, 4, 10, 0.95)' : 'rgba(2, 4, 10, 0.4)' }]} />
      {phase !== 'opened' && <BlurView intensity={20} style={StyleSheet.absoluteFill} />}

      {/* Main UI Container */}
      <AnimatedView style={[styles.mainContainer, bootStyle]}>
        
        {/* TOP MECHANICAL BORDER */}
        <View style={styles.mechBorderTop}>
            <ExpoLinearGradient
                colors={['transparent', '#00d2ff', '#e6ffff', '#00d2ff', 'transparent']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={StyleSheet.absoluteFill}
            />
            <View style={styles.mechInnerLine} />
        </View>
        
        {/* BOTTOM MECHANICAL BORDER */}
        <View style={styles.mechBorderBottom}>
            <ExpoLinearGradient
                colors={['transparent', '#00d2ff', '#e6ffff', '#00d2ff', 'transparent']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={StyleSheet.absoluteFill}
            />
            <View style={styles.mechInnerLine} />
        </View>

        {/* MAIN HUD FRAME */}
        <View style={styles.hudFrame}>
            {/* Scanlines Pattern */}
            <View style={StyleSheet.absoluteFill} pointerEvents="none">
                <Svg width={MODAL_WIDTH} height={MODAL_HEIGHT}>
                    <Defs>
                        <Pattern id={scanlinePatternId} x="0" y="0" width="4" height="4" patternUnits="userSpaceOnUse">
                            <Rect x="0" y="0" width="4" height="1" fill="#00d2ff" fillOpacity="0.05" />
                        </Pattern>
                    </Defs>
                    <Rect x="0" y="0" width={MODAL_WIDTH} height={MODAL_HEIGHT} fill={`url(#${scanlinePatternId})`} />
                </Svg>
            </View>

            {/* Side Accents */}
            <View style={[styles.sideAccent, { left: 0 }]} />
            <View style={[styles.sideAccent, { right: 0 }]} />

            {/* Corner Brackets & Ticks */}
            <View style={StyleSheet.absoluteFill} pointerEvents="none">
                <Svg width={MODAL_WIDTH} height={MODAL_HEIGHT}>
                    {/* Top Left */}
                    <Path d="M 15 35 L 15 15 L 35 15" fill="none" stroke="#00d2ff" strokeWidth="2" opacity="0.8" />
                    {/* Top Right */}
                    <Path d={`M ${MODAL_WIDTH - 15} 35 L ${MODAL_WIDTH - 15} 15 L ${MODAL_WIDTH - 35} 15`} fill="none" stroke="#00d2ff" strokeWidth="2" opacity="0.8" />
                    {/* Bottom Left */}
                    <Path d={`M 15 ${MODAL_HEIGHT - 35} L 15 ${MODAL_HEIGHT - 15} L 35 ${MODAL_HEIGHT - 15}`} fill="none" stroke="#00d2ff" strokeWidth="2" opacity="0.8" />
                    {/* Bottom Right */}
                    <Path d={`M ${MODAL_WIDTH - 15} ${MODAL_HEIGHT - 35} L ${MODAL_WIDTH - 15} ${MODAL_HEIGHT - 15} L ${MODAL_WIDTH - 35} ${MODAL_HEIGHT - 15}`} fill="none" stroke="#00d2ff" strokeWidth="2" opacity="0.8" />
                    
                    {/* Edge Ticks */}
                    <Line x1="0" y1={MODAL_HEIGHT / 2} x2="6" y2={MODAL_HEIGHT / 2} stroke="#00d2ff" strokeWidth="2" />
                    <Line x1={MODAL_WIDTH} y1={MODAL_HEIGHT / 2} x2={MODAL_WIDTH - 6} y2={MODAL_HEIGHT / 2} stroke="#00d2ff" strokeWidth="2" />
                </Svg>
            </View>

            {/* HEADER */}
            <View style={styles.headerContainer}>
                <View style={styles.headerRow}>
                    <View style={styles.iconSquareFrame}>
                        <View style={styles.exclamationCircle}>
                            <Text style={styles.exclamationText}>!</Text>
                        </View>
                    </View>
                    <View style={styles.titleTextFrame}>
                        <Text style={styles.headerTitle} numberOfLines={2}>
                            {phase === 'opened' ? "CACHE OPENED" : "CHEST FOUND"}
                        </Text>
                    </View>
                </View>

                <Text style={styles.subText}>
                    YOU HAVE ACQUIRED THE{'\n'}FOLLOWING REWARDS.
                </Text>
            </View>

            {/* LOOT STAGE */}
            <View style={styles.lootStage}>

                {/* Beam */}
                <AnimatedView style={[styles.beam, beamStyle]}>
                    <ExpoLinearGradient
                        colors={['white', '#00e5ff', 'transparent']}
                        style={{ flex: 1 }}
                    />
                </AnimatedView>

                {/* Shockwave */}
                {phase === 'opening' && (
                    <AnimatedView style={[styles.shockwave, shockwaveStyle]} />
                )}

                {/* LOOT ITEMS */}
                <View style={styles.lootContainer}>
                    <LootItem 
                        style={loot1Style} 
                        icon={rewardIcons.exp} val="+100" label="EXP" 
                    />
                    <LootItem 
                        style={loot2Style} 
                        icon={rewardIcons.coin} val="+50" label="COINS" 
                    />
                    <LootItem 
                        style={loot3Style} 
                        icon={rewardIcons.gems} val="+3" label="GEMS" 
                    />
                    <LootItem 
                        style={loot4Style} 
                        icon={rewardIcons.weapon} val="+1" label="WEAPON" 
                    />
                </View>

                {/* CLAIM BUTTON - only when loot is shown */}
                {phase === 'opened' && (
                  <View style={styles.claimButtonWrap}>
                    <Pressable
                      style={({ pressed }) => [styles.claimButton, pressed && styles.claimButtonPressed]}
                      onPress={handleClaim}
                    >
                      <Text style={styles.claimButtonText}>CLAIM</Text>
                    </Pressable>
                  </View>
                )}

                {/* CHEST */}
                {phase !== 'opened' && (
                    <TouchableWithoutFeedback onPress={handleOpen}>
                        <AnimatedView style={[styles.chestContainer, chestStyle]}>
                            <Image
                                source={chestImages[chestType]}
                                style={styles.chestImage}
                                resizeMode="contain"
                            />
                            {/* Core Burn Overlay */}
                            <AnimatedView style={[styles.coreBurn, coreBurnStyle]} />
                            
                            {phase === 'idle' && (
                                <View style={styles.tapToOpenContainer}>
                                    <Text style={styles.tapToOpenText}>TAP TO OPEN</Text>
                                </View>
                            )}
                        </AnimatedView>
                    </TouchableWithoutFeedback>
                )}

                {/* Super Flash Overlay */}
                <AnimatedView style={[styles.superFlash, flashStyle]} />

            </View>
        </View>
      </AnimatedView>
    </View>
  );
};

// Reusable Loot Item Component
const LootItem = ({ style, icon, val, label }: any) => (
    <AnimatedView style={[styles.lootItem, style]}>
        <View style={styles.lootIconContainer}>
            <Image source={icon} style={styles.lootIcon} resizeMode="contain" />
        </View>
        <Text style={styles.lootVal}>{val}</Text>
        <Text style={styles.lootLabel}>{label}</Text>
    </AnimatedView>
);

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 9999,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mainContainer: {
    width: MODAL_WIDTH,
    height: MODAL_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // HUD Frame Styles
  hudFrame: {
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(4, 12, 28, 0.95)',
    borderColor: 'rgba(0, 210, 255, 0.3)',
    borderWidth: 1,
    borderRadius: 2,
    overflow: 'hidden',
    shadowColor: '#0066ff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 30,
    elevation: 10,
  },
  // Side Accents
  sideAccent: {
    position: 'absolute',
    top: 40,
    bottom: 40,
    width: 1,
    backgroundColor: 'rgba(0, 210, 255, 0.4)',
    shadowColor: '#00d2ff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 10,
    zIndex: 10,
  },
  // Mechanical Borders
  mechBorderTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 8,
    zIndex: 20,
  },
  mechBorderBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 8,
    zIndex: 20,
  },
  mechInnerLine: {
    position: 'absolute',
    top: 3,
    left: '5%',
    right: '5%',
    height: 1,
    backgroundColor: '#00d2ff',
    shadowColor: '#00d2ff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 8,
  },
  // Header Styles
  headerContainer: {
    width: '100%',
    alignItems: 'center',
    paddingTop: 32,
    paddingHorizontal: 24,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 16,
    gap: 8,
  },
  iconSquareFrame: {
    width: 44,
    height: 44,
    borderWidth: 1.5,
    borderColor: 'rgba(0, 255, 255, 0.75)',
    backgroundColor: 'rgba(2, 12, 32, 0.92)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#00ffff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 14,
    elevation: 8,
  },
  exclamationCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#ffffff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 10,
  },
  exclamationText: {
    color: '#FFFFFF',
    fontFamily: 'Lato-Black',
    fontSize: 18,
    fontWeight: '800',
    lineHeight: 22,
    textShadowColor: '#a5f3fc',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
    transform: [{ scaleY: 1.38 }, { translateY: -1 }],
  },
  titleTextFrame: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 4,
    borderWidth: 1.5,
    borderColor: 'rgba(0, 255, 255, 0.75)',
    backgroundColor: 'rgba(2, 12, 32, 0.92)',
    shadowColor: '#00ffff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.45,
    shadowRadius: 14,
    elevation: 8,
    flexShrink: 1,
  },
  headerTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
    fontFamily: 'Lato-Black',
    letterSpacing: 2,
    textAlign: 'center',
    textShadowColor: '#22d3ee',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 12,
    textTransform: 'uppercase',
  },
  subText: {
    color: '#00d2ff',
    fontSize: 11,
    fontFamily: 'Exo2-Bold',
    fontWeight: '600',
    letterSpacing: 2,
    textAlign: 'center',
    lineHeight: 18,
    textShadowColor: 'rgba(0, 210, 255, 0.3)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 4,
    textTransform: 'uppercase',
  },
  // Loot Stage – centers chest in remaining space
  lootStage: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 0,
  },
  beam: {
    position: 'absolute',
    bottom: 40,
    width: 96,
    height: 400,
    opacity: 0,
  },
  shockwave: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#fff',
  },
  superFlash: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: '#fff',
    zIndex: 50,
  },
  // Chest – centered in modal
  chestContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 30,
    marginTop: -20,
  },
  chestImage: {
    width: 280,
    height: 280,
    shadowColor: '#00e5ff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 15,
  },
  coreBurn: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#fff',
    borderRadius: 140, // half of chest width
    opacity: 0,
  },
  tapToOpenContainer: {
    position: 'absolute',
    bottom: -32,
  },
  tapToOpenText: {
    color: '#00d2ff',
    fontSize: 11,
    fontWeight: 'bold',
    fontFamily: 'Exo2-Bold',
    letterSpacing: 3,
    textShadowColor: 'rgba(0, 210, 255, 0.8)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 5,
  },
  // Loot Items
  lootContainer: {
    position: 'absolute',
    top: 40,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    width: '100%',
    paddingHorizontal: 10,
    zIndex: 40,
  },
  lootItem: {
    alignItems: 'center',
    width: 60,
  },
  lootIconContainer: {
    width: 56,
    height: 56,
    marginBottom: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lootIcon: {
    width: '100%',
    height: '100%',
    shadowColor: '#fff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
  },
  lootVal: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    fontFamily: 'Exo2-Bold',
    textShadowColor: 'rgba(255, 255, 255, 0.4)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },
  lootLabel: {
    color: '#00e5ff',
    fontSize: 10,
    fontWeight: 'bold',
    fontFamily: 'Exo2-Bold',
    letterSpacing: 1,
    marginTop: 4,
    textTransform: 'uppercase',
    textShadowColor: 'rgba(0, 229, 255, 0.5)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 5,
  },
  claimButtonWrap: {
    position: 'absolute',
    bottom: 32,
    zIndex: 50,
  },
  claimButton: {
    paddingVertical: 10,
    paddingHorizontal: 28,
    backgroundColor: 'rgba(0, 229, 255, 0.25)',
    borderWidth: 2,
    borderColor: '#00e5ff',
    borderRadius: 4,
    shadowColor: '#00e5ff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 6,
  },
  claimButtonPressed: {
    opacity: 0.85,
    backgroundColor: 'rgba(0, 229, 255, 0.4)',
  },
  claimButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
    fontFamily: 'Exo2-Bold',
    letterSpacing: 3,
    textShadowColor: 'rgba(0, 229, 255, 0.8)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 4,
  },
});
