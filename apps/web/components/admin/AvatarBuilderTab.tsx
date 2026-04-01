"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { 
  Monitor
} from 'lucide-react';
import LayeredAvatar from '@/components/LayeredAvatar';
import type { User } from '@/lib/types';
import {
  HAIR_CREATOR_SWATCHES,
  DEFAULT_HAIR_TINT_HEX,
} from '@repo/avatar-constants';

// --- Shared Types ---
type PartItem = { 
  id: string | number; 
  name: string; 
  image_url: string; 
  image_base_url?: string | null;
  skin_tint_hex?: string | null;
  slot: string; 
  z_index?: number; 
  offset_x?: number; 
  offset_y?: number; 
  scale?: number; 
  file?: File;
  onboarding_available?: boolean;
  gender?: string | string[];
  price?: number;
  grip_type?: string | null;
};

// --- Constants ---
const FIXED_BASES: PartItem[] = [
  { id: 'default_male', name: 'Male Base', image_url: '/NoobMan.png', slot: 'base_body', gender: 'male' },
  { id: 'default_female', name: 'Female Base', image_url: '/NoobWoman.png', slot: 'base_body', gender: 'female' },
];

const CREATOR_SLOTS = [
  { id: 'avatar', label: 'Avatars' },
  { id: 'base_body', label: 'Base Body' },
  { id: 'face_eyes', label: 'Eyes' },
  { id: 'face_mouth', label: 'Mouth' },
  { id: 'hair', label: 'Hair' },
  { id: 'face', label: 'Face Accessories' },
  { id: 'body', label: 'Body/Armor' },
] as const;

const CREATOR_SLOT_IDS = CREATOR_SLOTS.map((s) => s.id);

const PART_SLOTS = ["face_eyes", "face_mouth", "hair", "face", "body"] as const;
const SLOT_LABELS: Record<string, string> = {
  base: "Base body",
  face_eyes: "Eyes",
  face_mouth: "Mouth",
  hair: "Hair",
  face: "Face",
  body: "Body",
};

const CANVAS_SIZE = 512;

interface AvatarBuilderTabProps {
  shopItems: any[];
}

export default function AvatarBuilderTab(props: AvatarBuilderTabProps) {
  // Asset Library: only creator-slot items that are "Show in Avatar Lab" (onboarding_available)
  const creatorShopItems = useMemo(
    () =>
      props.shopItems.filter(
        (i: any) =>
          CREATOR_SLOT_IDS.includes(i.slot) && i.onboarding_available === true
      ),
    [props.shopItems]
  );

  return (
    <div className="flex flex-col gap-6">
      {/* View Switcher Header - Simplified */}
      <div className="flex items-center justify-between bg-gray-900/50 p-3 rounded-xl border border-gray-800">
        <h2 className="text-lg font-black uppercase tracking-widest text-cyan-400 flex items-center gap-2">
          User Experience Simulator
        </h2>
        <div className="flex bg-gray-800 rounded-lg p-1">
          <div className="flex items-center gap-2 px-4 py-2 rounded-md text-xs font-bold uppercase bg-purple-600 text-white shadow-lg">
            <Monitor size={14} /> User Simulator
          </div>
        </div>
      </div>

      <SimulatorView shopItems={creatorShopItems} />
    </div>
  );
}

// ==========================================
// 1. THE SIMULATOR VIEW (Mirrors Avatar Lab)
// ==========================================
function partGenderStr(part: PartItem): string {
  const raw = part.gender;
  if (typeof raw === "string") return raw.trim().toLowerCase();
  if (Array.isArray(raw) && raw.length > 0) return String(raw[0]).trim().toLowerCase();
  return "";
}

function partMatchesBaseGender(part: PartItem, baseGender: string): boolean {
  const g = partGenderStr(part);
  if (!g) return true;
  if (baseGender === "nonbinary") return g === "unisex" || g === "nonbinary" || g === "non-binary";
  return g === baseGender || g === "unisex";
}

