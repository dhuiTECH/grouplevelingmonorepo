"use client";

import { useEffect, useState, Suspense, FormEvent } from "react";
import { useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import LayeredAvatar from "@/components/LayeredAvatar";
import SystemWindow from "@/components/SystemWindow";
import MarketingSubfooter from "@/components/marketing/MarketingSubfooter";
import {
  marketingBodyClass,
  marketingContainerClass,
  marketingLabelClass,
  marketingLeadClass,
  marketingMainClass,
  marketingMutedClass,
  marketingSmallClass,
  marketingTitleClass,
} from "@/components/marketing/marketingDoc";
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

  return (
    <main className={marketingMainClass}>
      <div className={marketingContainerClass}>
        <h1 className={marketingTitleClass}>Join</h1>
        <p className={marketingLeadClass}>
          Waitlist, referral rewards, and launch bonuses for the iOS and Android app.
          We&apos;re an{" "}
          <strong className="font-semibold text-slate-200">independent</strong> fitness
          RPG.
        </p>

        <div className="mt-10">
          <SystemWindow className="w-full">
            <div className="flex flex-col items-stretch text-left">
              {inviter ? (
                <div className="mb-8 flex flex-col items-center sm:items-start">
                  <div className="relative group">
                    <div className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-500 opacity-30 blur transition duration-1000 group-hover:opacity-60" />
                    <div className="relative rounded-2xl border-2 border-cyan-500/40 bg-slate-950 p-1 shadow-[0_0_25px_rgba(34,211,238,0.3)]">
                      <LayeredAvatar
                        user={inviter}
                        size={140}
                        className="rounded-xl"
                        hideBackground={false}
                      />
                    </div>
                  </div>
                  <div className="mt-4 text-center sm:text-left">
                    <p className={`${marketingLabelClass} mb-1`}>Summoned by</p>
                    <h2 className="font-[family-name:var(--font-orbitron)] text-2xl font-bold tracking-tight text-white">
                      {inviter.name}
                    </h2>
                    <div className="mt-2 flex flex-wrap justify-center gap-2 sm:justify-start">
                      <span className="rounded border border-cyan-500/30 bg-cyan-500/10 px-2 py-0.5 text-xs font-semibold text-cyan-300">
                        Lvl {inviter.level}
                      </span>
                      {inviter.current_title && (
                        <span className="rounded border border-blue-500/30 bg-blue-500/10 px-2 py-0.5 text-xs font-semibold text-blue-300">
                          {inviter.current_title}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ) : referralCode ? (
                <div className="mb-8 flex flex-col items-center sm:items-start">
                  <div className="mb-4 flex h-[140px] w-[140px] items-center justify-center rounded-2xl border-2 border-slate-800 bg-slate-900/50">
                    {loadingInviter ? (
                      <div className="h-12 w-12 animate-pulse rounded-full border-2 border-slate-700 bg-slate-800/50" />
                    ) : (
                      <span className="break-all px-2 text-center font-mono text-base font-semibold text-cyan-400">
                        {referralCode}
                      </span>
                    )}
                  </div>
                  <p className={marketingLabelClass}>Referral code linked</p>
                  <p className={`mt-2 max-w-md ${marketingSmallClass}`}>
                    Keep this device or save your code, you&apos;ll use it at signup so
                    your rewards lock in.
                  </p>
                </div>
              ) : null}

              <div className="mb-8 w-full">
                <p className={marketingLabelClass}>iOS and Android</p>
                <h2 className="mt-2 font-[family-name:var(--font-orbitron)] text-2xl font-black tracking-tight text-white sm:text-3xl">
                  Coming{" "}
                  <span className="text-cyan-400 drop-shadow-[0_0_20px_rgba(34,211,238,0.45)]">
                    soon
                  </span>
                </h2>
                <p className={`mt-3 max-w-md ${marketingBodyClass}`}>
                  Join the email list for launch updates and a{" "}
                  <span className="font-semibold text-amber-300/95">$20 bonus reward</span>{" "}
                  for early supporters.
                </p>
              </div>

              <div className="mb-6 w-full rounded-2xl border border-cyan-500/20 bg-cyan-500/5 p-5">
                <p className={`${marketingBodyClass} mb-1 font-semibold text-amber-300`}>
                  List bonus: about $20 value
                </p>
                <p className={marketingSmallClass}>
                  We&apos;ll email you when the app is ready. Subscribing reserves your
                  launch bonus.
                </p>
                <div className="mt-5 flex flex-col items-center justify-center gap-6 border-t border-cyan-500/15 pt-5 sm:flex-row sm:gap-10">
                  <div className="flex flex-col items-center">
                    <div className="mb-1 flex items-center gap-2">
                      <img src="/coinicon.png" alt="" className="h-7 w-7 object-contain" />
                      <span className="text-2xl font-black text-yellow-400">1000</span>
                    </div>
                    <span className="text-xs font-semibold uppercase tracking-wide text-yellow-400/70">
                      Coins
                    </span>
                  </div>
                  <div className="hidden h-9 w-px bg-cyan-500/20 sm:block" />
                  <div className="flex flex-col items-center">
                    <div className="mb-1 flex items-center gap-2">
                      <img src="/gemicon.png" alt="" className="h-7 w-7 object-contain" />
                      <span className="text-2xl font-black text-blue-400">2</span>
                    </div>
                    <span className="text-xs font-semibold uppercase tracking-wide text-blue-400/70">
                      Gems
                    </span>
                  </div>
                </div>
                <p className={`mt-4 text-center ${marketingMutedClass}`}>
                  In-game starter pack when you register with your referral link.
                </p>
              </div>

              <form
                onSubmit={handleJoinWaitlist}
                className={`flex w-full max-w-md flex-col gap-2 rounded-2xl border border-white/20 bg-black/40 p-1.5 backdrop-blur-sm transition-all sm:flex-row sm:rounded-full sm:items-center ${
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
                  placeholder={
                    waitlistError ? waitlistError : "Your Email + $20 Reward"
                  }
                  disabled={isJoiningWaitlist || waitlistSuccess}
                  className="w-full rounded-xl border-none bg-transparent px-3 py-3 text-sm font-medium text-white placeholder:text-slate-500 focus:outline-none sm:rounded-none sm:py-2"
                />
                <button
                  type="submit"
                  disabled={isJoiningWaitlist || waitlistSuccess}
                  className={`flex min-h-[44px] shrink-0 items-center justify-center rounded-xl px-5 text-xs font-bold uppercase tracking-wide transition-all sm:h-[38px] sm:rounded-full ${
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

              <p className={`mt-5 max-w-md ${marketingMutedClass}`}>
                Launch updates only. We&apos;ll explain how to redeem your bonus when the
                app goes live.
              </p>
            </div>
          </SystemWindow>
        </div>

        <MarketingSubfooter />
      </div>
    </main>
  );
}

export default function JoinPage() {
  return (
    <Suspense
      fallback={
        <main className={marketingMainClass}>
          <div className={marketingContainerClass}>
            <p className={marketingBodyClass}>Loading…</p>
          </div>
        </main>
      }
    >
      <JoinPageContent />
    </Suspense>
  );
}
