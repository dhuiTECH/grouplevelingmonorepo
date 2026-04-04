"use client";

import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Loader2, CheckCircle } from 'lucide-react';
import CustomDropdown from './CustomDropdown';
import { MaskPainter } from './MaskPainter';
import { useShopItemForm } from './shop-item-form/useShopItemForm';
import { BonusesSection } from './shop-item-form/BonusesSection';
import { ItemEffectsSection } from './shop-item-form/ItemEffectsSection';
import { RequirementsSection } from './shop-item-form/RequirementsSection';
import { AvatarPreview } from './shop-item-form/AvatarPreview';
import { PositioningControls } from './shop-item-form/PositioningControls';

interface AddShopItemFormProps {
  onAdd: (item: any) => void;
  onEdit: (item: any) => void;
  onCancel: () => void;
  editingItem?: any;
  gachaCollections: any[];
  baseBodyShopItems?: any[];
  shopItems?: any[];
}

const SKIN_TINT_SLOTS = ['avatar', 'base_body', 'hand_grip', 'face_eyes', 'face_mouth', 'hair'];
const DUAL_POSITION_SLOTS = ['weapon', 'head', 'eyes', 'back', 'hands', 'shoulder', 'accessory', 'body', 'face', 'base_body', 'face_eyes', 'face_mouth', 'hair', 'hand_grip'];
const CREATOR_SLOTS = ['avatar', 'base_body', 'face_eyes', 'face_mouth', 'hair', 'face', 'body'];

