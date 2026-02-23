import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Platform,
  Dimensions,
  KeyboardAvoidingView,
  Image,
  LayoutAnimation,
  Pressable,
  StatusBar,
} from 'react-native';
import { Video, ResizeMode, Audio } from 'expo-av';
import { LinearGradient } from 'expo-linear-gradient';
import { MotiView, AnimatePresence } from 'moti';
import { useAudio } from '@/contexts/AudioContext';
import { 
  Skull, 
  Lock, 
  Loader2, 
  Sword, 
  Shield, 
  Target, 
  Zap, 
  Heart, 
  Eye,
  ChevronRight,
  Mail
} from 'lucide-react-native';

const { width } = Dimensions.get('window');

// --- CONSTANTS & DATA ---
const CLASSES = [
  { 
    id: 'Assassin', name: 'ASSASSIN', desc: 'Precision & Speed focused. Engineered for silent execution.', 
    color: ['rgba(147, 51, 234, 0.6)', 'transparent'], image: require('../../../assets/classes/assassin.webp'), icon: Sword, 
    stats: { agility: 95, strength: 55, vitality: 40 }
  },
  { 
    id: 'Fighter', name: 'FIGHTER', desc: 'Intensity & Strength. Peak physical power.', 
    color: ['rgba(220, 38, 38, 0.6)', 'transparent'], image: require('../../../assets/classes/fighter.webp'), icon: Target, 
    stats: { agility: 55, strength: 95, vitality: 70 }
  },
  { 
    id: 'Tanker', name: 'TANKER', desc: 'Unyielding Defense. The ultimate shield.', 
    color: ['rgba(37, 99, 235, 0.6)', 'transparent'], image: require('../../../assets/classes/tanker.webp'), icon: Shield, 
    stats: { agility: 30, strength: 75, vitality: 95 }
  },
  { 
    id: 'Ranger', name: 'RANGER', desc: 'Perception & Range. Long-distance specialist.', 
    color: ['rgba(234, 88, 12, 0.6)', 'transparent'], image: require('../../../assets/classes/ranger.webp'), icon: Eye, 
    stats: { agility: 85, strength: 50, vitality: 60 }
  },
  { 
    id: 'Mage', name: 'MAGE', desc: 'Intellect & Power. Arcane energy specialist.', 
    color: ['rgba(79, 70, 229, 0.6)', 'transparent'], image: require('../../../assets/classes/mage.webp'), icon: Zap, 
    stats: { agility: 70, strength: 40, vitality: 60 }
  },
  { 
    id: 'Healer', name: 'HEALER', desc: 'Spirit & Support. Master of restoration.', 
    color: ['rgba(22, 163, 74, 0.6)', 'transparent'], image: require('../../../assets/classes/healer.webp'), icon: Heart, 
    stats: { agility: 50, strength: 45, vitality: 85 }
  }
];

// --- CUSTOM COMPONENTS ---

