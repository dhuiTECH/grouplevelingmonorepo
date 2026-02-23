import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { MotiView } from 'moti';
import { X } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface NotificationProps {
  message: string;
  type: 'success' | 'error';
  onHide: () => void;
  duration?: number;
}

const Notification = ({ message, type, onHide, duration = 3000 }: NotificationProps) => {
  const [visible, setVisible] = useState(true);
  const insets = useSafeAreaInsets();

  const handleHide = () => {
    setVisible(false);
    // Wait for animation to finish
    setTimeout(onHide, 300);
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      handleHide();
    }, duration);

    return () => clearTimeout(timer);
  }, [duration]);

  const isSuccess = type === 'success';
  const labelText = isSuccess ? 'SYSTEM UPDATE' : 'SYSTEM ERROR';

  // Overlay without Modal so touches pass through — you can scroll while the toast is visible
  return (
    <View style={[StyleSheet.absoluteFill, styles.overlay]} pointerEvents="box-none">
      <View
        style={[
          styles.toastContainer,
          {
            top: insets.top + 12,
            right: Math.max(insets.right, 16),
          },
        ]}
        pointerEvents="box-none"
      >
        <MotiView
          pointerEvents="auto"
            from={{ opacity: 0, translateY: -20, scale: 0.95 }}
          animate={{ 
            opacity: visible ? 1 : 0, 
            translateY: visible ? 0 : -20, 
            scale: visible ? 1 : 0.95 
          }}
          transition={{ type: 'timing', duration: 300 }}
            style={[
              styles.toast,
              isSuccess ? styles.toastSuccess : styles.toastError,
            ]}
          >
            <View style={styles.dotWrapper}>
              <MotiView
                from={{ opacity: 0.3, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1.2 }}
                transition={{
                  type: 'timing',
                  duration: 1000,
                  loop: true,
                  repeatReverse: true,
                }}
                style={[
                  styles.dot,
                  isSuccess ? styles.dotSuccess : styles.dotError,
                ]}
              />
            </View>

            <View style={styles.content}>
              <Text style={[styles.label, isSuccess ? styles.labelSuccess : styles.labelError]}>
                {labelText}
              </Text>
              <Text style={[styles.message, isSuccess ? styles.messageSuccess : styles.messageError]}>
                {message}
              </Text>
            </View>

            <TouchableOpacity onPress={handleHide} style={styles.closeBtn} hitSlop={12}>
              <X size={14} color={isSuccess ? '#22d3ee' : '#f87171'} />
            </TouchableOpacity>
          </MotiView>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    zIndex: 9999,
    pointerEvents: 'box-none',
  },
  toastContainer: {
    position: 'absolute',
    minWidth: 240,
    maxWidth: 320,
    alignItems: 'flex-end',
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  toastSuccess: {
    backgroundColor: 'rgba(6, 78, 99, 0.95)',
    borderColor: 'rgba(34, 211, 238, 0.5)',
  },
  toastError: {
    backgroundColor: 'rgba(127, 29, 29, 0.95)',
    borderColor: 'rgba(248, 113, 113, 0.5)',
  },
  dotWrapper: {
    marginTop: 2,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  dotSuccess: {
    backgroundColor: '#22d3ee',
  },
  dotError: {
    backgroundColor: '#f87171',
  },
  content: {
    flex: 1,
  },
  label: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 2,
    marginBottom: 4,
  },
  labelSuccess: {
    color: '#67e8f9',
  },
  labelError: {
    color: '#fca5a5',
  },
  message: {
    fontSize: 12,
    fontWeight: 'bold',
    lineHeight: 18,
  },
  messageSuccess: {
    color: '#cffafe',
  },
  messageError: {
    color: '#fecaca',
  },
  closeBtn: {
    padding: 4,
    marginTop: -4,
    marginRight: -4,
  },
});

export default Notification;
