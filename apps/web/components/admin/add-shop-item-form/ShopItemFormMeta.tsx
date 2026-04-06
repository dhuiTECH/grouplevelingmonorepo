"use client";

import React from "react";
import CustomDropdown from "../CustomDropdown";
import type { ShopItemFormFieldsProps } from "./types";
import { CREATOR_SLOTS } from "./constants";

export function ShopItemFormMeta(props: ShopItemFormFieldsProps) {
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

  const genderValues = Array.isArray(formData.gender)
    ? formData.gender
    : [formData.gender].filter(Boolean);

  return (
    <>

            <div>
              <label className="block text-xs font-black uppercase text-gray-300 mb-2">{formData.slot === 'avatar' ? 'Avatar Gender' : 'Gender Restriction'}</label>
              <div className="flex gap-2">
                {[
                  { value: 'unisex', label: 'Unisex', icon: '👥' },
                  { value: 'male', label: 'Male', icon: '👨' },
                  { value: 'female', label: 'Female', icon: '👩' }
                ].map(({ value, label, icon }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => {
                      let newGenders: string[];
                      if (value === 'unisex') newGenders = ['unisex'];
                      else {
                        if (genderValues.includes(value)) newGenders = genderValues.filter((g: string) => g !== value && g !== 'unisex');
                        else newGenders = [...genderValues.filter((g: string) => g !== 'unisex'), value];
                        if (newGenders.length === 0) newGenders = ['unisex'];
                      }
                      setFormData({ ...formData, gender: newGenders });
                    }}
                    className={`flex-1 px-3 py-2 rounded-lg text-xs font-bold transition-all ${genderValues.includes(value) ? 'bg-cyan-600 text-white shadow-[0_0_10px_rgba(6,182,212,0.3)]' : 'bg-gray-700 hover:bg-gray-600 text-gray-300 hover:text-white'}`}
                  >
                    <div className="flex flex-col items-center gap-1"><span className="text-sm">{icon}</span><span>{label}</span></div>
                  </button>
                ))}
              </div>
              <div className="text-[10px] text-gray-500 mt-1">{formData.slot === 'avatar' ? "Sets the avatar's gender; only matching parts (hair, eyes, etc.) can be equipped in Avatar Lab." : formData.slot === 'base_body' ? "Sets the base body's gender; only parts (hair, eyes, etc.) with matching gender can be equipped on this base in Avatar Lab." : 'Controls which gender can purchase this item'}</div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-black uppercase text-gray-300 mb-1">Minimum Level</label>
                <input type="number" value={safeFormData.min_level} onChange={(e) => setFormData({ ...formData, min_level: e.target.value })} placeholder="1" min={1} max={999} className="w-full bg-black border border-gray-700 rounded px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-red-500 focus:outline-none z-10 relative" />
              </div>
              <div>
                <CustomDropdown label="Class Requirement" value={safeFormData.class_req} options={[{ value: 'All', label: 'All Classes' }, { value: 'Assassin', label: 'Assassin' }, { value: 'Fighter', label: 'Fighter' }, { value: 'Mage', label: 'Mage' }, { value: 'Tanker', label: 'Tanker' }, { value: 'Ranger', label: 'Ranger' }, { value: 'Healer', label: 'Healer' }]} onChange={(value) => setFormData({ ...formData, class_req: value })} isOpen={classReqOpen} onToggle={() => setClassReqOpen(!classReqOpen)} />
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 bg-gray-800/30 rounded-lg border border-gray-600/50">
              <input type="checkbox" id="no-restrictions" checked={safeFormData.no_restrictions} onChange={(e) => setFormData({ ...formData, no_restrictions: e.target.checked })} className="w-4 h-4 text-cyan-600 bg-gray-700 border-gray-600 rounded focus:ring-cyan-500 focus:ring-2" />
              <label htmlFor="no-restrictions" className="text-sm font-bold text-gray-200 cursor-pointer">No Restrictions - Available to All Players</label>
              <div className="text-xs text-gray-400 ml-auto">{formData.no_restrictions ? 'Unrestricted' : 'Restricted'}</div>
            </div>

            <div className="flex items-center gap-3 p-3 bg-gray-800/30 rounded-lg border border-gray-600/50">
              <input type="checkbox" id="is-stackable" checked={isStackable} onChange={(e) => setIsStackable(e.target.checked)} className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-600 focus:ring-2" />
              <label htmlFor="is-stackable" className="text-sm font-bold text-gray-200 cursor-pointer">Is Stackable? (e.g., Potions, Currency)</label>
              <div className="text-xs text-gray-400 ml-auto">{isStackable ? 'Stackable' : 'Unique'}</div>
            </div>

            <div className="flex items-center gap-3 p-3 bg-gray-800/30 rounded-lg border border-gray-600/50">
              <input type="checkbox" id="is-sellable" checked={isSellable} onChange={(e) => setIsSellable(e.target.checked)} disabled={['base_body', 'face_eyes', 'face_mouth', 'hair'].includes(formData.slot)} className="w-4 h-4 text-cyan-600 bg-gray-700 border-gray-600 rounded focus:ring-cyan-500 focus:ring-2 disabled:opacity-50 disabled:cursor-not-allowed" />
              <label htmlFor="is-sellable" className="text-sm font-bold text-gray-200 cursor-pointer">
                {['base_body', 'face_eyes', 'face_mouth', 'hair'].includes(formData.slot) ? 'Not in shop (creator slot)' : 'Sellable (show in public shop)'}
              </label>
            </div>

            <div className="flex items-center gap-3 p-3 bg-gray-800/30 rounded-lg border border-gray-600/50">
              <input type="checkbox" id="is-global" checked={isGlobal} onChange={(e) => setIsGlobal(e.target.checked)} className="w-4 h-4 text-yellow-600 bg-gray-700 border-gray-600 rounded focus:ring-yellow-500 focus:ring-2" />
              <label htmlFor="is-global" className="text-sm font-bold text-gray-200 cursor-pointer">Is Global Item? (Available everywhere)</label>
              <div className="text-xs text-gray-400 ml-auto">{isGlobal ? 'Global' : 'Regional/Limited'}</div>
            </div>

            {CREATOR_SLOTS.includes(formData.slot) && (
              <div className="flex items-center gap-3 p-3 bg-gray-800/30 rounded-lg border border-gray-600/50">
                <input type="checkbox" id="onboarding-available" checked={onboardingAvailable} onChange={(e) => setOnboardingAvailable(e.target.checked)} className="w-4 h-4 text-green-600 bg-gray-700 border-gray-600 rounded focus:ring-green-500 focus:ring-2" />
                <label htmlFor="onboarding-available" className="text-sm font-bold text-gray-200 cursor-pointer">
                  Show in Avatar Lab (onboarding and /avatar-lab)
                </label>
              </div>
            )}

            <div>
              <label className="block text-xs font-black uppercase text-gray-300 mb-1">Description</label>
              <textarea name="itemDescription" value={safeFormData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} rows={3} placeholder="Enter item description..." className="w-full bg-black border border-gray-700 rounded px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-red-500 focus:outline-none z-10 relative" />
            </div>
    </>
  );
}
