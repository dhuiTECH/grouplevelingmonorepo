"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function SignupPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/');
  }, [router]);

  return (
    <div className="min-h-screen bg-[#050b14] flex items-center justify-center p-4">
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-blue-900/5 blur-[120px] rounded-full animate-pulse" />
      </div>
      <p className="relative z-10 text-cyan-400/80 text-sm uppercase tracking-widest">Redirecting to sign up…</p>
    </div>
  );
}