function SimulatorView({ shopItems }: { shopItems: PartItem[] }) {
  const [gender, setGender] = useState<"Male" | "Female">("Male");

  const apiParts = useMemo(() => shopItems.filter(i => (i.onboarding_available || i.price === 0) && i.slot !== 'hand_grip'), [shopItems]);
  const apiBases = useMemo(() => shopItems.filter(i => i.slot === "avatar" || i.slot === "base_body"), [shopItems]);

  const basesList = useMemo(() => {
    const fallback = gender === "Male" ? FIXED_BASES[0] : FIXED_BASES[1];
    const g = gender === "Male" ? "male" : "female";
    const matching = apiBases.filter((b) => partMatchesBaseGender(b, g));
    return matching.length > 0 ? matching : [fallback];
  }, [gender, apiBases]);

  const [activeCategory, setActiveCategory] = useState<"base" | (typeof PART_SLOTS)[number]>("base");
  const [hairTintHex, setHairTintHex] = useState(DEFAULT_HAIR_TINT_HEX);
  const [selectedBaseIndex, setSelectedBaseIndex] = useState(0);
  const [selectedPartIndex, setSelectedPartIndex] = useState<Record<string, number>>(() => {
    const o: Record<string, number> = {};
    for (const slot of PART_SLOTS) o[slot] = 0;
    return o;
  });

  const selectedBase = basesList[selectedBaseIndex];

  const effectiveGender = useMemo(() => {
    const g = selectedBase?.gender;
    if (g) {
      if (Array.isArray(g)) {
        const lowerGenders = g.map(x => String(x).trim().toLowerCase());
        if (lowerGenders.includes('male')) return 'male';
        if (lowerGenders.includes('female')) return 'female';
        if (lowerGenders.some(x => x === 'nonbinary' || x === 'non-binary' || x === 'unisex')) return 'nonbinary';
      } else if (typeof g === "string" && g.trim()) {
        const lower = g.trim().toLowerCase();
        if (lower === "male" || lower === "female") return lower;
        if (lower === "nonbinary" || lower === "non-binary" || lower === "unisex") return "nonbinary";
      }
    }
    return gender === "Male" ? "male" : "female";
  }, [selectedBase, gender]);

  const partsBySlot = useMemo(() => {
    const filtered = apiParts.filter((p) => partMatchesBaseGender(p, effectiveGender));
    const out: Record<string, PartItem[]> = {};
    for (const slot of PART_SLOTS) {
      out[slot] = filtered.filter((p) => (p.slot || "").toLowerCase() === slot);
    }
    return out;
  }, [apiParts, effectiveGender]);

  useEffect(() => {
    setSelectedPartIndex((prev) => {
      let next = { ...prev };
      for (const slot of PART_SLOTS) {
        const opts = partsBySlot[slot] || [];
        const maxIdx = Math.max(0, opts.length - 1);
        const current = prev[slot] ?? 0;
        if (current > maxIdx) next = { ...next, [slot]: 0 };
      }
      return next;
    });
  }, [effectiveGender, partsBySlot]);

  const baseImage = selectedBase?.image_url || (gender === "Female" ? "/NoobWoman.png" : "/NoobMan.png");
  const baseSilhouetteUrl = selectedBase && 'image_base_url' in selectedBase ? (selectedBase as PartItem).image_base_url : undefined;
  const baseTintHex = selectedBase && 'skin_tint_hex' in selectedBase ? (selectedBase as PartItem).skin_tint_hex : undefined;

  const currentOptions: PartItem[] = activeCategory === "base" ? basesList : (partsBySlot[activeCategory] || []);
  const currentSelectionIndex = activeCategory === "base" ? selectedBaseIndex : (selectedPartIndex[activeCategory] ?? 0);

  const handleSelectOption = (index: number) => {
    if (activeCategory === "base") setSelectedBaseIndex(index);
    else setSelectedPartIndex((prev) => ({ ...prev, [activeCategory]: index }));
  };

  const equippedCosmetics = useMemo(() => {
    const list: any[] = [];
    
    // Add selected base to cosmetics list
    if (selectedBase) {
      list.push({ shop_items: selectedBase, equipped: true });
    }

    PART_SLOTS.forEach(slot => {
      const idx = selectedPartIndex[slot] ?? 0;
      const item = partsBySlot[slot]?.[idx];
      if (item && item.image_url) {
        const shop_items =
          slot === 'hair' ? { ...item, skin_tint_hex: hairTintHex } : item;
        list.push({ shop_items, equipped: true });
      }
    });
    return list.sort((a, b) => (Number(a.shop_items.z_index ?? 1) - Number(b.shop_items.z_index ?? 1)));
  }, [selectedPartIndex, partsBySlot, selectedBase, hairTintHex]);

  const syntheticUser: User = useMemo(() => ({
    id: "sim-preview", name: "Preview", hunter_name: "Preview",
    avatar_url: baseImage,
    base_body_url: baseImage,
    base_body_silhouette_url: baseSilhouetteUrl || undefined,
    base_body_tint_hex: baseTintHex && baseTintHex.trim() ? baseTintHex.trim() : '#FFDBAC',
    hair_tint_hex: hairTintHex,
    exp: 0, coins: 0, gems: 0, level: 1, skill_points: 0, rank: "E", slotsUsed: 0,
    inventory: [], equipped: {}, submittedIds: [], completedDungeons: [],
    cosmetics: equippedCosmetics
  }), [baseImage, baseSilhouetteUrl, baseTintHex, hairTintHex, equippedCosmetics]);

  return (
    <div className="bg-black text-white flex flex-col items-center justify-center p-8 rounded-xl border border-gray-800 min-h-[600px]">
      <div className="mb-4 flex gap-4">
        <button onClick={() => setGender("Male")} className={`px-4 py-2 rounded font-bold uppercase ${gender === "Male" ? "bg-cyan-600" : "bg-gray-800 text-gray-400"}`}>Test Male</button>
        <button onClick={() => setGender("Female")} className={`px-4 py-2 rounded font-bold uppercase ${gender === "Female" ? "bg-cyan-600" : "bg-gray-800 text-gray-400"}`}>Test Female</button>
      </div>

      <div className="w-full max-w-lg tech-panel rounded-xl border border-cyan-500/30 bg-gray-900/60 p-6 space-y-4">
        <h2 className="text-center text-xl uppercase tracking-[0.4em] text-cyan-400 font-black">USER SIMULATOR</h2>

        <div className="flex justify-center my-6">
          <div className="relative w-56 h-56 sm:w-72 sm:h-72 rounded-lg overflow-hidden border-2 border-cyan-500/50 shadow-[0_0_20px_rgba(6,182,212,0.3)] bg-black/30">
            <LayeredAvatar user={syntheticUser} size={288} className="rounded-lg" hideBackground breathing={false} />
          </div>
        </div>

        <div className="flex flex-wrap gap-1 justify-center border-b border-gray-700 pb-2">
          <button onClick={() => setActiveCategory("base")} className={`px-2 py-2 rounded-lg text-[10px] font-bold uppercase ${activeCategory === "base" ? "bg-cyan-600 text-white" : "bg-gray-800 text-gray-400"}`}>Base</button>
          {PART_SLOTS.map(slot => (
            <button key={slot} onClick={() => setActiveCategory(slot)} className={`px-2 py-2 rounded-lg text-[10px] font-bold uppercase ${activeCategory === slot ? "bg-cyan-600 text-white" : "bg-gray-800 text-gray-400"}`}>{SLOT_LABELS[slot]}</button>
          ))}
        </div>

        {activeCategory === 'hair' && (
          <div className="space-y-1 pb-2 border-b border-gray-700">
            <p className="text-[10px] font-bold uppercase tracking-wider text-cyan-400/90">Hair color</p>
            <div className="flex flex-wrap gap-2 justify-center">
              {HAIR_CREATOR_SWATCHES.map(({ hex, label }) => (
                <button
                  key={hex}
                  type="button"
                  title={label}
                  onClick={() => setHairTintHex(hex)}
                  className={`w-8 h-8 rounded-full border-2 transition-all ${
                    hairTintHex === hex ? 'border-purple-400 ring-2 ring-purple-500/50' : 'border-cyan-500/50'
                  }`}
                  style={{ backgroundColor: hex }}
                />
              ))}
            </div>
          </div>
        )}

        <div className="py-4">
          <div className="flex flex-wrap justify-center gap-4 max-h-[280px] overflow-y-auto p-2">
            {currentOptions.map((item, index) => {
              const isSelected = index === currentSelectionIndex;
              const hasImage = !!item.image_url;
              const glowClass = isSelected ? "border-purple-500 shadow-[0_0_20px_rgba(168,85,247,0.6)]" : "border-cyan-500/50 shadow-[0_0_10px_rgba(6,182,212,0.3)] hover:border-cyan-400";
              const bgClass = isSelected ? "bg-purple-900/30" : "bg-gray-900/50 hover:bg-cyan-900/20";
              return (
                <button
                  key={item.id ?? `opt-${activeCategory}-${index}`}
                  type="button"
                  onClick={() => handleSelectOption(index)}
                  className={`relative w-20 h-20 sm:w-24 sm:h-24 rounded-xl border-2 p-2 transition-all duration-300 overflow-hidden ${glowClass} ${bgClass} ${isSelected ? "scale-105 z-10" : "scale-100"}`}
                  aria-pressed={isSelected}
                  aria-label={item.name}
                >
                  <div className="w-full h-full rounded-lg overflow-hidden flex items-center justify-center bg-gray-800/50">
                    {(item.slot !== 'avatar' && (item.slot === 'base_body' || item.image_base_url || item.slot === 'hair')) ? (
                      <div className="relative w-full h-full" style={{ isolation: 'isolate' }}>
                        {/* Tinted fill layer */}
                        {(item.image_base_url || item.image_url) && (
                          <div
                            className="absolute inset-0 w-full h-full"
                            style={{
                              backgroundColor:
                                item.slot === 'hair' ? (hairTintHex || '#5D4037') : (item.skin_tint_hex || '#FFDBAC'),
                              WebkitMaskImage: `url(${item.image_base_url || item.image_url})`,
                              maskImage: `url(${item.image_base_url || item.image_url})`,
                              WebkitMaskSize: 'contain',
                              maskSize: 'contain',
                              WebkitMaskPosition: 'center',
                              maskPosition: 'center',
                              WebkitMaskRepeat: 'no-repeat',
                              maskRepeat: 'no-repeat'
                            }}
                          />
                        )}
                        {/* Detail / outline layer */}
                        {item.image_url && (
                          <img 
                            src={item.image_url} 
                            alt="" 
                            className={`absolute inset-0 w-full h-full object-contain z-10 ${isSelected ? "opacity-100" : "opacity-70 hover:opacity-100"}`}
                            style={{ mixBlendMode: 'multiply' }}
                          />
                        )}
                      </div>
                    ) : hasImage ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={item.image_url} alt="" className={`w-full h-full object-cover ${isSelected ? "opacity-100" : "opacity-70 hover:opacity-100"}`} />
                    ) : (
                      <span className="text-[10px] font-bold uppercase text-cyan-700">{item.name || "—"}</span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="text-center text-[10px] text-gray-500">
          This is exactly what the user will see during onboarding.
        </div>
      </div>
    </div>
  );
}