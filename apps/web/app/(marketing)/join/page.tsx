"use client";

import { useEffect, useState, Suspense, FormEvent } from "react";
import { useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import LayeredAvatar from "@/components/LayeredAvatar";
import SystemWindow from "@/components/SystemWindow";
import { User } from "@/lib/types";

function JoinPageContent() {
  const searchParams = useSearchParams();

  const [referralCode, setReferralCode] = useState<string | null>(null);
  const [inviter, setInviter] = useState<User | null>(null);
  const [loadingInviter, setLoadingInviter] = useState(false);

  const [waitlistEmail, setWaitlistEmail] = useState("");
  const [isJoiningWaitlist, setIsJoiningWaitlist] = useState(false);
  const [waitlistSuccess, setWaitlistSuccess] = useState(false);
  const [waitlistError, setWaitlistError] = useState<string | null>(null);

  // Capture ref from URL and persist to localStorage
  useEffect(() => {
    const code = searchParams.get("ref");

    if (typeof window === "undefined") return;

    if (code) {
      localStorage.setItem("referral_code", code);
      setReferralCode(code);
    } else {
      const stored = localStorage.getItem("referral_code");
      if (stored) {
        setReferralCode(stored);
      }
    }
  }, [searchParams]);

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

  const handleJoinWaitlist = async (e: FormEvent) => {
    e.preventDefault();

    if (!waitlistEmail || !waitlistEmail.includes("@")) {
      setWaitlistError("Invalid email");
      return;
    }

    setIsJoiningWaitlist(true);
    setWaitlistError(null);

    try {
      const response = await fetch("/api/waitlist/ios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: waitlistEmail,
          hunter_name: null,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setWaitlistSuccess(true);
        setTimeout(() => {
          setWaitlistSuccess(false);
          setWaitlistEmail("");
        }, 4000);
      } else {
        console.error("Waitlist failed:", data);
        setWaitlistError(data.error || "Failed");
      }
    } catch (error) {
      console.error("Waitlist error:", error);
      setWaitlistError("Error");
    } finally {
      setIsJoiningWaitlist(false);
    }
  };

  const windowTitle = referralCode ? "REFERRAL TERMINAL" : "COMING SOON";

  return (
    <div className="min-h-screen relative overflow-hidden bg-[#020817] text-cyan-100 flex items-center justify-center p-4 py-16">
      <div className="pointer-events-none absolute inset-0 z-0">
        <div className="absolute -top-32 -left-32 w-80 h-80 bg-cyan-500/10 blur-3xl rounded-full" />
        <div className="absolute bottom-0 right-0 w-[28rem] h-[28rem] bg-sky-500/10 blur-3xl rounded-full" />
        <div className="absolute inset-0 bg-gradient-to-b from-cyan-500/5 via-transparent to-purple-700/10" />
        <div className="absolute inset-0 bg-grid-mesh opacity-20 mix-blend-soft-light" />
      </div>

      <div className="relative z-10 w-full max-w-2xl">
        <SystemWindow title={windowTitle} className="w-full">
          <div className="flex flex-col items-center text-center px-2 sm:px-0">
            {inviter ? (
              <div className="mb-8 flex flex-col items-center">
                <div className="relative group">
                  <div className="absolute -inset-1 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-2xl blur opacity-30 group-hover:opacity-60 transition duration-1000" />
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
                  <div className="flex flex-wrap items-center justify-center gap-2 mt-1">
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
                  {loadingInviter ? (
                    <div className="w-12 h-12 rounded-full border-2 border-slate-700 animate-pulse bg-slate-800/50" />
                  ) : (
                    <span className="text-lg font-mono font-bold text-cyan-400/90 tracking-wider px-2 text-center break-all">
                      {referralCode}
                    </span>
                  )}
                </div>
                <p className="text-[10px] uppercase tracking-[0.35em] text-cyan-400/70 mb-1">
                  Referral code linked
                </p>
                <p className="text-[11px] text-slate-400 max-w-xs leading-relaxed">
                  Keep this device or save your code—you&apos;ll use it at signup so your rewards lock in.
                </p>
              </div>
            ) : null}

            <div className="mb-8 w-full">
              <p className="text-[10px] uppercase tracking-[0.35em] text-cyan-400/80 mb-2 font-bold">
                iOS &amp; Android
              </p>
              <h1 className="text-3xl sm:text-4xl font-black tracking-tight uppercase text-white leading-tight">
                Coming <span className="text-cyan-400 drop-shadow-[0_0_20px_rgba(34,211,238,0.6)]">Soon</span>
              </h1>
              <p className="mt-4 text-slate-400 text-xs sm:text-sm tracking-wide max-w-md mx-auto font-medium leading-relaxed">
                Join the email list to get notified at launch and claim a{" "}
                <span className="text-amber-300/95 font-semibold">$20 bonus reward</span> for early supporters.
              </p>
            </div>

            <div className="w-full bg-cyan-500/5 border border-cyan-500/20 rounded-2xl p-5 mb-6 relative overflow-hidden text-left">
              <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 blur-3xl rounded-full -mr-16 -mt-16 pointer-events-none" />
              <p className="relative z-10 text-[11px] sm:text-xs text-slate-300 leading-relaxed mb-4">
                <span className="text-amber-300 font-black uppercase tracking-wide text-sm block mb-1">
                  List bonus — $20 value
                </span>
                We&apos;ll email you when the Hunter System app is ready. Subscribing here reserves your launch bonus.
              </p>
              <div className="relative z-10 flex flex-col sm:flex-row items-center justify-center gap-5 sm:gap-8 pt-4 border-t border-cyan-500/15">
                <div className="flex flex-col items-center">
                  <div className="flex items-center gap-2 mb-1">
                    <img src="/coinicon.png" alt="" className="w-7 h-7 object-contain" />
                    <span className="text-2xl font-black text-yellow-400">1000</span>
                  </div>
                  <span className="text-[9px] uppercase tracking-widest text-yellow-400/60 font-bold">Coins</span>
                </div>
                <div className="hidden sm:block h-9 w-px bg-cyan-500/20" />
                <div className="flex flex-col items-center">
                  <div className="flex items-center gap-2 mb-1">
                    <img src="/gemicon.png" alt="" className="w-7 h-7 object-contain" />
                    <span className="text-2xl font-black text-blue-400">2</span>
                  </div>
                  <span className="text-[9px] uppercase tracking-widest text-blue-400/60 font-bold">Gems</span>
                </div>
              </div>
              <p className="relative z-10 mt-4 text-[9px] uppercase tracking-[0.15em] text-cyan-300/50 font-bold text-center">
                * In-game starter pack when you register with your referral link
              </p>
            </div>

            <form
              onSubmit={handleJoinWaitlist}
              className={`w-full max-w-md flex flex-col sm:flex-row items-stretch sm:items-center gap-2 rounded-2xl sm:rounded-full p-1.5 border border-white/20 bg-black/50 backdrop-blur-md transition-all duration-300 ${
                waitlistSuccess ? "ring-2 ring-green-400/80" : ""
              }`}
            >
              <input
                type="email"
                value={waitlistEmail}
                onChange={(e) => {
                  setWaitlistEmail(e.target.value);
                  setWaitlistError(null);
                }}
                placeholder={waitlistError ? waitlistError : "Email for launch + $20 bonus"}
                disabled={isJoiningWaitlist || waitlistSuccess}
                className="bg-transparent border-none text-xs sm:text-sm font-semibold px-3 py-3 sm:py-2 focus:outline-none w-full text-white placeholder:text-slate-500 rounded-xl sm:rounded-none"
              />
              <button
                type="submit"
                disabled={isJoiningWaitlist || waitlistSuccess}
                className={`rounded-xl sm:rounded-full px-5 min-h-[44px] sm:min-h-0 sm:h-[38px] flex items-center justify-center transition-all duration-300 shrink-0 font-black uppercase text-[11px] tracking-wide ${
                  waitlistSuccess
                    ? "bg-green-600 text-white"
                    : "bg-gradient-to-r from-blue-600 to-cyan-600 text-white hover:from-blue-500 hover:to-cyan-500"
                }`}
              >
                {isJoiningWaitlist ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : waitlistSuccess ? (
                  "On the list"
                ) : (
                  "Notify me"
                )}
              </button>
            </form>

            <p className="mt-5 text-[9px] text-slate-500 uppercase tracking-[0.25em] max-w-sm mx-auto leading-relaxed">
              No spam—launch updates and how to redeem your bonus when the app goes live.
            </p>
          </div>
        </SystemWindow>
      </div>

      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-8 opacity-20 whitespace-nowrap pointer-events-none">
        <div className="h-px w-12 sm:w-24 bg-gradient-to-r from-transparent to-cyan-500" />
        <span className="text-[8px] uppercase tracking-[1em] text-cyan-400 font-black">Hunter System</span>
        <div className="h-px w-12 sm:w-24 bg-gradient-to-l from-transparent to-cyan-500" />
      </div>
    </div>
  );
}

export default function JoinPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#020817] flex items-center justify-center">
          <p className="text-cyan-400/80 text-sm uppercase tracking-widest">Loading…</p>
        </div>
      }
    >
      <JoinPageContent />
    </Suspense>
  );
}
