'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Trophy, ArrowLeft } from 'lucide-react';
import { signInWithOTP, stabilizeConnection } from '@/app/actions/auth';

export default function LoginPage() {
  const router = useRouter();
  const [step, setStep] = useState<'credentials' | 'otp'>('credentials');
  const [isLoading, setIsLoading] = useState(false);
  const [identifier, setIdentifier] = useState(''); // Can be email or hunter_name
  const [otpToken, setOtpToken] = useState('');
  const [error, setError] = useState('');
  const [characterData, setCharacterData] = useState<{name: string, email: string, gender: string, currentClass: string} | null>(null);

  const handleSendLoginOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    if (!identifier.trim()) {
      setError('Please enter your email or hunter name');
      setIsLoading(false);
      return;
    }

    try {
      // First verify the profile exists
      const response = await fetch(`/api/user?email=${encodeURIComponent(identifier)}&name=${encodeURIComponent(identifier)}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        setError(errorData.message || 'Profile not found. Please check your email or hunter name.');
        setIsLoading(false);
        return;
      }

      const data = await response.json();
      const profile = data.user;

      if (!profile) {
        setError('Profile not found. Please check your email or hunter name.');
        setIsLoading(false);
        return;
      }

      if (!profile.email) {
        setError('This profile does not have an email address associated. Please contact support.');
        setIsLoading(false);
        return;
      }

      // Store character data for the verification step
      setCharacterData({
        name: profile.hunter_name || profile.name,
        email: profile.email,
        gender: profile.gender || 'Male', // Default to Male if not set
        currentClass: profile.current_class || 'None' // Add this line
      });

      // Send OTP to the profile's email
      const formData = new FormData();
      formData.append('email', profile.email);
      formData.append('characterName', profile.hunter_name || profile.name);

      const result = await signInWithOTP(formData);

      if (result.error) {
        setError(`Failed to send login code: ${result.error}`);
        setIsLoading(false);
        return;
      }

      console.log('✅ Login OTP sent to:', profile.email);
      setStep('otp');
      setIsLoading(false);

    } catch (err) {
      console.error('Send OTP error:', err);
      setError('Failed to send login code. Please try again.');
      setIsLoading(false);
    }
  };

  const handleVerifyLoginOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    if (!otpToken || otpToken.length !== 6) {
      setError('Please enter a valid 6-digit code');
      setIsLoading(false);
      return;
    }

    if (!characterData) {
      setError('Session expired. Please start over.');
      setIsLoading(false);
      return;
    }

    try {
      // Verify the OTP with stored character data
      const formData = new FormData();
      formData.append('email', characterData.email);
      formData.append('token', otpToken);
      formData.append('characterName', characterData.name);
      formData.append('gender', characterData.gender);
      formData.append('current_class', characterData.currentClass);

      const result = await stabilizeConnection(formData);

      if (result.error) {
        setError(`Invalid verification code: ${result.error}`);
        setIsLoading(false);
        return;
      }

      // Success! The stabilizeConnection function already created/updated the profile
      // We need to get the profile ID from the result or look it up
      const profileResponse = await fetch(`/api/user?email=${encodeURIComponent(characterData.email)}`);
      if (profileResponse.ok) {
        const profileData = await profileResponse.json();
        const profile = profileData.user;

      if (profile && typeof window !== 'undefined') {
        localStorage.setItem('current_hunter_id', profile.id);
        localStorage.setItem('hunter_id', profile.id);
      }
      }

      console.log('✅ Login successful for hunter:', characterData.name);

      // Redirect to dashboard (now at /login)
      router.push('/login');

    } catch (err) {
      console.error('OTP verification error:', err);
      setError('Verification failed. Please try again.');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-blue-400 flex flex-col items-center justify-center p-8 font-mono relative overflow-hidden">
      {/* Background video */}
      <video
        autoPlay
        loop
        muted
        playsInline
        className="absolute inset-0 w-full h-full object-cover opacity-30 z-0"
      >
        <source src="/hologram.webm" type="video/webm" />
      </video>
      {/* Background effects */}
      <div className="absolute inset-0 z-0">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-blue-900/2 blur-[30px] rounded-full animate-pulse" />
      </div>

      {/* Back button */}
      <button
        onClick={() => router.push('/')}
        className="absolute top-6 left-6 flex items-center gap-2 text-gray-400 hover:text-white transition-colors z-10"
      >
        <ArrowLeft size={18} />
        Back
      </button>

      {/* Login Form */}
      <div className="relative z-10 w-full max-w-lg space-y-8 animate-in fade-in zoom-in duration-1000">
        <div className="text-center space-y-2">
          <h1 className="text-4xl tracking-tighter text-white" style={{textShadow: '0 0 10px #3b82f6, 0 0 20px #3b82f6, 0 0 30px #3b82f6, 0 0 40px #3b82f6'}}>HUNTER LOGIN</h1>
          <p className="text-xs uppercase tracking-[0.4em] text-blue-200 opacity-60">Reestablish Connection</p>
        </div>

        <div className="tech-panel clip-tech-card tech-border-container p-10">
          {step === 'credentials' ? (
            // Step 1: Enter credentials
            <>
              <div className="text-center mb-6">
                <h2 className="text-lg uppercase tracking-tight text-blue-400 mb-2">
                  Enter Your Credentials
                </h2>
                <p className="text-xs text-gray-400">
                  We'll send a verification code to your email
                </p>
              </div>

              <form onSubmit={handleSendLoginOTP} className="space-y-6">
            <div>
              <label className="block text-xs font-black uppercase text-gray-300 mb-2">
                Email or Hunter Name
              </label>
              <input
                type="text"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                required
                className="w-full system-glass rounded px-4 py-3 text-white font-ui font-bold placeholder-cyan-400/50 focus:border-cyan-400 focus:outline-none transition-colors"
                placeholder="hunter@email.com or YourHunterName"
              />
              <p className="text-[10px] text-gray-500 mt-1">Enter your email address or hunter name</p>
            </div>

            {error && (
              <div className="text-red-400 text-sm text-center bg-red-900/20 border border-red-800 rounded p-3">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full relative px-4 font-black uppercase tracking-widest text-white bg-blue-600 border-b-4 border-blue-900 shadow-lg shadow-blue-500/40 transition-all duration-75 hover:brightness-110 active:border-b-0 active:translate-y-[4px] clip-tech-button py-4 text-xs flex items-center justify-center gap-2 shimmer-effect group disabled:opacity-50 disabled:cursor-not-allowed disabled:active:translate-y-0 disabled:active:border-b-4"
            >
                  {isLoading ? 'Sending Code...' : 'Send Login Code'}
                </button>
              </form>
            </>
          ) : (
            // Step 2: Enter OTP
            <>
              <div className="text-center mb-6">
                <h2 className="text-lg uppercase tracking-tight text-blue-400 mb-2">
                  Enter Verification Code
                </h2>
                <p className="text-xs text-gray-400 mb-4">
                  We've sent a 6-digit code to your email
                </p>
                <div className="text-sm text-cyan-400 font-bold mb-2">
                  Welcome back, Hunter {characterData?.name}
                </div>
                <div className="text-xs text-gray-500">
                  Email: {characterData?.email}
                </div>
              </div>

              <form onSubmit={handleVerifyLoginOTP} className="space-y-6">
                <div>
                  <input
                    type="text"
                    value={otpToken}
                    onChange={(e) => setOtpToken(e.target.value)}
                    maxLength={6}
                    placeholder="000000"
                    className="w-full bg-black border-b-2 border-blue-500 text-center tracking-widest text-2xl text-white font-ui font-bold placeholder-cyan-400/50 focus:border-cyan-400 focus:outline-none transition-colors"
                    required
                  />
                </div>

                {error && (
                  <div className="text-red-400 text-sm text-center bg-red-900/20 border border-red-800 rounded p-3">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full relative px-4 font-black uppercase tracking-widest text-white bg-green-600 border-b-4 border-green-900 shadow-lg shadow-green-500/40 transition-all duration-75 hover:brightness-110 active:border-b-0 active:translate-y-[4px] clip-tech-button py-4 text-xs flex items-center justify-center gap-2 shimmer-effect group disabled:opacity-50 disabled:cursor-not-allowed disabled:active:translate-y-0 disabled:active:border-b-4"
                >
                  {isLoading ? 'Verifying...' : 'Verify & Login'}
            </button>
          </form>

              <button
                onClick={() => {
                  setStep('credentials');
                  setOtpToken('');
                  setError('');
                }}
                className="w-full mt-4 text-blue-400 hover:text-blue-300 text-sm uppercase tracking-wider transition-colors"
              >
                ← Back to Credentials
              </button>
            </>
          )}

          <div className="mt-6 pt-6 border-t border-gray-700">
            <p className="text-xs text-gray-400 text-center mb-3">New Hunter?</p>
            <button
              onClick={() => router.push('/signup')}
              className="w-full py-2 text-blue-400 hover:text-blue-300 text-sm uppercase tracking-wider transition-colors"
            >
              Create New Account →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
