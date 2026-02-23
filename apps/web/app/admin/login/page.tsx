"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Lock, Loader2, ArrowLeft } from 'lucide-react';

export default function AdminLoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  // Redirect if already logged in
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        console.log('✅ Already have a session, redirecting to admin...');
        router.push('/admin');
      }
    });
  }, [router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (!supabase) {
      setError('Supabase client not initialized');
      setLoading(false);
      return;
    }

    try {
      // Sign in with Supabase Auth
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        // Check if session exists even if error (sometimes happens with auto-refresh)
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          console.log('✅ Admin authenticated via existing session');
          router.push('/admin');
          return;
        }
        setError(authError.message);
        setLoading(false);
        return;
      }

      if (!data.user) {
        setError('Login failed - no user returned');
        setLoading(false);
        return;
      }

      // Successfully authenticated with Supabase Auth
      // If you can authenticate, you're an admin - no profile check needed
      console.log('✅ Admin authenticated via Supabase Auth');
      console.log('Auth User ID:', data.user.id);
      console.log('Auth User Email:', data.user.email);

      // Success - redirect to admin dashboard
      router.push('/admin');
    } catch (err: any) {
      console.error('Login error:', err);
      setError(err.message || 'An error occurred during login');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-red-400 flex flex-col items-center justify-center p-8 font-mono relative overflow-hidden">
      <div className="absolute inset-0 z-0 opacity-20">
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-red-900 via-transparent to-transparent animate-pulse" />
      </div>

      {/* Back Button */}
      <div className="fixed top-4 left-4 z-50">
        <button
          onClick={() => router.push('/')}
          className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm font-bold flex items-center gap-2 transition-all"
        >
          <ArrowLeft size={18} />
          Back to Game
        </button>
      </div>

      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-black italic tracking-tighter text-red-500 drop-shadow-[0_0_10px_rgba(239,68,68,0.6)] mb-2">
            ADMIN ACCESS
          </h1>
          <div className="h-px w-full bg-red-900 mb-4" />
          <p className="text-xs uppercase tracking-[0.4em] font-bold text-red-200 opacity-70">
            System Authentication
          </p>
        </div>

        <div className="tech-panel clip-tech-card tech-border-container p-8 border-red-500/40">
          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-red-400 tracking-widest ml-1">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="admin@hunter-system.com"
                className="w-full system-glass rounded px-4 py-3 text-sm font-ui font-bold focus:outline-none focus:border-red-400 transition-colors text-white placeholder-red-400/50"
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-red-400 tracking-widest ml-1">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="Enter password"
                className="w-full system-glass rounded px-4 py-3 text-sm font-ui font-bold focus:outline-none focus:border-red-400 transition-colors text-white placeholder-red-400/50"
                disabled={loading}
              />
            </div>

            {error && (
              <div className="bg-red-900/20 border border-red-500/40 clip-tech-button p-3">
                <p className="text-xs font-bold text-red-400">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full relative px-4 font-black uppercase tracking-widest text-white bg-red-600 border-b-4 border-red-900 shadow-lg shadow-red-500/40 transition-all duration-75 hover:brightness-110 active:border-b-0 active:translate-y-[4px] clip-tech-button py-4 text-xs flex items-center justify-center gap-2 shimmer-effect group disabled:opacity-50 disabled:cursor-not-allowed disabled:active:translate-y-0 disabled:active:border-b-4"
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin" size={16} />
                  Authenticating...
                </>
              ) : (
                <>
                  <Lock size={16} />
                  Enter Admin Portal
                </>
              )}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-red-900/30">
            <p className="text-[9px] text-red-400 text-center uppercase tracking-widest font-bold">
              Admin access requires Supabase Auth credentials
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

