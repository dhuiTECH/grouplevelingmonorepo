import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { PawPrint, UtensilsCrossed } from "lucide-react";
import PhoneFrame from "@/components/marketing/features/PhoneFrame";
import MarketingSubfooter from "@/components/marketing/MarketingSubfooter";
import {
  marketingContainerClass,
  marketingLeadClass,
  marketingMainClass,
  marketingTitleClass,
  marketingWideClass,
} from "@/components/marketing/marketingDoc";
import { DEFAULT_OG_IMAGE, SITE_NAME } from "@/lib/site";

const title = `Features | ${SITE_NAME}`;
const description =
  "Walk the real world as your RPG map, collect and evolve pets, style your hunter, log meals for buffs, and team up in guilds for boss raids.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/features" },
  openGraph: {
    title,
    description,
    url: "/features",
    siteName: SITE_NAME,
    type: "website",
    images: [{ url: DEFAULT_OG_IMAGE, width: 1200, height: 630, alt: title }],
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
    images: [DEFAULT_OG_IMAGE],
  },
};

/** Empty slot inside phone mockups — swap for your own assets later. */
function PhSlot({ className = "" }: { className?: string }) {
  return (
    <div
      className={`rounded-sm border border-dashed border-gl-primary/20 bg-gl-surface-high/30 ${className}`}
      aria-hidden
    />
  );
}

function Headline({ line1, accent }: { line1: string; accent: string }) {
  return (
    <h2 className="font-sans text-3xl font-black leading-[0.9] tracking-tighter text-white md:text-5xl lg:text-7xl">
      {line1}
      <br />
      <span className="text-gl-primary gl-glow-text">{accent}</span>
    </h2>
  );
}

function SectionLabel({
  accent,
  children,
}: {
  accent: "primary" | "secondary";
  children: ReactNode;
}) {
  const bar =
    accent === "primary" ? "bg-gl-primary" : "bg-gl-secondary";
  const text =
    accent === "primary" ? "text-gl-primary" : "text-gl-secondary";
  return (
    <div className="flex items-center gap-4">
      <span className={`h-px w-12 ${bar}`} aria-hidden />
      <span
        className={`font-sans font-bold ${text} text-[10px] uppercase tracking-[0.4em]`}
      >
        {children}
      </span>
    </div>
  );
}

