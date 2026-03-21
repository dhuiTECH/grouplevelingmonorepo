"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";
import SpriteAnimation from "@/components/SpriteAnimation";
import SystemWindow from "@/components/SystemWindow";
import FeatureCard from "@/components/marketing/FeatureCard";

export default function LandingPageClient() {
  // Waitlist State
  const [isWaitlistFormVisible, setIsWaitlistFormVisible] = useState(false);
  const [waitlistEmail, setWaitlistEmail] = useState("");
  const [isJoiningWaitlist, setIsJoiningWaitlist] = useState(false);
  const [waitlistSuccess, setWaitlistSuccess] = useState(false);
  const [waitlistError, setWaitlistError] = useState<string | null>(null);

  // Mobile Detection
  const [isMobile, setIsMobile] = useState<boolean | null>(null);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);

    return () => {
      window.removeEventListener("resize", checkMobile);
    };
  }, []);

  const handleJoinWaitlist = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();

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
          hunter_name: null, // Optional
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setWaitlistSuccess(true);
        setTimeout(() => {
          setIsWaitlistFormVisible(false);
          setWaitlistSuccess(false);
          setWaitlistEmail("");
        }, 3000);
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
    <div className="min-h-screen bg-slate-900 font-sans text-white overflow-x-hidden">
      {/* 
        HERO SECTION 
        - Mobile: hero-banner-mobile.webp + lightning sword.mp4 (9:16)
        - Desktop: hero-banner.webp + Lightningsword_1.webm
      */}
      <section className="relative z-20 w-full aspect-[9/16] md:aspect-auto md:h-[800px]">
        {/* Background Assets Layer */}
        <div className="absolute inset-0 z-0 overflow-hidden" style={{ isolation: "isolate" }}>
          {/* 1. Background Image */}
          <picture>
            <source
              media="(max-width: 767px)"
              srcSet="/website/hero-banner-mobile.webp"
            />
            <img
              src="/website/hero-banner.webp"
              alt="Group Leveling Hero"
              className="absolute inset-0 w-full h-full object-cover object-center md:object-top"
              style={{ zIndex: 0 }}
            />
          </picture>

          {/* 2. Video Overlay */}
          {isMobile !== null && (
            <>
              {isMobile ? (
                <video
                  autoPlay
                  muted
                  loop
                  playsInline
                  style={{ mixBlendMode: "screen", zIndex: 10, opacity: 0.6 }}
                  className="absolute inset-0 w-full h-full object-contain scale-[1.02] -translate-y-[-7.7%] translate-x-[4.9%]"
                >
                  <source
                    src="/website/lightning%20sword.mp4"
                    type='video/mp4; codecs="hvc1"'
                  />
                  <source
                    src="/website/lightning%20sword.mp4"
                    type="video/mp4"
                  />
                </video>
              ) : (
                <video
                  src="/website/Lightningsword_1.webm"
                  autoPlay
                  muted
                  loop
                  playsInline
                  className="absolute top-[39.5%] right-[0.090%] w-[60%] h-[560px] object-contain mix-blend-screen scale-[1.7] origin-bottom-right translate-x-[9.9px]"
                  style={{ zIndex: 10 }}
                />
              )}
            </>
          )}

          {/* 3. Smooth cinematic gradient fade for background only */}
          <div
            className="absolute bottom-0 left-0 right-0 h-[150px] md:h-[300px] bg-gradient-to-t from-slate-950 via-slate-950/80 to-transparent pointer-events-none"
            style={{ zIndex: 5 }}
          />
        </div>

        {/* Logo at Top Center (UI Layer) */}
        <div className="absolute -top-14 md:-top-20 left-0 right-0 z-50 flex justify-center">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="relative w-[55%] max-w-[400px] h-48 md:w-[650px] md:h-80"
          >
            <Image
              src="/website/groupleveling-logo.png"
              alt="Group Leveling Logo"
              fill
              className="object-contain drop-shadow-[0_0_5px_rgba(255,255,255,0.6)]"
              priority
            />
          </motion.div>
        </div>

        {/* Hero Content (UI Layer) */}
        <div className="relative z-40 container mx-auto px-4 h-full flex flex-col justify-between items-center md:items-start pt-28 pb-16 md:pb-8 md:justify-center md:pt-20 text-center md:text-left">
          <SystemWindow className="max-w-2xl mt-2 md:mt-12">
            {/* Top Section: Title */}
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
              className="max-w-2xl w-full flex flex-col items-center md:items-start mb-2 md:mb-4"
            >
              <h1 className="text-base md:text-3xl lg:text-[36px] font-black tracking-tight leading-[1.15] system-glow-text drop-shadow-[0_4px_4px_rgba(0,0,0,0.8)]">
                Your Daily Walk Has Been Converted into an RPG Quest.
              </h1>
              <h2 className="mt-1 md:mt-5 text-[10px] md:text-base font-semibold text-white/95 max-w-[95%] md:max-w-xl text-center md:text-left drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] leading-relaxed md:ml-1">
                Join thousands of heroes already leveling up. Traverse a fantasy world with every step and log your fitness and calories to power your hero&apos;s journey.
              </h2>
            </motion.div>

            {/* Bottom Section: Buttons & Waitlist (Desktop Only inside SystemWindow) */}
            {isMobile === false && (
              <HeroButtons
                handleJoinWaitlist={handleJoinWaitlist}
                waitlistEmail={waitlistEmail}
                setWaitlistEmail={setWaitlistEmail}
                setWaitlistError={setWaitlistError}
                waitlistError={waitlistError}
                waitlistSuccess={waitlistSuccess}
                isJoiningWaitlist={isJoiningWaitlist}
              />
            )}
          </SystemWindow>

          {/* Bottom Section: Buttons & Waitlist (Mobile Only outside SystemWindow) */}
          {isMobile === true && (
            <div className="mt-8 w-full">
              <HeroButtons
                handleJoinWaitlist={handleJoinWaitlist}
                waitlistEmail={waitlistEmail}
                setWaitlistEmail={setWaitlistEmail}
                setWaitlistError={setWaitlistError}
                waitlistError={waitlistError}
                waitlistSuccess={waitlistSuccess}
                isJoiningWaitlist={isJoiningWaitlist}
              />
            </div>
          )}
        </div>

        {/* Desktop Sprite Animation - Positioned absolutely relative to Hero Section */}
        <div className="hidden md:block absolute top-[82%] left-[45%] z-50 pointer-events-none">
          <div className="pointer-events-auto scale-[2] origin-bottom translate-y-[20px]">
            <SpriteAnimation />
          </div>
        </div>
      </section>

      {/* 
        FEATURE GRID SECTION 
        - Anchor: #features for deep links
      */}
      <section
        id="features"
        className="relative z-10 w-full bg-slate-950 py-20 scroll-mt-20"
      >
        <div className="px-4 md:px-6 max-w-[1600px] mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 items-start">
            {/* CARD 1: Track & Convert */}
            <FeatureCard
              imageSrc="/website/feature-track.png"
              title="Track & Convert"
              description="Track/Journal Your Daily Steps, Activity, Gym, Running turn into Rewards, Gold and XP!"
              delay={0.1}
            />

            {/* CARD 2: Diet & Level Up */}
            <FeatureCard
              imageSrc="/website/feature-diet.png"
              title="Diet & Level Up"
              description="You Can Lose Weight Logging Nutrition And Stay Consistent With AI Analysis for Rewards!"
              delay={0.2}
            />

            {/* CARD 3: Socialize & Quest */}
            <FeatureCard
              imageSrc="/website/feature-social.png"
              title="Socialize & Quest"
              description="You Can Join Guilds, Catch Cute Pets, Co-op Dungeon Quest With Friends & Compete!"
              delay={0.3}
            />

            {/* CARD 4: Avatar + Pet Customization */}
            <FeatureCard
              imageSrc="/website/feature-customize.png"
              title="Avatar/Pet Styling"
              description="Express Your Style And Your Pet With Over 100+ Unique Gear, Hairstyle, Outfits"
              delay={0.4}
            />
          </div>
        </div>
      </section>

      {/* Footer / Socials Bar */}
      <footer className="w-full bg-slate-900 border-t border-cyan-900 py-8">
        <div className="container mx-auto px-4 flex flex-col items-center justify-center text-center">
          <div className="flex space-x-6 mb-4">
            {/* Social Icons Placeholder */}
            <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-slate-900 font-bold">
              f
            </div>
            <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-slate-900 font-bold">
              X
            </div>
            <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-slate-900 font-bold">
              O
            </div>
            <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-slate-900 font-bold">
              Y
            </div>
          </div>
          <p className="text-slate-400 text-sm">
            © 2024 Group Leveling. All Rights Reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}

