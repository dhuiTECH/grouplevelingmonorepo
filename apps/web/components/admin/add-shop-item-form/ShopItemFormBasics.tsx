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

export function ShopItemFormBasics(props: ShopItemFormFieldsProps) {
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
            <div>
              <label className="block text-xs font-black uppercase text-gray-300 mb-1">Item Name *</label>
              <input
                type="text"
                name="itemName"
                value={safeFormData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Enter item name..."
                required
                className="w-full bg-black border border-gray-700 rounded px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-red-500 focus:outline-none z-10 relative"
              />
            </div>

            <div>
              <label className="block text-xs font-black uppercase text-gray-300 mb-1">
                {SKIN_TINT_SLOTS.includes(formData.slot) ? 'Detail Layer (Outlines) *' : 'Upload Image/Video *'}
              </label>
              <input
                type="file"
                accept="image/png,image/jpeg,image/gif,image/webp,video/webm"
                onChange={handleFileChange}
                className="w-full bg-black border border-gray-700 rounded px-3 py-2 text-sm text-gray-300 file:mr-4 file:py-1 file:px-3 file:rounded file:border-0 file:text-xs file:font-bold file:bg-red-600 file:text-white hover:file:bg-red-500"
              />
              {previewUrl && (
                <div className="mt-3 flex items-center gap-3">
                  {isVideoPreview ? (
                    <video src={previewUrl} className="w-16 h-16 rounded border border-red-500/50 object-cover" muted autoPlay loop playsInline />
                  ) : (
                    <img src={previewUrl} alt="Preview" className="w-16 h-16 rounded border border-red-500/50 object-cover" />
                  )}
                  <div className="text-xs text-gray-400">
                    {selectedFile ? <><p>New file: {selectedFile.name}</p><p>{(selectedFile.size / 1024).toFixed(1)} KB</p></> : editingItem ? <><p>Current image</p><p className="text-yellow-400">(Upload new file to replace)</p></> : null}
                  </div>
                </div>
              )}
              <p className="text-xs text-gray-500 mt-1">Supported: PNG, JPG, GIF, WebP, WebM (max 5MB)</p>
            </div>

            {SKIN_TINT_SLOTS.includes(formData.slot) && (
              <div>
                <label className="block text-xs font-black uppercase text-gray-300 mb-1">Base Layer (Silhouette)</label>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/gif,image/webp"
                  onChange={(e) => setSelectedBaseLayerFile(e.target.files?.[0] || null)}
                  className="w-full bg-black border border-gray-700 rounded px-3 py-2 text-sm text-gray-300 file:mr-4 file:py-1 file:px-3 file:rounded file:border-0 file:text-xs file:font-bold file:bg-red-600 file:text-white hover:file:bg-red-500"
                />
                {(selectedBaseLayerFile || editingItem?.image_base_url) && (
                  <div className="mt-3 flex items-center gap-3">
                    <img
                      src={selectedBaseLayerFile ? URL.createObjectURL(selectedBaseLayerFile) : editingItem?.image_base_url}
                      alt="Base layer"
                      className="w-16 h-16 rounded border border-red-500/50 object-cover"
                    />
                    <div className="text-xs text-gray-400">
                      {selectedBaseLayerFile ? <><p>New file: {selectedBaseLayerFile.name}</p><p>{(selectedBaseLayerFile.size / 1024).toFixed(1)} KB</p></> : editingItem?.image_base_url ? <><p>Current base layer</p><p className="text-yellow-400">(Upload new file to replace)</p></> : null}
                    </div>
                  </div>
                )}
                <p className="text-xs text-gray-500 mt-1">Silhouette/base body image (PNG, JPG, GIF, WebP). Uploads to storage and saves to image_base_url.</p>
              </div>
            )}

            <div>
              <label className="block text-xs font-black uppercase text-gray-300 mb-1">Thumbnail Image (Optional)</label>
              <div className="flex items-center gap-2">
                <input
                  id="thumbnail-upload"
                  type="file"
                  accept="image/png,image/jpeg,image/gif,image/webp"
                  onChange={(e) => { setSelectedThumbnailFile(e.target.files?.[0] || null); setThumbnailCleared(false); }}
                  className="w-full bg-black border border-gray-700 rounded px-3 py-2 text-sm text-gray-300 file:mr-4 file:py-1 file:px-3 file:rounded file:border-0 file:text-xs file:font-bold file:bg-red-600 file:text-white hover:file:bg-red-500"
                />
                <button
                  type="button"
                  onClick={() => { setSelectedThumbnailFile(null); setThumbnailCleared(true); const input = document.getElementById('thumbnail-upload') as HTMLInputElement; if (input) input.value = ''; }}
                  className="px-3 py-1 bg-red-600/20 hover:bg-red-600 text-red-400 hover:text-white rounded text-xs font-bold transition-all border border-red-900/50"
                >
                  Clear
                </button>
              </div>
              {(selectedThumbnailFile || (editingItem?.thumbnail_url && !thumbnailCleared)) && (
                <div className="mt-2">
                  <img src={selectedThumbnailFile ? URL.createObjectURL(selectedThumbnailFile) : editingItem?.thumbnail_url} alt="Thumbnail" className="w-16 h-16 rounded border border-red-500/50 object-cover" />
                </div>
              )}
              <p className="text-xs text-gray-500 mt-1">Small image for list views (PNG, JPG, GIF, WebP)</p>
            </div>

            <CustomDropdown
              label="Slot (Equipment/Visual) *"
              value={formData.slot}
              options={SLOT_OPTIONS}
              onChange={(value) => {
                setFormData({
                  ...formData,
                  slot: value,
                  ...(value !== 'weapon' ? { weapon_type: null } : {})
                });
                if (['base_body', 'face_eyes', 'face_mouth', 'hair', 'hand_grip'].includes(value)) setIsSellable(false);
              }}
              isOpen={slotOpen}
              onToggle={() => setSlotOpen(!slotOpen)}
            />

            {(formData.slot === 'weapon' || formData.slot === 'hand_grip') && (
              <CustomDropdown
                label="Grip Type (for hand matching)"
                value={formData.grip_type || ''}
                options={[
                  { value: '', label: 'None' },
                  { value: 'All Around', label: 'All Around' },
                  { value: 'Caster', label: 'Caster' },
                  { value: 'Shield', label: 'Shield' },
                  { value: 'Wand', label: 'Wand' }
                ]}
                onChange={(value) => {
                  const nextGrip = value || null;
                  const isAllAroundOrUnset = !nextGrip || nextGrip === 'All Around';
                  setFormData({
                    ...formData,
                    grip_type: nextGrip,
                    ...(!isAllAroundOrUnset ? { weapon_type: null } : {}),
                  });
                  setGripTypeOpen(false);
                }}
                isOpen={gripTypeOpen}
                onToggle={() => setGripTypeOpen(!gripTypeOpen)}
              />
            )}

            {formData.slot === 'weapon' &&
              (formData.grip_type === 'All Around' || formData.grip_type === '' || formData.grip_type == null) && (
              <CustomDropdown
                label="Weapon type (All Around only — sword / spear / bow motion)"
                value={formData.weapon_type || ''}
                options={[
                  { value: '', label: 'None' },
                  { value: 'Sword', label: 'Sword' },
                  { value: 'Spear', label: 'Spear' },
                  { value: 'Bow', label: 'Bow' }
                ]}
                onChange={(value) => {
                  setFormData({ ...formData, weapon_type: value || null });
                  setWeaponTypeOpen(false);
                }}
                isOpen={weaponTypeOpen}
                onToggle={() => setWeaponTypeOpen(!weaponTypeOpen)}
              />
            )}

            {(formData.slot === 'weapon' || formData.grip_type) && (
              <div>
                <label className="block text-xs font-black uppercase text-gray-300 mb-1">
                  Hand Grip Z-Index Override (Optional)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={formData.hand_grip_z_index_override ?? ''}
                    onChange={(e) => setFormData({ ...formData, hand_grip_z_index_override: e.target.value ? parseInt(e.target.value) : null })}
                    placeholder="Auto (based on Hand Grip item)"
                    className="w-full bg-black border border-gray-700 rounded px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-red-500 focus:outline-none z-10 relative"
                  />
                  {formData.hand_grip_z_index_override !== null && (
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, hand_grip_z_index_override: null })}
                      className="px-2 py-1 bg-gray-700 hover:bg-gray-600 text-white text-xs rounded"
                    >
                      Clear
                    </button>
                  )}
                </div>
                <p className="text-[10px] text-gray-500 mt-1">
                  If set, the hand grip will use this Z-Index instead of its own. Useful for items that should be in front of the hand.
                </p>
              </div>
            )}

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-black uppercase text-gray-300">Bonuses (Up to 3)</label>
                <button type="button" onClick={() => bonuses.length < 3 && setBonuses([...bonuses, { type: 'speed', value: 0 }])} disabled={bonuses.length >= 3} className="px-2 py-1 bg-green-600 hover:bg-green-500 disabled:bg-gray-600 text-white text-xs rounded">+ Add Bonus</button>
              </div>
              {bonuses.map((bonus, index) => (
                <div key={index} className="flex items-center gap-2 p-2 bg-gray-800/50 rounded">
                  <div className="flex-1">
                    <CustomDropdown
                      label="Type"
                      value={bonus.type}
                      options={BONUS_STAT_OPTIONS}
                      onChange={(value) => { const newBonuses = [...bonuses]; newBonuses[index].type = value; setBonuses(newBonuses); setBonusTypeOpenIndex(null); }}
                      isOpen={bonusTypeOpenIndex === index}
                      onToggle={() => setBonusTypeOpenIndex((prev) => (prev === index ? null : index))}
                    />
                  </div>
                  <div className="w-20">
                    <input
                      type="number"
                      value={bonus.value}
                      onChange={(e) => { const newBonuses = [...bonuses]; newBonuses[index].value = parseFloat(e.target.value) || 0; setBonuses(newBonuses); }}
                      step={bonus.type === 'xp_boost' || bonus.type === 'crit_percentage' ? '0.01' : bonus.type === 'crit_damage' ? '0.1' : '1'}
                      min={bonus.type === 'crit_damage' ? 1 : 0}
                      placeholder={bonus.type === 'crit_damage' ? '2.0' : '0'}
                      className="w-full bg-black border border-gray-700 rounded px-2 py-1 text-sm text-white placeholder-gray-500"
                    />
                  </div>
                  <button type="button" onClick={() => setBonuses(bonuses.filter((_, i) => i !== index))} className="px-2 py-1 bg-red-600 hover:bg-red-500 text-white text-xs rounded">×</button>
                </div>
              ))}
              {bonuses.length === 0 && <div className="text-xs text-gray-500 italic p-2 bg-gray-800/30 rounded">No bonuses added yet</div>}
              <div className="text-[10px] text-gray-500">Each bonus adds stat improvements to equipped characters</div>
            </div>
    </>
  );
}
