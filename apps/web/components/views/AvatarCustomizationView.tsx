"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { Loader2 } from "lucide-react";
import LayeredAvatar from "@/components/LayeredAvatar";
import type { User } from "@/lib/types";
import { ShopItemMedia } from "@/components/ShopItemMedia";
import Image from "next/image"; // Assuming Next.js for optimized images
import {
  HAIR_CREATOR_SWATCHES,
  DEFAULT_HAIR_TINT_HEX,
} from "@repo/avatar-constants";

// ==========================================
// ASSET PATHS - UPDATE THESE IF NECESSARY
// ==========================================
const ASSETS = {
  // A dark stone wall texture
  bgStone: "/assets/stone-bg.jpg",
  // A transparent PNG of a glowing runic circle
  runicCircle: "/assets/runic-circle.png",
  // A texture for the glowing crystal button bar
  crystalButtonBg: "/assets/crystal-button-bg.png",
};

// ==========================================
// CONSTANTS & TYPES (Unchanged)
// ==========================================
const PART_SLOTS = ["face_eyes", "face_mouth", "hair", "face", "body"] as const;
const SLOT_LABELS: Record<string, string> = {
  base: "Base",
  face_eyes: "Eyes",
  face_mouth: "Mouth",
  hair: "Hair",
  face: "Face",
  body: "Body",
};

type OptionItem = {
  id: string | number | null;
  name: string;
  image_url?: string;
  image_base_url?: string | null;
  skin_tint_hex?: string | null;
  thumbnail_url?: string;
  slot: string;
  z_index?: number;
  offset_x?: number;
  offset_y?: number;
  scale?: number;
  gender?: string;
};

export interface AvatarLabConfig {
  avatarUrl?: string;
  baseBodyUrl?: string;
  baseBodySilhouetteUrl?: string;
  baseBodyTintHex?: string;
  hairTintHex?: string;
  baseId?: number | string;
  selectedParts?: Array<{ shop_item_id: number; slot: string }>;
}

interface AvatarCustomizationViewProps {
  gender: string;
  initialBaseBodyUrl?: string;
  onComplete: (config: AvatarLabConfig) => void;
}

