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

export function ShopItemFormEraserMask(props: ShopItemFormFieldsProps) {
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

            <div className="p-4 border border-blue-900/30 bg-black/40 rounded mt-4 space-y-3">
              <h3 className="text-blue-500 text-sm font-bold uppercase">Targeted Masking</h3>
              <p className="text-xs text-gray-400 mb-2">Erase parts of layers underneath when this item is equipped.</p>
              
              <div className="space-y-2 bg-gray-900/50 p-3 rounded border border-gray-700">
                <label className="block text-xs font-black uppercase text-gray-300 mb-2">Target Layers to Mask</label>
                <div className="grid grid-cols-2 gap-2">
                  {ERASER_MASK_TARGETS.map((target) => (
                    <label key={target.value} className="flex items-center gap-2 cursor-pointer group">
                      <input 
                        type="checkbox" 
                        checked={formData.eraser_mask_targets?.includes(target.value) || false}
                        onChange={(e) => {
                          const current = formData.eraser_mask_targets || [];
                          const newTargets = e.target.checked 
                            ? [...current, target.value] 
                            : current.filter((t: string) => t !== target.value);
                          
                          setFormData((prev: any) => ({ 
                            ...prev, 
                            eraser_mask_targets: newTargets,
                            // Clear mask URL if no targets are selected anymore
                            eraser_mask_url: newTargets.length === 0 ? null : prev.eraser_mask_url
                          }));
                        }}
                        className="w-4 h-4 text-blue-600 bg-gray-800 border-gray-600 rounded focus:ring-blue-500 cursor-pointer"
                      />
                      <span className="text-sm text-gray-300 group-hover:text-white transition-colors">{target.label}</span>
                    </label>
                  ))}
                </div>
                {(!formData.eraser_mask_targets || formData.eraser_mask_targets.length === 0) && (
                  <p className="text-xs text-gray-500 italic mt-2">Select at least one target to enable the mask painter.</p>
                )}
              </div>

              {formData.eraser_mask_targets && formData.eraser_mask_targets.length > 0 && (
                <div className="mt-3 space-y-3">
                  <div className="flex flex-col gap-2">
                    <span className="text-xs font-bold text-gray-300">Male</span>
                    <button
                      type="button"
                      onClick={() => { setShowMaskPainterForFemale(false); setShowMaskPainter(true); }}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs font-bold w-full transition-colors"
                    >
                      {formData.eraser_mask_url ? 'Edit Mask (Male)' : 'Paint Eraser Mask (Male)'}
                    </button>
                    {formData.eraser_mask_url && (
                      <div className="flex items-center justify-between bg-blue-900/20 p-2 rounded border border-blue-500/30">
                        <div className="flex items-center gap-2">
                          <img src={formData.eraser_mask_url} className="w-8 h-8 object-contain bg-white/10 rounded" alt="Male mask" />
                          <span className="text-xs text-blue-300 font-bold">Male mask</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setFormData((prev: any) => ({ ...prev, eraser_mask_url: null }))}
                          className="text-xs text-red-400 hover:text-red-300 font-bold px-2"
                        >
                          Remove
                        </button>
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col gap-2">
                    <span className="text-xs font-bold text-gray-300">Female</span>
                    <button
                      type="button"
                      onClick={() => { setShowMaskPainterForFemale(true); setShowMaskPainter(true); }}
                      className="px-4 py-2 bg-pink-600 hover:bg-pink-500 text-white rounded text-xs font-bold w-full transition-colors"
                    >
                      {formData.eraser_mask_url_female ? 'Edit Mask (Female)' : 'Paint Eraser Mask (Female)'}
                    </button>
                    {formData.eraser_mask_url_female && (
                      <div className="flex items-center justify-between bg-pink-900/20 p-2 rounded border border-pink-500/30">
                        <div className="flex items-center gap-2">
                          <img src={formData.eraser_mask_url_female} className="w-8 h-8 object-contain bg-white/10 rounded" alt="Female mask" />
                          <span className="text-xs text-pink-300 font-bold">Female mask</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setFormData((prev: any) => ({ ...prev, eraser_mask_url_female: null }))}
                          className="text-xs text-red-400 hover:text-red-300 font-bold px-2"
                        >
                          Remove
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
    </>
  );
}