const CyberButton = ({ onPress, text, icon: Icon, color = '#2563eb', shadowColor = '#1e40af', disabled, loading, backgroundImage, width, height, style, radiate }: any) => {
  return (
    <TouchableOpacity 
      onPress={onPress} 
      activeOpacity={0.8}
      disabled={disabled}
      style={[
        styles.cyberBtn, 
        width && { width },
        height && { height },
        { 
          backgroundColor: backgroundImage ? 'transparent' : color, 
          borderBottomColor: backgroundImage ? 'transparent' : shadowColor,
          borderBottomWidth: backgroundImage ? 0 : 4,
          // Blue Shine/Glow Effect
          shadowColor: radiate && !disabled ? '#3b82f6' : 'transparent',
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: radiate && !disabled ? 0.4 : 0,
          shadowRadius: radiate && !disabled ? 10 : 0,
          elevation: radiate && !disabled ? 6 : 0,
        },
        disabled && { opacity: 0.5, borderBottomWidth: 0, transform: [{translateY: 4}] },
        style
      ]}
    >
      {backgroundImage && (
        <Image 
          source={backgroundImage} 
          style={{ ...StyleSheet.absoluteFillObject, width: '100%', height: '100%', borderRadius: 4 }}
          resizeMode="cover" 
        />
      )}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, zIndex: 1 }}>
        {loading ? (
           <Text style={styles.cyberBtnText}>SYSTEM PROCESSING...</Text>
        ) : (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={styles.cyberBtnText}>{text}</Text>
            {Icon && <Icon size={14} color="#fff" />}
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
};

const CyberInput = ({ value, onChangeText, placeholder, keyboardType, autoCapitalize, label }: any) => (
  <View style={{ marginBottom: 14, width: 321, alignSelf: 'center' }}>
    {label && <Text style={styles.inputLabel}>{label}</Text>}
    <TextInput
      style={styles.cyberInput}
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor="rgba(34, 211, 238, 0.4)"
      keyboardType={keyboardType}
      autoCapitalize={autoCapitalize}
    />
  </View>
);

// --- MAIN COMPONENT ---

interface OnboardingProps {
  onLogin: () => void;
  onAdminLogin: () => void;
  onComplete: (data: any) => void;
  handleAwaken: (data: any) => Promise<any>;
  handleVerifyOTP: (otp: string, data: any) => Promise<any>;
  handleClassAwaken: (data: any) => Promise<any>;
  handleGoogleSignIn: () => Promise<void>;
}

export default function OnboardingView({
  onLogin,
  onAdminLogin,
  onComplete,
  handleAwaken,
  handleVerifyOTP,
  handleClassAwaken,
  handleGoogleSignIn,
}: OnboardingProps) {
  const [step, setStep] = useState<'register' | 'verify' | 'class_path'>('register');
  const [data, setData] = useState({ name: '', email: '', gender: 'Male' as any });
  const [otp, setOtp] = useState('');
  const [selectedClass, setSelectedClass] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { playTrack } = useAudio();

  useEffect(() => {
    playTrack('Onboarding Screen - Before Tutorial Overlay');
  }, [playTrack]);

  // Sound for gender selection
  const playSelectionSound = async () => {
    try {
      const { sound } = await Audio.Sound.createAsync(
        require('../../../assets/sounds/changeselection.mp3')
      );
      await sound.playAsync();
    } catch (e) {
      console.log('Error playing selection sound', e);
    }
  };

  // Animations
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const cardFlexAnims = useRef(CLASSES.map(() => new Animated.Value(1))).current;

  useEffect(() => {
    // Continuous rotation for loader icon
    Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 2000,
        useNativeDriver: true,
      })
    ).start();

    // Pulsating opacity for avatar + shirt
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 0.5,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  const spin = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const onStartAwakening = async () => {
    if (!data.name || !data.email) return setError('Identify yourself, Hunter.');
    setIsLoading(true);
    setError(null);
    try {
      const res = await handleAwaken(data);
      if (res.success) setStep('verify');
      else setError(res.error || 'Connection Failed');
    } catch (e) { setError('System Error'); }
    setIsLoading(false);
  };

  const onVerify = async () => {
    if (otp.length !== 6) return;
    setIsLoading(true);
    try {
      const res = await handleVerifyOTP(otp, data);
      if (res.success) {
        // Verification successful. The AppNavigator will handle the transition 
        // to the AvatarScreen once the user state updates.
        // We just keep loading state here.
      } else {
        setError(res.error || 'Invalid Key');
        setIsLoading(false);
      }
    } catch (e) { 
      setError('Verification Failed'); 
      setIsLoading(false);
    }
  };

  const onFinalize = async () => {
    if (!selectedClass) return;
    setIsLoading(true);
    try {
      // Pass full data including name, gender, and selected class
      const res = await handleClassAwaken({
        ...data,
        selectedClass
      });
      if (res.success) onComplete({ ...data, selectedClass });
      else setError(res.error || 'Class Sync Failed');
    } catch (e) { setError('Sync Error'); }
    setIsLoading(false);
  };

  const handleCardPress = (id: string, index: number) => {
    setSelectedClass(id);
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    cardFlexAnims.forEach((anim, i) => {
      Animated.timing(anim, {
        toValue: i === index ? 6 : 1,
        duration: 300,
        useNativeDriver: false,
      }).start();
    });
  };

  const getAvatarSource = () => {
    switch (data.gender) {
      case 'Female': return require('../../../assets/NoobWoman.png');
      case 'Non-binary': return require('../../../assets/Noobnonbinary.png');
      default: return require('../../../assets/NoobMan.png');
    }
  };

  const getShirtSource = () => {
     return data.gender === 'Female' 
       ? require('../../../assets/White T-Shirt (F).png') 
       : require('../../../assets/White T-Shirt (Unisex).png');
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      <Video
        source={require('../../../assets/Hologram.mp4')}
        style={[StyleSheet.absoluteFill, { opacity: 0.3 }]}
        resizeMode={ResizeMode.COVER}
        shouldPlay isLooping isMuted
      />
      <View style={styles.bgOverlay} />

      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
        style={styles.keyboardView}
      >
        <View style={[styles.mainWrapper, step === 'class_path' && { width: '100%', maxWidth: 800 }]}>
          
          <View style={styles.contentContainer}>
            <View style={styles.headerContainer}>
              <Text style={styles.systemHeader}>SYSTEM</Text>
              <Text style={styles.subHeader}>INITIALIZE DAILY PROTOCOLS</Text>
            </View>

            <View style={styles.techPanel}>
              <AnimatePresence exitBeforeEnter>
                
                {/* STEP 1: REGISTER */}
                {step === 'register' && (
                  <MotiView 
                    key="register"
                    from={{ opacity: 0, scale: 0.95 }} 
                    animate={{ opacity: 1, scale: 1 }} 
                    exit={{ opacity: 0, scale: 1.05 }}
                    style={{ width: '100%', padding: 20 }}
                  >
                    {/* --- BANNER --- */}
                    <View style={{ alignItems: 'center', marginBottom: 16 }}>
                      <Animated.View
                        style={[styles.awakensContainer, { opacity: pulseAnim }]}
                      >
                        {/* Box 1: Icon (NO BORDER/BG) */}
                        <View style={styles.iconBox}>
                          <Image 
                            source={require('../../../assets/exclamation.png')} 
                            style={styles.exclamationIcon} 
                          />
                        </View>

                        {/* Box 2: Text (HAS BORDER/BG) */}
                        <View style={styles.textBox}>
                          <Text style={styles.awakensText}>HUNTER AWAKENS</Text>
                        </View>
                      </Animated.View>
                    </View>
                    {/* --- END BANNER --- */}

                    <CyberInput 
                      label="CHARACTER NAME"
                      value={data.name} 
                      onChangeText={(t: string) => setData({...data, name: t})} 
                      placeholder="Hunter Name..." 
                    />
                    <CyberInput 
                      label="EMAIL ADDRESS"
                      value={data.email} 
                      onChangeText={(t: string) => setData({...data, email: t})} 
                      placeholder="hunter@email.com" 
                      keyboardType="email-address"
                      autoCapitalize="none"
                    />

                    <View style={styles.alternativeContainer}>
                      <View style={styles.dividerLine} />
                      <Text style={styles.dividerText}>OR</Text>
                      <View style={styles.dividerLine} />
                    </View>

                    <TouchableOpacity 
                      onPress={() => {
                        if (!data.name) {
                          setError('Identify yourself, Hunter, before connecting.');
                          return;
                        }
                        handleGoogleSignIn();
                      }}
                      style={[
                        styles.googleLogoBtn,
                        !data.name && { opacity: 0.5 }
                      ]}
                    >
                      <Image 
                        source={{ uri: 'https://www.gstatic.com/images/branding/product/2x/googleg_48dp.png' }} 
                        style={styles.googleLogoImg} 
                      />
                      <Text style={styles.googleLogoBtnText}>CONTINUE WITH GOOGLE</Text>
                    </TouchableOpacity>

                    <Text style={styles.inputLabel}>GENDER CHOICE <Text style={{color: '#f87171'}}>*</Text></Text>
                    <View style={[styles.genderRow, { width: 321, alignSelf: 'center' }]}>
                      {['Male', 'Female', 'Non-binary'].map((g) => (
                        <TouchableOpacity 
                          key={g} 
                          onPress={() => {
                            setData({ ...data, gender: g as any });
                            playSelectionSound();
                          }}
                          style={[
                            styles.genderBtn, 
                            data.gender === g && styles.genderBtnActive
                          ]}
                        >
                          <Text style={[styles.genderText, data.gender === g && { color: '#22d3ee' }]}>{g.toUpperCase()}</Text>
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

                    {error && <Text style={styles.errorText}>{error}</Text>}

                    <CyberButton 
                      text="ENTER THE GATE" 
                      loading={isLoading}
                      onPress={onStartAwakening}
                      disabled={!data.name || !data.email}
                      backgroundImage={require('../../../assets/bluebutton.png')}
                      width={321}
                      height={54}
                      style={{ alignSelf: 'center' }}
                      radiate
                    />

                    <TouchableOpacity onPress={onLogin} style={styles.linkContainer}>
                      <Text style={styles.linkText}>ALREADY AWAKENED? <Text style={{color: '#fff'}}>LOGIN</Text></Text>
                    </TouchableOpacity>
                  </MotiView>
                )}

                {/* STEP 2: VERIFY */}
                {step === 'verify' && (
                  <MotiView 
                    key="verify"
                    from={{ opacity: 0, translateX: 50 }} 
                    animate={{ opacity: 1, translateX: 0 }} 
                    exit={{ opacity: 0, translateX: -50 }}
                    style={{ width: '100%', padding: 20, alignItems: 'center' }}
                  >
                    <Animated.View style={{ transform: [{ rotate: spin }], marginBottom: 16 }}>
                      <Loader2 size={48} color="#3b82f6" />
                    </Animated.View>
                    
                    <Text style={styles.verifyTitle}>SYSTEM VERIFICATION REQUIRED</Text>
                    <Text style={styles.verifyDesc}>Enter the 6-digit key sent to your communication device.</Text>

                    <TextInput
                      style={[styles.otpInput, { width: 321, alignSelf: 'center' }]}
                      value={otp}
                      onChangeText={setOtp}
                      placeholder="000000"
                      placeholderTextColor="rgba(34, 211, 238, 0.2)"
                      keyboardType="number-pad"
                      maxLength={6}
                    />

                    {error && <Text style={styles.errorText}>{error}</Text>}

                    <View style={{ width: 321, alignSelf: 'center', marginTop: 16 }}>
                      <CyberButton 
                        text="VERIFY & PROCEED" 
                        onPress={onVerify}
                        loading={isLoading}
                        disabled={otp.length !== 6}
                        backgroundImage={require('../../../assets/bluebutton.png')}
                        width={321}
                        height={54}
                        style={{ alignSelf: 'center' }}
                        radiate
                      />
                    </View>
                    
                    <TouchableOpacity onPress={() => setStep('register')} style={styles.linkContainer}>
                      <Text style={styles.linkText}>← RECONNECT TO SYSTEM</Text>
                    </TouchableOpacity>
                  </MotiView>
                )}

                {/* STEP 3: CLASS SELECTION */}
                {step === 'class_path' && (
                  <MotiView 
                    key="class"
                    from={{ opacity: 0 }} 
                    animate={{ opacity: 1 }} 
                    style={{ width: '100%', padding: 10 }}
                  >
                    <View style={{ alignItems: 'center', marginBottom: 12 }}>
                       <Animated.View style={{ transform: [{ rotate: spin }] }}>
                         <Loader2 size={24} color="#22d3ee" />
                       </Animated.View>
                       <Text style={styles.classHeaderTitle}>CLASS PATH SELECTION</Text>
                       <Text style={styles.classHeaderSub}>Choose your archetype to determine core strengths.</Text>
                    </View>

                    <View style={styles.classGrid}>
                      {CLASSES.map((c, idx) => {
                        const isSelected = selectedClass === c.id;
                        return (
                          <Animated.View 
                            key={c.id} 
                            style={[
                              styles.classCardWrapper, 
                              { flex: cardFlexAnims[idx] },
                              isSelected && styles.classCardWrapperActive
                            ]}
                          >
                            <Pressable 
                              onPress={() => handleCardPress(c.id, idx)}
                              style={styles.classCard}
                            >
                              <Image source={c.image} style={styles.classImg} />
                              <LinearGradient 
                                colors={isSelected ? (c.color as any) : ['rgba(0,0,0,0.8)', 'rgba(0,0,0,0.4)']} 
                                style={StyleSheet.absoluteFill} 
                              />
                              
                              {!isSelected && (
                                <View style={styles.verticalTextContainer}>
                                  <Text style={styles.verticalText}>{c.name}</Text>
                                </View>
                              )}

                              {isSelected && (
                                <MotiView from={{opacity: 0, translateY: 10}} animate={{opacity: 1, translateY: 0}} style={styles.classContent}>
                                  <View style={styles.classTitleRow}>
                                    <View style={styles.iconBoxSmall}><c.icon size={16} color="#000" /></View>
                                    <Text style={styles.classNameLarge}>{c.name}</Text>
                                  </View>
                                  <Text style={styles.classDesc}>{c.desc}</Text>
                                  
                                  <TouchableOpacity onPress={onFinalize} style={styles.confirmClassBtn}>
                                    <Text style={styles.confirmClassText}>CONFIRM SELECTION</Text>
                                    <ChevronRight size={12} color="#fff" />
                                  </TouchableOpacity>
                                </MotiView>
                              )}
                            </Pressable>
                          </Animated.View>
                        );
                      })}
                    </View>
                    <TouchableOpacity onPress={() => setStep('verify')} style={styles.linkContainer}>
                      <Text style={styles.linkText}>← BACK</Text>
                    </TouchableOpacity>
                  </MotiView>
                )}

              </AnimatePresence>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

// --- STYLES ---

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  bgOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(37, 99, 235, 0.05)' },

  adminButton: { 
    position: 'absolute', top: 60, right: 24, zIndex: 50, 
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(255,255,255,0.8)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 4
  },
  adminText: { color: '#000', fontSize: 10, fontWeight: '700', letterSpacing: 1 },

  keyboardView: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 16 },
  mainWrapper: { width: '100%', maxWidth: 600, alignItems: 'center' },
  contentContainer: { width: '100%', alignItems: 'center' },

  // HEADER
  headerContainer: { alignItems: 'center', marginBottom: 8, marginTop: Platform.OS === 'ios' ? 20 : 0 },
  systemHeader: {
    fontSize: 36, fontWeight: '300', color: '#fff', letterSpacing: -2,
    textShadowColor: '#3b82f6', textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 20
  },
  subHeader: {
    fontSize: 10, color: '#bfdbfe', letterSpacing: 4, opacity: 0.8, marginTop: 4, fontWeight: '700'
  },

  // TECH PANEL
  techPanel: {
    width: '100%',
    backgroundColor: 'rgba(15, 23, 42, 0.9)',
    borderColor: 'rgba(30, 58, 138, 0.5)', borderWidth: 1,
    borderTopWidth: 0, 
    borderBottomWidth: 0,
    borderRadius: 0,
    paddingVertical: 12,
  },

  // --- NEW BANNER STYLES ---
  awakensContainer: { 
    flexDirection: 'row', 
    gap: 8, 
    alignItems: 'center',
  },
  
  iconBox: {
    width: 60, 
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },

  textBox: {
    height: 40,
    justifyContent: 'center',
    paddingHorizontal: 20,
    borderWidth: 1,
    borderColor: '#22d3ee', // Cyan Border
    backgroundColor: 'rgba(15, 23, 42, 0.9)', 
    
    // GLOW EFFECT
    shadowColor: '#22d3ee',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 15,
    elevation: 8,
  },

  exclamationCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#FFFFFF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 10,
    elevation: 5,
  },

  exclamationTextInline: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 16,
    textShadowColor: '#FFFFFF',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 5,
  },

  exclamationIcon: { 
    width: 64, 
    height: 64, 
    tintColor: '#FFFFFF', // White tint
    resizeMode: 'contain', 
    
    // GLOW EFFECT
    shadowColor: '#FFFFFF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 12,
  },

  awakensText: { 
    color: '#fff', 
    fontWeight: '500', 
    fontSize: 16, 
    letterSpacing: 3,
    textShadowColor: '#22d3ee',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  // -------------------------

  // INPUTS
  inputLabel: { color: '#fff', fontSize: 10, fontWeight: '900', letterSpacing: 2, marginBottom: 4, marginLeft: 4 },
  cyberInput: {
    backgroundColor: 'rgba(30, 41, 59, 0.6)',
    borderWidth: 1, borderColor: 'rgba(56, 189, 248, 0.2)',
    borderRadius: 8, paddingHorizontal: 16, paddingVertical: 12,
    color: '#fff', fontSize: 14, fontWeight: '700',
  },
  
  // GENDER
  genderRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  genderBtn: {
    flex: 1, paddingVertical: 8, backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', borderRadius: 8,
    alignItems: 'center'
  },
  genderBtnActive: { borderColor: '#22d3ee' },
  genderText: { fontSize: 8, fontWeight: '900', color: '#64748b' },

  // --- AVATAR GLOW UPDATE ---
  avatarContainer: { alignItems: 'center', marginBottom: 20, marginTop: 12 },
  avatarCircle: {
    width: 140, 
    height: 140, 
    borderRadius: 70, 
    overflow: 'hidden',
    borderWidth: 2, 
    borderColor: '#22d3ee', // Cyan Border
    backgroundColor: 'transparent', // Navy Background
    
    // GLOW EFFECT
    shadowColor: '#22d3ee',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.7,
    shadowRadius: 20,
    elevation: 15,
  },
  avatarImg: { ...StyleSheet.absoluteFillObject, width: '100%', height: '100%' },
  // --------------------------

  // BUTTON
  cyberBtn: {
    width: '100%', height: 44, borderRadius: 4,
    justifyContent: 'center', alignItems: 'center',
    borderBottomWidth: 4, marginBottom: 4,
  },
  cyberBtnText: { color: '#fff', fontWeight: '900', fontSize: 11, letterSpacing: 3 },

  linkContainer: { marginTop: 12, width: '100%', alignItems: 'center', borderTopWidth: 1, borderTopColor: 'rgba(30, 58, 138, 0.3)', paddingTop: 12 },
  linkText: { color: '#94a3b8', fontSize: 10, fontWeight: '700', letterSpacing: 1 },
  errorText: { color: '#f87171', fontSize: 10, textAlign: 'center', marginBottom: 16, fontWeight: 'bold' },

  alternativeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: 321,
    alignSelf: 'center',
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
    paddingVertical: 10,
    width: 321,
    alignSelf: 'center',
    marginBottom: 16,
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

  // VERIFY STEP
  verifyTitle: { color: '#3b82f6', fontSize: 18, fontWeight: '400', letterSpacing: 1, marginBottom: 8, textAlign: 'center' },
  verifyDesc: { color: '#94a3b8', fontSize: 10, textAlign: 'center', marginBottom: 24 },
  otpInput: {
    width: '100%', borderBottomWidth: 2, borderBottomColor: '#3b82f6',
    textAlign: 'center', fontSize: 32, fontWeight: '400', color: '#fff',
    letterSpacing: 8, paddingVertical: 10, backgroundColor: '#000'
  },

  // CLASS STEP
  classHeaderTitle: { color: '#22d3ee', fontSize: 20, fontWeight: '900', letterSpacing: 2, marginTop: 16, textShadowColor: '#22d3ee', textShadowRadius: 10 },
  classHeaderSub: { color: '#94a3b8', fontSize: 10, marginTop: 4 },
  classGrid: { flexDirection: 'row', height: 420, gap: 4, width: '100%' },
  classCardWrapper: { overflow: 'hidden', borderRadius: 4, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  classCardWrapperActive: { borderColor: '#22d3ee', shadowColor: '#22d3ee', shadowOpacity: 0.5, shadowRadius: 10, elevation: 5 },
  classCard: { flex: 1 },
  classImg: { ...StyleSheet.absoluteFillObject, width: '100%', height: '100%', resizeMode: 'cover' },
  
  verticalTextContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)' },
  verticalText: { 
    color: 'rgba(255,255,255,0.4)', fontSize: 20, fontWeight: '900', letterSpacing: 6, 
    transform: [{ rotate: '-90deg' }], width: 300, textAlign: 'center' 
  },
  
  classContent: { flex: 1, justifyContent: 'flex-end', padding: 16, backgroundColor: 'rgba(0,0,0,0.3)' },
  classTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  iconBoxSmall: { backgroundColor: '#22d3ee', padding: 4, borderRadius: 4 },
  classNameLarge: { color: '#fff', fontSize: 28, fontWeight: '900', letterSpacing: -1 },
  classDesc: { color: '#e2e8f0', fontSize: 10, lineHeight: 14, marginBottom: 16, fontWeight: '600' },
  confirmClassBtn: { 
    backgroundColor: 'rgba(0, 0, 0, 0.3)', borderWidth: 1, borderColor: '#22d3ee', 
    paddingVertical: 10, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8 
  },
  confirmClassText: { color: '#fff', fontSize: 10, fontWeight: '900', letterSpacing: 2 },
  
});