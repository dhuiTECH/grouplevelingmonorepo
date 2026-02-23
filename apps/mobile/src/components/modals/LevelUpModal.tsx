import React, { useEffect, useRef } from 'react';
import { Modal, View, Text, StyleSheet, Animated, Easing } from 'react-native';
import { Audio } from 'expo-av';
import LayeredAvatar from '@/components/LayeredAvatar';

export const LevelUpModal = ({ visible, user, previousLevel, onClose }) => {
  const scaleAnim = useRef(new Animated.Value(0.5)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      playSound();
      Animated.sequence([
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 3,
          useNativeDriver: true,
        }),
      ]).start();

      setTimeout(() => {
        onClose();
      }, 3000); // Auto close after 3 seconds
    } else {
      scaleAnim.setValue(0.5);
      opacityAnim.setValue(0);
    }
  }, [visible]);

  const playSound = async () => {
    const { sound } = await Audio.Sound.createAsync(
      require('../../../assets/sounds/level-up.mp3')
    );
    await sound.playAsync();
  };

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Animated.View style={[styles.modalCard, { opacity: opacityAnim, transform: [{ scale: scaleAnim }] }]}>
          <View style={styles.leftColumn}>
            <LayeredAvatar user={user} size={100} />
          </View>
          <View style={styles.rightColumn}>
            <Text style={styles.title}>LEVEL UP!</Text>
            <Text style={styles.levelText}>Level {previousLevel} → Level {user?.level}</Text>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCard: {
    width: '80%',
    backgroundColor: '#0f172a',
    padding: 24,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#facc15',
    shadowColor: '#facc15',
    shadowOpacity: 0.5,
    shadowRadius: 20,
  },
  leftColumn: {
    flex: 1,
  },
  rightColumn: {
    flex: 2,
    alignItems: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: '900',
    color: '#facc15',
    letterSpacing: 2,
    marginBottom: 10,
  },
  levelText: {
    color: '#fff',
    fontSize: 18,
  },
});
