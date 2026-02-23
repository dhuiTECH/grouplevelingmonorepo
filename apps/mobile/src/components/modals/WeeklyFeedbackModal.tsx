import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet } from 'react-native';
import { BlurView } from 'expo-blur';
import { MotiView } from 'moti';
import HologramPet from '@/components/HologramPet';

interface WeeklyFeedbackModalProps {
  onConfirm: (rating: number) => void;
  visible: boolean;
}

import { useNotification } from '@/contexts/NotificationContext';

export default function WeeklyFeedbackModal({ onConfirm, visible }: WeeklyFeedbackModalProps) {
  const { showNotification } = useNotification();
  const [rating, setRating] = useState<number | null>(null);

  const emojis = ['💀', '😫', '😐', '🙂', '🤩'];
  const labels = ['Destruction', 'Struggle', 'Survival', 'Progress', 'Dominance'];

  if (!visible) return null;

  return (
    <Modal
      transparent
      animationType="fade"
      visible={visible}
      statusBarTranslucent
    >
      <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill}>
        <View className="flex-1 items-center justify-center p-6 bg-black/80">
          <MotiView
            from={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'timing', duration: 300 }}
            className="w-full max-w-md items-center"
          >
            <HologramPet />

            <View className="w-full mt-[-20px] items-center space-y-6">
              <View className="items-center">
                <Text className="text-2xl font-black text-cyan-400 uppercase tracking-widest mb-2 text-center">
                  System Check
                </Text>
                <Text className="text-cyan-600 font-mono text-sm uppercase text-center">
                  WEEKLY PERFORMANCE REVIEW REQUIRED
                </Text>
              </View>

              <View className="bg-slate-900/50 border border-cyan-500/20 rounded-2xl p-6 w-full">
                <Text className="text-gray-400 text-xs uppercase tracking-wider font-bold mb-6 text-center">
                  How was your training this week?
                </Text>

                <View className="flex-row justify-between items-end">
                  {emojis.map((emoji, idx) => {
                    const isSelected = rating === idx + 1;
                    return (
                      <TouchableOpacity
                        key={idx}
                        onPress={() => setRating(idx + 1)}
                        className="items-center justify-center"
                      >
                         <MotiView
                            animate={{ 
                                scale: isSelected ? 1.2 : 1,
                                opacity: rating && !isSelected ? 0.5 : 1
                            }}
                            className="items-center"
                         >
                            <Text className="text-3xl mb-2">{emoji}</Text>
                            <Text 
                                className={`text-[8px] font-bold uppercase tracking-widest ${
                                    isSelected ? 'text-cyan-400' : 'text-gray-600'
                                }`}
                            >
                                {labels[idx]}
                            </Text>
                         </MotiView>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              <TouchableOpacity
  disabled={!rating}
  onPress={() => rating && onConfirm(rating)}
  style={[
    styles.submitButton,
    rating ? styles.submitButtonActive : styles.submitButtonInactive
  ]}
>
  <Text
    style={[
      styles.submitButtonText,
      rating ? styles.submitButtonTextActive : styles.submitButtonTextInactive
    ]}
  >
    {rating ? 'Submit & Initialize' : 'Select Rating'}
  </Text>
</TouchableOpacity>
            </View>
          </MotiView>
        </View>
      </BlurView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  submitButton: {
    width: '100%',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    transitionProperty: 'background-color',
    transitionDuration: '300ms',
  },
  submitButtonActive: {
    backgroundColor: '#0891b2', // cyan-600
    shadowColor: '#06b6d4',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 5,
  },
  submitButtonInactive: {
    backgroundColor: '#1e293b', // slate-800
  },
  submitButtonText: {
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
  submitButtonTextActive: {
    color: '#fff',
  },
  submitButtonTextInactive: {
    color: '#475569', // gray-600
  },
});
