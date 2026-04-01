
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { BlurView } from 'expo-blur';
import { SettingsIcon } from '../icons/SettingsIcon';
import { XIcon } from '../icons/XIcon';
import { SkullIcon } from '../icons/SkullIcon';
import { GlobalTerminal } from '../GlobalTerminal';
import { User } from '@/types/user';
import BaseModal from './BaseModal';
import { useNotification } from '@/contexts/NotificationContext';
import { useAudio } from '@/contexts/AudioContext';
import { Volume2, VolumeX } from 'lucide-react-native';
import { SecureAccountCard } from '@/components/SecureAccountCard';

interface SettingsModalProps {
  visible: boolean;
  onClose: () => void;
  user: User;
  fastBoot: boolean;
  setFastBoot: (fast: boolean) => void;
  toggleIncognito: () => void;
  onLogout: () => void;
  // Add other props from HunterHeader as needed, e.g., for logout
}

const SettingsModal: React.FC<SettingsModalProps> = ({
  visible,
  onClose,
  user,
  fastBoot,
  setFastBoot,
  toggleIncognito,
  onLogout,
}) => {
  const { showNotification } = useNotification();
  const { isMuted, setMuted } = useAudio();
  return (
    <BaseModal visible={visible} onClose={onClose}>
      <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill} />
      <View style={styles.settingsModal}>
        {/* Header */}
        <View style={styles.modalHeader}>
          <View style={styles.modalHeaderLeft}>
            <View style={styles.settingsIconBox}>
              <SettingsIcon size={20} color="#22d3ee" />
            </View>
            <View>
              <Text style={styles.modalTitle}>System Config</Text>
              <Text style={styles.modalSubtitle}>HUNTER_NET_TERMINAL_V2.0</Text>
            </View>
          </View>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <XIcon size={18} color="#f87171" />
          </TouchableOpacity>
        </View>

        <SecureAccountCard />

        {/* Settings Grid */}
        <View style={styles.settingsGrid}>
          {/* Sound Off (replaces Skip Intro) */}
          <TouchableOpacity
            onPress={() => {
              const nextMuted = !isMuted;
              setMuted(nextMuted);
              showNotification(nextMuted ? 'AUDIO: OFF' : 'AUDIO: ON', 'success');
            }}
            style={[
              styles.settingOption,
              isMuted ? styles.settingOptionActive : styles.settingOptionInactive
            ]}
          >
            {isMuted ? (
              <VolumeX size={12} color="#bfdbfe" />
            ) : (
              <Volume2 size={12} color="#9ca3af" />
            )}
            <Text style={[styles.settingText, isMuted ? { color: '#bfdbfe' } : { color: '#9ca3af' }]}>
              Sound Off
            </Text>
          </TouchableOpacity>

          {/* Incognito */}
          <TouchableOpacity
            onPress={toggleIncognito}
            style={[
              styles.settingOption,
              user.is_private ? styles.settingOptionPurple : styles.settingOptionInactive
            ]}
          >
            <SettingsIcon size={12} color={user.is_private ? "#e9d5ff" : "#9ca3af"} />
            <Text style={[styles.settingText, user.is_private ? {color: '#e9d5ff'} : {color: '#9ca3af'}]}>
              Incognito Mode
            </Text>
          </TouchableOpacity>

          {/* Admin & Logout */}
          <View style={styles.row}>
            {/* Admin (Mock condition) */}
            {true && ( 
              <TouchableOpacity
                style={[styles.settingOption, styles.adminOption]}
              >
                <SettingsIcon size={12} color="#facc15" />
                <Text style={[styles.settingText, {color: '#facc15'}]}>Admin Panel</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[styles.settingOption, styles.logoutOption]}
              onPress={() => {
                onLogout();
                onClose();
              }}
            >
              <SkullIcon size={12} color="#f87171" />
              <Text style={[styles.settingText, {color: '#f87171'}]}>Terminate Session</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Chat Terminal */}
        <View style={styles.terminalContainer}>
          <GlobalTerminal userProfile={user} />
        </View>
      </View>
    </BaseModal>
  );
};

const styles = StyleSheet.create({
    settingsModal: {
      width: '100%',
      maxWidth: 420,
      height: '85%',
      maxHeight: 700,
      backgroundColor: 'rgba(15, 23, 42, 0.95)', // System glass look
      borderWidth: 1,
      borderColor: 'rgba(6, 182, 212, 0.3)',
      borderRadius: 16,
      padding: 20,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.5,
      shadowRadius: 50,
      elevation: 20,
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingBottom: 16,
      borderBottomWidth: 1,
      borderBottomColor: 'rgba(6, 182, 212, 0.2)',
      marginBottom: 16,
    },
    modalHeaderLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    settingsIconBox: {
      padding: 8,
      backgroundColor: 'rgba(6, 182, 212, 0.1)',
      borderRadius: 8,
      borderWidth: 1,
      borderColor: 'rgba(6, 182, 212, 0.3)',
    },
    modalTitle: {
      color: '#fff',
      fontSize: 16,
      fontWeight: '900',
      textTransform: 'uppercase',
      letterSpacing: 2,
      fontFamily: 'Exo2-Regular',
    },
    modalSubtitle: {
      color: 'rgba(34, 211, 238, 0.6)',
      fontSize: 10,
      fontFamily: 'Exo2-Regular',
    },
    closeBtn: {
      width: 32,
      height: 32,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: 'rgba(239, 68, 68, 0.1)',
      borderRadius: 8,
      borderWidth: 1,
      borderColor: 'rgba(239, 68, 68, 0.2)',
    },
    settingsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      marginBottom: 16,
    },
    settingOption: {
      flex: 1, // Grid item
      minWidth: '45%',
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 10,
      paddingHorizontal: 12,
      borderRadius: 9999,
      borderWidth: 1,
      gap: 8,
    },
    settingOptionActive: {
      backgroundColor: 'rgba(37, 99, 235, 0.2)',
      borderColor: 'rgba(59, 130, 246, 0.5)',
    },
    settingOptionInactive: {
      backgroundColor: 'rgba(15, 23, 42, 0.4)',
      borderColor: 'rgba(255, 255, 255, 0.05)',
    },
    settingOptionPurple: {
      backgroundColor: 'rgba(147, 51, 234, 0.2)',
      borderColor: 'rgba(168, 85, 247, 0.5)',
    },
    settingText: {
      fontSize: 9,
      fontWeight: '900',
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      fontFamily: 'Exo2-Regular',
    },
    row: {
      flexDirection: 'row',
      gap: 8,
      width: '100%',
    },
    adminOption: {
      backgroundColor: 'rgba(202, 138, 4, 0.1)',
      borderColor: 'rgba(234, 179, 8, 0.3)',
    },
    logoutOption: {
      backgroundColor: 'rgba(220, 38, 38, 0.1)',
      borderColor: 'rgba(220, 38, 38, 0.3)',
    },
    terminalContainer: {
      borderTopWidth: 1,
      borderTopColor: 'rgba(6, 182, 212, 0.2)',
      paddingTop: 12,
      minHeight: 280,
      flex: 1,
    },
});
  
export default SettingsModal;
