import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Pressable, useWindowDimensions } from 'react-native';
import {
  Canvas,
  Fill,
  Group,
  LinearGradient,
  Path,
  Rect,
  Circle,
  Skia,
  rect,
  vec,
} from '@shopify/react-native-skia';
import Reanimated, {
  useSharedValue,
  useFrameCallback,
  useDerivedValue,
  runOnJS,
  useAnimatedReaction,
  useAnimatedStyle,
  type SharedValue,
} from 'react-native-reanimated';

export const THEME = {
  bg: '#03050a',
  /** Abyss tint: slightly see-through so the screen behind shows through */
  bgScrim: 'rgba(3, 5, 10, 0.7)',
  blueDark: '#0a3a70',
  blueBright: '#0088ff',
  cyan: '#00e5ff',
  white: '#ffffff',
} as const;

const STATES = { IDLE: 0, CHARGING: 1, BURST: 2, RESOLVED: 3 } as const;

const BASE_DIAMOND = 160;
const MAX_STREAKS = 160;
const STRIDE = 10;
const SHOCK_STRIDE = 4;
const MAX_SHOCKS = 4;

export type LevelUpMode = 'preview' | 'game';

export interface LevelUpProps {
  active: boolean;
  mode?: LevelUpMode;
  fromLevel: number;
  toLevel: number;
  startXp: number;
  targetXp: number;
  onPreviewReset?: () => void;
  /** Called when game-mode animation finishes (auto-dismiss). */
  onGameContinue?: () => void;
}

function spawnStreak(buf: Float32Array, type: number, cx: number, cy: number): void {
  'worklet';
  let slot = -1;
  for (let i = 0; i < MAX_STREAKS; i++) {
    if (buf[i * STRIDE + 9] < 0.5) {
      slot = i;
      break;
    }
  }
  if (slot < 0) return;
  const o = slot * STRIDE;
  const angle = Math.random() * Math.PI * 2;
  if (type === 0) {
    const dist = Math.random() * 400 + 200;
    buf[o + 0] = cx + Math.cos(angle) * dist;
    buf[o + 1] = cy + Math.sin(angle) * dist;
    const speed = Math.random() * 10 + 5;
    buf[o + 2] = -Math.cos(angle) * speed;
    buf[o + 3] = -Math.sin(angle) * speed;
    buf[o + 4] = Math.random() * 40 + 20;
    buf[o + 5] = 0;
    buf[o + 8] = type;
    buf[o + 9] = 1;
  } else {
    buf[o + 0] = cx;
    buf[o + 1] = cy;
    const speed = Math.random() * 25 + 10;
    buf[o + 2] = Math.cos(angle) * speed;
    buf[o + 3] = Math.sin(angle) * speed;
    buf[o + 4] = Math.random() * 80 + 30;
    buf[o + 5] = 1;
    buf[o + 8] = type;
    buf[o + 9] = 1;
  }
}

function updateStreaks(buf: Float32Array, cx: number, cy: number): void {
  'worklet';
  for (let i = 0; i < MAX_STREAKS; i++) {
    const o = i * STRIDE;
    if (buf[o + 9] < 0.5) continue;
    buf[o + 0] += buf[o + 2];
    buf[o + 1] += buf[o + 3];
    const t = buf[o + 8];
    if (t === 0) {
      buf[o + 5] = Math.min(1, buf[o + 5] + 0.1);
      const dx = buf[o + 0] - cx;
      const dy = buf[o + 1] - cy;
      if (Math.sqrt(dx * dx + dy * dy) < 50) buf[o + 9] = 0;
    } else {
      buf[o + 5] -= 0.02;
      buf[o + 2] *= 0.98;
      buf[o + 3] *= 0.98;
      if (buf[o + 5] <= 0) buf[o + 9] = 0;
    }
  }
}

export function maxExpForLevel(level: number): number {
  return level * level * 100;
}

