"use client";

import React from "react";
import CustomDropdown from "../CustomDropdown";
import type { ShopItemFormFieldsProps } from "./types";
import {
  SKIN_TINT_SLOTS,
  SLOT_OPTIONS,
  BONUS_STAT_OPTIONS,
  CREATOR_SLOTS,
  NON_SELLABLE_CREATOR_SLOTS,
  ERASER_MASK_TARGETS,
} from "./constants";

export function ShopItemFormPricingGacha(props: ShopItemFormFieldsProps) {
  const {
    formData,
    setFormData,
    safeFormData,
    handleFileChange,
    editingItem,
    previewUrl,
    isVideoPreview,
    selectedFile,
    selectedThumbnailFile,
    selectedBaseLayerFile,
    setSelectedThumbnailFile,
    setThumbnailCleared,
    thumbnailCleared,
    setSelectedBaseLayerFile,
    slotOpen,
    setSlotOpen,
    gripTypeOpen,
    setGripTypeOpen,
    weaponTypeOpen,
    setWeaponTypeOpen,
    bonuses,
    setBonuses,
    bonusTypeOpenIndex,
    setBonusTypeOpenIndex,
    gachaCollections,
    classReqOpen,
    setClassReqOpen,
    isStackable,
    setIsStackable,
    isSellable,
    setIsSellable,
    isGlobal,
    setIsGlobal,
    onboardingAvailable,
    setOnboardingAvailable,
    effectType,
    setEffectType,
    effectHealAmount,
    setEffectHealAmount,
    effectBuffStat,
    setEffectBuffStat,
    effectBuffValue,
    setEffectBuffValue,
    effectBuffDuration,
    setEffectBuffDuration,
    effectGiveExpAmount,
    setEffectGiveExpAmount,
    effectGiveGoldAmount,
    setEffectGiveGoldAmount,
    effectCallingCardSkinId,
    setEffectCallingCardSkinId,
    effectCaptureBonus,
    setEffectCaptureBonus,
    effectIsConsumable,
    setEffectIsConsumable,
    itemEffectsJson,
    setItemEffectsJson,
    effectTypeOpen,
    setEffectTypeOpen,
    effectBuffStatOpen,
    setEffectBuffStatOpen,
    gemPrice,
    setGemPrice,
    rarityOpen,
    setRarityOpen,
    collectionOpen,
    setCollectionOpen,
    isGachaExclusive,
    setIsGachaExclusive,
    collectionId,
    setCollectionId,
    collectionName,
    setCollectionName,
    isAnimated,
    setIsAnimated,
    animConfig,
    setAnimConfig,
    setShowMaskPainter,
    setShowMaskPainterForFemale,
  } = props;

  return (
    <>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-[10px] font-black text-gray-500 uppercase mb-1">Coin Price</label>
                <div className="flex items-center bg-gray-800 border border-gray-700 rounded p-2">
                  <span className="mr-2 text-yellow-500 text-xs">🪙</span>
                  <input type="number" name="itemPrice" value={safeFormData.price} onChange={(e) => setFormData({ ...formData, price: e.target.value })} className="w-full bg-transparent text-sm outline-none text-white" placeholder="0" />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-black text-gray-500 uppercase mb-1">Gem Price</label>
                <div className="flex items-center bg-gray-800 border border-gray-700 rounded p-2">
                  <span className="mr-2 text-blue-400 text-xs">💎</span>
                  <input type="number" value={gemPrice ?? ''} onChange={(e) => setGemPrice(e.target.value ? Number(e.target.value) : null)} className="w-full bg-transparent text-sm outline-none text-white" placeholder="Ex: 100" />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <CustomDropdown label="Rarity" value={formData.rarity} options={[{ value: 'common', label: 'Common' }, { value: 'uncommon', label: 'Uncommon' }, { value: 'rare', label: 'Rare' }, { value: 'epic', label: 'Epic' }, { value: 'legendary', label: 'Legendary' }, { value: 'monarch', label: 'Monarch' }]} onChange={(value) => setFormData({ ...formData, rarity: value.toLowerCase() })} isOpen={rarityOpen} onToggle={() => setRarityOpen(!rarityOpen)} />
              <div>
                {isGachaExclusive ? (
                  <CustomDropdown
                    label="Collection Theme"
                    value={collectionId || ''}
                    options={[
                      { value: '', label: 'Select Collection...' },
                      ...gachaCollections.map((c) => ({ value: c.id, label: c.name }))
                    ]}
                    onChange={(id) => {
                      setCollectionId(id || null);
                      setCollectionName(gachaCollections.find((c) => c.id === id)?.name || 'Standard');
                    }}
                    isOpen={collectionOpen}
                    onToggle={() => setCollectionOpen(!collectionOpen)}
                  />
                ) : (
                  <>
                    <label className="block text-xs font-black uppercase text-gray-300 mb-1">Collection Theme</label>
                    <input type="text" value="Standard" disabled className="w-full bg-gray-900 border border-gray-800 rounded px-3 py-2 text-sm text-gray-500 cursor-not-allowed z-10 relative" />
                  </>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 bg-gray-800/30 rounded-lg border border-gray-600/50 mt-4">
              <input type="checkbox" id="gacha-exclusive" checked={isGachaExclusive} onChange={(e) => setIsGachaExclusive(e.target.checked)} className="w-4 h-4 text-blue-500 bg-gray-700 border-gray-600 rounded focus:ring-blue-500 focus:ring-2" />
              <label htmlFor="gacha-exclusive" className="text-sm font-bold text-gray-200 cursor-pointer uppercase">Gacha Exclusive</label>
            </div>

            <div className="flex items-center gap-2">
              <input type="checkbox" name="isAnimated" checked={isAnimated} onChange={(e) => setIsAnimated(e.target.checked)} className="rounded border-gray-700" />
              <label className="text-xs font-black uppercase text-gray-300">Animated Layer</label>
            </div>

            {isAnimated && (
              <div className="p-4 border border-red-900/30 bg-black/40 rounded mt-4">
                <h3 className="text-red-500 mb-3 text-sm font-bold uppercase">Animation Settings</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="block text-xs font-bold text-gray-300 mb-1">Frame Width</label><input type="number" value={animConfig.frameWidth} onChange={(e) => setAnimConfig((prev: any) => ({ ...prev, frameWidth: parseInt(e.target.value) || 0 }))} className="w-full bg-black border border-gray-700 rounded px-3 py-2 text-sm text-white" min={1} /></div>
                  <div><label className="block text-xs font-bold text-gray-300 mb-1">Frame Height</label><input type="number" value={animConfig.frameHeight} onChange={(e) => setAnimConfig((prev: any) => ({ ...prev, frameHeight: parseInt(e.target.value) || 0 }))} className="w-full bg-black border border-gray-700 rounded px-3 py-2 text-sm text-white" min={1} /></div>
                  <div><label className="block text-xs font-bold text-gray-300 mb-1">Total Frames</label><input type="number" value={animConfig.totalFrames} onChange={(e) => setAnimConfig((prev: any) => ({ ...prev, totalFrames: parseInt(e.target.value) || 1 }))} className="w-full bg-black border border-gray-700 rounded px-3 py-2 text-sm text-white" min={1} /></div>
                  <div><label className="block text-xs font-bold text-gray-300 mb-1">FPS</label><input type="number" value={animConfig.fps} onChange={(e) => setAnimConfig((prev: any) => ({ ...prev, fps: parseInt(e.target.value) || 1 }))} className="w-full bg-black border border-gray-700 rounded px-3 py-2 text-sm text-white" min={1} max={60} /></div>
                </div>
              </div>
            )}
    </>
  );
}