const AddShopItemForm = React.memo(function AddShopItemForm({
  onAdd,
  onEdit,
  onCancel,
  editingItem,
  gachaCollections,
  baseBodyShopItems = [],
  shopItems = [],
}: AddShopItemFormProps) {
  const {
    formData,
    setFormData,
    safeFormData,
    handOpacity,
    setHandOpacity,
    showHandPreview,
    setShowHandPreview,
    previewGripType,
    setPreviewGripType,
    editingGender,
    setEditingGender,
      bonuses,
    setBonuses,
    positioning,
    setPositioning,
    previewZoom,
    setPreviewZoom,
    isAnimated,
    setIsAnimated,
    animConfig,
    setAnimConfig,
    isSaving,
    saveStatus,
    isStackable,
    setIsStackable,
    itemEffectsJson,
    setItemEffectsJson,
    isGachaExclusive,
    setIsGachaExclusive,
    collectionName,
    setCollectionName,
    collectionId,
    setCollectionId,
    gemPrice,
    setGemPrice,
    isSellable,
    setIsSellable,
    isGlobal,
    setIsGlobal,
    onboardingAvailable,
    setOnboardingAvailable,
    isDragging,
    skinColor,
    setSkinColor,
    selectedFile,
    setSelectedFile,
    selectedThumbnailFile,
    setSelectedThumbnailFile,
    selectedBaseLayerFile,
    setSelectedBaseLayerFile,
    baseLayerPreviewUrl,
    baseLayerFetchedUrl,
    thumbnailCleared,
    setThumbnailCleared,
    uploading,
    previewUrl,
    isVideoPreview,
    slotOpen,
    setSlotOpen,
    bonusTypeOpenIndex,
    setBonusTypeOpenIndex,
    rarityOpen,
    setRarityOpen,
    classReqOpen,
    setClassReqOpen,
    effectTypeOpen,
    setEffectTypeOpen,
    effectBuffStatOpen,
    setEffectBuffStatOpen,
    collectionOpen,
    setCollectionOpen,
    gripTypeOpen,
    setGripTypeOpen,
    showMaskPainter,
    setShowMaskPainter,
    showMaskPainterForFemale,
    setShowMaskPainterForFemale,
    eraserMaskTargetOpen,
    setEraserMaskTargetOpen,
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
    handleFileChange,
    handleSubmit,
    handleSaveMask,
    handleSaveMaskFemale,
    handleMouseDown,
  } = useShopItemForm({
    onAdd,
    onEdit,
    onCancel,
    editingItem,
    gachaCollections,
    SKIN_TINT_SLOTS,
    CREATOR_SLOTS,
  });

  const maleBaseBodyItem = useMemo(
    () => baseBodyShopItems.find((i: any) => (i.name || '').trim().toLowerCase() === 'male'),
    [baseBodyShopItems],
  );
  const femaleBaseBodyItem = useMemo(
    () => baseBodyShopItems.find((i: any) => (i.name || '').trim().toLowerCase() === 'female'),
    [baseBodyShopItems],
  );

  const getAvatarImage = () => {
    switch (positioning.selectedAvatar) {
      case 'female':
        return '/NoobWoman.png';
      case 'female_base_body':
        return femaleBaseBodyItem?.image_url || '/NoobWoman.png';
      case 'nonbinary':
        return '/Noobnonbinary.png';
      case 'male':
        return '/NoobMan.png';
      case 'male_base_body':
        return maleBaseBodyItem?.image_url || '/NoobMan.png';
      default:
        return '/NoobMan.png';
    }
  };

  const getAvatarImageForGender = (gender: 'male' | 'female') => {
    if (gender === 'female') return femaleBaseBodyItem?.image_url || '/NoobWoman.png';
    return maleBaseBodyItem?.image_url || '/NoobMan.png';
  };

  const baseAvatarOptions = useMemo(() => {
    const opts: { value: string; label: string; icon: string }[] = [
      { value: 'male', label: 'Male', icon: '👨' },
      { value: 'female', label: 'Female', icon: '👩' },
    ];
    if (maleBaseBodyItem) opts.push({ value: 'male_base_body', label: 'Male (base_body)', icon: '👨' });
    if (femaleBaseBodyItem) opts.push({ value: 'female_base_body', label: 'Female (base_body)', icon: '👩' });
    return opts;
  }, [maleBaseBodyItem, femaleBaseBodyItem]);

  const showDualPositioning = DUAL_POSITION_SLOTS.includes(formData.slot);
  const genderValues = Array.isArray(formData.gender) ? formData.gender : [formData.gender].filter(Boolean);
  const currentMaskUrl = (editingGender === 'female' && formData.eraser_mask_url_female)
    ? formData.eraser_mask_url_female
    : formData.eraser_mask_url;

  return (
    <div className="space-y-4">
      <div className="text-center mb-6">
        <h3 className="text-lg font-header font-black uppercase tracking-widest text-red-400 drop-shadow-[0_0_8px_rgba(239,68,68,0.8)]">
          {editingItem?.id ? 'Edit Shop Item' : editingItem ? 'Duplicate Shop Item' : 'Create Shop Item'}
        </h3>
        <p className="text-sm text-gray-400 mt-2">
          Upload an image, position it on the avatar, and save everything at once.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 md:gap-8">
        <div className="lg:col-span-2 space-y-3 md:space-y-4">
          <form id="shop-item-form" onSubmit={handleSubmit} className="space-y-4">
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
              options={[
                { value: 'face', label: 'Face (Makeup / tattoo – sellable)' },
                { value: 'body', label: 'Body (Shirts, armor)' },
                { value: 'weapon', label: 'Weapon' },
                { value: 'head', label: 'Head (Hats, crowns)' },
                { value: 'eyes', label: 'Eyes (Glasses, goggles – sellable)' },
                { value: 'back', label: 'Back (Backpacks, capes, flags)' },
                { value: 'shoulder', label: 'Shoulder (Pauldrons, pads, mantle)' },
                { value: 'hands', label: 'Hands (Gloves)' },
                { value: 'feet', label: 'Feet (Shoes, boots)' },
                { value: 'background', label: 'Background (Scenes)' },
                { value: 'accessory', label: 'Accessory (Jewelry, charms, scarves, earrings)' },
                { value: 'magic effects', label: 'Magic Effects (Aura)' },
                { value: 'other', label: 'Other (Consumables, Misc)' },
                { value: 'avatar', label: 'Avatar' },
                { value: 'base_body', label: 'Base Body (Creator – not in shop)' },
                { value: 'face_eyes', label: 'Face Eyes (Creator – avatar lab only)' },
                { value: 'face_mouth', label: 'Face Mouth (Creator – avatar lab only)' },
                { value: 'hair', label: 'Hair (Creator – not in shop)' },
                { value: 'hand_grip', label: 'Hand Grip (System – hidden)' }
              ]}
              onChange={(value) => {
                setFormData({ ...formData, slot: value });
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
                  setFormData({ ...formData, grip_type: value || null });
                  setGripTypeOpen(false);
                }}
                isOpen={gripTypeOpen}
                onToggle={() => setGripTypeOpen(!gripTypeOpen)}
              />
            )}

            <BonusesSection
              bonuses={bonuses}
              setBonuses={setBonuses}
              bonusTypeOpenIndex={bonusTypeOpenIndex}
              setBonusTypeOpenIndex={setBonusTypeOpenIndex}
            />

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
                        if (genderValues.includes(value)) newGenders = genderValues.filter(g => g !== value && g !== 'unisex');
                        else newGenders = [...genderValues.filter(g => g !== 'unisex'), value];
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

            <RequirementsSection
              formData={formData}
              setFormData={setFormData}
              safeFormData={safeFormData}
              classReqOpen={classReqOpen}
              setClassReqOpen={setClassReqOpen}
              isStackable={isStackable}
              setIsStackable={setIsStackable}
              isSellable={isSellable}
              setIsSellable={setIsSellable}
              isGlobal={isGlobal}
              setIsGlobal={setIsGlobal}
              onboardingAvailable={onboardingAvailable}
              setOnboardingAvailable={setOnboardingAvailable}
              CREATOR_SLOTS={CREATOR_SLOTS}
            />

            <div>
              <label className="block text-xs font-black uppercase text-gray-300 mb-1">Description</label>
              <textarea name="itemDescription" value={safeFormData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} rows={3} placeholder="Enter item description..." className="w-full bg-black border border-gray-700 rounded px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-red-500 focus:outline-none z-10 relative" />
            </div>

            <ItemEffectsSection
              effectType={effectType}
              setEffectType={setEffectType}
              effectTypeOpen={effectTypeOpen}
              setEffectTypeOpen={setEffectTypeOpen}
              effectHealAmount={effectHealAmount}
              setEffectHealAmount={setEffectHealAmount}
              effectBuffStat={effectBuffStat}
              setEffectBuffStat={setEffectBuffStat}
              effectBuffValue={effectBuffValue}
              setEffectBuffValue={setEffectBuffValue}
              effectBuffDuration={effectBuffDuration}
              setEffectBuffDuration={setEffectBuffDuration}
              effectBuffStatOpen={effectBuffStatOpen}
              setEffectBuffStatOpen={setEffectBuffStatOpen}
              effectGiveExpAmount={effectGiveExpAmount}
              setEffectGiveExpAmount={setEffectGiveExpAmount}
              effectGiveGoldAmount={effectGiveGoldAmount}
              setEffectGiveGoldAmount={setEffectGiveGoldAmount}
              effectCallingCardSkinId={effectCallingCardSkinId}
              setEffectCallingCardSkinId={setEffectCallingCardSkinId}
              effectCaptureBonus={effectCaptureBonus}
              setEffectCaptureBonus={setEffectCaptureBonus}
              effectIsConsumable={effectIsConsumable}
              setEffectIsConsumable={setEffectIsConsumable}
              itemEffectsJson={itemEffectsJson}
              setItemEffectsJson={setItemEffectsJson}
            />

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
                  <div><label className="block text-xs font-bold text-gray-300 mb-1">Frame Width</label><input type="number" value={animConfig.frameWidth} onChange={(e) => setAnimConfig(prev => ({ ...prev, frameWidth: parseInt(e.target.value) || 0 }))} className="w-full bg-black border border-gray-700 rounded px-3 py-2 text-sm text-white" min={1} /></div>
                  <div><label className="block text-xs font-bold text-gray-300 mb-1">Frame Height</label><input type="number" value={animConfig.frameHeight} onChange={(e) => setAnimConfig(prev => ({ ...prev, frameHeight: parseInt(e.target.value) || 0 }))} className="w-full bg-black border border-gray-700 rounded px-3 py-2 text-sm text-white" min={1} /></div>
                  <div><label className="block text-xs font-bold text-gray-300 mb-1">Total Frames</label><input type="number" value={animConfig.totalFrames} onChange={(e) => setAnimConfig(prev => ({ ...prev, totalFrames: parseInt(e.target.value) || 1 }))} className="w-full bg-black border border-gray-700 rounded px-3 py-2 text-sm text-white" min={1} /></div>
                  <div><label className="block text-xs font-bold text-gray-300 mb-1">FPS</label><input type="number" value={animConfig.fps} onChange={(e) => setAnimConfig(prev => ({ ...prev, fps: parseInt(e.target.value) || 1 }))} className="w-full bg-black border border-gray-700 rounded px-3 py-2 text-sm text-white" min={1} max={60} /></div>
                </div>
              </div>
            )}

            <div className="p-4 border border-blue-900/30 bg-black/40 rounded mt-4 space-y-3">
              <h3 className="text-blue-500 text-sm font-bold uppercase">Targeted Masking</h3>
              <p className="text-xs text-gray-400 mb-2">Erase parts of layers underneath when this item is equipped.</p>
              
              <div className="space-y-2 bg-gray-900/50 p-3 rounded border border-gray-700">
                <label className="block text-xs font-black uppercase text-gray-300 mb-2">Target Layers to Mask</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { value: 'base_body', label: 'Base Body' },
                    { value: 'avatar', label: 'Unique Avatars' },
                    { value: 'hair', label: 'Hair' },
                    { value: 'body', label: 'Shirt / Body' },
                    { value: 'weapon', label: 'Weapon' },
                    { value: 'head', label: 'Head / Hat' },
                    { value: 'eyes', label: 'Eyes (Gear)' },
                    { value: 'face_eyes', label: 'Eyes (Base)' },
                    { value: 'face_mouth', label: 'Mouth (Base)' },
                    { value: 'face', label: 'Face / Makeup' },
                    { value: 'back', label: 'Back' },
                    { value: 'shoulder', label: 'Shoulder' },
                    { value: 'hands', label: 'Hands' },
                    { value: 'feet', label: 'Feet' },
                    { value: 'accessory', label: 'Accessory' },
                    { value: 'magic effects', label: 'Magic Effects' },
                    { value: 'hand_grip', label: 'Hand Grip' },
                  ].map(target => (
                    <label key={target.value} className="flex items-center gap-2 cursor-pointer group">
                      <input 
                        type="checkbox" 
                        checked={formData.eraser_mask_targets?.includes(target.value) || false}
                        onChange={(e) => {
                          const current = formData.eraser_mask_targets || [];
                          const newTargets = e.target.checked 
                            ? [...current, target.value] 
                            : current.filter(t => t !== target.value);
                          
                          setFormData(prev => ({ 
                            ...prev, 
                            eraser_mask_targets: newTargets,
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
                          onClick={() => setFormData(prev => ({ ...prev, eraser_mask_url: null }))}
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
                          onClick={() => setFormData(prev => ({ ...prev, eraser_mask_url_female: null }))}
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
          </form>
        </div>

        <div className="lg:col-span-3 space-y-3 md:space-y-4">
          <div>
            <label className="block text-xs font-black uppercase text-gray-300 mb-2">Base Avatar</label>
            <div className="flex flex-wrap gap-2 justify-center">
              {baseAvatarOptions.map(({ value, label, icon }) => (
                <button 
                  key={value} 
                  onClick={() => {
                    setPositioning(prev => ({ ...prev, selectedAvatar: value as any }));
                    if (value === 'female' || value === 'female_base_body') {
                      setEditingGender('female');
                    } else if (value === 'male' || value === 'male_base_body') {
                      setEditingGender('male');
                    }
                  }} 
                  className={`flex-1 min-w-[4.5rem] px-3 py-2 rounded-lg text-xs font-bold transition-all ${positioning.selectedAvatar === value ? 'bg-cyan-600 text-white shadow-[0_0_10px_rgba(6,182,212,0.3)]' : 'bg-gray-700 hover:bg-gray-600 text-gray-300 hover:text-white'}`}
                >
                  <div className="flex flex-col items-center gap-1"><span className="text-sm">{icon}</span><span>{label}</span></div>
                </button>
              ))}
            </div>
          </div>

          <AvatarPreview
            formData={formData}
            previewZoom={previewZoom}
            setPreviewZoom={setPreviewZoom}
            currentMaskUrl={currentMaskUrl}
            positioning={positioning}
            maleBaseBodyItem={maleBaseBodyItem}
            femaleBaseBodyItem={femaleBaseBodyItem}
            getAvatarImage={getAvatarImage}
            SKIN_TINT_SLOTS={SKIN_TINT_SLOTS}
            baseLayerPreviewUrl={baseLayerPreviewUrl}
            baseLayerFetchedUrl={baseLayerFetchedUrl}
            editingItem={editingItem}
            previewUrl={previewUrl}
            editingGender={editingGender}
            isDragging={isDragging}
            handleMouseDown={handleMouseDown}
            skinColor={skinColor}
            setSkinColor={setSkinColor}
            showHandPreview={showHandPreview}
            handOpacity={handOpacity}
            previewGripType={previewGripType}
            shopItems={shopItems}
            isAnimated={isAnimated}
            animConfig={animConfig}
          />

          <PositioningControls
            showDualPositioning={showDualPositioning}
            editingGender={editingGender}
            setEditingGender={setEditingGender}
            positioning={positioning}
            setPositioning={setPositioning}
            formData={formData}
            showHandPreview={showHandPreview}
            setShowHandPreview={setShowHandPreview}
            previewGripType={previewGripType}
            setPreviewGripType={setPreviewGripType}
            handOpacity={handOpacity}
            setHandOpacity={setHandOpacity}
          />
                      </div>
      </div>

      <div className="flex gap-3 justify-center pt-6 border-t border-gray-800">
        <motion.button
          type="submit"
          form="shop-item-form"
          disabled={uploading || isSaving}
          className={`px-6 py-3 rounded-lg text-sm font-bold transition-all duration-200 ${saveStatus === 'success' ? 'bg-green-600 hover:bg-green-500 text-white' : 'bg-red-600 hover:bg-red-500 disabled:bg-red-700 text-white'}`}
          animate={{ boxShadow: isSaving ? '0 0 20px rgba(6, 182, 212, 0.8)' : 'none' }}
          transition={{ duration: 0.3 }}
        >
          {uploading ? <><Loader2 size={16} className="inline mr-2 animate-spin" />Uploading...</> : saveStatus === 'saving' ? <><Loader2 size={16} className="inline mr-2 animate-spin" />Saving...</> : saveStatus === 'success' ? <><CheckCircle size={16} className="inline mr-2" />{editingItem?.id ? 'Updated successfully' : 'Created successfully'}</> : editingItem ? 'Update Shop Item' : 'Create Shop Item'}
        </motion.button>
        <button type="button" onClick={onCancel} disabled={uploading} className="px-6 py-3 bg-gray-600 hover:bg-gray-500 disabled:bg-gray-700 disabled:cursor-not-allowed text-white rounded-lg text-sm font-bold">
          Cancel
        </button>
      </div>

      {showMaskPainter && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="relative">
            <button 
              onClick={() => setShowMaskPainter(false)}
              className="absolute -top-10 right-0 text-white font-bold bg-red-600 px-3 py-1 rounded hover:bg-red-500"
            >
              Close
            </button>
            {(() => {
              const paintForFemale = showMaskPainterForFemale;
              let secondaryRef = undefined;
              const maskGender = paintForFemale ? 'female' : 'male';
              const currentMaskUrl = paintForFemale ? formData.eraser_mask_url_female : formData.eraser_mask_url;
              const activePreviewGrip = formData.slot === 'weapon' ? formData.grip_type : (formData.slot === 'hand_grip' ? formData.grip_type : null);

              if (activePreviewGrip) {
                const targetSlot = formData.slot === 'weapon' ? 'hand_grip' : 'weapon';
                const refItem = shopItems.find((i: any) => {
                  if (i.slot !== targetSlot || i.grip_type !== activePreviewGrip) return false;
                  const itemGender = Array.isArray(i.gender) ? i.gender : [i.gender];
                  return itemGender.includes(maskGender) || itemGender.includes('unisex');
                });

                if (refItem?.image_url) {
                  const isFemaleRef = maskGender === 'female';
                  secondaryRef = {
                    url: refItem.image_url,
                    offsetX: (isFemaleRef && refItem.offset_x_female !== null && refItem.offset_x_female !== undefined) ? refItem.offset_x_female : (refItem.offset_x || 0),
                    offsetY: (isFemaleRef && refItem.offset_y_female !== null && refItem.offset_y_female !== undefined) ? refItem.offset_y_female : (refItem.offset_y || 0),
                    scale: (isFemaleRef && refItem.scale_female !== null && refItem.scale_female !== undefined) ? refItem.scale_female : (refItem.scale || 1),
                    rotation: (isFemaleRef && refItem.rotation_female !== null && refItem.rotation_female !== undefined) ? refItem.rotation_female : (refItem.rotation || 0),
                    zIndex: refItem.z_index,
                    opacity: 1.0,
                    useFullSize: targetSlot === 'hand_grip',
                    isAnimated: !!refItem.is_animated,
                    animConfig: refItem.animation_config ? (typeof refItem.animation_config === 'string' ? JSON.parse(refItem.animation_config) : refItem.animation_config) : undefined
                  };
                }
              }

              return (
                <MaskPainter
                  baseReferenceUrl={maskGender === 'female' ? '/NoobWoman.png' : '/NoobMan.png'}
                  itemUrl={previewUrl || editingItem?.image_url || ''}
                  maskUrl={currentMaskUrl}
                  offsetX={paintForFemale ? positioning.offsetXFemale : positioning.offsetX}
                  offsetY={paintForFemale ? positioning.offsetYFemale : positioning.offsetY}
                  scale={paintForFemale ? positioning.scaleFemale : positioning.scale}
                  rotation={paintForFemale ? positioning.rotationFemale : positioning.rotation}
                  useFullSize={['base_body', 'hand_grip'].includes(formData.slot)}
                  isAnimated={isAnimated}
                  animConfig={animConfig}
                  secondaryReference={secondaryRef}
                  onSaveMask={paintForFemale ? handleSaveMaskFemale : handleSaveMask}
                />
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
});

export default AddShopItemForm;
