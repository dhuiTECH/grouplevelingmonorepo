import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  Platform,
  KeyboardAvoidingView,
  Alert,
} from 'react-native';
import { Video, ResizeMode } from 'expo-av';
import { useNavigation } from '@react-navigation/native';
import type { RootStackScreenProps } from '../types/navigation';
import * as Haptics from 'expo-haptics';
import { useAuth } from '@/contexts/AuthContext';
import { useAudio } from '@/contexts/AudioContext';
import { playHunterSound } from '@/utils/audio';
import { SoloLevelingPanelFrame } from '@/components/ui/SoloLevelingPanelFrame';
import { CyberButton } from '@/components/ui/CyberButton';

export default function SignupScreen() {
  const navigation = useNavigation<RootStackScreenProps<'Signup'>['navigation']>();
  const { signInAsGuest } = useAuth();
  const { playTrack } = useAudio();
  const [loading, setLoading] = useState(false);

  React.useEffect(() => {
    playTrack('Onboarding Screen - Before Tutorial Overlay');
  }, [playTrack]);

  const onEnterGate = async () => {
    setLoading(true);
    try {
      await signInAsGuest();
      playHunterSound('click');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e: any) {
      playHunterSound('error');
      Alert.alert('System Error', e?.message || 'Could not start guest session.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <Video
        source={require('../../assets/Hologram.mp4')}
        style={[StyleSheet.absoluteFill, { opacity: 0.3 }]}
        resizeMode={ResizeMode.COVER}
        shouldPlay
        isLooping
        isMuted
      />
      <View style={styles.bgOverlay} />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <View style={styles.headerContainer}>
          <Text style={styles.systemHeader}>SYSTEM</Text>
          <Text style={styles.subHeader}>INITIALIZE DAILY PROTOCOLS</Text>
        </View>

        <SoloLevelingPanelFrame title="Hunter Awakens">
          <CyberButton
            text="ENTER THE GATE"
            onPress={onEnterGate}
            loading={loading}
            disabled={loading}
            backgroundImage={require('../../assets/bluebutton.png')}
            width="100%"
            height={54}
            radiate
          />

          <TouchableOpacity onPress={() => navigation.navigate('Login')} style={styles.linkContainer}>
            <Text style={styles.linkText}>
              ALREADY AWAKENED? <Text style={{ color: '#fff' }}>LOGIN</Text>
            </Text>
          </TouchableOpacity>
        </SoloLevelingPanelFrame>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  bgOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(37, 99, 235, 0.05)' },
  keyboardView: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 16 },
  headerContainer: { alignItems: 'center', marginBottom: 16, width: '100%' },
  systemHeader: {
    fontSize: 36,
    fontFamily: 'Montserrat-Thin',
    fontWeight: '100',
    color: '#fff',
    letterSpacing: -2,
    textShadowColor: '#3b82f6',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 20,
  },
  subHeader: {
    fontSize: 10,
    fontFamily: 'Montserrat-Bold',
    color: '#bfdbfe',
    letterSpacing: 4,
    opacity: 0.8,
    marginTop: 4,
    fontWeight: '700',
  },
  linkContainer: {
    marginTop: 20,
    alignItems: 'center',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 210, 255, 0.2)',
  },
  linkText: { color: '#94a3b8', fontSize: 10, fontWeight: '700', letterSpacing: 1 },
});
