import React, { useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, Animated, StyleSheet } from 'react-native';
import { ArrowUp } from 'lucide-react-native';
import { QTE_TYPE } from '@/hooks/useBattleLogic';

interface QTEButtonProps {
  target: any;
  timerAnim: Animated.Value;
  onTap: () => void;
  onSwipe: (dir: string) => void;
}

export const QTEButton = React.memo(function QTEButton({ target, timerAnim, onTap, onSwipe }: QTEButtonProps) {
  const swipeStartRef = useRef<{ x: number; y: number } | null>(null);
  const exitAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (target.status !== 'pending' && target.status !== 'active') {
      Animated.timing(exitAnim, { toValue: 0, duration: 200, useNativeDriver: true }).start();
    } else {
      exitAnim.setValue(1);
    }
  }, [target.status]);

  const hitTime = target.hitTime;
  const scale = timerAnim.interpolate({
    inputRange: [hitTime - 25, hitTime],
    outputRange: [2.5, 1],
    extrapolate: 'clamp',
  });
  const ringOpacity = timerAnim.interpolate({
    inputRange: [hitTime - 25, hitTime - 20],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });
  const globalOpacity = timerAnim.interpolate({
    inputRange: [hitTime - 26, hitTime - 25, hitTime + 15, hitTime + 16],
    outputRange: [0, 1, 1, 0],
    extrapolate: 'clamp',
  });
  const ringColor = timerAnim.interpolate({
    inputRange: [hitTime - 25, hitTime - 8, hitTime],
    outputRange: ['#ef4444', '#ef4444', '#22d3ee'],
    extrapolate: 'clamp',
  });

  const isSwipe = target.type === QTE_TYPE.SWIPE;
  const swipeDir = target.direction;
  const isHit = target.status === 'hit' || target.status === 'perfect';
  const isPerfect = target.status === 'perfect';
  const isMiss = target.status === 'miss';
  const isActive = target.status === 'pending' || target.status === 'active';

  const handlePressIn = (e: any) => {
    if (isSwipe) {
      swipeStartRef.current = { x: e.nativeEvent.pageX, y: e.nativeEvent.pageY };
    } else {
      onTap();
    }
  };

  const handlePressOut = (e: any) => {
    if (!isSwipe || !swipeStartRef.current) return;
    const start = swipeStartRef.current;
    const dx = e.nativeEvent.pageX - start.x;
    const dy = e.nativeEvent.pageY - start.y;
    swipeStartRef.current = null;
    if (Math.abs(dx) < 10 && Math.abs(dy) < 10) return;
    let direction = '';
    if (Math.abs(dx) > Math.abs(dy)) direction = dx > 0 ? 'RIGHT' : 'LEFT';
    else direction = dy > 0 ? 'DOWN' : 'UP';
    onSwipe(direction);
  };

  return (
    <Animated.View
      style={[
        styles.qteContainer,
        { left: `${target.x}%`, top: `${target.y}%`, opacity: Animated.multiply(globalOpacity, exitAnim) },
      ]}
    >
      {isActive && !isHit && !isPerfect && !isMiss && (
        <Animated.View style={[styles.qteRing, { transform: [{ scale }], borderColor: ringColor, opacity: ringOpacity }]} />
      )}
      <TouchableOpacity
        activeOpacity={1}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={!isActive && !isHit && !isMiss && !isPerfect}
        hitSlop={{ top: 30, bottom: 30, left: 30, right: 30 }}
        style={[
          styles.qteBtn,
          isHit && { backgroundColor: '#22d3ee', borderColor: '#fff', transform: [{ scale: 1.1 }] },
          isPerfect && {
            backgroundColor: '#fbbf24',
            borderColor: '#fff',
            transform: [{ scale: 1.2 }],
          },
          isMiss && { backgroundColor: '#ef4444', borderColor: '#fff', opacity: 0.8 },
          target.status === 'active' && { borderColor: '#facc15', backgroundColor: 'rgba(250, 204, 21, 0.3)' },
          isSwipe && { borderRadius: 10, width: 80, height: 80 },
        ]}
      >
        <View style={[styles.qteInner, target.status === 'active' && { backgroundColor: '#facc15' }]}>
          {isSwipe ? (
            <View
              style={{
                transform: [
                  {
                    rotate:
                      swipeDir === 'UP' ? '0deg' : swipeDir === 'RIGHT' ? '90deg' : swipeDir === 'DOWN' ? '180deg' : '270deg',
                  },
                ],
              }}
            >
              <ArrowUp size={32} color={isHit ? 'black' : 'white'} strokeWidth={4} />
            </View>
          ) : (
            <Text style={[styles.qteText, target.status === 'active' && { color: 'black' }]}>
              {isPerfect ? '!!!' : isHit ? 'OK' : isMiss ? 'X' : ''}
            </Text>
          )}
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  qteContainer: {
    position: 'absolute',
    width: 120,
    height: 120,
    marginLeft: -60,
    marginTop: -60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qteRing: {
    position: 'absolute',
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 6,
    opacity: 0.8,
  },
  qteBtn: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: 'rgba(5, 11, 20, 0.8)',
    borderWidth: 3,
    borderColor: '#334155',
    alignItems: 'center',
    justifyContent: 'center',
  },
  qteInner: {
    width: 70,
    height: 70,
    borderRadius: 35,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qteText: {
    color: '#fff',
    fontWeight: '900',
    fontSize: 28,
  },
});
