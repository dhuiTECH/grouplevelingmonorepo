"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { Smartphone, Loader2 } from "lucide-react";
import SpriteAnimation from "../components/SpriteAnimation";

export default function LandingPage() {
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
      <section className="relative w-full aspect-[9/16] md:aspect-auto md:h-[700px] overflow-hidden">
        {/* Background Assets Layer */}
        <div className="absolute inset-0 z-0" style={{ isolation: "isolate" }}>
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
                  className="absolute inset-0 w-full h-full object-contain scale-[1.025] -translate-y-[-7.7%] translate-x-[4.9%]"
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
                  className="absolute bottom-[-24.8%] right-[0.090%] w-[60%] h-[80%] object-contain mix-blend-screen scale-[1.7] origin-bottom-right translate-x-[9.9px]"
                  style={{ zIndex: 10 }}
                />
              )}
            </>
          )}

          {/* 3. Gradient overlay for text readability */}
          <div
            className="absolute inset-0 bg-gradient-to-b from-slate-900/60 via-transparent to-slate-900/90 md:bg-gradient-to-b md:from-transparent md:via-transparent md:to-slate-900/90"
            style={{ zIndex: 20 }}
          />
        </div>

        {/* Logo at Top Center (UI Layer) */}
        <div className="absolute -top-14 md:-top-20 left-0 right-0 z-20 flex justify-center">
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
        <div className="relative z-10 container mx-auto px-4 h-full flex flex-col justify-between items-center md:items-start pt-36 pb-8 md:justify-center md:pt-20 text-center md:text-left">
          {/* Top Section: Title */}
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
            className="max-w-2xl w-full flex flex-col items-center md:items-start mb-6 md:mb-4"
          >
            <h1 className="text-2xl md:text-4xl lg:text-5xl font-black uppercase tracking-tight leading-tight system-glow-text drop-shadow-[0_4px_4px_rgba(0,0,0,0.8)]">
              <span className="block">Your Fitness Journey,</span>
              <span className="block mt-1 md:mt-2">Your RPG Adventure!</span>
            </h1>
            <p className="mt-3 md:mt-4 text-sm md:text-base font-semibold text-white/95 max-w-[90%] md:max-w-xl text-center md:text-left drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] leading-relaxed md:ml-1">
            Not just another boring fitness app. Track calories, crush weight loss goals, and level up your hero. Join thousands of heroes already leveling up.
            </p>
          </motion.div>

          {/* Bottom Section: Buttons & Waitlist */}
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
              <div className="relative w-full max-w-sm">
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
                        : "Your Email + Exclusive Reward"
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
                      "JOIN WAITLIST"
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
        </div>

        {/* Desktop Sprite Animation - Positioned absolutely relative to Hero Section */}
        <div className="hidden md:block absolute bottom-[0%] left-[40%] z-30 pointer-events-none">
            <div className="pointer-events-auto scale-[2] origin-bottom">
                <SpriteAnimation />
            </div>
        </div>
      </section>

      {/* 
        FEATURE GRID SECTION 
        - Single wide container style
        - Top/Bottom borders
        - Anchor: #features (e.g. /testingpage#features)
      */}
      <section
        id="features"
        className="relative w-full bg-white border-y-4 border-cyan-400 py-6 scroll-mt-20"
      >
        <div className="px-4 md:px-6 max-w-[1600px] mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 items-start mt-10">
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

// Reusable Feature Card Component
function FeatureCard({
  imageSrc,
  title,
  description,
  delay,
}: {
  imageSrc: string;
  title: string;
  description: string;
  delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6, delay }}
      className="flex flex-col items-center h-full scale-[1.02] origin-center"
    >
      {/* Fixed-height image area so all 4 cards align on same baseline */}
      <div className="relative w-full h-40 sm:h-44 md:h-52 flex-shrink-0 mb-4 transition-transform hover:scale-[1.02] duration-300">
        <Image
          src={imageSrc}
          alt={title}
          fill
          className="object-contain drop-shadow-sm"
        />
      </div>

      {/* Text – dark blue, centered */}
      <div className="text-center px-2 flex-grow flex flex-col justify-start">
        <h3 className="text-xl md:text-2xl font-bold text-slate-800 mb-2 min-h-[3rem] flex items-center justify-center">
          {title}
        </h3>
        <p className="text-slate-600 font-semibold text-sm md:text-base leading-snug">
          {description}
        </p>
      </div>
    </motion.div>
  );
}
