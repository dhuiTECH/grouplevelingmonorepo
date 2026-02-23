"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import LayeredAvatar from "@/components/LayeredAvatar";
import { User } from "@/lib/types";

function JoinPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [referralCode, setReferralCode] = useState<string | null>(null);
  const [inviter, setInviter] = useState<User | null>(null);
  const [loadingInviter, setLoadingInviter] = useState(false);

  // Capture ref from URL and persist to localStorage
  useEffect(() => {
    const code = searchParams.get("ref");

    if (typeof window === "undefined") return;

    if (code) {
      localStorage.setItem("referral_code", code);
      setReferralCode(code);
    } else {
      // Fallback to any existing stored referral
      const stored = localStorage.getItem("referral_code");
      if (stored) {
        setReferralCode(stored);
      }
    }
  }, [searchParams]);

  // Fetch inviter data
  useEffect(() => {
    async function fetchInviter() {
      if (!referralCode) return;
      setLoadingInviter(true);
      try {
        const res = await fetch(`/api/social/referral/${referralCode}`);
        if (res.ok) {
          const data = await res.json();
          setInviter(data.hunter);
        }
      } catch (err) {
        console.error("Failed to fetch inviter:", err);
      } finally {
        setLoadingInviter(false);
      }
    }
    fetchInviter();
  }, [referralCode]);

  const handleBeginAwakening = () => {
    router.push("/");
  };

  return (
    <div className="min-h-screen relative overflow-hidden bg-[#020817] text-cyan-100 flex items-center justify-center p-4">
      {/* Glowing background orbs */}
      <div className="pointer-events-none absolute inset-0 z-0">
        <div className="absolute -top-32 -left-32 w-80 h-80 bg-cyan-500/10 blur-3xl rounded-full" />
        <div className="absolute bottom-0 right-0 w-[28rem] h-[28rem] bg-sky-500/10 blur-3xl rounded-full" />
        <div className="absolute inset-0 bg-gradient-to-b from-cyan-500/5 via-transparent to-purple-700/10" />
        <div className="absolute inset-0 bg-grid-mesh opacity-20 mix-blend-soft-light" />
      </div>

      <div className="relative z-10 w-full max-w-xl">
        <div className="border border-cyan-500/30 bg-black/40 backdrop-blur-xl rounded-3xl shadow-[0_0_45px_rgba(8,145,178,0.45)] overflow-hidden">
          <div className="bg-gradient-to-b from-slate-950/80 via-slate-950/90 to-slate-950/95 px-6 py-10 sm:px-10 flex flex-col items-center text-center">
            
            {/* Inviter Info */}
            {inviter ? (
              <div className="mb-8 flex flex-col items-center">
                <div className="relative group">
                  <div className="absolute -inset-1 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-2xl blur opacity-30 group-hover:opacity-60 transition duration-1000"></div>
                  <div className="relative border-2 border-cyan-500/40 rounded-2xl p-1 bg-slate-950 shadow-[0_0_25px_rgba(34,211,238,0.3)]">
                    <LayeredAvatar 
                      user={inviter} 
                      size={140} 
                      className="rounded-xl" 
                      hideBackground={false} 
                    />
                  </div>
                </div>
                <div className="mt-4">
                  <p className="text-[10px] uppercase tracking-[0.4em] text-cyan-400/70 mb-1 font-bold">
                    Summoned By
                  </p>
                  <h2 className="text-2xl font-black tracking-widest uppercase text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.4)]">
                    {inviter.name}
                  </h2>
                  <div className="flex items-center justify-center gap-2 mt-1">
                    <span className="text-[10px] text-cyan-300 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/30 uppercase tracking-tighter font-bold">
                      LVL {inviter.level}
                    </span>
                    {inviter.current_title && (
                      <span className="text-[10px] text-blue-300 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/30 uppercase tracking-tighter font-bold">
                        {inviter.current_title}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ) : referralCode ? (
              <div className="mb-8 flex flex-col items-center">
                <div className="w-[140px] h-[140px] border-2 border-slate-800 rounded-2xl bg-slate-900/50 flex items-center justify-center mb-4">
                  <div className="w-12 h-12 rounded-full border-2 border-slate-700 animate-pulse bg-slate-800/50" />
                </div>
                <p className="text-[10px] uppercase tracking-[0.35em] text-cyan-400/70 mb-1">
                   Referral Code Detected
                </p>
                <h2 className="text-xl font-black text-white uppercase tracking-widest">{referralCode}</h2>
              </div>
            ) : null}

            {/* Main Header */}
            <div className="mb-10">
              <h1 className="text-4xl sm:text-5xl font-black tracking-tight uppercase text-white leading-tight">
                Begin Your <span className="text-cyan-400 drop-shadow-[0_0_20px_rgba(34,211,238,0.6)]">Awakening</span>
              </h1>
              <p className="mt-4 text-slate-400 text-xs sm:text-sm tracking-wide max-w-sm mx-auto uppercase font-medium">
                Your journey into the Hunter System starts here. 
                Accept the contract to receive your starting bonus.
              </p>
            </div>

            {/* Bonus Box */}
            <div className="w-full bg-cyan-500/5 border border-cyan-500/20 rounded-2xl p-6 mb-8 relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/10 blur-3xl rounded-full -mr-16 -mt-16 group-hover:bg-cyan-500/20 transition-all duration-700" />
              
              <div className="relative z-10 flex flex-col sm:flex-row items-center justify-center gap-6 sm:gap-10">
                <div className="flex flex-col items-center">
                  <div className="flex items-center gap-2 mb-1">
                    <img src="/coinicon.png" alt="Coins" className="w-8 h-8 object-contain" />
                    <span className="text-3xl font-black text-yellow-400">1000</span>
                  </div>
                  <span className="text-[10px] uppercase tracking-widest text-yellow-400/60 font-bold">Coins</span>
                </div>
                
                <div className="hidden sm:block h-10 w-[1px] bg-cyan-500/20" />
                
                <div className="flex flex-col items-center">
                  <div className="flex items-center gap-2 mb-1">
                    <img src="/gemicon.png" alt="Gems" className="w-8 h-8 object-contain" />
                    <span className="text-3xl font-black text-blue-400">2</span>
                  </div>
                  <span className="text-[10px] uppercase tracking-widest text-blue-400/60 font-bold">Gems</span>
                </div>
              </div>
              
              <p className="mt-6 text-[9px] uppercase tracking-[0.2em] text-cyan-300/50 font-bold">
                * Rewards automatically credited upon registration
              </p>
            </div>

            {/* Action */}
            <button
              onClick={handleBeginAwakening}
              className="w-full group relative overflow-hidden rounded-2xl bg-cyan-400 py-5 transition-all active:scale-[0.98]"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-cyan-400 via-cyan-300 to-cyan-400 bg-[length:200%_100%] opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="relative z-10 flex items-center justify-center gap-3">
                <span className="text-slate-950 font-black uppercase tracking-[0.3em] text-sm">
                  Begin Awakening
                </span>
                <div className="h-1 w-10 bg-slate-950/30 rounded-full group-hover:bg-slate-950/50 transition-colors" />
              </div>
              <div className="absolute inset-x-0 bottom-0 h-[1px] bg-white/20" />
            </button>

            <p className="mt-6 text-[9px] text-slate-500 uppercase tracking-[0.3em]">
              Redirecting to Secure Registration Terminal
            </p>
          </div>
        </div>
      </div>
      
      {/* Footer Decoration */}
      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-8 opacity-20 whitespace-nowrap">
         <div className="h-[1px] w-12 sm:w-24 bg-gradient-to-r from-transparent to-cyan-500" />
         <span className="text-[8px] uppercase tracking-[1em] text-cyan-400 font-black">Hunter System</span>
         <div className="h-[1px] w-12 sm:w-24 bg-gradient-to-l from-transparent to-cyan-500" />
      </div>
    </div>
  );
}

export default function JoinPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#020817] flex items-center justify-center">
        <p className="text-cyan-400/80 text-sm uppercase tracking-widest">Loading…</p>
      </div>
    }>
      <JoinPageContent />
    </Suspense>
  );
}
