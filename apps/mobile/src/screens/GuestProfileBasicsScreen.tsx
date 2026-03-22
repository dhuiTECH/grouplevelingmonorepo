import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Platform,
  KeyboardAvoidingView,
  Animated,
  ScrollView,
  StatusBar,
  Alert,
} from 'react-native';
import { Video, ResizeMode } from 'expo-av';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { SoloLevelingPanelFrame } from '@/components/ui/SoloLevelingPanelFrame';
import { CyberButton } from '@/components/ui/CyberButton';
import { playHunterSound } from '@/utils/audio';

function CyberInput({
  value,
  onChangeText,
  placeholder,
  label,
}: {
  value: string;
  onChangeText: (t: string) => void;
  placeholder: string;
  label: string;
}) {
  return (
    <View style={styles.inputWrap}>
      <Text style={styles.inputLabel}>{label}</Text>
      <TextInput
        style={styles.cyberInput}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="rgba(34, 211, 238, 0.4)"
        autoCapitalize="words"
      />
    </View>
  );
}

export default function GuestProfileBasicsScreen() {
  const insets = useSafeAreaInsets();
  const { user, refreshProfile, checkProfileExists } = useAuth();
  const [name, setName] = useState('');
  const [gender, setGender] = useState<'Male' | 'Female' | 'Non-binary'>('Male');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 0.55, duration: 1500, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1500, useNativeDriver: true }),
      ])
    ).start();
  }, [pulseAnim]);

  const getAvatarSource = () => {
    switch (gender) {
      case 'Female':
        return require('../../assets/NoobWoman.png');
      case 'Non-binary':
        return require('../../assets/Noobnonbinary.png');
      default:
        return require('../../assets/NoobMan.png');
    }
  };

  const getShirtSource = () =>
    gender === 'Female'
      ? require('../../assets/White T-Shirt (F).png')
      : require('../../assets/White T-Shirt (Unisex).png');

  const onContinue = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setError('Identify yourself, Hunter.');
      return;
    }
    if (!user?.id) {
      setError('No session. Enter the gate again.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const taken = await checkProfileExists(trimmed);
      if (
        taken &&
        taken.id !== user.id &&
        taken.hunter_name?.toLowerCase() === trimmed.toLowerCase()
      ) {
        setError('This hunter name is already in use.');
        setLoading(false);
        playHunterSound('error');
        return;
      }

      let avatarUrl = 'NoobMan.png';
      if (gender === 'Female') avatarUrl = 'NoobWoman.png';
      else if (gender === 'Non-binary') avatarUrl = 'Noobnonbinary.png';

      const { error: upErr } = await supabase
        .from('profiles')
        .update({
          hunter_name: trimmed,
          gender,
          avatar: avatarUrl,
          onboarding_step: 'avatar',
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (upErr) {
        const msg =
          (upErr as { code?: string }).code === '23505'
            ? 'This hunter name is already in use.'
            : upErr.message || 'Could not save profile.';
        throw new Error(msg);
      }

      await refreshProfile();
      playHunterSound('click');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e: any) {
      playHunterSound('error');
      Alert.alert('Error', e?.message || 'Save failed');
      setError(e?.message || 'Save failed');
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
        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.scrollContent,
            {
              paddingTop: Math.max(insets.top, 12) + 16,
              paddingBottom: Math.max(insets.bottom, 16) + 32,
            },
          ]}
        >
          <View style={styles.headerContainer}>
            <Text style={styles.systemHeader}>SYSTEM</Text>
            <Text style={styles.subHeader}>INITIALIZE DAILY PROTOCOLS</Text>
          </View>

          <SoloLevelingPanelFrame title="Hunter Awakens">
            <CyberInput
              label="CHARACTER NAME"
              value={name}
              onChangeText={setName}
              placeholder="Hunter Name..."
            />

            <Text style={[styles.inputLabel, styles.genderLabel]}>
              GENDER CHOICE <Text style={{ color: '#f87171' }}>*</Text>
            </Text>
            <View style={styles.genderRow}>
              {(['Male', 'Female', 'Non-binary'] as const).map((g) => (
                <TouchableOpacity
                  key={g}
                  onPress={() => {
                    setGender(g);
                    Haptics.selectionAsync();
                  }}
                  style={[styles.genderBtn, gender === g && styles.genderBtnActive]}
                >
                  <Text style={[styles.genderText, gender === g && { color: '#22d3ee' }]}>
                    {g.toUpperCase()}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.avatarContainer}>
              <View style={styles.avatarCircle}>
                <Animated.Image
                  source={getAvatarSource()}
                  style={[styles.avatarImg, { opacity: pulseAnim }]}
                />
                <Animated.Image
                  source={getShirtSource()}
                  style={[styles.avatarImg, { zIndex: 10, opacity: pulseAnim }]}
                  resizeMode="contain"
                />
              </View>
            </View>

            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            <CyberButton
              text="CONTINUE"
              onPress={onContinue}
              loading={loading}
              disabled={loading || !name.trim()}
              backgroundImage={require('../../assets/bluebutton.png')}
              width="100%"
              height={54}
              radiate
            />
          </SoloLevelingPanelFrame>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  bgOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(37, 99, 235, 0.05)' },
  keyboardView: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 16 },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
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
  inputWrap: { marginBottom: 14, width: '100%' },
  inputLabel: { color: '#fff', fontSize: 10, fontWeight: '900', letterSpacing: 2, marginBottom: 4, marginLeft: 2 },
  genderLabel: { width: '100%', marginTop: 4 },
  cyberInput: {
    backgroundColor: 'rgba(30, 41, 59, 0.6)',
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.2)',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  genderRow: { flexDirection: 'row', gap: 8, marginBottom: 12, width: '100%' },
  genderBtn: {
    flex: 1,
    paddingVertical: 8,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 8,
    alignItems: 'center',
  },
  genderBtnActive: { borderColor: '#22d3ee' },
  genderText: { fontSize: 8, fontWeight: '900', color: '#64748b' },
  avatarContainer: { alignItems: 'center', marginBottom: 16, marginTop: 12, width: '100%' },
  avatarCircle: {
    width: 140,
    height: 140,
    borderRadius: 70,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#22d3ee',
    backgroundColor: 'transparent',
  },
  avatarImg: { ...StyleSheet.absoluteFillObject, width: '100%', height: '100%' },
  errorText: { color: '#f87171', fontSize: 10, textAlign: 'center', marginBottom: 12, fontWeight: 'bold', width: '100%' },
});
