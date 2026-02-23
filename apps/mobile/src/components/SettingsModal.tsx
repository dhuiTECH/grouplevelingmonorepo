import React from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Modal, 
  TouchableOpacity, 
  TouchableWithoutFeedback,
  Platform
} from 'react-native';
import { BlurView } from 'expo-blur';
import { MotiView } from 'moti';
import { SystemGlass } from './ui/SystemGlass';
import { GlowText } from './ui/GlowText';
import { TechButton } from './ui/TechButton';
import { playHunterSound } from '../utils/audio';

interface SettingsModalProps {
  visible: boolean;
  onClose: () => void;
  onLogout: () => void;
  onChat: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  visible,
  onClose,
  onLogout,
  onChat
}) => {
  if (!visible) return null;

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill} />
          
          <TouchableWithoutFeedback>
            <MotiView 
              from={{ opacity: 0, scale: 0.9, translateY: 50 }}
              animate={{ opacity: 1, scale: 1, translateY: 0 }}
              transition={{ type: 'timing', duration: 300 }}
              style={styles.modalContent}
            >
              <SystemGlass intensity={60} style={styles.glassContainer}>
                <View style={styles.header}>
                  <GlowText className="text-xl" color="#00E8FF">SYSTEM CONFIG</GlowText>
                  <Text style={styles.subHeader}>HUNTER ACCESS TERMINAL</Text>
                </View>

                <View style={styles.menuItems}>
                  <TouchableOpacity 
                    style={styles.menuItem} 
                    onPress={() => {
                      playHunterSound('click');
                      onClose();
                      onChat();
                    }}
                  >
                    <View style={styles.iconBox}>
                      <Text style={styles.icon}>💬</Text>
                    </View>
                    <View style={styles.itemText}>
                      <Text style={styles.itemTitle}>LINKED TERMINAL</Text>
                      <Text style={styles.itemDesc}>Access Hunter Communication Network</Text>
                    </View>
                    <Text style={styles.arrow}>→</Text>
                  </TouchableOpacity>

                  <TouchableOpacity 
                    style={[styles.menuItem, styles.logoutItem]} 
                    onPress={() => {
                      playHunterSound('click');
                      onClose();
                      onLogout();
                    }}
                  >
                    <View style={[styles.iconBox, styles.logoutIconBox]}>
                      <Text style={styles.icon}>⚠️</Text>
                    </View>
                    <View style={styles.itemText}>
                      <Text style={[styles.itemTitle, styles.logoutText]}>SYSTEM DISCONNECT</Text>
                      <Text style={styles.itemDesc}>Terminate Connection</Text>
                    </View>
                    <Text style={[styles.arrow, styles.logoutText]}>→</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.footer}>
                  <TechButton 
                    title="CLOSE CONFIG" 
                    onPress={onClose}
                    variant="secondary"
                    style={{ height: 48 }}
                  />
                </View>
              </SystemGlass>
            </MotiView>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 400,
  },
  glassContainer: {
    width: '100%',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(0, 232, 255, 0.3)',
  },
  header: {
    alignItems: 'center',
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  subHeader: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 10,
    fontFamily: 'Rajdhani-Medium',
    letterSpacing: 2,
    marginTop: 4,
  },
  menuItems: {
    padding: 16,
    gap: 12,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  logoutItem: {
    borderColor: 'rgba(239, 68, 68, 0.3)',
    backgroundColor: 'rgba(239, 68, 68, 0.05)',
  },
  iconBox: {
    width: 40,
    height: 40,
    backgroundColor: 'rgba(0, 232, 255, 0.1)',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  logoutIconBox: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
  },
  icon: {
    fontSize: 20,
  },
  itemText: {
    flex: 1,
  },
  itemTitle: {
    color: '#fff',
    fontSize: 14,
    fontFamily: 'Orbitron-Bold',
    letterSpacing: 1,
    marginBottom: 2,
  },
  itemDesc: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 10,
    fontFamily: 'Rajdhani-Medium',
  },
  logoutText: {
    color: '#ef4444',
  },
  arrow: {
    color: 'rgba(255, 255, 255, 0.3)',
    fontSize: 18,
    fontFamily: 'Rajdhani-Medium',
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  }
});