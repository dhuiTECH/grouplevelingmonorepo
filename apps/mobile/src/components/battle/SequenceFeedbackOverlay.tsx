import React from 'react';
import { View, Text, Animated, StyleSheet } from 'react-native';

interface SequenceFeedbackOverlayProps {
  sequenceFeedback: string | null;
  feedbackAnim: Animated.Value;
}

export function SequenceFeedbackOverlay({ sequenceFeedback, feedbackAnim }: SequenceFeedbackOverlayProps) {
  if (!sequenceFeedback) return null;

  return (
    <Animated.View
      style={[
        styles.flashOverlay,
        {
          zIndex: 2000,
          opacity: feedbackAnim,
          transform: [{ scale: feedbackAnim.interpolate({ inputRange: [0, 1], outputRange: [0.8, 1.1] }) }],
        },
      ]}
    >
      {sequenceFeedback === 'PERFECT' ? (
        <View style={styles.feedbackCard}>
          <View style={[styles.feedbackGlow, { backgroundColor: '#facc15' }]} />
          <View style={[styles.perfectParallelogram, styles.perfectParallelogramGold]}>
            <Text style={styles.perfectParallelogramTextGold}>PERFECT</Text>
          </View>
          <Text style={styles.feedbackSubtext}>MAXIMUM COUNTER</Text>
          <View style={[styles.feedbackLine, { backgroundColor: '#facc15' }]} />
        </View>
      ) : (
        <View style={styles.feedbackCard}>
          <View
            style={[
              styles.feedbackGlow,
              { backgroundColor: sequenceFeedback === 'FAILED' ? '#ef4444' : '#22d3ee' },
            ]}
          />
          <Text
            style={[
              styles.cinematicText,
              {
                fontSize: 42,
                color: '#fff',
                textShadowColor: sequenceFeedback === 'FAILED' ? '#ef4444' : '#22d3ee',
                textShadowRadius: 30,
              },
            ]}
          >
            {sequenceFeedback}
          </Text>
          <View
            style={[
              styles.feedbackLine,
              { backgroundColor: sequenceFeedback === 'FAILED' ? '#ef4444' : '#22d3ee' },
            ]}
          />
        </View>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  flashOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
    alignItems: 'center',
    justifyContent: 'center',
  },
  feedbackCard: { alignItems: 'center', justifyContent: 'center', gap: 10 },
  feedbackGlow: {
    position: 'absolute',
    width: 300,
    height: 100,
    borderRadius: 50,
    opacity: 0.25,
    zIndex: -1,
  },
  perfectParallelogram: {
    transform: [{ skewX: '-12deg' }],
    paddingHorizontal: 36,
    paddingVertical: 14,
    backgroundColor: 'rgba(34, 211, 238, 0.35)',
    borderWidth: 3,
    borderColor: '#22d3ee',
    alignItems: 'center',
    justifyContent: 'center',
  },
  perfectParallelogramGold: {
    backgroundColor: 'rgba(250, 204, 21, 0.4)',
    borderColor: '#facc15',
  },
  perfectParallelogramTextGold: {
    transform: [{ skewX: '12deg' }],
    color: '#fef08a',
    fontSize: 32,
    fontWeight: '900',
    letterSpacing: 6,
    textShadowColor: '#facc15',
    textShadowRadius: 14,
  },
  feedbackSubtext: {
    color: '#facc15',
    fontSize: 12,
    letterSpacing: 8,
    fontWeight: 'bold',
  },
  feedbackLine: {
    width: 220,
    height: 2,
    borderRadius: 2,
    marginTop: 10,
    opacity: 0.8,
  },
  cinematicText: {
    fontSize: 48,
    fontStyle: 'italic',
    fontWeight: '900',
    color: 'white',
    textTransform: 'uppercase',
    textShadowColor: '#22d3ee',
    textShadowRadius: 20,
  },
});