export default function FeaturesPage() {
  return (
    <main className={`${marketingMainClass} font-sans selection:bg-cyan-500/30 selection:text-white`}>
      <div className={marketingContainerClass}>
        <h1 className={marketingTitleClass}>Features</h1>
        <p className={marketingLeadClass}>
          How Group Leveling turns real walks, meals, and workouts into loot, XP, pets,
          and guild co-op, an{" "}
          <strong className="font-semibold text-slate-200">independent</strong> fitness
          RPG, not the Solo Leveling brand.
        </p>
      </div>

      <div
        className={`${marketingWideClass} space-y-24 px-6 pb-24 pt-10 text-slate-200 md:space-y-48 md:px-12`}
      >
        {/* 1 — Walk to Explore */}
        <section
          aria-labelledby="feat-walk-heading"
          className="grid grid-cols-1 items-center gap-8 lg:grid-cols-2 lg:gap-20"
        >
          <div className="order-2 space-y-6 lg:order-1 lg:space-y-10">
            <div className="space-y-4">
              <SectionLabel accent="primary">Gameplay Basics</SectionLabel>
              <div id="feat-walk-heading">
                <Headline line1="WALK TO" accent="EXPLORE" />
              </div>
            </div>
            <p className="max-w-2xl text-base leading-relaxed text-slate-400">
              The real world is your game map.{" "}
              <span className="font-semibold text-cyan-300">Track steps</span> to earn
              loot, explore, fight mobs and unlock powerful skills.
            </p>
            <div className="grid grid-cols-2 gap-6">
              <div className="gl-system-border bg-gl-surface-low p-6">
                <div className="font-sans text-3xl font-black text-gl-primary gl-glow-text">
                  8,244
                </div>
                <div className="mt-1 font-sans text-[9px] uppercase tracking-[0.2em] text-gl-on-surface-variant">
                  Steps Today
                </div>
              </div>
              <div className="gl-system-border bg-gl-surface-low p-6">
                <div className="font-sans text-3xl font-black text-gl-secondary gl-glow-text">
                  +410
                </div>
                <div className="mt-1 font-sans text-[9px] uppercase tracking-[0.2em] text-gl-on-surface-variant">
                  Loot Found
                </div>
              </div>
            </div>
          </div>
          <div className="order-1 flex justify-center lg:order-2">
            <PhoneFrame>
              <div className="relative flex flex-1 flex-col overflow-hidden bg-gl-background">
                <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
                  <div
                    className="absolute inset-0 gl-map-grid-overlay opacity-30"
                    aria-hidden
                  />
                  <div className="gl-phone-scanline" aria-hidden />
                  <div className="pointer-events-none absolute inset-0 flex flex-col p-4">
                    <div className="flex items-start justify-between">
                      <div className="border border-gl-primary/30 bg-gl-surface-lowest/80 p-2 backdrop-blur-md">
                        <div className="mb-1 font-sans text-[8px] font-black uppercase text-gl-primary/60">
                          Scanning...
                        </div>
                        <div className="font-sans text-[10px] font-bold text-white">
                          CITY_GRID_A7
                        </div>
                      </div>
                      <PhSlot className="h-8 w-8 shrink-0" />
                    </div>
                    <div className="absolute left-[30%] top-[40%] animate-pulse">
                      <div className="flex h-4 w-4 items-center justify-center rounded-full border border-gl-primary bg-gl-primary/20">
                        <div className="h-1.5 w-1.5 rounded-full bg-gl-primary" />
                      </div>
                      <div className="mt-1 border border-gl-primary/20 bg-gl-surface-lowest/80 px-1 py-0.5 font-sans text-[6px] font-bold text-gl-primary">
                        LOOT_HERE
                      </div>
                    </div>
                    <div className="absolute right-[20%] top-[60%]">
                      <div className="flex h-3 w-3 rotate-45 items-center justify-center border border-gl-secondary bg-gl-secondary/10">
                        <span className="h-1 w-1 bg-gl-secondary" />
                      </div>
                      <div className="mt-1 border border-gl-secondary/20 bg-gl-surface-lowest/80 px-1 py-0.5 font-sans text-[6px] font-bold text-gl-secondary">
                        RAID_PORTAL
                      </div>
                    </div>
                    <div className="mt-auto space-y-2">
                      <div className="border border-gl-primary/20 bg-gl-surface-lowest/90 p-3 backdrop-blur-md">
                        <div className="mb-2 flex items-center justify-between">
                          <span className="font-sans text-[7px] font-bold tracking-widest text-gl-primary">
                            STEP_GOAL
                          </span>
                          <span className="font-sans text-[8px] font-black text-white">
                            82% COMPLETE
                          </span>
                        </div>
                        <div className="h-1 w-full bg-[#1b3a4b]">
                          <div className="gl-glow-primary h-full w-[82%] bg-gl-primary" />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="flex flex-col items-center border border-gl-primary/20 bg-gl-surface-lowest/90 p-2 backdrop-blur-md">
                          <span className="font-sans text-[6px] font-bold text-gl-on-surface-variant">
                            HEART_RATE
                          </span>
                          <span className="font-sans text-[10px] font-black text-white">
                            124 BPM
                          </span>
                        </div>
                        <div className="flex flex-col items-center border border-gl-primary/20 bg-gl-surface-lowest/90 p-2 backdrop-blur-md">
                          <span className="font-sans text-[6px] font-bold text-gl-on-surface-variant">
                            ALTITUDE
                          </span>
                          <span className="font-sans text-[10px] font-black text-white">
                            240 M
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex h-16 shrink-0 items-center justify-around border-t border-gl-outline bg-gl-phone-bar px-4">
                  <PhSlot className="h-6 w-6 rounded-full" />
                  <PhSlot className="h-6 w-6 rounded-full opacity-50" />
                  <div className="-mt-10 flex h-10 w-10 items-center justify-center rounded-full border-4 border-gl-surface-lowest bg-gl-primary shadow-lg">
                    <PhSlot className="h-4 w-4 rounded-full border-0 bg-gl-on-primary/30" />
                  </div>
                  <PhSlot className="h-6 w-6 rounded-full opacity-50" />
                  <PhSlot className="h-6 w-6 rounded-full opacity-50" />
                </div>
              </div>
            </PhoneFrame>
          </div>
        </section>

        {/* 2 — Catch & Evolve Pets */}
        <section
          aria-labelledby="feat-pets-heading"
          className="grid grid-cols-1 items-center gap-8 lg:grid-cols-2 lg:gap-20"
        >
          <div className="order-1 flex justify-center lg:order-1">
            <PhoneFrame>
              <div className="flex h-full flex-col bg-gl-background p-6 pb-4 pt-4">
                <div className="mb-6 flex items-center justify-between">
                  <h3 className="font-sans text-sm font-bold uppercase tracking-widest text-gl-primary">
                    Pet Kennel
                  </h3>
                  <PhSlot className="h-5 w-5 shrink-0" />
                </div>
                <div className="min-h-0 flex-1 space-y-4 overflow-y-auto pr-1">
                  <div className="gl-system-border flex flex-col items-center gap-3 bg-gl-primary/5 p-4">
                    <div className="gl-system-border flex h-24 w-24 items-center justify-center bg-gl-surface-high">
                      <PhSlot className="h-14 w-14 border-gl-primary/30" />
                    </div>
                    <div className="text-center">
                      <div className="font-sans text-[10px] font-black tracking-widest text-white">
                        CYBER_HARE
                      </div>
                      <div className="mt-0.5 font-sans text-[8px] font-bold uppercase text-gl-primary">
                        LVL 24 | EVOLVING...
                      </div>
                    </div>
                    <div className="h-1 w-full bg-gl-surface-low">
                      <div
                        className="h-full w-[65%] bg-gl-primary shadow-[0_0_8px_rgba(72,202,228,0.5)]"
                        aria-hidden
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="gl-system-border flex aspect-square flex-col items-center justify-center gap-2 bg-gl-surface-low p-2">
                      <PhSlot className="h-8 w-8" />
                      <span className="font-sans text-[7px] font-black text-white/60">
                        SPRIGGAN
                      </span>
                    </div>
                    <div className="gl-system-border flex aspect-square flex-col items-center justify-center gap-2 bg-gl-surface-low p-2">
                      <PhSlot className="h-8 w-8" />
                      <span className="font-sans text-[7px] font-black text-white/60">
                        AQUA_DROID
                      </span>
                    </div>
                    <div className="gl-system-border flex aspect-square items-center justify-center bg-gl-surface-low p-2 opacity-40">
                      <PhSlot className="h-8 w-8" />
                    </div>
                    <div className="flex aspect-square items-center justify-center border border-dashed border-gl-primary/20">
                      <PhSlot className="h-8 w-8 border-gl-primary/15" />
                    </div>
                  </div>
                </div>
                <div className="mt-4 flex justify-between border-t border-gl-primary/10 px-2 pt-4">
                  <PhSlot className="h-5 w-5 rounded-full opacity-60" />
                  <PhSlot className="h-5 w-5 rounded-full opacity-60" />
                  <PhSlot className="h-5 w-5 rounded-full border-gl-primary/40 bg-gl-primary/15" />
                  <PhSlot className="h-5 w-5 rounded-full opacity-60" />
                </div>
              </div>
            </PhoneFrame>
          </div>
          <div className="order-2 space-y-6 text-right lg:order-2 lg:space-y-10 lg:text-left">
            <div className="space-y-4">
              <div className="flex items-center justify-end gap-4 lg:justify-start">
                <span className="h-px w-12 bg-gl-primary" aria-hidden />
                <span className="font-sans font-bold text-gl-primary text-[10px] uppercase tracking-[0.4em]">
                  Companion System
                </span>
              </div>
              <div id="feat-pets-heading">
                <Headline line1="CATCH &" accent="EVOLVE PETS" />
              </div>
            </div>
            <p className="ml-auto max-w-2xl text-base leading-relaxed text-slate-400 lg:ml-0">
              Find loyal companions on your walks. Rare pets grow stronger as
              you reach your step goals and help you in battles.
            </p>
            <div className="gl-system-border ml-auto flex items-start gap-6 bg-gl-surface-high p-6 lg:ml-0">
              <div className="flex h-14 w-14 items-center justify-center border border-gl-primary/20 bg-gl-primary/10 text-gl-primary">
                <PawPrint className="h-8 w-8" />
              </div>
              <div className="text-left">
                <div className="font-sans text-lg font-bold tracking-tight text-white">
                  PET_SYNERGY
                </div>
                <div className="mt-1 text-sm leading-snug text-gl-on-surface-variant">
                  Each companion brings unique bonuses to your stats. The more
                  you walk, the faster they evolve.
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 3 — Style Your Hero */}
        <section
          aria-labelledby="feat-hero-heading"
          className="grid grid-cols-1 items-center gap-8 lg:grid-cols-2 lg:gap-20"
        >
          <div className="order-1 flex justify-center lg:order-1">
            <PhoneFrame>
              <div className="flex h-full flex-col bg-gl-background p-6 pb-4 pt-4">
                <div className="mb-6 flex items-center justify-between">
                  <h3 className="font-sans text-sm font-bold uppercase tracking-widest text-gl-primary">
                    My Hero
                  </h3>
                  <PhSlot className="h-6 w-6 shrink-0 rounded-sm" />
                </div>
                <div className="relative mb-6 flex min-h-0 flex-1 flex-col items-center justify-center gl-system-border bg-gl-surface-low p-6">
                  <div className="absolute left-4 top-4 z-10">
                    <PhSlot className="h-10 w-10" />
                  </div>
                  <div className="absolute left-4 top-16 z-10">
                    <PhSlot className="h-10 w-10" />
                  </div>
                  <div className="absolute right-4 top-4 z-10">
                    <PhSlot className="h-10 w-10 border-gl-primary/35 bg-gl-primary/10" />
                  </div>
                  <div className="flex aspect-[4/5] w-full max-w-[200px] items-center justify-center gl-system-border bg-gl-surface-high/30">
                    <PhSlot className="min-h-[120px] min-w-[100px] max-w-[85%] flex-1 border-gl-primary/15" />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="gl-system-border flex h-14 items-center justify-center bg-gl-surface-high">
                    <span className="font-sans text-[9px] font-black uppercase tracking-widest text-gl-primary">
                      Gear
                    </span>
                  </div>
                  <div className="flex h-14 items-center justify-center border border-gl-primary/10 bg-gl-surface-low opacity-40">
                    <span className="font-sans text-[9px] font-black uppercase tracking-widest text-white">
                      Pets
                    </span>
                  </div>
                  <div className="flex h-14 items-center justify-center border border-gl-primary/10 bg-gl-surface-low opacity-40">
                    <span className="font-sans text-[9px] font-black uppercase tracking-widest text-white">
                      Stats
                    </span>
                  </div>
                </div>
              </div>
            </PhoneFrame>
          </div>
          <div className="order-2 space-y-6 text-right lg:order-2 lg:space-y-10 lg:text-left">
            <div className="space-y-4">
              <div className="flex items-center justify-end gap-4 lg:justify-start">
                <span className="h-px w-12 bg-gl-primary" aria-hidden />
                <span className="font-sans font-bold text-gl-primary text-[10px] uppercase tracking-[0.4em]">
                  Customization
                </span>
              </div>
              <div id="feat-hero-heading">
                <Headline line1="STYLE YOUR" accent="HERO" />
              </div>
            </div>
            <p className="ml-auto max-w-2xl text-base leading-relaxed text-slate-400 lg:ml-0">
              Unlock gear as you get stronger. Collect legendary outfits that
              show everyone how far you&apos;ve come.
            </p>
            <div className="ml-auto grid max-w-lg grid-cols-2 gap-6 lg:ml-0">
              <div className="gl-system-border bg-gl-surface-high/50 p-6">
                <div className="font-sans text-3xl font-black text-gl-primary gl-glow-text">
                  99+
                </div>
                <div className="mt-2 font-sans text-[9px] uppercase tracking-[0.2em] text-gl-on-surface-variant">
                  Gear Items
                </div>
              </div>
              <div className="gl-system-border bg-gl-surface-high/50 p-6">
                <div className="font-sans text-3xl font-black text-gl-secondary gl-glow-text">
                  ELITE
                </div>
                <div className="mt-2 font-sans text-[9px] uppercase tracking-[0.2em] text-gl-on-surface-variant">
                  Current Rank
                </div>
              </div>
            </div>
            <div className="flex justify-end lg:justify-start">
              <Link
                href="/join"
                className="group relative inline-flex overflow-hidden px-10 py-4"
              >
                <span className="absolute inset-0 border-2 border-gl-primary bg-gl-primary/10 transition-all group-hover:bg-gl-primary/20" />
                <span className="pointer-events-none absolute left-0 top-0 h-4 w-4 border-l-2 border-t-2 border-white" />
                <span className="pointer-events-none absolute bottom-0 right-0 h-4 w-4 border-b-2 border-r-2 border-white" />
                <span className="relative font-sans text-sm font-black uppercase tracking-[0.3em] text-gl-primary">
                  Open Inventory
                </span>
              </Link>
            </div>
          </div>
        </section>

        {/* 4 — Eat to Level Up */}
        <section
          aria-labelledby="feat-eat-heading"
          className="grid grid-cols-1 items-center gap-8 lg:grid-cols-2 lg:gap-20"
        >
          <div className="order-1 flex justify-center lg:order-1">
            <PhoneFrame>
              <div className="h-full bg-gl-background p-6 pb-4 pt-4">
                <div className="mb-6 flex items-center justify-between">
                  <h3 className="font-sans text-sm font-bold uppercase tracking-widest text-gl-primary">
                    Food Log
                  </h3>
                  <PhSlot className="h-5 w-5 shrink-0" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="gl-system-border flex aspect-square flex-col items-center justify-center gap-2 bg-gl-surface-high p-4">
                    <PhSlot className="h-10 w-10" />
                    <span className="font-sans text-[10px] font-bold uppercase tracking-tighter text-white">
                      Protein Core
                    </span>
                    <span className="font-sans text-[8px] font-black text-gl-primary">
                      +30 ATK
                    </span>
                  </div>
                  <div className="gl-system-border flex aspect-square flex-col items-center justify-center gap-2 bg-gl-surface-high p-4 opacity-70">
                    <PhSlot className="h-10 w-10" />
                    <span className="font-sans text-[10px] font-bold uppercase tracking-tighter text-white">
                      Hydration
                    </span>
                    <span className="font-sans text-[8px] font-black text-gl-secondary">
                      +10 DEF
                    </span>
                  </div>
                  <div className="gl-system-border flex aspect-square flex-col items-center justify-center gap-2 bg-gl-surface-high p-4 opacity-70">
                    <PhSlot className="h-10 w-10" />
                    <span className="font-sans text-[10px] font-bold uppercase tracking-tighter text-white">
                      Vital Fruit
                    </span>
                    <span className="font-sans text-[8px] font-black text-gl-primary">
                      +15 VIT
                    </span>
                  </div>
                  <div className="flex aspect-square items-center justify-center border border-dashed border-gl-primary/20">
                    <PhSlot className="h-10 w-10" />
                  </div>
                </div>
                <div className="mt-8 space-y-4">
                  <div className="font-sans text-[10px] font-black uppercase tracking-[0.2em] text-gl-primary/60">
                    Active_Buffs
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between border-l-2 border-gl-primary bg-gl-primary/5 p-3">
                      <span className="font-sans text-[10px] font-bold text-white">
                        STRENGTH_BOOST
                      </span>
                      <span className="font-sans text-[9px] font-black text-gl-primary">
                        01:42:00
                      </span>
                    </div>
                    <div className="flex items-center justify-between border-l-2 border-gl-secondary bg-gl-secondary/5 p-3">
                      <span className="font-sans text-[10px] font-bold text-white">
                        REGEN_LINK
                      </span>
                      <span className="font-sans text-[9px] font-black text-gl-secondary">
                        04:15:22
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </PhoneFrame>
          </div>
          <div className="order-2 space-y-6 text-right lg:order-2 lg:space-y-10 lg:text-left">
            <div className="space-y-4">
              <div className="flex items-center justify-end gap-4 lg:justify-start">
                <span className="h-px w-12 bg-gl-secondary" aria-hidden />
                <span className="font-sans font-bold text-gl-secondary text-[10px] uppercase tracking-[0.4em]">
                  Power Up
                </span>
              </div>
              <div id="feat-eat-heading">
                <h2 className="font-sans text-3xl font-black leading-[0.9] tracking-tighter text-white md:text-5xl lg:text-7xl">
                  EAT TO
                  <br />
                  <span className="text-gl-secondary gl-glow-text">LEVEL UP</span>
                </h2>
              </div>
            </div>
            <p className="ml-auto max-w-2xl text-base leading-relaxed text-slate-400 lg:ml-0">
              Log meals to get buffs and boost your stats. Your nutrition is
              fuel for your character&apos;s power.
            </p>
            <div className="gl-system-border ml-auto flex max-w-lg items-start gap-6 bg-gl-surface-high p-6 lg:ml-0">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center border border-gl-secondary/20 bg-gl-secondary/10 text-gl-secondary">
                <UtensilsCrossed className="h-8 w-8" />
              </div>
              <div className="text-left">
                <div className="font-sans text-lg font-bold tracking-tight text-white">
                  MEAL_BONUS
                </div>
                <div className="mt-1 text-sm leading-snug text-gl-on-surface-variant">
                  Quickly scan your food to earn immediate XP and combat boosts
                  for your next raid.
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 5 — Team Up & Quest */}
        <section
          aria-labelledby="feat-team-heading"
          className="grid grid-cols-1 items-center gap-8 lg:grid-cols-2 lg:gap-20"
        >
          <div className="order-2 space-y-6 lg:order-1 lg:space-y-10">
            <div className="space-y-4">
              <SectionLabel accent="primary">Multiplayer Mode</SectionLabel>
              <div id="feat-team-heading">
                <h2 className="font-sans text-3xl font-black leading-[0.9] tracking-tighter text-white md:text-5xl lg:text-7xl">
                  TEAM UP &amp;
                  <br />
                  <span className="text-gl-primary gl-glow-text">QUEST</span>
                </h2>
              </div>
            </div>
            <p className="max-w-2xl text-base leading-relaxed text-slate-400">
              Don&apos;t go it alone. Join local Guilds to crush fitness goals with
              friends and defeat massive bosses by staying active together.
            </p>
            <div className="space-y-4">
              <div className="flex items-center justify-between px-2 font-sans text-[9px] uppercase tracking-[0.3em] text-gl-on-surface-variant">
                <span>Guild_Ranking</span>
                <span>Total_XP</span>
              </div>
              <div className="space-y-3">
                <div className="gl-system-border flex items-center justify-between bg-gl-surface-high/50 p-5 transition-all hover:bg-gl-surface-high">
                  <div className="flex items-center gap-4">
                    <span className="font-sans text-xl font-black text-gl-primary">
                      01
                    </span>
                    <span className="font-sans font-bold text-white">
                      SHADOW_WALKERS
                    </span>
                  </div>
                  <span className="font-sans font-black text-gl-primary">
                    12.8M
                  </span>
                </div>
                <div className="flex items-center justify-between bg-gl-surface-low p-5 opacity-50">
                  <div className="flex items-center gap-4">
                    <span className="font-sans text-xl font-black text-gl-on-surface-variant">
                      02
                    </span>
                    <span className="font-sans font-bold text-white">
                      VOID_COMMANDERS
                    </span>
                  </div>
                  <span className="font-sans font-black text-gl-on-surface-variant">
                    10.5M
                  </span>
                </div>
              </div>
            </div>
          </div>
          <div className="order-1 flex justify-center lg:order-2">
            <PhoneFrame>
              <div className="flex h-full flex-col">
                <div className="relative flex h-[45%] min-h-[200px] items-center justify-center overflow-hidden bg-gl-surface-lowest">
                  <div
                    className="absolute inset-0 z-10 bg-gradient-to-t from-gl-background to-transparent"
                    aria-hidden
                  />
                  <div className="relative z-0 flex flex-col items-center justify-center p-6 text-center">
                    <div className="mx-auto flex h-36 w-36 rotate-45 items-center justify-center border-4 border-gl-error/20 bg-gl-error/5">
                      <PhSlot className="h-16 w-16 -rotate-45 border-gl-error/25" />
                    </div>
                  </div>
                  <div className="absolute bottom-4 left-4 right-4 z-20">
                    <div className="mb-2 font-sans text-[9px] font-black uppercase tracking-[0.3em] text-gl-error">
                      Boss Battle!
                    </div>
                    <div className="h-1.5 w-full bg-[#1b3a4b]">
                      <div
                        className="h-full w-[42%] bg-gl-error shadow-[0_0_10px_#ff716c]"
                        aria-hidden
                      />
                    </div>
                    <div className="mt-1 flex justify-between">
                      <span className="font-sans text-[8px] font-bold text-gl-error">
                        HP: 42,400
                      </span>
                      <span className="font-sans text-[8px] font-bold text-gl-on-surface-variant">
                        LVL 99
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex flex-1 flex-col gap-6 bg-gl-background p-5">
                  <div className="space-y-3">
                    <div className="font-sans text-[10px] font-black uppercase tracking-[0.2em] text-gl-primary">
                      Active_Party
                    </div>
                    <div className="flex -space-x-3">
                      {[0, 1, 2].map((i) => (
                        <div
                          key={i}
                          className="flex h-12 w-12 items-center justify-center border-2 border-[#1b3a4b] bg-gl-surface-high"
                        >
                          <div
                            className="h-7 w-7 rounded border border-gl-primary/15 bg-gl-surface-lowest/40"
                            aria-hidden
                          />
                        </div>
                      ))}
                      <div className="flex h-12 w-12 items-center justify-center border-2 border-[#1b3a4b] bg-gl-primary/20 font-sans text-[10px] font-black text-gl-primary">
                        +12
                      </div>
                    </div>
                  </div>
                  <div className="gl-system-border bg-gl-primary/5 p-4">
                    <p className="font-sans text-[10px] font-medium italic leading-relaxed text-gl-primary">
                      &quot;Quest Alert: Keep walking to break the boss&apos;s
                      shield!&quot;
                    </p>
                  </div>
                </div>
              </div>
            </PhoneFrame>
          </div>
        </section>
      </div>

      <footer className="border-t border-white/10 bg-slate-900/90 py-12">
        <div className={marketingContainerClass}>
          <div className="mb-8 flex flex-wrap items-center gap-3 text-sm text-slate-500">
            <Link
              href="/privacy-policy"
              className="text-cyan-400 hover:text-cyan-300"
            >
              Privacy
            </Link>
            <span aria-hidden>·</span>
            <Link
              href="/terms-of-service"
              className="text-cyan-400 hover:text-cyan-300"
            >
              Terms
            </Link>
            <span aria-hidden>·</span>
            <Link href="/faq" className="text-cyan-400 hover:text-cyan-300">
              FAQ
            </Link>
          </div>
          <MarketingSubfooter />
          <p className="mt-6 text-sm text-slate-600">
            © {new Date().getFullYear()} Group Leveling. All rights reserved.
          </p>
        </div>
      </footer>
    </main>
  );
}
