import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { RootStackScreenProps } from '../types/navigation';
import * as Haptics from 'expo-haptics';
import { useAuth } from '@/contexts/AuthContext';
import { useAudio } from '@/contexts/AudioContext';
import { playHunterSound } from '@/utils/audio';

// Import UI components
import LoginPage from '@/components/views/LoginPage';

export const LoginScreen: React.FC = () => {
  const navigation = useNavigation<RootStackScreenProps<'Login'>['navigation']>();
  const { signInWithOtp, signInWithGoogle, verifyOtp, checkProfileExists } = useAuth();
  const { playTrack } = useAudio();

  useEffect(() => {
    playTrack('Onboarding Screen - Before Tutorial Overlay');
  }, [playTrack]);

  const handleSendLoginOTP = async (identifier: string) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const profile = await checkProfileExists(identifier);
      
      if (!profile || !profile.email) {
        return { success: false, error: 'No profile matches this ID. Please register first.' };
      }

      await signInWithOtp(profile.email);
      playHunterSound('click');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      
      return { 
        success: true, 
        email: profile.email, 
        name: profile.hunter_name 
      };
    } catch (error: any) {
      playHunterSound('error');
      return { success: false, error: error.message || 'Could not send login code.' };
    }
  };

  const handleVerifyLoginOTP = async (email: string, otp: string) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      await verifyOtp(email, otp);
      playHunterSound('loginSuccess');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      
      navigation.reset({
        index: 0,
        routes: [{ name: 'Home' }],
      });
      
      return { success: true };
    } catch (error: any) {
      playHunterSound('error');
      return { success: false, error: error.message || 'Invalid or expired code.' };
    }
  };

  return (
    <View style={styles.container}>
      <LoginPage
        onBack={() => navigation.goBack()}
        onSignup={() => navigation.navigate('Signup' as any)}
        onAuthenticated={() => {
          // Navigation handled inside handleVerifyLoginOTP
        }}
        handleSendLoginOTP={handleSendLoginOTP}
        handleVerifyLoginOTP={handleVerifyLoginOTP}
        handleGoogleSignIn={signInWithGoogle}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
});

export default LoginScreen;
