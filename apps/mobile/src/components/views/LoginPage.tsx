import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Platform,
  KeyboardAvoidingView,
  StatusBar,
  Image,
  ScrollView,
} from 'react-native';
import { Video, ResizeMode } from 'expo-av';
import { MotiView, AnimatePresence } from 'moti';
import { ArrowLeft, User, AlertCircle } from 'lucide-react-native';
import HologramPet from '../HologramPet';
import { CyberButton } from '@/components/ui/CyberButton';
import { SoloLevelingPanelFrame } from '@/components/ui/SoloLevelingPanelFrame';

// --- REUSABLE CYBER COMPONENTS ---

// 1. Cyber Input (Updated to match Onboarding Navy Style)
const CyberInput = ({ 
  value, 
  onChangeText, 
  placeholder, 
  icon: Icon, 
  secureTextEntry, 
  keyboardType,
  autoCapitalize 
}: any) => {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <View style={[
      styles.inputContainer, 
      isFocused && styles.inputContainerFocused
    ]}>
      {Icon && <Icon size={18} color={isFocused ? "#22d3ee" : "#64748b"} style={{ marginRight: 12 }} />}
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="rgba(34, 211, 238, 0.4)"
        secureTextEntry={secureTextEntry}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize || "none"}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
      />
    </View>
  );
};

// --- MAIN PAGE ---

interface LoginPageProps {
  onBack: () => void;
  onSignup: () => void;
  onAuthenticated: (userData: any) => void;
  handleSendLoginOTP: (identifier: string) => Promise<{ success: boolean; email?: string; name?: string; error?: string }>;
  handleVerifyLoginOTP: (email: string, otp: string) => Promise<{ success: boolean; user?: any; error?: string }>;
  handleGoogleSignIn: () => Promise<void>;
}