// Reusable Hero Buttons Component
function HeroButtons({
  handleJoinWaitlist,
  waitlistEmail,
  setWaitlistEmail,
  setWaitlistError,
  waitlistError,
  waitlistSuccess,
  isJoiningWaitlist,
}: {
  handleJoinWaitlist: (e: React.FormEvent) => Promise<void>;
  waitlistEmail: string;
  setWaitlistEmail: (email: string) => void;
  setWaitlistError: (error: string | null) => void;
  waitlistError: string | null;
  waitlistSuccess: boolean;
  isJoiningWaitlist: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 50 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, delay: 0.2 }}
      className="flex flex-col items-center md:items-start gap-6 w-full"
    >
      <div className="flex flex-col items-center md:items-start justify-center gap-6 md:gap-8 w-full">
        {/* Mobile Sprite Animation */}
        <div className="md:hidden w-full flex justify-center mb-[-20px] z-10 pointer-events-none">
          <div className="pointer-events-auto scale-90 origin-bottom">
            <SpriteAnimation />
          </div>
        </div>

        {/* Top: Waitlist */}
        <div className="relative w-full max-sm:max-w-[280px] max-w-sm">
          <form
            onSubmit={handleJoinWaitlist}
            className={`flex items-center gap-2 rounded-full p-1 border border-white/20 bg-black/60 backdrop-blur-md transition-all duration-500 animate-in fade-in zoom-in w-full shadow-[0_0_20px_rgba(0,0,0,0.3)] ${
              waitlistSuccess ? "ring-2 ring-green-400" : ""
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
                waitlistError
                  ? waitlistError
                  : "Your Email + $20 Reward"
              }
              className="bg-transparent border-none text-xs font-semibold px-3 py-2 focus:outline-none w-full text-white placeholder-gray-400"
            />
            <button
              type="submit"
              disabled={isJoiningWaitlist || waitlistSuccess}
              className={`rounded-full px-4 h-[32px] flex items-center justify-center transition-all duration-300 shrink-0 ${
                waitlistSuccess
                  ? "bg-green-500 text-white"
                  : "bg-gradient-to-r from-blue-600 to-cyan-600 text-white text-[10px] font-black uppercase"
              }`}
            >
              {isJoiningWaitlist ? (
                <Loader2 size={14} className="animate-spin" />
              ) : waitlistSuccess ? (
                <svg
                  className="w-4 h-4 text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={4}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              ) : (
                "JOIN CLOSED BETA"
              )}
            </button>
          </form>
        </div>

        {/* Middle: Buttons and Icon */}
        <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 md:gap-6 w-full">
          <div className="flex items-center gap-4 flex-1 max-w-[340px] md:max-w-none md:flex-initial">
            <motion.div className="relative overflow-hidden group grayscale opacity-70 hover:opacity-100 hover:grayscale-0 transition-all duration-300 transform hover:scale-105 w-[160px]">
              <div className="bg-black/80 backdrop-blur-sm border border-white/20 rounded-xl px-4 py-2 flex items-center gap-2 h-14 relative shadow-lg hover:border-cyan-400/50">
                <div className="w-6 h-6 relative shrink-0">
                  <Image
                    src="/website/applelogo.png"
                    alt="Apple Logo"
                    fill
                    className="object-contain"
                  />
                </div>
                <div className="flex flex-col items-start leading-none">
                  <span className="text-[8px] text-gray-400 uppercase font-bold tracking-tight">
                    Download on the
                  </span>
                  <span className="text-sm font-black text-white tracking-tight">
                    App Store
                  </span>
                </div>
                <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-[1px]">
                  <span className="text-white font-black text-[8px] uppercase tracking-widest border border-white/30 bg-black/60 px-2 py-0.5 -rotate-3">
                    COMING SOON
                  </span>
                </div>
              </div>
            </motion.div>

            <motion.div className="relative overflow-hidden group grayscale opacity-70 hover:opacity-100 hover:grayscale-0 transition-all duration-300 transform hover:scale-105 w-[160px]">
              <div className="bg-black/80 backdrop-blur-sm border border-white/20 rounded-xl px-4 py-2 flex items-center gap-2 h-14 relative shadow-lg hover:border-green-400/50">
                <div className="w-6 h-6 relative shrink-0">
                  <Image
                    src="/website/playstorelogo.png"
                    alt="Play Store Logo"
                    fill
                    className="object-contain"
                  />
                </div>
                <div className="flex flex-col items-start leading-none">
                  <span className="text-[8px] text-gray-400 uppercase font-bold tracking-tight">
                    GET IT ON
                  </span>
                  <span className="text-sm font-black text-white tracking-tight">
                    Google Play
                  </span>
                </div>
                <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-[1px]">
                  <span className="text-white font-black text-[8px] uppercase tracking-widest border border-white/30 bg-black/60 px-2 py-0.5 -rotate-3">
                    COMING SOON
                  </span>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
