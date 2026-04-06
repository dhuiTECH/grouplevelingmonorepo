"use client";

import React, { useState, useEffect, useRef } from "react";
import { adminAuthorizedUpload } from "@/lib/admin-authorized-fetch";
import type { AddShopItemFormProps, ShopItemFormFieldsProps } from "./types";
import type { ShopItemPreviewStageProps } from "./ShopItemPreviewStage";
import {
  SKIN_TINT_SLOTS,
  CREATOR_SLOTS,
  DUAL_POSITION_SLOTS,
} from "./constants";
import { getGenderValue, isVideoFile } from "./helpers";

export function useAddShopItemForm({
  onAdd,
  onEdit,
  onCancel,
  editingItem,
  gachaCollections,
  baseBodyShopItems = [],
  shopItems = [],
}: AddShopItemFormProps) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    slot: 'head',
    is_animated: false,
    price: '0',
    rarity: 'common',
    gender: 'unisex' as string | string[],
    min_level: '1',
    class_req: 'All',
    no_restrictions: false,
    grip_type: null as string | null,
    weapon_type: null as string | null,
    hand_grip_z_index_override: null as number | null,
    eraser_mask_targets: [] as string[],
    eraser_mask_url: null as string | null,
    eraser_mask_url_female: null as string | null
  });

  const [handOpacity, setHandOpacity] = useState(1.0);
  const [showHandPreview, setShowHandPreview] = useState(true);
  const [previewGripType, setPreviewGripType] = useState<string | null>(null); // For avatars/base_body to preview hands

  const [editingGender, setEditingGender] = useState<'male' | 'female'>('male');

  const showDualPositioning = (DUAL_POSITION_SLOTS as readonly string[]).includes(
    formData.slot
  );

  const safeFormData = {
    name: formData.name ?? '',
    description: formData.description ?? '',
    slot: formData.slot ?? 'head',
    is_animated: formData.is_animated ?? false,
    price: formData.price ?? '0',
    rarity: formData.rarity ?? 'common',
    gender: formData.gender ?? 'unisex',
    min_level: formData.min_level ?? '1',
    class_req: formData.class_req ?? 'All',
    no_restrictions: formData.no_restrictions ?? false,
    grip_type: formData.grip_type ?? null,
    weapon_type: formData.weapon_type ?? null
  };

  useEffect(() => {
    if (editingItem) {
      setFormData({
        name: editingItem.name ?? '',
        description: editingItem.description ?? '',
        slot: editingItem.slot ?? 'head',
        is_animated: Boolean(editingItem.is_animated ?? false),
        price: String(editingItem.price ?? 0),
        rarity: editingItem.rarity ?? 'common',
        gender: editingItem.gender ?? 'unisex',
        min_level: editingItem.min_level?.toString() || '1',
        class_req: editingItem.class_req || 'All',
        no_restrictions: Boolean(editingItem.no_restrictions ?? false),
        grip_type: editingItem.grip_type ?? null,
        weapon_type: editingItem.weapon_type ?? null,
        hand_grip_z_index_override: editingItem.hand_grip_z_index_override ?? null,
        eraser_mask_targets: Array.isArray(editingItem.eraser_mask_targets) ? editingItem.eraser_mask_targets : 
                             (typeof editingItem.eraser_mask_targets === 'string' && editingItem.eraser_mask_targets !== 'none' ? [editingItem.eraser_mask_targets] : []),
        eraser_mask_url: editingItem.eraser_mask_url ?? null,
        eraser_mask_url_female: editingItem.eraser_mask_url_female ?? null
      });
      setOnboardingAvailable(Boolean(editingItem.onboarding_available ?? false));
    } else {
      setFormData({
        name: '',
        description: '',
        slot: 'head',
        is_animated: false,
        price: '0',
        rarity: 'common',
        gender: 'unisex',
        min_level: '1',
        class_req: 'All',
        no_restrictions: false,
        grip_type: null,
        weapon_type: null,
        hand_grip_z_index_override: null,
        eraser_mask_targets: [],
        eraser_mask_url: null,
        eraser_mask_url_female: null
      });
      setOnboardingAvailable(false);
    }
  }, [editingItem]);

  const [bonuses, setBonuses] = useState<Array<{ type: string; value: number }>>([]);
  const [positioning, setPositioning] = useState({
    offsetX: 0,
    offsetY: 0,
    zIndex: 15,
    rotation: 0,
    scale: 1.0,
    offsetXFemale: 0,
    offsetYFemale: 0,
    scaleFemale: 1.0,
    rotationFemale: 0,
    selectedAvatar: 'male' as 'male' | 'female' | 'nonbinary' | 'male_base_body' | 'female_base_body'
  });
  const [previewZoom, setPreviewZoom] = useState(1.0);
  const [isAnimated, setIsAnimated] = useState(false);
  const [animConfig, setAnimConfig] = useState({
    frameWidth: 64,
    frameHeight: 64,
    totalFrames: 4,
    fps: 10
  });
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success'>('idle');
  const [isStackable, setIsStackable] = useState(false);
  const [itemEffectsJson, setItemEffectsJson] = useState('');
  const [isGachaExclusive, setIsGachaExclusive] = useState(false);
  const [collectionName, setCollectionName] = useState('Standard');
  const [collectionId, setCollectionId] = useState<string | null>(null);
  const [gemPrice, setGemPrice] = useState<number | null>(null);
  const [isSellable, setIsSellable] = useState(true);
  const [isGlobal, setIsGlobal] = useState(true);
  const [onboardingAvailable, setOnboardingAvailable] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<{ x: number; y: number; offsetX: number; offsetY: number } | null>(null);

  const [effectType, setEffectType] = useState<'none' | 'heal' | 'buff' | 'give_exp' | 'give_gold' | 'calling_card' | 'capture_tool' | 'custom'>('none');
  const [effectHealAmount, setEffectHealAmount] = useState(50);
  const [effectBuffStat, setEffectBuffStat] = useState('str');
  const [effectBuffValue, setEffectBuffValue] = useState(5);
  const [effectBuffDuration, setEffectBuffDuration] = useState(60);
  const [effectGiveExpAmount, setEffectGiveExpAmount] = useState(100);
  const [effectGiveGoldAmount, setEffectGiveGoldAmount] = useState(50);
  const [effectCallingCardSkinId, setEffectCallingCardSkinId] = useState('');
  const [effectCaptureBonus, setEffectCaptureBonus] = useState(0.1);
  const [effectIsConsumable, setEffectIsConsumable] = useState(true);

  const [skinColor, setSkinColor] = useState('#FFDBAC');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedThumbnailFile, setSelectedThumbnailFile] = useState<File | null>(null);
  const [selectedBaseLayerFile, setSelectedBaseLayerFile] = useState<File | null>(null);
  const [baseLayerPreviewUrl, setBaseLayerPreviewUrl] = useState<string | null>(null);
  const [baseLayerFetchedUrl, setBaseLayerFetchedUrl] = useState<string | null>(null);
  const [thumbnailCleared, setThumbnailCleared] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isVideoPreview, setIsVideoPreview] = useState(false);
  const [slotOpen, setSlotOpen] = useState(false);
  const [bonusTypeOpenIndex, setBonusTypeOpenIndex] = useState<number | null>(null);
  const [rarityOpen, setRarityOpen] = useState(false);
  const [classReqOpen, setClassReqOpen] = useState(false);
  const [effectTypeOpen, setEffectTypeOpen] = useState(false);
  const [effectBuffStatOpen, setEffectBuffStatOpen] = useState(false);
  const [collectionOpen, setCollectionOpen] = useState(false);
  const [gripTypeOpen, setGripTypeOpen] = useState(false);
  const [weaponTypeOpen, setWeaponTypeOpen] = useState(false);
  const [showMaskPainter, setShowMaskPainter] = useState(false);
  const [showMaskPainterForFemale, setShowMaskPainterForFemale] = useState(false);
  const [eraserMaskTargetOpen, setEraserMaskTargetOpen] = useState(false);

  useEffect(() => {
    if (formData.slot !== 'base_body') setSelectedBaseLayerFile(null);
  }, [formData.slot]);

  useEffect(() => {
    if (!selectedBaseLayerFile) {
      setBaseLayerPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(selectedBaseLayerFile);
    setBaseLayerPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [selectedBaseLayerFile]);

  useEffect(() => {
    const url = editingItem?.image_base_url;
    if (!url || typeof url !== 'string' || !url.startsWith('http')) {
      setBaseLayerFetchedUrl(null);
      return () => {};
    }
    let cancelled = false;
    fetch(url, { mode: 'cors' })
      .then((r) => r.blob())
      .then((blob) => {
        const blobUrl = URL.createObjectURL(blob);
        if (cancelled) {
          URL.revokeObjectURL(blobUrl);
          return;
        }
        setBaseLayerFetchedUrl(blobUrl);
      })
      .catch(() => {
        if (!cancelled) setBaseLayerFetchedUrl(null);
      });
    return () => {
      cancelled = true;
      setBaseLayerFetchedUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });
    };
  }, [editingItem?.image_base_url]);

  useEffect(() => {
    if (editingItem) {
      if (editingItem.bonuses && Array.isArray(editingItem.bonuses) && editingItem.bonuses.length > 0) {
        setBonuses(editingItem.bonuses);
      } else if (editingItem.bonus_type && editingItem.bonus_value) {
        setBonuses([{ type: editingItem.bonus_type, value: editingItem.bonus_value }]);
      } else {
        setBonuses([]);
      }
      setIsAnimated(editingItem.is_animated || false);
      if (editingItem.animation_config) {
        setAnimConfig({
          frameWidth: editingItem.animation_config.frameWidth || 64,
          frameHeight: editingItem.animation_config.frameHeight || 64,
          totalFrames: editingItem.animation_config.totalFrames || 4,
          fps: editingItem.animation_config.fps || 10
        });
      }
      setPositioning({
        offsetX: editingItem.offset_x || 0,
        offsetY: editingItem.offset_y || 0,
        zIndex: editingItem.z_index ?? 15,
        rotation: editingItem.rotation || 0,
        scale: typeof editingItem.scale === 'number' ? editingItem.scale : parseFloat(String(editingItem.scale || 1.0)),
        offsetXFemale: editingItem.offset_x_female ?? editingItem.offset_x ?? 0,
        offsetYFemale: editingItem.offset_y_female ?? editingItem.offset_y ?? 0,
        scaleFemale: editingItem.scale_female !== undefined && editingItem.scale_female !== null 
          ? (typeof editingItem.scale_female === 'number' ? editingItem.scale_female : parseFloat(String(editingItem.scale_female))) 
          : (typeof editingItem.scale === 'number' ? editingItem.scale : parseFloat(String(editingItem.scale || 1.0))),
        rotationFemale: editingItem.rotation_female ?? editingItem.rotation ?? 0,
        selectedAvatar: 'male'
      });
      // setScale(editingItem.scale || 1.0); // Now handled in positioning state
      setIsStackable(editingItem.is_stackable || false);
      const ie = editingItem.item_effects;
      if (!ie || (typeof ie === 'object' && Object.keys(ie).length === 0)) {
        setEffectType('none');
        setEffectHealAmount(50);
        setEffectBuffStat('str');
        setEffectBuffValue(5);
        setEffectBuffDuration(60);
        setEffectGiveExpAmount(100);
        setEffectGiveGoldAmount(50);
        setEffectCallingCardSkinId('');
        setEffectCaptureBonus(0.1);
        setEffectIsConsumable(true);
        setItemEffectsJson('');
      } else if (ie.subtype === 'calling_card') {
        setEffectType('calling_card');
        setEffectCallingCardSkinId(ie.skin_id ?? '');
        setEffectCaptureBonus(0.1);
        setEffectIsConsumable(true);
        setItemEffectsJson('');
      } else if (ie.type === 'capture_tool') {
        setEffectType('capture_tool');
        setEffectCaptureBonus(Number(ie.capture_bonus) || 0.1);
        setEffectIsConsumable(ie.is_consumable !== false);
        setEffectCallingCardSkinId('');
        setItemEffectsJson('');
      } else if (ie.type === 'heal') {
        setEffectType('heal');
        setEffectHealAmount(Number(ie.amount) || 50);
        setEffectCaptureBonus(0.1);
        setEffectIsConsumable(true);
        setItemEffectsJson('');
      } else if (ie.type === 'buff') {
        setEffectType('buff');
        setEffectBuffStat(ie.stat ?? 'str');
        setEffectBuffValue(Number(ie.value) ?? 5);
        setEffectBuffDuration(Number(ie.duration) ?? 60);
        setEffectCaptureBonus(0.1);
        setEffectIsConsumable(true);
        setItemEffectsJson('');
      } else if (ie.type === 'give_exp') {
        setEffectType('give_exp');
        setEffectGiveExpAmount(Number(ie.amount) || 100);
        setEffectCaptureBonus(0.1);
        setEffectIsConsumable(true);
        setItemEffectsJson('');
      } else if (ie.type === 'give_gold') {
        setEffectType('give_gold');
        setEffectGiveGoldAmount(Number(ie.amount) || 50);
        setEffectCaptureBonus(0.1);
        setEffectIsConsumable(true);
        setItemEffectsJson('');
      } else {
        setEffectType('custom');
        setEffectCaptureBonus(0.1);
        setEffectIsConsumable(true);
        setItemEffectsJson(JSON.stringify(ie, null, 2));
      }
      setIsGachaExclusive(editingItem.is_gacha_exclusive || false);
      setCollectionName(editingItem.collection_name || 'Standard');
      setCollectionId(editingItem.collection_id || null);
      setGemPrice(editingItem.gem_price !== undefined ? editingItem.gem_price : null);
      setIsSellable(editingItem.is_sellable !== false);
      setIsGlobal(editingItem.is_global !== false);
      setThumbnailCleared(false);
      if (editingItem.image_url) {
        setPreviewUrl(editingItem.image_url);
        setIsVideoPreview(isVideoFile(editingItem.image_url));
      } else {
        setPreviewUrl(null);
      }
      if ((SKIN_TINT_SLOTS as readonly string[]).includes(editingItem.slot)) {
        setSkinColor(editingItem.skin_tint_hex || '#FFDBAC');
      }
    } else {
      setBonuses([]);
      setIsAnimated(false);
      setAnimConfig({ frameWidth: 64, frameHeight: 64, totalFrames: 4, fps: 10 });
      setPositioning({ 
        offsetX: 0, 
        offsetY: 0, 
        zIndex: 15, 
        rotation: 0, 
        scale: 1.0,
        offsetXFemale: 0,
        offsetYFemale: 0,
        scaleFemale: 1.0,
        rotationFemale: 0,
        selectedAvatar: 'male' 
      });
      // setScale(1.0); // Now handled in positioning state
      setIsStackable(false);
      setEffectType('none');
      setEffectHealAmount(50);
      setEffectBuffStat('str');
      setEffectBuffValue(5);
      setEffectBuffDuration(60);
      setEffectGiveExpAmount(100);
      setEffectGiveGoldAmount(50);
      setEffectCallingCardSkinId('');
      setItemEffectsJson('');
      setIsGachaExclusive(false);
      setCollectionName('Standard');
      setCollectionId(null);
      setGemPrice(null);
      setIsSellable(true);
      setIsGlobal(true);
      setOnboardingAvailable(false);
      setThumbnailCleared(false);
      setPreviewUrl(null);
      setIsVideoPreview(false);
      setSelectedFile(null);
      setSelectedThumbnailFile(null);
      setSelectedBaseLayerFile(null);
    }
  }, [editingItem]);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (slotOpen || rarityOpen || classReqOpen || bonusTypeOpenIndex !== null || effectTypeOpen || effectBuffStatOpen || collectionOpen || gripTypeOpen || weaponTypeOpen || eraserMaskTargetOpen) {
        if (!target.closest('[data-dropdown]')) {
          setSlotOpen(false);
          setBonusTypeOpenIndex(null);
          setRarityOpen(false);
          setClassReqOpen(false);
          setEffectTypeOpen(false);
          setEffectBuffStatOpen(false);
          setCollectionOpen(false);
          setGripTypeOpen(false);
          setEraserMaskTargetOpen(false);
        }
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [slotOpen, rarityOpen, classReqOpen, bonusTypeOpenIndex, effectTypeOpen, effectBuffStatOpen, collectionOpen, gripTypeOpen, weaponTypeOpen, eraserMaskTargetOpen]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/') && file.type !== 'video/webm') return;
      if (file.size > 5 * 1024 * 1024) return;
      setSelectedFile(file);
      setIsVideoPreview(file.type === 'video/webm');
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleSaveMask = async (base64Png: string) => {
    setUploading(true);
    try {
      // Convert base64 to Blob
      const response = await fetch(base64Png);
      const blob = await response.blob();
      const file = new File([blob], `mask_${Date.now()}.png`, { type: 'image/png' });

      const uploadResponse = await adminAuthorizedUpload('/api/admin/upload', () => {
        const fd = new FormData();
        fd.append('file', file);
        return fd;
      });
      
      if (!uploadResponse.ok) {
        throw new Error('Failed to upload mask image');
      }
      
      const uploadData = await uploadResponse.json();
      const maskUrl = uploadData.path || uploadData.url || uploadData.publicUrl;
      
      setFormData((prev: any) => ({ ...prev, eraser_mask_url: maskUrl }));
      setShowMaskPainter(false);
    } catch (err) {
      console.error('Error uploading mask:', err);
      alert('Failed to save mask. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleSaveMaskFemale = async (base64Png: string) => {
    setUploading(true);
    try {
      const response = await fetch(base64Png);
      const blob = await response.blob();
      const file = new File([blob], `mask_female_${Date.now()}.png`, { type: 'image/png' });

      const uploadResponse = await adminAuthorizedUpload('/api/admin/upload', () => {
        const fd = new FormData();
        fd.append('file', file);
        return fd;
      });

      if (!uploadResponse.ok) throw new Error('Failed to upload mask image');

      const uploadData = await uploadResponse.json();
      const maskUrl = uploadData.path || uploadData.url || uploadData.publicUrl;

      setFormData((prev: any) => ({ ...prev, eraser_mask_url_female: maskUrl }));
      setShowMaskPainter(false);
    } catch (err) {
      console.error('Error uploading female mask:', err);
      alert('Failed to save female mask. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const target = e.currentTarget;
    let finalItemEffects: any = null;
    if (effectType === 'heal') {
      finalItemEffects = { type: 'heal', amount: effectHealAmount };
    } else if (effectType === 'buff') {
      finalItemEffects = { type: 'buff', stat: effectBuffStat, value: effectBuffValue, duration: effectBuffDuration };
    } else if (effectType === 'give_exp') {
      finalItemEffects = { type: 'give_exp', amount: effectGiveExpAmount };
    } else if (effectType === 'give_gold') {
      finalItemEffects = { type: 'give_gold', amount: effectGiveGoldAmount };
    } else if (effectType === 'calling_card') {
      finalItemEffects = { subtype: 'calling_card', skin_id: effectCallingCardSkinId.trim() || undefined };
    } else if (effectType === 'capture_tool') {
      finalItemEffects = { type: 'capture_tool', capture_bonus: effectCaptureBonus, is_consumable: effectIsConsumable };
    } else if (effectType === 'custom' && itemEffectsJson.trim() !== '') {
      try {
        finalItemEffects = JSON.parse(itemEffectsJson);
      } catch {
        alert('Error: Invalid JSON format in Item Effects. Please ensure it is valid JSON.');
        return;
      }
    }

    const itemData: any = {
      name: (target.elements.namedItem('itemName') as HTMLInputElement)?.value || '',
      description: (target.elements.namedItem('itemDescription') as HTMLTextAreaElement)?.value || '',
      image_url: editingItem?.image_url || '',
      image_base_url: (SKIN_TINT_SLOTS as readonly string[]).includes(formData.slot) ? (editingItem?.image_base_url ?? null) : undefined,
      skin_tint_hex: (SKIN_TINT_SLOTS as readonly string[]).includes(formData.slot) ? (skinColor || null) : undefined,
      thumbnail_url: editingItem?.thumbnail_url || '',
      slot: formData.slot,
      bonuses,
      is_animated: isAnimated,
      price: parseInt((target.elements.namedItem('itemPrice') as HTMLInputElement)?.value || formData.price || '0'),
      gem_price: gemPrice,
      rarity: formData.rarity,
      gender: getGenderValue(formData.gender),
      min_level: safeFormData.no_restrictions ? null : parseInt(safeFormData.min_level),
      class_req: safeFormData.no_restrictions ? null : safeFormData.class_req,
      no_restrictions: safeFormData.no_restrictions,
      is_stackable: isStackable,
      item_effects: finalItemEffects,
      is_global: isGlobal,
      is_gacha_exclusive: isGachaExclusive,
      collection_name: isGachaExclusive ? (gachaCollections.find(c => c.id === collectionId)?.name || collectionName) : 'Standard',
      collection_id: isGachaExclusive ? collectionId : null,
      offset_x: positioning.offsetX,
      offset_y: positioning.offsetY,
      z_index: positioning.zIndex,
      rotation: positioning.rotation,
      scale: positioning.scale,
      offset_x_female: positioning.offsetXFemale,
      offset_y_female: positioning.offsetYFemale,
      scale_female: positioning.scaleFemale,
      rotation_female: positioning.rotationFemale,
      animation_config: isAnimated ? animConfig : null,
      is_sellable: ['base_body', 'face_eyes', 'face_mouth', 'hair', 'hand_grip'].includes(formData.slot) ? false : isSellable,
      onboarding_available: (CREATOR_SLOTS as readonly string[]).includes(formData.slot) ? onboardingAvailable : false,
      grip_type: formData.grip_type,
      weapon_type:
        formData.slot === 'weapon' &&
        (formData.grip_type === 'All Around' || formData.grip_type === '' || formData.grip_type == null)
          ? formData.weapon_type || null
          : null,
      hand_grip_z_index_override: formData.hand_grip_z_index_override,
      eraser_mask_targets: formData.eraser_mask_targets,
      eraser_mask_url: formData.eraser_mask_url,
      eraser_mask_url_female: formData.eraser_mask_url_female ?? null
    };

    if (editingItem && thumbnailCleared) itemData.thumbnail_url = null;
    if (!editingItem && !selectedFile) return;

    if (selectedFile) {
      setUploading(true);
      try {
        const uploadResponse = await adminAuthorizedUpload('/api/admin/upload', () => {
          const fd = new FormData();
          fd.append('file', selectedFile);
          return fd;
        });
        if (!uploadResponse.ok) {
          const errBody = await uploadResponse.json().catch(() => ({}));
          throw new Error((errBody.details || errBody.error) || 'Failed to upload image');
        }
        const uploadData = await uploadResponse.json();
        itemData.image_url = uploadData.path || uploadData.url || uploadData.publicUrl || '';
        if (!itemData.image_url) {
          setUploading(false);
          alert('Upload succeeded but no image URL was returned. Please try again.');
          return;
        }
      } catch (err) {
        console.error('Upload error:', err);
        setUploading(false);
        alert(err instanceof Error ? err.message : 'Upload failed');
        return;
      }
    }

    if ((SKIN_TINT_SLOTS as readonly string[]).includes(formData.slot) && selectedBaseLayerFile) {
      setUploading(true);
      try {
        const baseRes = await adminAuthorizedUpload('/api/admin/upload', () => {
          const fd = new FormData();
          fd.append('file', selectedBaseLayerFile);
          return fd;
        });
        if (!baseRes.ok) {
          const errBody = await baseRes.json().catch(() => ({}));
          throw new Error((errBody.details || errBody.error) || 'Failed to upload base layer');
        }
        const baseData = await baseRes.json();
        itemData.image_base_url = baseData.path || baseData.url || baseData.publicUrl || '';
        if (!itemData.image_base_url) {
          setUploading(false);
          alert('Base layer upload succeeded but no URL was returned. Please try again.');
          return;
        }
      } catch (err) {
        console.error('Base layer upload error:', err);
        setUploading(false);
        alert(err instanceof Error ? err.message : 'Failed to upload base layer');
        return;
      }
    }

    if (selectedThumbnailFile) {
      setUploading(true);
      try {
        const res = await adminAuthorizedUpload('/api/admin/upload', () => {
          const fd = new FormData();
          fd.append('file', selectedThumbnailFile);
          return fd;
        });
        if (!res.ok) {
          const errBody = await res.json().catch(() => ({}));
          throw new Error((errBody.details || errBody.error) || 'Failed to upload thumbnail');
        }
        const data = await res.json();
        itemData.thumbnail_url = data.path || data.url || data.publicUrl || '';
      } catch (err) {
        console.error('Thumbnail upload error:', err);
        setUploading(false);
        return;
      }
    }

    setUploading(false);
    if (!itemData.name.trim() || !itemData.slot) return;

    setIsSaving(true);
    setSaveStatus('saving');
    try {
      if (editingItem?.id) {
        await onEdit(itemData);
      } else {
        await onAdd(itemData);
      }
      setSaveStatus('success');
      setTimeout(() => {
        setIsSaving(false);
        setSaveStatus('idle');
        onCancel();
      }, 1500);
    } catch (err) {
      setIsSaving(false);
      setSaveStatus('idle');
      throw err;
    }
  };

  const maleBaseBodyItem = React.useMemo(
    () => baseBodyShopItems.find((i: any) => (i.name || '').trim().toLowerCase() === 'male'),
    [baseBodyShopItems]
  );
  const femaleBaseBodyItem = React.useMemo(
    () => baseBodyShopItems.find((i: any) => (i.name || '').trim().toLowerCase() === 'female'),
    [baseBodyShopItems]
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

  const currentMaskUrl = (editingGender === 'female' && formData.eraser_mask_url_female)
    ? formData.eraser_mask_url_female
    : formData.eraser_mask_url;

  const baseAvatarOptions = React.useMemo(() => {
    const opts: { value: string; label: string; icon: string }[] = [
      { value: 'male', label: 'Male', icon: '👨' },
      { value: 'female', label: 'Female', icon: '👩' },
    ];
    if (maleBaseBodyItem) opts.push({ value: 'male_base_body', label: 'Male (base_body)', icon: '👨' });
    if (femaleBaseBodyItem) opts.push({ value: 'female_base_body', label: 'Female (base_body)', icon: '👩' });
    return opts;
  }, [maleBaseBodyItem, femaleBaseBodyItem]);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    
    // Always track drag based on what the toggle says
    const isFemaleMode = editingGender === 'female';
    
    const startOffsetX = isFemaleMode ? positioning.offsetXFemale : positioning.offsetX;
    const startOffsetY = isFemaleMode ? positioning.offsetYFemale : positioning.offsetY;
    
    dragStartRef.current = { x: e.clientX, y: e.clientY, offsetX: startOffsetX, offsetY: startOffsetY };
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging || !dragStartRef.current) return;
    const deltaX = (e.clientX - dragStartRef.current.x) / previewZoom;
    const deltaY = (e.clientY - dragStartRef.current.y) / previewZoom;
    
    const isFemaleMode = editingGender === 'female';
    
    setPositioning((prev: any) => {
      let newOffsetX = (dragStartRef.current!.offsetX) + deltaX;
      let newOffsetY = (dragStartRef.current!.offsetY) + deltaY;

      if (e.shiftKey) {
        newOffsetX = Math.round(newOffsetX / 10) * 10;
        newOffsetY = Math.round(newOffsetY / 10) * 10;
      }
      newOffsetX = Math.max(-512, Math.min(512, newOffsetX));
      newOffsetY = Math.max(-512, Math.min(512, newOffsetY));

      // If in male mode, also update female offsets IF they are currently identical (sync mode)
      if (!isFemaleMode) {
        const shouldSync = prev.offsetXFemale === prev.offsetX && prev.offsetYFemale === prev.offsetY;
        if (shouldSync) {
          return { ...prev, offsetX: newOffsetX, offsetY: newOffsetY, offsetXFemale: newOffsetX, offsetYFemale: newOffsetY };
        }
        return { ...prev, offsetX: newOffsetX, offsetY: newOffsetY };
      }
      
      // In female mode, only update female
      return { ...prev, offsetXFemale: newOffsetX, offsetYFemale: newOffsetY };
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    dragStartRef.current = null;
  };

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging]);

  const fieldsProps: ShopItemFormFieldsProps = {
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
  };

  const previewProps: ShopItemPreviewStageProps = {
    formData,
    positioning,
    setPositioning,
    editingGender,
    setEditingGender,
    previewZoom,
    setPreviewZoom,
    baseAvatarOptions,
    maleBaseBodyItem,
    femaleBaseBodyItem,
    currentMaskUrl,
    editingItem,
    baseLayerPreviewUrl,
    baseLayerFetchedUrl,
    previewUrl,
    skinColor,
    setSkinColor,
    shopItems,
    handleMouseDown,
    isDragging,
    previewGripType,
    setPreviewGripType,
    handOpacity,
    setHandOpacity,
    showHandPreview,
    setShowHandPreview,
    isAnimated,
    animConfig,
    getAvatarImage,
    showDualPositioning,
  };

  return {
    fieldsProps,
    handleSubmit,
    previewProps,
    editingItem,
    showMaskPainter,
    setShowMaskPainter,
    showMaskPainterForFemale,
    shopItems,
    formData,
    positioning,
    isAnimated,
    animConfig,
    previewUrl,
    handleSaveMask,
    handleSaveMaskFemale,
    uploading,
    isSaving,
    saveStatus,
    onCancel,
  };
}