export default function LoginPage({
  onBack,
  onSignup,
  onAuthenticated,
  handleSendLoginOTP,
  handleVerifyLoginOTP,
  handleGoogleSignIn,
}: LoginPageProps) {
  // State
  const [step, setStep] = useState<'credentials' | 'otp'>('credentials');
  const [isLoading, setIsLoading] = useState(false);
  const [identifier, setIdentifier] = useState('');
  const [otpToken, setOtpToken] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [characterData, setCharacterData] = useState<{ name: string; email: string } | null>(null);

  // Handlers
  const onSendOTP = async () => {
    if (!identifier) return setError('Please enter your email or hunter name');
    setIsLoading(true);
    setError(null);
    try {
      const result = await handleSendLoginOTP(identifier);
      if (result.success) {
        setCharacterData({ name: result.name || 'Hunter', email: result.email || '' });
        setStep('otp');
      } else {
        setError(result.error || 'Profile not found');
      }
    } catch (e: any) {
      setError('System connection failed');
    }
    setIsLoading(false);
  };

  const onVerifyOTP = async () => {
    if (otpToken.length !== 6) return setError('Invalid key length');
    setIsLoading(true);
    setError(null);
    try {
      const result = await handleVerifyLoginOTP(characterData?.email || '', otpToken);
      if (result.success) {
        onAuthenticated(result.user);
      } else {
        setError(result.error || 'Verification failed');
      }
    } catch (e: any) {
      setError('System connection failed');
    }
    setIsLoading(false);
  };

  const frameTitle = step === 'credentials' ? 'Hunter Login' : 'Verify Identity';

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* BACKGROUND VIDEO */}
      <Video
        source={require('../../../assets/Hologram.mp4')}
        style={StyleSheet.absoluteFill}
        resizeMode={ResizeMode.COVER}
        shouldPlay isLooping isMuted opacity={0.3}
      />
      {/* Vignette Overlay (Updated to match Onboarding) */}
      <View style={styles.overlay} />

      {/* BACK BUTTON */}
      <TouchableOpacity style={styles.backButton} onPress={onBack}>
        <ArrowLeft size={20} color="#94a3b8" />
        <Text style={styles.backText}>BACK</Text>
      </TouchableOpacity>

      {/* HOLOGRAM PET - bottom left */}
      <View style={styles.hologramPetContainer} pointerEvents="none">
        <HologramPet scale={0.33} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          <View style={styles.headerContainer}>
            <Text style={styles.systemHeader}>SYSTEM</Text>
            <Text style={styles.subHeader}>REESTABLISH CONNECTION</Text>
          </View>

          <SoloLevelingPanelFrame title={frameTitle}>
            <AnimatePresence exitBeforeEnter>
              {step === 'credentials' && (
                <MotiView
                  key="creds"
                  from={{ opacity: 0, translateX: -20 }}
                  animate={{ opacity: 1, translateX: 0 }}
                  exit={{ opacity: 0, translateX: 20 }}
                  style={styles.stepBlock}
                >
                  <View style={{ marginBottom: 20, width: '100%' }}>
                    <Text style={styles.label}>EMAIL OR HUNTER NAME</Text>
                    <CyberInput
                      value={identifier}
                      onChangeText={setIdentifier}
                      placeholder="hunter@email.com or Name"
                      icon={User}
                    />
                  </View>

                  <View style={styles.alternativeContainer}>
                    <View style={styles.dividerLine} />
                    <Text style={styles.dividerText}>OR</Text>
                    <View style={styles.dividerLine} />
                  </View>

                  <TouchableOpacity onPress={handleGoogleSignIn} style={styles.googleLogoBtn}>
                    <Image
                      source={{
                        uri: 'https://www.gstatic.com/images/branding/product/2x/googleg_48dp.png',
                      }}
                      style={styles.googleLogoImg}
                    />
                    <Text style={styles.googleLogoBtnText}>CONTINUE WITH GOOGLE</Text>
                  </TouchableOpacity>

                  {error && (
                    <MotiView from={{ opacity: 0 }} animate={{ opacity: 1 }} style={styles.errorBox}>
                      <AlertCircle size={14} color="#f87171" />
                      <Text style={styles.errorText}>{error}</Text>
                    </MotiView>
                  )}

                  <CyberButton
                    text="SEND LOGIN CODE"
                    onPress={onSendOTP}
                    loading={isLoading}
                    backgroundImage={require('../../../assets/bluebutton.png')}
                    width="100%"
                    height={54}
                    radiate
                  />
                </MotiView>
              )}

              {step === 'otp' && (
                <MotiView
                  key="otp"
                  from={{ opacity: 0, translateX: 20 }}
                  animate={{ opacity: 1, translateX: 0 }}
                  exit={{ opacity: 0, translateX: -20 }}
                  style={styles.stepBlock}
                >
                  <View style={{ alignItems: 'center', marginBottom: 20, width: '100%' }}>
                    <View style={styles.welcomeBox}>
                      <Text style={styles.welcomeText}>Welcome back, Hunter {characterData?.name}</Text>
                      <Text style={styles.emailText}>{characterData?.email}</Text>
                    </View>
                  </View>

                  <View style={{ marginBottom: 20 }}>
                    <Text style={styles.label}>ENTER 6-DIGIT KEY</Text>
                    <View style={styles.otpWrapper}>
                      <TextInput
                        value={otpToken}
                        onChangeText={setOtpToken}
                        placeholder="000000"
                        placeholderTextColor="rgba(34, 211, 238, 0.2)"
                        keyboardType="number-pad"
                        maxLength={6}
                        style={styles.otpInput}
                      />
                    </View>
                  </View>

                  {error && (
                    <View style={styles.errorBox}>
                      <AlertCircle size={14} color="#f87171" />
                      <Text style={styles.errorText}>{error}</Text>
                    </View>
                  )}

                  <CyberButton
                    text="VERIFY & LOGIN"
                    onPress={onVerifyOTP}
                    loading={isLoading}
                    backgroundImage={require('../../../assets/bluebutton.png')}
                    width="100%"
                    height={54}
                    radiate
                  />

                  <TouchableOpacity
                    style={styles.backLink}
                    onPress={() => {
                      setStep('credentials');
                      setError(null);
                    }}
                  >
                    <Text style={styles.backLinkText}>← BACK TO CREDENTIALS</Text>
                  </TouchableOpacity>
                </MotiView>
              )}
            </AnimatePresence>

            <View style={styles.footer}>
              <Text style={styles.footerText}>New Hunter?</Text>
              <TouchableOpacity onPress={onSignup} style={styles.footerLinkContainer}>
                <Text style={styles.footerLink}>CREATE NEW ACCOUNT →</Text>
              </TouchableOpacity>
            </View>
          </SoloLevelingPanelFrame>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  // 1. NAVY BACKGROUND
  container: { flex: 1, backgroundColor: '#0f172a' },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(37, 99, 235, 0.05)' },
  
  // BACK BUTTON
  backButton: { 
    position: 'absolute', top: 60, left: 24, zIndex: 50, 
    flexDirection: 'row', alignItems: 'center', gap: 6 
  },
  backText: { color: '#94a3b8', fontSize: 12, fontWeight: '700', letterSpacing: 1 },

  hologramPetContainer: {
    position: 'absolute',
    bottom: -170,
    left: -160,
    zIndex: 40,
    alignItems: 'flex-start',
    justifyContent: 'flex-end',
  },

  keyboardView: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 16 },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 24,
    paddingBottom: 40,
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
  stepBlock: { width: '100%', paddingTop: 4, paddingBottom: 4 },

  // INPUTS
  label: { color: '#cbd5e1', fontSize: 10, fontWeight: '900', letterSpacing: 2, marginBottom: 8, marginLeft: 2 },
  inputContainer: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(30, 41, 59, 0.6)', // Slate 800 input bg
    borderWidth: 1, borderColor: 'rgba(56, 189, 248, 0.2)', // Cyan-ish border
    borderRadius: 8, paddingHorizontal: 16, height: 50
  },
  inputContainerFocused: { borderColor: '#22d3ee', backgroundColor: 'rgba(34, 211, 238, 0.05)' },
  input: { flex: 1, color: '#fff', fontSize: 14, fontWeight: '600' },

  // OTP INPUT
  otpWrapper: {
    backgroundColor: '#000', borderBottomWidth: 2, borderBottomColor: '#3b82f6',
    width: '100%', height: 60, justifyContent: 'center'
  },
  otpInput: {
    textAlign: 'center', color: '#fff', fontSize: 24, 
    fontWeight: '400', letterSpacing: 8
  },

  // WELCOME BOX
  welcomeBox: { 
    backgroundColor: 'rgba(34, 211, 238, 0.05)', padding: 12, borderRadius: 4, 
    borderWidth: 1, borderColor: 'rgba(34, 211, 238, 0.2)', width: '100%', alignItems: 'center' 
  },
  welcomeText: { color: '#22d3ee', fontWeight: 'bold', fontSize: 12 },
  emailText: { color: 'rgba(34, 211, 238, 0.6)', fontSize: 10, marginTop: 2 },

  // ERRORS
  errorBox: { 
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.1)', borderWidth: 1, borderColor: 'rgba(239, 68, 68, 0.3)',
    padding: 12, borderRadius: 4, marginBottom: 20, width: '100%'
  },
  errorText: { color: '#f87171', fontSize: 11, fontWeight: 'bold' },

  alternativeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginBottom: 16,
    gap: 10,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(56, 189, 248, 0.2)',
  },
  dividerText: {
    color: 'rgba(56, 189, 248, 0.4)',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1,
  },
  googleLogoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    paddingVertical: 12,
    width: '100%',
    marginBottom: 24,
    gap: 12,
  },
  googleLogoImg: {
    width: 20,
    height: 20,
    resizeMode: 'contain',
  },
  googleLogoBtnText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 2,
  },

  // LINKS
  backLink: { marginTop: 20, width: '100%', alignItems: 'center' },
  backLinkText: { color: '#60a5fa', fontSize: 10, fontWeight: '700', letterSpacing: 1 },
  
  footer: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 210, 255, 0.2)',
    width: '100%',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerText: { color: '#94a3b8', fontSize: 10, textAlign: 'center', marginBottom: 2 },
  footerLinkContainer: { marginLeft: 0 },
  footerLink: { color: '#60a5fa', fontSize: 11, fontWeight: '700', letterSpacing: 1, textAlign: 'center' }
});