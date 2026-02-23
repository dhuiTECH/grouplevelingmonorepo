import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { RootStackScreenProps } from '../types/navigation';
import * as Haptics from 'expo-haptics';
import { useAuth, resolveAvatar } from '@/contexts/AuthContext';
import { useAudio } from '@/contexts/AudioContext';
import { supabase } from '@/lib/supabase';
import { playHunterSound } from '@/utils/audio';

// Import UI components
import OnboardingView from '@/components/views/OnboardingView';

export default function SignupScreen() {
  const navigation = useNavigation<RootStackScreenProps<'Signup'>['navigation']>();
  const { signInWithOtp, signInWithGoogle, verifyOtp, checkProfileExists, user, setUser } = useAuth();
  const { playTrack } = useAudio();

  useEffect(() => {
    playTrack('Onboarding Screen - Before Tutorial Overlay');
  }, [playTrack]);

  // Track email for verification step
  const emailRef = React.useRef('');

  const handleAwaken = async (data: { name: string, email: string, gender: string }) => {
    try {
      emailRef.current = data.email;
      
      // Check duplicate name
      const existingName = await checkProfileExists(data.name);
      if (existingName) {
        return { success: false, error: 'This hunter name is already in use.' };
      }

      // Check duplicate email
      const existingEmail = await checkProfileExists(data.email);
      if (existingEmail) {
        return { success: false, error: 'This email is already registered.' };
      }

      await signInWithOtp(data.email);
      playHunterSound('click');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      return { success: true };
    } catch (e: any) {
      playHunterSound('error');
      return { success: false, error: e.message || 'Failed to send OTP.' };
    }
  };

  const handleVerifyOTP = async (otp: string, data: { name: string, email: string, gender: string }) => {
    try {
      if (!emailRef.current) {
        return { success: false, error: 'Email context lost. Please try again.' };
      }
      
      await verifyOtp(emailRef.current, otp);
      
      // Upsert partial profile immediately after login
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
          let avatarUrl = 'NoobMan.png';
          if (data.gender === 'Female') avatarUrl = 'NoobWoman.png';
          else if (data.gender === 'Non-binary') avatarUrl = 'Noobnonbinary.png';

          const { error: profileError } = await supabase.from('profiles').upsert({
            id: session.user.id,
            hunter_name: data.name,
            email: data.email,
            gender: data.gender || 'Male',
            avatar: avatarUrl,
            onboarding_completed: false, // Not yet completed
            updated_at: new Date().toISOString(),
          });

          if (profileError) {
            console.error('Profile upsert error (verify step):', profileError);
            const msg = (profileError as { code?: string }).code === '23505'
              ? 'This hunter name or email is already in use.'
              : (profileError.message || 'Database error saving new user.');
            throw new Error(msg);
          }
      }

      playHunterSound('loginSuccess');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      return { success: true };
    } catch (e: any) {
      playHunterSound('error');
      return { success: false, error: e.message || 'OTP verification failed.' };
    }
  };

  const handleClassAwaken = async (data: { name: string, email: string, gender: string, selectedClass: string, referralCode?: string }) => {
    try {
      const userId = (await supabase.auth.getSession()).data.session?.user.id;
      if (!userId) throw new Error('User session not found');

      let avatarUrl = 'NoobMan.png';
      if (data.gender === 'Female') avatarUrl = 'NoobWoman.png';
      else if (data.gender === 'Non-binary') avatarUrl = 'Noobnonbinary.png';

      // Check if referral code was used - gives 1000 coins + 2 gems instead of default 100 coins
      const hasReferral = !!data.referralCode;
      const startingCoins = hasReferral ? 1000 : 100;
      const startingGems = hasReferral ? 2 : 0;

      // Generate unique referral code for this user
      const newReferralCode = `HUNT-${data.name.substring(0, 3).toUpperCase()}${Math.floor(100 + Math.random() * 900)}`;

      const updates = {
          id: userId,
          hunter_name: data.name,
          email: data.email,
          current_class: data.selectedClass,
          gender: data.gender || 'Male',
          avatar: avatarUrl,
          level: 1,
          coins: startingCoins,
          gems: startingGems,
          referral_code: newReferralCode,
          referral_used: data.referralCode || null,
          onboarding_completed: true,
          updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
          .from('profiles')
          .upsert(updates);

      if (error) {
        console.error('Profile upsert error (class awaken):', error);
        const msg = (error as { code?: string }).code === '23505'
          ? 'This hunter name or email is already in use.'
          : (error.message || 'Database error saving new user.');
        throw new Error(msg);
      }

      // Update local user context
      if (user) {
        setUser({
          ...user,
          name: data.name,
          hunter_name: data.name,
          current_class: data.selectedClass,
          gender: data.gender,
          onboarding_completed: true,
          avatar: avatarUrl,
          profilePicture: resolveAvatar(avatarUrl),
          coins: startingCoins,
          gems: startingGems,
          referral_code: newReferralCode,
          referral_used: data.referralCode || undefined,
        });
      }

      // Finalize awakening logic
      playHunterSound('activation');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      
      navigation.reset({
        index: 0,
        routes: [{ name: 'Home' }],
      });
      return { success: true };
    } catch (e: any) {
      console.error('Awakening error:', e);
      const message = e?.message || 'Failed to finalize awakening.';
      return { success: false, error: message };
    }
  };

  return (
    <View style={styles.container}>
      <OnboardingView
        onLogin={() => navigation.navigate('Login')}
        onAdminLogin={() => navigation.navigate('Admin' as any)}
        onComplete={() => {
          // Navigation handled inside handleClassAwaken
        }}
        handleAwaken={handleAwaken}
        handleVerifyOTP={handleVerifyOTP}
        handleClassAwaken={handleClassAwaken}
        handleGoogleSignIn={signInWithGoogle}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
});