export function LevelUp({
  active,
  mode = 'preview',
  fromLevel,
  toLevel,
  startXp,
  targetXp,
  onPreviewReset,
  onGameContinue,
}: LevelUpProps) {
  const finishRef = useRef(onGameContinue);
  useEffect(() => {
    finishRef.current = onGameContinue;
  }, [onGameContinue]);

  const runFinish = useCallback(() => {
    finishRef.current?.();
  }, []);

  const modeGameSV = useSharedValue(mode === 'game' ? 1 : 0);
  useEffect(() => {
    modeGameSV.value = mode === 'game' ? 1 : 0;
  }, [mode, modeGameSV]);

  const { width: winW, height: winH } = useWindowDimensions();
  const cx = useSharedValue(winW / 2);
  const cy = useSharedValue(winH / 2);
  const timeMs = useSharedValue(0);
  const tick = useSharedValue(0);

  const currentState = useSharedValue<number>(
    mode === 'game' ? STATES.CHARGING : STATES.IDLE,
  );
  const stateTimer = useSharedValue(0);
  const levelSV = useSharedValue(fromLevel);
  const targetLevelSV = useSharedValue(toLevel);
  const xpSV = useSharedValue(startXp);
  const targetXpSV = useSharedValue(targetXp);
  const diamondScale = useSharedValue(1);
  const diamondShake = useSharedValue(0);
  const flashAlpha = useSharedValue(0);
  const backgroundGlowIntensity = useSharedValue(0.3);
  const windowScale = useSharedValue(0);
  const shakeX = useSharedValue(0);
  const shakeY = useSharedValue(0);
  const burstFrames = useSharedValue(0);
  const didAutoFinish = useSharedValue(0);

  const streaks = useSharedValue<Float32Array>(new Float32Array(MAX_STREAKS * STRIDE));
  const shocks = useSharedValue<Float32Array>(new Float32Array(MAX_SHOCKS * SHOCK_STRIDE));

  const [displayLevel, setDisplayLevel] = useState(fromLevel);
  const [displayXp, setDisplayXp] = useState(Math.floor(startXp));
  const [showButton, setShowButton] = useState(mode !== 'game');
  const [buttonLabel, setButtonLabel] = useState('COMPLETE QUEST');
  const [phase, setPhase] = useState<number>(
    mode === 'game' ? STATES.CHARGING : STATES.IDLE,
  );

  const resetToIdle = useCallback(() => {
    didAutoFinish.value = 0;
    burstFrames.value = 0;
    levelSV.value = fromLevel;
    targetLevelSV.value = toLevel;
    xpSV.value = startXp;
    targetXpSV.value = targetXp;
    diamondScale.value = 1;
    diamondShake.value = 0;
    flashAlpha.value = 0;
    backgroundGlowIntensity.value = 0.3;
    windowScale.value = 0;
    streaks.value = new Float32Array(MAX_STREAKS * STRIDE);
    shocks.value = new Float32Array(MAX_SHOCKS * SHOCK_STRIDE);
    timeMs.value = 0;

    if (mode === 'game') {
      currentState.value = STATES.CHARGING;
      stateTimer.value = 0;
      setShowButton(false);
      setPhase(STATES.CHARGING);
    } else {
      currentState.value = STATES.IDLE;
      stateTimer.value = 0;
      setShowButton(true);
      setButtonLabel('COMPLETE QUEST');
      setPhase(STATES.IDLE);
    }
    setDisplayLevel(fromLevel);
    setDisplayXp(Math.floor(startXp));
  }, [
    currentState,
    stateTimer,
    burstFrames,
    didAutoFinish,
    levelSV,
    mode,
    targetLevelSV,
    xpSV,
    targetXpSV,
    diamondScale,
    diamondShake,
    flashAlpha,
    backgroundGlowIntensity,
    windowScale,
    streaks,
    shocks,
    timeMs,
    fromLevel,
    toLevel,
    startXp,
    targetXp,
  ]);

  useEffect(() => {
    cx.value = winW / 2;
    cy.value = winH / 2;
  }, [winW, winH, cx, cy]);

  useEffect(() => {
    if (active) {
      resetToIdle();
    }
  }, [active, fromLevel, toLevel, startXp, targetXp, resetToIdle]);

  useAnimatedReaction(
    () => Math.round(levelSV.value),
    (v, prev) => {
      if (v !== prev) runOnJS(setDisplayLevel)(v);
    },
  );

  useAnimatedReaction(
    () => Math.floor(xpSV.value),
    (v, prev) => {
      if (v !== prev) runOnJS(setDisplayXp)(v);
    },
  );

  useAnimatedReaction(
    () => currentState.value,
    (v, prev) => {
      if (v !== prev) runOnJS(setPhase)(v);
    },
  );

  useFrameCallback((frame) => {
    'worklet';
    const dt = frame.timeSincePreviousFrame ?? 16;
    timeMs.value += dt;
    const cxi = winW / 2;
    const cyi = winH / 2;

    const st = currentState.value;

    if (st === STATES.IDLE) {
      diamondScale.value = 1 + Math.sin(timeMs.value / 500) * 0.02;
      stateTimer.value = 0;
    } else {
      stateTimer.value += 1;
    }

    if (st === STATES.CHARGING) {
      if (Math.random() < 0.8) spawnStreak(streaks.value, 0, cxi, cyi);
      if (Math.random() < 0.8) spawnStreak(streaks.value, 0, cxi, cyi);

      const tx = targetXpSV.value;
      if (xpSV.value < tx) {
        const delta = (tx - xpSV.value) * 0.05 + 1;
        xpSV.value = Math.min(tx, xpSV.value + delta);
      }

      const t = stateTimer.value;
      diamondShake.value = (t / 120) * 5;
      backgroundGlowIntensity.value = 0.3 + (t / 120) * 0.5;
      diamondScale.value = 1 - (t / 120) * 0.1;

      if (t >= 120 && xpSV.value >= tx) {
        currentState.value = STATES.BURST;
        stateTimer.value = 0;
        burstFrames.value = 0;
        levelSV.value = targetLevelSV.value;
        flashAlpha.value = 1;
        diamondScale.value = 1.3;
        backgroundGlowIntensity.value = 1;
        for (let k = 0; k < 100; k++) spawnStreak(streaks.value, 1, cxi, cyi);
        const sh = shocks.value;
        sh[0] = 10;
        sh[1] = 1;
        sh[2] = 30;
        sh[3] = 1;
      }
    } else if (st === STATES.BURST) {
      burstFrames.value += 1;
      flashAlpha.value = Math.max(0, flashAlpha.value - 0.03);
      diamondScale.value += (1 - diamondScale.value) * 0.1;
      diamondShake.value = 0;

      if (burstFrames.value === 9) {
        const sh = shocks.value;
        sh[4] = 10;
        sh[5] = 1;
        sh[6] = 30;
        sh[7] = 1;
      }

      if (stateTimer.value > 60) {
        currentState.value = STATES.RESOLVED;
        stateTimer.value = 0;
        windowScale.value = 0;
      }
    } else if (st === STATES.RESOLVED) {
      diamondScale.value += (1 - diamondScale.value) * 0.1;
      backgroundGlowIntensity.value += (0.4 - backgroundGlowIntensity.value) * 0.05;
      windowScale.value += (1 - windowScale.value) * 0.15;

      if (
        modeGameSV.value === 0 &&
        stateTimer.value === 150
      ) {
        runOnJS(setButtonLabel)('RESET ANIMATION');
        runOnJS(setShowButton)(true);
      }
      if (
        modeGameSV.value === 1 &&
        stateTimer.value >= 200 &&
        didAutoFinish.value === 0
      ) {
        didAutoFinish.value = 1;
        runOnJS(runFinish)();
      }
    }

    if (st === STATES.CHARGING) {
      shakeX.value = (Math.random() - 0.5) * diamondShake.value;
      shakeY.value = (Math.random() - 0.5) * diamondShake.value;
    } else {
      shakeX.value = 0;
      shakeY.value = 0;
    }

    updateStreaks(streaks.value, cxi, cyi);

    const sh = shocks.value;
    for (let i = 0; i < MAX_SHOCKS; i++) {
      const o = i * SHOCK_STRIDE;
      if (sh[o + 3] < 0.5) continue;
      sh[o + 0] += 35;
      sh[o + 1] -= 0.04;
      sh[o + 2] *= 0.9;
      if (sh[o + 1] <= 0) sh[o + 3] = 0;
    }

    tick.value = tick.value + 1;
  });

  const progress = useDerivedValue(() => {
    const t = targetXpSV.value;
    if (t <= 0) return 0;
    return Math.min(1, Math.max(0, xpSV.value / t));
  });

  const outerPath = useDerivedValue(() => {
    const s = BASE_DIAMOND * diamondScale.value;
    const half = s / 2;
    const p = Skia.Path.Make();
    p.addRect(rect(-half, -half, s, s));
    return p;
  });

  const innerPath = useDerivedValue(() => {
    const s = BASE_DIAMOND * diamondScale.value * 0.85;
    const half = s / 2;
    const p = Skia.Path.Make();
    p.addRect(rect(-half, -half, s, s));
    return p;
  });

  const streakPath = useDerivedValue(() => {
    tick.value;
    const buf = streaks.value;
    const p = Skia.Path.Make();
    for (let i = 0; i < MAX_STREAKS; i++) {
      const o = i * STRIDE;
      if (buf[o + 9] < 0.5) continue;
      const alpha = buf[o + 5];
      if (alpha <= 0) continue;
      const x0 = buf[o + 0];
      const y0 = buf[o + 1];
      const vx = buf[o + 2];
      const vy = buf[o + 3];
      const len = buf[o + 4];
      const x1 = x0 - (vx * len) / 10;
      const y1 = y0 - (vy * len) / 10;
      p.moveTo(x0, y0);
      p.lineTo(x1, y1);
    }
    return p;
  });

  const diamondGroupTransform = useDerivedValue(() => [
    { translateX: cx.value + shakeX.value },
    { translateY: cy.value + shakeY.value },
    { rotate: Math.PI / 4 },
  ]);

  const beamTop = useDerivedValue(() => cy.value - 120 * diamondScale.value);
  const beamH = useDerivedValue(() => 240 * diamondScale.value);
  const lineY1 = useDerivedValue(() => cy.value - 60 * diamondScale.value);
  const lineY2 = useDerivedValue(() => cy.value + 60 * diamondScale.value);
  const innerBeamY = useDerivedValue(() => cy.value - 20);

  const lineRevealStyle = useAnimatedStyle(() => ({
    transform: [{ scaleY: Math.max(0.02, windowScale.value) }],
    opacity: 1,
  }));

  const lineBarStyle = useAnimatedStyle(() => ({
    opacity: Math.max(0, 1 - windowScale.value),
  }));

  const handlePress = () => {
    const st = currentState.value;
    if (st === STATES.IDLE) {
      currentState.value = STATES.CHARGING;
      stateTimer.value = 0;
      setShowButton(false);
      return;
    }
    if (st === STATES.RESOLVED) {
      if (mode === 'game') {
        onGameContinue?.();
        return;
      }
      resetToIdle();
      onPreviewReset?.();
    }
  };

  const handleSkip = useCallback(() => {
    onGameContinue?.();
  }, [onGameContinue]);

  const showXpRow = phase === STATES.IDLE || phase === STATES.CHARGING;
  const showLevelUpTitle = phase === STATES.RESOLVED;

  return (
    <View style={styles.root} pointerEvents="box-none">
      <Pressable
        style={styles.skipBackdrop}
        onPress={handleSkip}
        accessibilityRole="button"
        accessibilityLabel="Skip level up animation"
      />
      <View style={styles.canvasWrap} pointerEvents="none">
        <Canvas style={styles.canvas}>
        <Fill color="rgba(0,0,0,0)" />

        <Group opacity={backgroundGlowIntensity}>
          <Rect x={0} y={beamTop} width={winW} height={beamH}>
            <LinearGradient
              colors={['rgba(0,136,255,0)', THEME.blueBright, 'rgba(0,136,255,0)']}
              start={vec(0, 0)}
              end={vec(0, 1)}
            />
          </Rect>
          <Rect x={0} y={innerBeamY} width={winW} height={40}>
            <LinearGradient
              colors={['rgba(0,229,255,0)', THEME.cyan, 'rgba(0,229,255,0)']}
              start={vec(0, 0)}
              end={vec(0, 1)}
            />
          </Rect>
          <Rect x={0} y={lineY1} width={winW} height={2} color={THEME.cyan} />
          <Rect x={0} y={lineY2} width={winW} height={2} color={THEME.cyan} />
        </Group>

        <Path path={streakPath} style="stroke" strokeWidth={2} color={THEME.cyan} />

        <ShockDisc i={0} shocks={shocks} cx={cx} cy={cy} tick={tick} color={THEME.white} />
        <ShockDisc i={1} shocks={shocks} cx={cx} cy={cy} tick={tick} color={THEME.cyan} />

        <Group transform={diamondGroupTransform}>
          <Path path={outerPath} color="rgba(10,58,112,0.8)" style="fill" />
          <Path path={outerPath} style="stroke" strokeWidth={12} color="rgba(255,255,255,0.1)" />
          <Path path={outerPath} style="stroke" strokeWidth={12} color={THEME.white} end={progress} />
          <Path path={innerPath} style="stroke" strokeWidth={3} color="rgba(0,229,255,0.2)" />
          <Path path={innerPath} style="stroke" strokeWidth={3} color={THEME.cyan} end={progress} />
        </Group>

        <Rect x={0} y={0} width={winW} height={winH} color="white" opacity={flashAlpha} />
        </Canvas>
      </View>

      <View style={styles.textLayer} pointerEvents="none">
        <View style={[styles.levelBlock, { marginTop: -24 }]}>
          <Text style={styles.levelText}>{displayLevel}</Text>
          {showXpRow && (
            <Text style={styles.xpText}>{`XP: ${displayXp} / ${Math.round(targetXp)}`}</Text>
          )}
        </View>

        {showLevelUpTitle && (
          <View style={[styles.levelUpWrap, { top: winH / 2 - 200 }]}>
            <Reanimated.View style={[styles.lineReveal, lineRevealStyle]}>
              <Reanimated.View style={lineBarStyle}>
                <View style={styles.cyanLine} />
              </Reanimated.View>
              <Text style={styles.levelUpTitle}>LEVEL UP!</Text>
            </Reanimated.View>
          </View>
        )}
      </View>

      {showButton && (
        <View style={[styles.buttonWrap, styles.buttonWrapAbove]} pointerEvents="box-none">
          <Pressable onPress={handlePress} style={styles.ctaOuter}>
            <Text style={styles.ctaText}>{buttonLabel}</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

function ShockDisc({
  i,
  shocks,
  cx,
  cy,
  tick,
  color,
}: {
  i: number;
  shocks: SharedValue<Float32Array>;
  cx: SharedValue<number>;
  cy: SharedValue<number>;
  tick: SharedValue<number>;
  color: string;
}) {
  const r = useDerivedValue(() => {
    tick.value;
    const o = i * SHOCK_STRIDE;
    const buf = shocks.value;
    return buf[o + 3] > 0.5 ? buf[o + 0] : 0;
  });
  const opacity = useDerivedValue(() => {
    tick.value;
    const o = i * SHOCK_STRIDE;
    const buf = shocks.value;
    return buf[o + 3] > 0.5 ? buf[o + 1] : 0;
  });
  const sw = useDerivedValue(() => {
    tick.value;
    const o = i * SHOCK_STRIDE;
    const buf = shocks.value;
    return buf[o + 3] > 0.5 ? Math.max(1, buf[o + 2]) : 0;
  });
  return (
    <Circle cx={cx} cy={cy} r={r} style="stroke" strokeWidth={sw} color={color} opacity={opacity} />
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  skipBackdrop: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 0,
  },
  canvasWrap: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1,
  },
  canvas: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  textLayer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
  },
  levelBlock: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  levelText: {
    color: THEME.white,
    fontSize: 56,
    fontFamily: 'Montserrat-ExtraBold',
    textShadowColor: THEME.cyan,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 15,
  },
  xpText: {
    marginTop: 8,
    color: '#e6ffff',
    fontSize: 16,
    fontFamily: 'Montserrat-SemiBold',
    letterSpacing: 2,
    textTransform: 'uppercase',
    textShadowColor: 'rgba(0, 210, 255, 0.5)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },
  levelUpWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  lineReveal: {
    alignItems: 'center',
    overflow: 'hidden',
  },
  cyanLine: {
    width: 360,
    height: 4,
    backgroundColor: THEME.cyan,
    shadowColor: THEME.white,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 20,
  },
  levelUpTitle: {
    marginTop: 8,
    color: '#e6ffff',
    fontFamily: 'Montserrat-Bold',
    fontSize: 28,
    letterSpacing: 4,
    textTransform: 'uppercase',
    textShadowColor: 'rgba(0, 210, 255, 0.9)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 18,
  },
  buttonWrap: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  buttonWrapAbove: {
    zIndex: 10,
  },
  ctaOuter: {
    paddingVertical: 14,
    paddingHorizontal: 40,
    borderWidth: 1.5,
    borderColor: 'rgba(0, 255, 255, 0.75)',
    backgroundColor: 'rgba(2, 12, 32, 0.92)',
    shadowColor: '#00ffff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.45,
    shadowRadius: 14,
    elevation: 8,
  },
  ctaText: {
    color: '#e6ffff',
    fontFamily: 'Montserrat-Bold',
    fontSize: 14,
    letterSpacing: 3,
    textTransform: 'uppercase',
    textShadowColor: 'rgba(0, 210, 255, 0.8)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 12,
  },
});
