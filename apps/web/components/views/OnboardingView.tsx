"use client";

import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Skull, Lock, Loader2, Smartphone, Volume2, VolumeX } from 'lucide-react';
import { signInWithOTP, stabilizeConnection } from '@/app/actions/auth';
import AvatarCustomizationView, { type AvatarLabConfig } from '@/components/views/AvatarCustomizationView';

interface OnboardingProps {
  onAuthenticated: (profile: any) => void;
  // These are passed from page.tsx
  isAuthenticated?: boolean;
  isOnboarded?: boolean;
  initialUser?: any;
}

export default function OnboardingView({ onAuthenticated, isAuthenticated, isOnboarded, initialUser }: OnboardingProps) {
  const searchParams = useSearchParams();

  // --- STATE ---
  const [step, setStep] = useState<'register' | 'verify' | 'avatar_customize' | 'class_path'>(
    isAuthenticated && !isOnboarded ? 'class_path' : 'register'
  );
  const [otpEmail, setOtpEmail] = useState('');
  const [otpToken, setOtpToken] = useState('');
  const [isLoadingOTP, setIsLoadingOTP] = useState(false);
  const [systemError, setSystemError] = useState<string | null>(null);
  const [genderError, setGenderError] = useState(false);
  const [hunterNameError, setHunterNameError] = useState<string | null>(null);
  const [referralCode, setReferralCode] = useState<string>('');
  const [isMuted, setIsMuted] = useState(false);
  const [audio, setAudio] = useState<HTMLAudioElement | null>(null);

  // Load referral code from URL (?ref=) or localStorage (e.g. from /join link)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    // Initialize audio
    const onboardingAudio = new Audio('/sounds/Game Music/GroupLevelingOSTBeginning.mp3');
    onboardingAudio.loop = true;
    onboardingAudio.volume = 0.5; // Set reasonable default volume
    
    // Play audio on first user interaction if browser blocks autoplay
    const playAudio = () => {
      onboardingAudio.play().catch(e => console.log("Autoplay blocked, waiting for interaction", e));
      window.removeEventListener('click', playAudio);
      window.removeEventListener('keydown', playAudio);
      window.removeEventListener('touchstart', playAudio);
    };
    
    // Add multiple interaction listeners to ensure it starts
    window.addEventListener('click', playAudio);
    window.addEventListener('keydown', playAudio);
    window.addEventListener('touchstart', playAudio);
    
    setAudio(onboardingAudio);
    // Try immediate playback in case it's allowed
    onboardingAudio.play().catch(e => console.log("Autoplay blocked, waiting for interaction", e));

    return () => {
      onboardingAudio.pause();
      onboardingAudio.currentTime = 0; // Reset
      window.removeEventListener('click', playAudio);
      window.removeEventListener('keydown', playAudio);
      window.removeEventListener('touchstart', playAudio);
    };
  }, []);

  useEffect(() => {
    if (audio) {
      audio.muted = isMuted;
    }
  }, [isMuted, audio]);

  // Load referral code from URL (?ref=) or localStorage (e.g. from /join link)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const fromUrl = searchParams.get('ref');
    if (fromUrl) {
      localStorage.setItem('referral_code', fromUrl);
      setReferralCode(fromUrl);
      return;
    }
    const stored = localStorage.getItem('referral_code');
    if (stored) setReferralCode(stored);
  }, [searchParams]);

  const [onboardingData, setOnboardingData] = useState({
    name: initialUser?.hunter_name || '',
    gender: initialUser?.gender || '',
    avatar: initialUser?.avatar || '',
    base_body_url: initialUser?.base_body_url || '',
    email: initialUser?.email || '',
    current_class: initialUser?.current_class || '',
    avatarLabConfig: undefined as AvatarLabConfig | undefined,
    selectedParts: undefined as AvatarLabConfig['selectedParts'],
  });

  // --- HANDLERS ---
  
  const handleAwaken = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!onboardingData.name.trim()) return;
    if (!onboardingData.email?.trim()) return;
    if (!onboardingData.gender) {
        setGenderError(true);
        return;
    }

    setIsLoadingOTP(true);
    setGenderError(false);
    setHunterNameError(null);
    setSystemError(null);

    const formData = new FormData();
    formData.append('email', onboardingData.email);
    formData.append('characterName', onboardingData.name);

    const result = await signInWithOTP(formData);

    if (result.error) {
        if (result.error.includes('Duplicate') || result.error.includes('taken')) {
            setHunterNameError(result.error);
        } else {
            setSystemError(result.error);
        }
        setIsLoadingOTP(false);
    } else {
        setOtpEmail(onboardingData.email);
        setStep('verify');
        setIsLoadingOTP(false);
    }
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpToken || otpToken.length !== 6) return;

    setStep('avatar_customize');
  };

  const handleClassAwaken = async (selectedClass: string) => {
    setIsLoadingOTP(true);
    setSystemError(null);

    let finalAvatar = onboardingData.avatar;
    if (!finalAvatar) {
        if (onboardingData.gender === 'Female') finalAvatar = '/NoobWoman.png';
        else if (onboardingData.gender === 'Non-binary') finalAvatar = onboardingData.base_body_url || '/NoobMan.png';
        else finalAvatar = '/NoobMan.png';
    }

    const formData = new FormData();
    formData.append('email', otpEmail || onboardingData.email);
    formData.append('token', otpToken);
    formData.append('characterName', onboardingData.name);
    formData.append('gender', onboardingData.gender);
    formData.append('avatar', finalAvatar);
    if (onboardingData.gender === 'Non-binary' && onboardingData.base_body_url) {
      formData.append('base_body_url', onboardingData.base_body_url);
    }
    formData.append('current_class', selectedClass);
    if (referralCode?.trim()) {
      formData.append('referral_code', referralCode.trim());
    }

    const result = await stabilizeConnection(formData);

    if (result.error) {
        setSystemError(result.error);
        setIsLoadingOTP(false);
        // If it's an authentication error, go back to verify
        if (result.error.toLowerCase().includes('token') || result.error.toLowerCase().includes('code')) {
            setStep('verify');
        }
    } else if (result.profile) {
        const hunterId = result.profile.id;
        const baseId = onboardingData.avatarLabConfig?.baseId;
        const partIds = onboardingData.selectedParts?.map((p) => p.shop_item_id).filter((id): id is number => id != null) ?? [];
        if (hunterId && (baseId != null || partIds.length > 0)) {
            try {
                await fetch('/api/avatar/save', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        hunterId,
                        baseId: baseId != null ? baseId : undefined,
                        partIds: partIds.length > 0 ? partIds : undefined,
                    }),
                });
            } catch (e) {
                console.warn('Avatar save (creator parts) failed:', e);
            }
        }
        onAuthenticated(result.profile);
    }
  };

  // --- RENDER ---
  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center md:justify-center p-2 md:p-4 relative overflow-y-auto md:overflow-hidden font-sans">
        
        {/* Mute Button */}
        <button 
          onClick={() => setIsMuted(!isMuted)}
          className="absolute top-4 right-4 z-50 p-2 bg-black/40 border border-white/20 rounded-full hover:bg-white/10 transition-colors"
          title={isMuted ? "Unmute" : "Mute"}
        >
          {isMuted ? <VolumeX size={20} className="text-gray-400" /> : <Volume2 size={20} className="text-white" />}
        </button>
        
        <video autoPlay loop muted playsInline className="absolute inset-0 w-full h-full object-cover opacity-30 z-0">
          <source src="/hologram.webm" type="video/webm" />
        </video>

        <div className="absolute inset-0 z-0">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-blue-900/2 blur-[30px] rounded-full animate-pulse" />
        </div>

        {/* Main Content Card - Width Adjusts based on Step */}
        <div className={`relative z-10 w-full ${step === 'class_path' ? 'max-w-6xl' : 'max-w-lg'} space-y-1 md:space-y-3 lg:space-y-4 animate-in fade-in zoom-in duration-1000 px-2 md:px-4 py-2 md:py-0`}>
          
          <div className="text-center space-y-1 md:space-y-2">
            <h1 className="text-2xl md:text-3xl tracking-tighter text-white" style={{textShadow: '0 0 10px #3b82f6, 0 0 20px #3b82f6, 0 0 30px #3b82f6, 0 0 40px #3b82f6'}}>SYSTEM</h1>
            <p className="text-[10px] md:text-xs uppercase tracking-[0.4em] text-blue-200 opacity-60">Initial Connection Established</p>
          </div>

          <div className="tech-panel clip-tech-card tech-border-container p-3 md:p-6 lg:p-10">
            {step === 'verify' ? (
              // --- VERIFICATION FORM ---
              <div className="verification-screen animate-pulse">
                <div className="text-center mb-3">
                  <div className="inline-block mb-2">
                    <div className="w-16 h-16 mx-auto mb-3 border-2 border-blue-500 rounded-full animate-spin border-t-transparent"></div>
                  </div>
                  <h2 className="text-xl uppercase tracking-tight text-blue-400 font-black" style={{textShadow: '0 0 10px #3b82f6, 0 0 20px #3b82f6, 0 0 30px #3b82f6'}}>
                    SYSTEM VERIFICATION REQUIRED
                  </h2>
                </div>
                <p className="text-xs text-gray-400 text-center mb-3 tracking-wider">
                  Enter the 6-digit key sent to your communication device.
                </p>

                <form onSubmit={handleVerifyOTP} className="space-y-6">
                  <div>
                    <input
                      type="text"
                      value={otpToken}
                      onChange={(e) => setOtpToken(e.target.value)}
                      maxLength={6}
                      placeholder="000000"
                      className="w-full bg-black border-b-2 border-blue-500 text-center tracking-widest text-xl text-white font-ui font-bold placeholder-cyan-400/50 focus:border-cyan-400 focus:outline-none transition-colors"
                      required
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={isLoadingOTP}
                    className="w-full relative px-3 sm:px-4 font-black uppercase tracking-widest text-white bg-green-600 border-b-4 border-green-900 shadow-lg shadow-green-500/40 transition-all duration-75 hover:brightness-110 active:border-b-0 active:translate-y-[4px] clip-tech-button py-3 sm:py-4 text-[10px] sm:text-xs flex items-center justify-center gap-2 shimmer-effect group disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    VERIFY & PROCEED
                  </button>
                </form>
                <button onClick={() => setStep('register')} className="w-full mt-4 text-blue-400 hover:text-blue-300 text-sm uppercase tracking-wider transition-colors">
                  ← RECONNECT TO SYSTEM
                </button>
              </div>

            ) : step === 'avatar_customize' ? (
              <div className="space-y-4">
                <AvatarCustomizationView
                  gender={onboardingData.gender}
                  initialBaseBodyUrl={onboardingData.gender === 'Non-binary' ? onboardingData.base_body_url : undefined}
                  onComplete={(config) => {
                    setOnboardingData((prev) => ({
                      ...prev,
                      avatarLabConfig: config,
                      avatar: config.avatarUrl ?? prev.avatar,
                      base_body_url: config.baseBodyUrl ?? config.avatarUrl ?? prev.base_body_url,
                      selectedParts: config.selectedParts,
                    }));
                    setStep('class_path');
                  }}
                />
                <button onClick={() => setStep('verify')} className="w-full text-center text-cyan-400 hover:text-cyan-300 text-sm uppercase tracking-wider transition-colors">
                  ← Back
                </button>
              </div>
            ) : step === 'class_path' ? (
              // --- CLASS PATH SELECTION ---
              <div className="space-y-4">
                <div className="text-center space-y-2">
                  <div className="inline-block mb-2">
                    <div className="w-16 h-16 mx-auto mb-3 border-2 border-cyan-500 rounded-full animate-spin border-t-transparent"></div>
                  </div>
                  <h2 className="text-xl uppercase tracking-tight text-cyan-400 font-black" style={{textShadow: '0 0 10px #06b6d4, 0 0 20px #06b6d4'}}>
                    CLASS PATH SELECTION
                  </h2>
                  <p className="text-sm text-gray-400 text-center tracking-wider">
                    Choose your archetype. This determines your character's core strengths and playstyle.
                  </p>
                </div>

                {/* Class Selection Grid */}
                <div className="flex flex-row items-stretch justify-center gap-1 max-w-6xl mx-auto h-[400px] sm:h-[500px]">
                  {[
                    { id: 'Assassin', name: 'Assassin', desc: 'Precision & Speed focused. Engineered for silent execution and rapid movement.', color: 'from-purple-600/40 to-black', image: '/classes/assassin.webp', stats: { agility: 95, strength: 55, vitality: 50 }, icon: '🗡️' },
                    { id: 'Fighter', name: 'Fighter', desc: 'Intensity & Strength. Peak physical power. Balanced offensive and defensive capabilities.', color: 'from-red-600/40 to-black', image: '/classes/fighter.webp', stats: { agility: 55, strength: 95, vitality: 70 }, icon: '⚔️' },
                    { id: 'Tanker', name: 'Tanker', desc: 'Unyielding Defense. Engineered for endurance and survival. The ultimate shield.', color: 'from-blue-600/40 to-black', image: '/classes/tanker.webp', stats: { agility: 40, strength: 75, vitality: 95 }, icon: '🛡️' },
                    { id: 'Ranger', name: 'Ranger', desc: 'Perception & Range. Long-distance specialist. Master of survival and tracking.', color: 'from-orange-600/40 to-black', image: '/classes/ranger.webp', stats: { agility: 80, strength: 60, vitality: 60 }, icon: '🏹' },
                    { id: 'Mage', name: 'Mage', desc: 'Intellect & Power. Arcane energy specialist. Master of elemental control.', color: 'from-indigo-600/40 to-black', image: '/classes/mage.webp', stats: { agility: 60, strength: 40, vitality: 50 }, icon: '🔮' },
                    { id: 'Healer', name: 'Healer', desc: 'Spirit & Support. Vitality specialist. Master of life-preserving arts.', color: 'from-green-600/40 to-black', image: '/classes/healer.webp', stats: { agility: 50, strength: 45, vitality: 85 }, icon: '✨' }
                  ].map(classOption => {
                    const isSelected = onboardingData.current_class === classOption.id;
                    return (
                      <div
                        key={classOption.id}
                        onClick={() => setOnboardingData({...onboardingData, current_class: classOption.id})}
                        className={`relative transition-all duration-500 cursor-pointer overflow-hidden border border-white/10 ${
                          isSelected 
                            ? 'flex-[6] sm:flex-[5] ring-2 ring-cyan-400 shadow-[0_0_50px_rgba(6,182,212,0.6),inset_0_0_20px_rgba(6,182,212,0.4)] brightness-110' 
                            : 'flex-1 hover:flex-[1.2] grayscale opacity-60 hover:opacity-100 hover:grayscale-0'
                        }`}
                      >
                        <img src={classOption.image} alt={classOption.name} className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 hover:scale-110" />
                        <div className={`absolute inset-0 bg-gradient-to-t ${classOption.color} via-transparent to-transparent opacity-80`} />
                        
                        {!isSelected && (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <h3 className="text-lg sm:text-2xl font-header font-black text-white/40 uppercase tracking-[0.2em] rotate-180 [writing-mode:vertical-lr] text-center">
                              {classOption.name}
                            </h3>
                          </div>
                        )}

                        {isSelected && (
                          <div className="absolute inset-0 flex flex-col justify-end p-3 sm:p-8 animate-in fade-in slide-in-from-bottom-4 duration-500 bg-black/60 backdrop-blur-[1px]">
                            <div className="space-y-3 sm:space-y-4 max-w-md">
                              <div className="flex items-center gap-2 sm:gap-3">
                                <div className="bg-cyan-500 text-black p-1 sm:p-2 rounded shadow-[0_0_10px_#06b6d4]">
                                  <span className="text-xs sm:text-xl">{classOption.icon}</span>
                                </div>
                                <h3 className="text-xl sm:text-4xl font-header font-black text-white uppercase tracking-tighter" style={{ textShadow: '0 0 20px rgba(6,182,212,0.5)' }}>
                                  {classOption.name}
                                </h3>
                              </div>
                              <p className="text-[9px] sm:text-xs text-gray-200 leading-tight sm:leading-relaxed font-ui font-medium uppercase tracking-tight">
                                {classOption.desc}
                              </p>
                              
                              {/* Confirm Button */}
                              <div className="pt-4 flex justify-center">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleClassAwaken(classOption.id);
                                  }}
                                  disabled={isLoadingOTP}
                                  className="group relative px-6 py-2 sm:px-10 sm:py-3 bg-black/60 border border-cyan-500/50 hover:border-cyan-400 transition-all clip-tech-button"
                                >
                                  <div className="absolute inset-0 bg-cyan-500/10 group-hover:bg-cyan-500/20 transition-all" />
                                  <span className="relative z-10 text-[10px] sm:text-xs font-black text-white uppercase tracking-[0.2em] flex items-center gap-2">
                                    {isLoadingOTP ? 'FINALIZING...' : 'CONFIRM SELECTION'} <span className="text-cyan-400">→</span>
                                  </span>
                                </button>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
                
                {systemError && <p className="text-red-400 text-xs text-center animate-pulse">{systemError}</p>}
                
                <button
                  onClick={() => setStep('avatar_customize')}
                  className="w-full text-center text-cyan-400 hover:text-cyan-300 text-sm uppercase tracking-wider transition-colors"
                >
                  ← BACK
                </button>
              </div>

            ) : (
              // --- REGISTRATION FORM ---
              <>
                <h2 className="text-sm md:text-base uppercase tracking-tight mb-2 md:mb-3 flex items-center justify-center gap-0">
                  <img 
                    src="/exclamation.png" 
                    alt="Exclamation" 
                    className="inline animate-pulse w-13 h-13 md:w-16 md:h-16" 
                    style={{ filter: 'drop-shadow(0 0 10px rgba(59, 130, 246, 0.8))' }} 
                  />
                  <span 
                    className="text-white border border-white/50 px-3 md:px-4 bg-black/50 flex items-center justify-center whitespace-nowrap drop-shadow-[0_0_10px_rgba(59,130,246,0.8)] animate-pulse h-8 md:h-10 min-w-[100px] md:min-w-[120px]"
                  >
                    Hunter Awakens
                  </span>
                </h2>

                <form onSubmit={handleAwaken} className="space-y-3 md:space-y-6 pb-10 md:pb-0">
                  <div className="space-y-1 md:space-y-2">
                    <label className="text-[9px] md:text-[10px] font-black uppercase text-white tracking-widest ml-1">Character Name</label>
                    <input required type="text" value={onboardingData.name} onChange={(e) => setOnboardingData({...onboardingData, name: e.target.value})} placeholder="Hunter Name..." className="w-full system-glass rounded-xl px-3 sm:px-4 py-2 md:py-3 text-sm sm:text-base font-ui font-bold focus:outline-none focus:border-cyan-400 transition-colors text-white placeholder-cyan-400/50" />
                  </div>
                  <div className="space-y-1 md:space-y-2">
                    <label className="text-[9px] md:text-[10px] font-black uppercase text-white tracking-widest ml-1">Email Address <span className="text-red-400">*</span></label>
                    <input required type="email" value={onboardingData.email} onChange={(e) => setOnboardingData({...onboardingData, email: e.target.value})} placeholder="hunter@email.com" className="w-full system-glass rounded-xl px-3 sm:px-4 py-2 md:py-3 text-sm sm:text-base font-ui font-bold focus:outline-none focus:border-cyan-400 transition-colors text-white placeholder-cyan-400/50" />
                  </div>

                  <div className="space-y-1 md:space-y-2">
                    <label className="text-[9px] md:text-[10px] font-black uppercase text-gray-400 tracking-widest ml-1">Referral code (optional)</label>
                    <input type="text" value={referralCode} onChange={(e) => setReferralCode(e.target.value)} placeholder="e.g. HUNT-ABC123" className="w-full system-glass rounded-xl px-3 sm:px-4 py-2 md:py-3 text-sm sm:text-base font-ui font-bold focus:outline-none focus:border-cyan-400 transition-colors text-white placeholder-cyan-400/50" />
                    {referralCode && (
                      <div className="mt-2 p-2 md:p-3 bg-cyan-500/10 border border-cyan-500/30 rounded-xl flex flex-wrap items-center gap-2 md:gap-3">
                        <span className="text-[9px] md:text-[10px] font-black uppercase text-cyan-300 tracking-wider">Referral applied</span>
                        <span className="text-xs text-cyan-200 font-bold">{referralCode}</span>
                        <span className="flex items-center gap-2 text-[9px] md:text-[10px] text-cyan-400/80">
                          <img src="/coinicon.png" alt="Coins" className="w-3 h-3 md:w-4 md:h-4 object-contain" />
                          <span>1000 coins</span>
                          <span className="text-cyan-300/60">+</span>
                          <img src="/gemicon.png" alt="Gems" className="w-3 h-3 md:w-4 md:h-4 object-contain" />
                          <span>2 gems</span>
                        </span>
                      </div>
                    )}
                  </div>
                  
                  <div className="space-y-1 md:space-y-2">
                    <label className={`text-[9px] md:text-[10px] font-black uppercase tracking-widest ml-1 ${genderError ? 'text-red-400' : 'text-white'}`}>Gender Choice <span className="text-red-400">*</span></label>
                    {genderError && <div className="text-[8px] text-red-400 font-bold">⚠️ Please select a gender to continue</div>}
                    <div className={`grid grid-cols-3 gap-1 sm:gap-2 ${genderError ? 'ring-2 ring-red-400/50 rounded-xl p-1' : ''}`}>
                      {['Male', 'Female', 'Non-binary'].map(g => (
                        <button
                          key={g}
                          type="button"
                          onClick={() => {
                            const audio = new Audio('/sounds/clickA.mp3');
                            audio.play().catch(e => console.error("Audio play failed:", e));
                            const avatarForGender = g === 'Female' ? '/NoobWoman.png' : g === 'Non-binary' ? (onboardingData.base_body_url || '/NoobMan.png') : '/NoobMan.png';
                            // Always default to male body for NB if not set, or preserve existing if already set
                            const baseBody = g === 'Non-binary' ? (onboardingData.base_body_url || '/NoobMan.png') : '';
                            setOnboardingData({ ...onboardingData, gender: g, avatar: avatarForGender, base_body_url: baseBody });
                            setGenderError(false);
                          }}
                          className={`py-1.5 md:py-2.5 system-glass rounded-xl text-[7px] md:text-[8px] font-ui font-bold uppercase transition-all cursor-pointer ${onboardingData.gender === g ? 'text-cyan-300 border-cyan-400' : 'text-gray-400 border-gray-600 hover:border-cyan-400 hover:text-cyan-300'}`}
                        >
                          {g}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Avatar Preview with T-Shirt */}
                  <div className="flex justify-center mt-2 md:mt-4 mb-2 md:mb-6">
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 relative">
                      <div className="w-24 h-24 md:w-40 md:h-40 flex items-center justify-center rank-plasma-container rounded-full overflow-hidden">
                        <div className="relative w-20 h-20 md:w-36 md:h-36 rounded-full overflow-hidden">
                          <img
                            src={onboardingData.avatar || '/NoobMan.png'}
                            alt="Avatar"
                            className="absolute inset-0 w-full h-full object-cover animate-pulse-fade-in-out"
                            style={{ zIndex: 1 }}
                          />
                          <img
                            src={onboardingData.gender === 'Female' || (onboardingData.gender === 'Non-binary' && onboardingData.base_body_url === '/NoobWoman.png') ? '/White T-Shirt (F).png' : '/White T-Shirt (Unisex).png'}
                            alt="White T-Shirt"
                            className="absolute inset-0 w-full h-full object-contain animate-pulse-fade-in-out"
                            style={{ zIndex: 10 }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {systemError && <p className="text-red-400 text-[10px] text-center animate-pulse">{systemError}</p>}
                  {hunterNameError && <p className="text-red-400 text-[10px] text-center animate-pulse">{hunterNameError}</p>}

                  <button
                    type="submit"
                    disabled={isLoadingOTP || !onboardingData.name.trim() || !onboardingData.email?.trim() || !onboardingData.gender || (onboardingData.gender === 'Non-binary' && !onboardingData.base_body_url)}
                    className="w-full relative px-4 py-3 md:py-4 font-black uppercase tracking-widest text-white bg-blue-600 border-b-4 border-blue-900 shadow-lg shadow-blue-500/40 transition-all duration-75 hover:brightness-110 active:border-b-0 active:translate-y-[4px] clip-tech-button text-[10px] md:text-xs flex items-center justify-center gap-2 shimmer-effect group disabled:opacity-50"
                  >
                    {isLoadingOTP ? 'CONNECTING...' : 'ENTER THE GATE'}
                    <Skull size={14} className="opacity-0 group-hover:opacity-100 group-active:opacity-100 transition-opacity duration-200" />
                  </button>

                </form>
              </>
            )}
          </div>

          {step === 'register' && (
            <div className="mt-4 md:mt-6 flex flex-col items-center gap-4 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-300">
              <div className="flex items-center justify-center gap-2">
                <span className="text-[10px] text-gray-400 uppercase tracking-widest">Already Awakened?</span>
                <button
                  type="button"
                  onClick={() => window.location.href = '/login'}
                  className="text-[10px] font-black uppercase tracking-widest bg-gradient-to-r from-blue-400 to-blue-600 bg-clip-text text-transparent hover:from-blue-300 hover:to-blue-500 transition-all"
                >
                  Login & Re-Awaken
                </button>
              </div>
            </div>
          )}
        </div>
    </div>
  );
}
