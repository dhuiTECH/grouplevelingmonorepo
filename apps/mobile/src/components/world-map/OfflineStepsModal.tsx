import React from 'react';
import { View, Text, Modal, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import Svg, { Rect } from 'react-native-svg';
import { HolographicGlass } from './HolographicGlass';
import { TargetCrosshairIcon, CompassIcon, WalkingIcon } from './MapIcons';

interface OfflineStepsModalProps {
  visible: boolean;
  pendingSteps: number;
  floatAnim: Animated.Value;
  pulseAnim: Animated.Value;
  spin: Animated.AnimatedInterpolation<string | number>;
  onAuto: () => void;
  onManual: () => void;
}

export const OfflineStepsModal: React.FC<OfflineStepsModalProps> = ({
  visible,
  pendingSteps,
  floatAnim,
  pulseAnim,
  spin,
  onAuto,
  onManual,
}) => {
  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <HolographicGlass style={styles.modalGlass}>
            <Animated.View
              style={{
                transform: [{ translateY: floatAnim }],
                alignItems: 'center',
                marginBottom: 16,
              }}
            >
              <WalkingIcon size={56} />
            </Animated.View>
            <Text style={styles.modalTitle}>ENERGY COLLECTED</Text>

            <View style={styles.stepsRow}>
              <Animated.View style={{ opacity: pulseAnim }}>
                <Svg width="32" height="24" viewBox="0 0 32 24" fill="#00E5FF">
                  <Rect x="2" y="8" width="4" height="8" rx="2" />
                  <Rect x="10" y="4" width="4" height="16" rx="2" />
                  <Rect x="18" y="2" width="4" height="20" rx="2" />
                  <Rect x="26" y="6" width="4" height="12" rx="2" />
                </Svg>
              </Animated.View>

              <Text style={styles.stepsNumber}>
                {pendingSteps} <Text style={styles.stepsLabel}>STEPS</Text>
              </Text>

              <Animated.View style={{ opacity: pulseAnim }}>
                <Svg width="32" height="24" viewBox="0 0 32 24" fill="#00E5FF">
                  <Rect x="2" y="6" width="4" height="12" rx="2" />
                  <Rect x="10" y="2" width="4" height="20" rx="2" />
                  <Rect x="18" y="4" width="4" height="16" rx="2" />
                  <Rect x="26" y="8" width="4" height="8" rx="2" />
                </Svg>
              </Animated.View>
            </View>

            <View style={styles.progressRow}>
              {[...Array(10)].map((_, i) => (
                <Animated.View
                  key={i}
                  style={[
                    styles.progressDash,
                    { backgroundColor: i < 7 ? '#00E5FF' : 'rgba(0, 229, 255, 0.2)' },
                    i < 7 && { opacity: pulseAnim },
                    i < 7 && styles.activeDashGlow,
                  ]}
                />
              ))}
            </View>

            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={[styles.actionButton, styles.redBorder]}
                onPress={onAuto}
                activeOpacity={0.7}
              >
                <Animated.View style={{ transform: [{ rotate: spin }], marginBottom: 8 }}>
                  <TargetCrosshairIcon />
                </Animated.View>
                <Text style={styles.buttonTitleRed}>AUTO-HUNT</Text>
                <Text style={styles.buttonSubtextRed} numberOfLines={1} adjustsFontSizeToFit>
                  Automatic Encounter
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionButton, styles.cyanBorder]}
                onPress={onManual}
                activeOpacity={0.7}
              >
                <Animated.View style={{ transform: [{ rotate: spin }], marginBottom: 8 }}>
                  <CompassIcon />
                </Animated.View>
                <Text style={styles.buttonTitleCyan}>MANUAL</Text>
                <Text style={styles.buttonSubtextCyan} numberOfLines={1} adjustsFontSizeToFit>
                  Explore Map
                </Text>
              </TouchableOpacity>
            </View>
          </HolographicGlass>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(5, 10, 20, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    width: '100%',
    paddingHorizontal: 20,
  },
  modalGlass: {
    borderRadius: 32,
    width: '100%',
  },
  modalTitle: {
    color: 'rgba(0, 229, 255, 0.8)',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 4,
    marginBottom: 20,
  },
  stepsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 20,
  },
  stepsNumber: {
    color: '#FFF',
    fontSize: 48,
    fontWeight: '900',
    marginHorizontal: 15,
    textShadowColor: 'rgba(0, 229, 255, 0.5)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 15,
  },
  stepsLabel: {
    color: '#00E5FF',
    fontSize: 24,
  },
  progressRow: {
    flexDirection: 'row',
    width: '100%',
    gap: 8,
    marginBottom: 30,
  },
  progressDash: {
    flex: 1,
    height: 6,
    borderRadius: 3,
  },
  activeDashGlow: {
    shadowColor: '#00E5FF',
    shadowOpacity: 0.8,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 0 },
  },
  buttonRow: {
    flexDirection: 'row',
    width: '100%',
    paddingHorizontal: 20,
    gap: 12,
  },
  actionButton: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.4)',
    borderRadius: 20,
    padding: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  redBorder: {
    borderColor: 'rgba(255, 68, 68, 0.5)',
    borderWidth: 1,
  },
  cyanBorder: {
    borderColor: 'rgba(0, 229, 255, 0.5)',
    borderWidth: 1,
  },
  buttonTitleRed: { color: '#ff4444', fontWeight: 'bold', marginTop: 8 },
  buttonSubtextRed: { color: 'rgba(255, 68, 68, 0.6)', fontSize: 10, marginTop: 4 },
  buttonTitleCyan: { color: '#00E5FF', fontWeight: 'bold', marginTop: 8 },
  buttonSubtextCyan: { color: 'rgba(0, 229, 255, 0.6)', fontSize: 10, marginTop: 4 },
});