export default function AvatarCustomizationView({
  gender,
  initialBaseBodyUrl,
  onComplete,
}: AvatarCustomizationViewProps) {
  // ==========================================
  // LOGIC & STATE (Unchanged from your original code)
  // ==========================================
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [apiBases, setApiBases] = useState<OptionItem[]>([]);
  const [apiParts, setApiParts] = useState<OptionItem[]>([]);
  const avatarContainerRef = useRef<HTMLDivElement>(null);
  const [avatarSize, setAvatarSize] = useState(320);

  useEffect(() => {
    const el = avatarContainerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      const w = el.clientWidth;
      const h = el.clientHeight;
      if (w && h) setAvatarSize(Math.min(w, h));
    });
    ro.observe(el);
    const w = el.clientWidth;
    const h = el.clientHeight;
    if (w && h) setAvatarSize(Math.min(w, h));
    return () => ro.disconnect();
  }, []);

  const apiGender =
    gender === "Male" ? "male" : gender === "Female" ? "female" : "nonbinary";

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetch(
      `/api/avatar/options?onboarding=true&gender=${apiGender}&all_genders=true`,
    )
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        if (data.error) {
          setError(data.error);
          setApiBases([]);
          setApiParts([]);
        } else {
          setApiBases((data.bases || []) as OptionItem[]);
          setApiParts((data.parts || []) as OptionItem[]);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err?.message || "Failed to load options");
          setApiBases([]);
          setApiParts([]);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [apiGender]);

  const basesList = useMemo((): OptionItem[] => apiBases, [apiBases]);

  const [activeCategory, setActiveCategory] = useState<
    "base" | (typeof PART_SLOTS)[number]
  >("base");
  const [selectedBaseIndex, setSelectedBaseIndex] = useState(0);
  const [skinTintHex, setSkinTintHex] = useState("#FFDBAC");
  const [hairTintHex, setHairTintHex] = useState(DEFAULT_HAIR_TINT_HEX);
  const [selectedPartIndex, setSelectedPartIndex] = useState<
    Record<string, number>
  >(() => {
    const o: Record<string, number> = {};
    for (const slot of PART_SLOTS) o[slot] = 0;
    return o;
  });

  useEffect(() => {
    if (loading || basesList.length < 1) return;
    if (
      (gender === "Non-binary" || gender === "Female") &&
      initialBaseBodyUrl === "/NoobWoman.png"
    ) {
      const femaleIndex = basesList.findIndex(
        (b) => (b as OptionItem & { gender?: string }).gender === "female",
      );
      setSelectedBaseIndex(femaleIndex >= 0 ? femaleIndex : 0);
    }
  }, [loading, gender, initialBaseBodyUrl, basesList]);

  useEffect(() => {
    if (basesList.length > 0 && selectedBaseIndex >= basesList.length) {
      setSelectedBaseIndex(basesList.length - 1);
    }
  }, [basesList.length, selectedBaseIndex]);

  const selectedBase = basesList[selectedBaseIndex];

  useEffect(() => {
    const base = selectedBase as OptionItem | undefined;
    const tint = base?.skin_tint_hex && String(base.skin_tint_hex).trim();
    setSkinTintHex(tint || "#FFDBAC");
  }, [selectedBase]);

  const effectiveGender = useMemo(() => {
    const g = (selectedBase as OptionItem & { gender?: string })?.gender;
    if (typeof g === "string" && g.trim()) {
      const lower = g.trim().toLowerCase();
      if (lower === "male" || lower === "female") return lower;
      if (lower === "nonbinary" || lower === "non-binary" || lower === "unisex")
        return "nonbinary";
    }
    return apiGender;
  }, [selectedBase, apiGender]);

  const partsBySlot = useMemo(() => {
    const partGenderStr = (
      part: OptionItem & { gender?: string | string[] },
    ) => {
      const raw: unknown = part.gender;
      if (typeof raw === "string") return raw.trim().toLowerCase();
      if (Array.isArray(raw) && raw.length > 0)
        return String(raw[0]).trim().toLowerCase();
      return "";
    };
    const partMatchesBaseGender = (
      part: OptionItem & { gender?: string | string[] },
      baseGender: string,
    ) => {
      const g = partGenderStr(part);
      if (!g) return true;
      if (baseGender === "nonbinary")
        return g === "unisex" || g === "nonbinary" || g === "non-binary";
      return g === baseGender || g === "unisex";
    };
    const filtered = apiParts.filter((p) =>
      partMatchesBaseGender(
        p as OptionItem & { gender?: string | string[] },
        effectiveGender,
      ),
    );
    const out: Record<string, OptionItem[]> = {};

    // Special "None" option ONLY for face accessories in Avatar Lab
    const noneFaceOption: OptionItem = {
      id: null,
      name: "None",
      slot: "face",
      image_url: undefined,
    };

    for (const slot of PART_SLOTS) {
      const items = filtered.filter(
        (p) => (p.slot || "").toLowerCase() === slot,
      );

      if (slot === "face") {
        out[slot] = [noneFaceOption, ...items];
      } else {
        out[slot] = items;
      }
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

  const baseImage =
    selectedBase?.image_url ||
    (gender === "Female" ? "/NoobWoman.png" : "/NoobMan.png");
  const baseSilhouetteUrl = (selectedBase as OptionItem)?.image_base_url;
  const hasSilhouette = !!baseSilhouetteUrl;

  const currentOptions: OptionItem[] =
    activeCategory === "base" ? basesList : partsBySlot[activeCategory] || [];
  const currentSelectionIndex =
    activeCategory === "base"
      ? selectedBaseIndex
      : (selectedPartIndex[activeCategory] ?? 0);

  const handleSelectOption = (index: number) => {
    if (activeCategory === "base") {
      setSelectedBaseIndex(index);
    } else {
      setSelectedPartIndex((prev) => ({ ...prev, [activeCategory]: index }));
    }
  };

  const equippedCosmetics = useMemo(() => {
    const list: Array<{
      id: string;
      shop_items: OptionItem;
      equipped: boolean;
    }> = [];
    for (const slot of PART_SLOTS) {
      const idx = selectedPartIndex[slot] ?? 0;
      const opts = partsBySlot[slot] || [];
      const item = opts[idx];
      if (
        item &&
        item.id != null &&
        (item.image_url || (item as any).image_url)
      ) {
        const raw = item as OptionItem;
        const shop_items =
          slot === "hair"
            ? { ...raw, skin_tint_hex: hairTintHex }
            : raw;
        list.push({
          id: `preview-${slot}-${item.id}`,
          shop_items: shop_items as any,
          equipped: true,
        });
      }
    }
    return list.sort(
      (a, b) =>
        Number(a.shop_items.z_index ?? 1) - Number(b.shop_items.z_index ?? 1),
    );
  }, [selectedPartIndex, partsBySlot, hairTintHex]);

  const syntheticUser: User = useMemo(
    () => ({
      id: "onboarding-preview",
      name: "Preview",
      hunter_name: "Preview",
      avatar_url: baseImage,
      base_body_url: baseImage,
      base_body_silhouette_url: hasSilhouette ? baseSilhouetteUrl : undefined,
      base_body_tint_hex: hasSilhouette ? skinTintHex : undefined,
      hair_tint_hex: hairTintHex,
      exp: 0,
      coins: 0,
      gems: 0,
      level: 1,
      skill_points: 0,
      rank: "E",
      slotsUsed: 0,
      inventory: [],
      cosmetics: equippedCosmetics,
      equipped: {},
      submittedIds: [],
      completedDungeons: [],
    }),
    [baseImage, baseSilhouetteUrl, hasSilhouette, skinTintHex, hairTintHex, equippedCosmetics],
  );

  const handleFinalize = () => {
    const selectedParts: Array<{ shop_item_id: number; slot: string }> = [];
    for (const slot of PART_SLOTS) {
      const idx = selectedPartIndex[slot] ?? 0;
      const opts = partsBySlot[slot] || [];
      const item = opts[idx];
      if (item && item.id != null && typeof item.id === "number") {
        selectedParts.push({ shop_item_id: item.id, slot });
      }
    }
    const baseId =
      selectedBase?.id != null &&
      (typeof selectedBase.id === "number" ||
        typeof selectedBase.id === "string") &&
      selectedBase.id !== "default_male" &&
      selectedBase.id !== "default_female"
        ? selectedBase.id
        : undefined;
    onComplete({
      avatarUrl: baseImage,
      baseBodyUrl: baseImage,
      baseBodySilhouetteUrl: hasSilhouette ? baseSilhouetteUrl : undefined,
      baseBodyTintHex: hasSilhouette ? skinTintHex : undefined,
      hairTintHex,
      baseId,
      selectedParts: selectedParts.length ? selectedParts : undefined,
    });
  };

  // ==========================================
  // RENDER
  // ==========================================

  if (loading) {
    return (
      // Using the stone background for loading screen too
      <div
        className="min-h-screen flex flex-col items-center justify-center p-4 font-sans bg-cover bg-center relative"
        style={{ backgroundImage: `url(${ASSETS.bgStone})` }}
      >
        {/* Dark overlay */}
        <div className="absolute inset-0 bg-black/70" />
        <div className="relative z-10 flex flex-col items-center">
          <Loader2 className="w-12 h-12 text-cyan-400 animate-spin drop-shadow-[0_0_10px_rgba(6,182,212,0.8)]" />
          <p className="text-cyan-300 mt-4 font-bold tracking-widest drop-shadow-[0_0_5px_rgba(6,182,212,0.5)]">
            INITIALIZING AVATAR LAB...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen bg-black flex flex-col items-center pt-4 p-4 relative overflow-y-auto font-sans bg-cover bg-center"
      style={{ backgroundImage: `url(${ASSETS.bgStone})` }}
    >
      <div className="absolute inset-0 bg-[#050a14]/80 mix-blend-overlay pointer-events-none" />

      <div className="relative z-10 w-full max-w-lg rounded-3xl bg-[#0c1423]/40 p-4 flex flex-col flex-1 min-h-0 shadow-[0_0_40px_rgba(0,247,255,0.3),inset_0_0_20px_rgba(0,247,255,0.1)] backdrop-blur-md">
        {/* Title — unchanged: Hunter Processing + exclamation */}
        <h2 className="text-base uppercase tracking-tight mb-4 flex items-center justify-center gap-0 shrink-0">
          <img
            src="/exclamation.png"
            alt=""
            className="inline animate-pulse"
            style={{
              width: "64px",
              height: "64px",
              filter:
                "drop-shadow(0 0 10px rgba(59, 130, 246, 0.8)) drop-shadow(0 0 20px rgba(59, 130, 246, 0.6)) drop-shadow(0 0 30px rgba(59, 130, 246, 0.4))",
            }}
          />
          <span
            className="text-white border border-white/50 px-4 bg-black/50 flex items-center justify-center whitespace-nowrap drop-shadow-[0_0_10px_rgba(59,130,246,0.8)] animate-pulse"
            style={{ height: "40px", width: "fit-content", minWidth: "120px" }}
          >
            HUNTER PROCESSING
          </span>
        </h2>

        {error && (
          <p className="text-amber-400 text-sm text-center font-bold drop-shadow-md shrink-0">
            Could not load some options. Using defaults.
          </p>
        )}

        {/* Avatar fills screen — square sized to viewport */}
        <div className="flex-1 min-h-0 flex items-center justify-center w-full">
          <div
            ref={avatarContainerRef}
            className="rounded-2xl overflow-hidden bg-transparent relative shrink-0"
            style={{
              width: "min(90vw, calc(90vh - 320px), 520px)",
              aspectRatio: "1",
            }}
          >
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-[130%] h-[130%] relative opacity-60">
                <Image
                  src={ASSETS.runicCircle}
                  alt=""
                  fill
                  className="object-contain animate-[spin_60s_linear_infinite]"
                />
              </div>
            </div>
            <div className="absolute inset-0 flex items-center justify-center">
              <LayeredAvatar
                user={syntheticUser}
                size={avatarSize}
                className="rounded-lg"
                hideBackground
              />
            </div>
          </div>
        </div>

        {/* Category Tabs — 2 rows: Base, Eyes, Mouth | Hair, Face, Body */}
        <div className="grid grid-cols-3 gap-x-3 gap-y-2 border-b border-cyan-500/30 py-2 pb-3 shrink-0 justify-items-stretch items-stretch">
          <CategoryButton
            label={SLOT_LABELS["base"]}
            isActive={activeCategory === "base"}
            onClick={() => setActiveCategory("base")}
          />
          {PART_SLOTS.map((slot) => (
            <CategoryButton
              key={slot}
              label={SLOT_LABELS[slot] || slot}
              isActive={activeCategory === slot}
              onClick={() => setActiveCategory(slot)}
            />
          ))}
        </div>

        {/* Skin color presets — only when Base is selected and base has silhouette */}
        {activeCategory === "hair" && (
          <div className="py-2 shrink-0 space-y-1">
            <p className="text-[10px] font-bold uppercase tracking-wider text-cyan-400/90">
              Hair color
            </p>
            <div className="flex flex-wrap items-center gap-2">
              {HAIR_CREATOR_SWATCHES.map(({ hex, label }) => (
                <button
                  key={hex}
                  type="button"
                  onClick={() => setHairTintHex(hex)}
                  className={`w-8 h-8 rounded-full border-2 hover:border-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:ring-offset-2 focus:ring-offset-[#0c1423] transition-all ${
                    hairTintHex === hex
                      ? "border-purple-400 ring-2 ring-purple-500/60"
                      : "border-cyan-500/50"
                  }`}
                  style={{ backgroundColor: hex }}
                  title={label}
                />
              ))}
            </div>
          </div>
        )}

        {activeCategory === "base" && hasSilhouette && (
          <div className="py-2 shrink-0 space-y-1">
            <p className="text-[10px] font-bold uppercase tracking-wider text-cyan-400/90">
              Skin color
            </p>
            <div className="flex flex-wrap items-center gap-2">
              {[
                { hex: "#FFDBAC", label: "Light" },
                { hex: "#F1C27D", label: "Light warm" },
                { hex: "#E0AC69", label: "Medium light" },
                { hex: "#C68642", label: "Tan" },
                { hex: "#B87333", label: "Filipino brown" },
                { hex: "#A0522D", label: "Brown" },
                { hex: "#8D5524", label: "Light skin Black" },
                { hex: "#5C3317", label: "Dark brown" },
                { hex: "#3D2314", label: "Dark skin" },
                { hex: "#2C1810", label: "Black" },
              ].map(({ hex, label }) => (
                <button
                  key={hex}
                  type="button"
                  onClick={() => setSkinTintHex(hex)}
                  className="w-8 h-8 rounded-full border-2 border-cyan-500/50 hover:border-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:ring-offset-2 focus:ring-offset-[#0c1423] transition-all"
                  style={{ backgroundColor: hex }}
                  title={label}
                />
              ))}
            </div>
          </div>
        )}

        {/* Thumbnails Grid */}
        <div className="py-1 shrink-0">
          {/* Using flex wrap center instead of grid for better centering of few items */}
          <div className="flex flex-wrap justify-center gap-4 max-h-[280px] overflow-y-auto p-2 custom-scrollbar">
            {currentOptions.map((item, index) => {
              const isSelected = index === currentSelectionIndex;
              const hasImage = !!(
                item.image_url || (item as { image_url?: string }).image_url
              );

              // FIX: Use Purple for selected state, Cyan for unselected
              const glowColorClass = isSelected
                ? "border-purple-500 shadow-[0_0_20px_rgba(168,85,247,0.6)]"
                : "border-cyan-500/50 shadow-[0_0_10px_rgba(6,182,212,0.3)] hover:border-cyan-400 hover:shadow-[0_0_15px_rgba(6,182,212,0.5)]";
              const bgClass = isSelected
                ? "bg-purple-900/30"
                : "bg-gray-900/50 hover:bg-cyan-900/20";

              return (
                <button
                  key={item.id ?? `opt-${activeCategory}-${index}`}
                  type="button"
                  onClick={() => handleSelectOption(index)}
                  // Redesigned Thumbnail Frame
                  className={`relative group w-20 h-20 sm:w-24 sm:h-24 rounded-xl border-2 p-2 transition-all duration-300 ease-out overflow-hidden ${glowColorClass} ${bgClass} ${isSelected ? "scale-105 z-10" : "scale-100"}`}
                  aria-pressed={isSelected}
                  aria-label={item.name}
                >
                  <div className="w-full h-full rounded-lg overflow-hidden flex items-center justify-center relative z-20">
                    {hasImage ? (
                      <ShopItemMedia
                        item={item}
                        className={`w-full h-full object-cover transition-opacity duration-300 ${
                          isSelected
                            ? "opacity-100"
                            : "opacity-70 group-hover:opacity-100"
                        }`}
                        animate={false}
                      />
                    ) : (
                      <span
                        className={`text-[10px] font-bold uppercase tracking-wider transition-colors ${
                          isSelected
                            ? "text-purple-200"
                            : "text-cyan-700 group-hover:text-cyan-400"
                        }`}
                      >
                        None
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="pt-2 flex flex-col gap-1 items-center shrink-0">
          {/* Crystal Finalize Button — larger, with blue glow around crystal */}
          <button
            type="button"
            onClick={handleFinalize}
            className="relative group inline-block w-full max-w-md border-0 transition-transform active:scale-95 overflow-visible"
            style={{
              filter:
                "drop-shadow(0 0 20px rgba(0, 247, 255, 0.7)) drop-shadow(0 0 40px rgba(59, 130, 246, 0.5)) drop-shadow(0 0 60px rgba(6, 182, 212, 0.3))",
            }}
          >
            {/* Crystal image defines button size; keep natural aspect ratio */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={ASSETS.crystalButtonBg}
              alt=""
              className="block w-full h-auto opacity-90 group-hover:opacity-100 transition-opacity pointer-events-none"
            />
            {/* Text centered on top of crystal */}
            <span
              className="absolute inset-0 z-10 flex items-center justify-center translate-y-5.5 text-2xl font-black uppercase tracking-[0.25em] text-white pointer-events-none"
              style={{
                textShadow:
                  "0 0 10px rgba(0, 247, 255, 1), 0 0 20px rgba(0, 247, 255, 0.8)",
              }}
            >
              FINALIZE
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// HELPER COMPONENT: Runic Category Button
// ==========================================
function CategoryButton({
  label,
  isActive,
  onClick,
}: {
  label: string;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`
        relative w-full min-h-[44px] flex items-center justify-center rounded-md border-2 transition-all duration-300
        ${isActive
          ? "bg-cyan-500/20 border-cyan-300 shadow-[0_0_15px_rgba(0,247,255,0.5)] scale-105"
          : "bg-[#0a101a]/80 border-[#1a2a40] hover:border-cyan-600 hover:shadow-[0_0_10px_rgba(0,247,255,0.2)]"
        }
      `}
    >
      <span
        className={`
          text-[9px] font-bold uppercase tracking-widest transition-all
          ${isActive ? "text-white drop-shadow-[0_0_5px_#00f7ff]" : "text-cyan-800 group-hover:text-cyan-400"}
        `}
      >
        {label}
      </span>
    </button>
  );
}
