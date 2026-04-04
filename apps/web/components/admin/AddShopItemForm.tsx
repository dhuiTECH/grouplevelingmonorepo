"use client";

import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Loader2, CheckCircle } from 'lucide-react';
import CustomDropdown from './CustomDropdown';
import AnimatedEquip from '@/components/AnimatedEquip';
import { supabase } from '@/lib/supabase';
import { MaskPainter } from './MaskPainter';

interface AddShopItemFormProps {
  onAdd: (item: any) => void;
  onEdit: (item: any) => void;
  onCancel: () => void;
  editingItem?: any;
  gachaCollections: any[];
  /** Shop items with slot base_body (Male/Female) for Avatar Stage base options */
  baseBodyShopItems?: any[];
  shopItems?: any[]; // Pass all shop items to find hand grips
}

function isVideoFile(url: string) {
  return url.toLowerCase().endsWith('.webm') || url.toLowerCase().includes('.webm');
}

const AddShopItemForm = React.memo(function AddShopItemForm({
  onAdd,
  onEdit,
  onCancel,
  editingItem,
  gachaCollections,
  baseBodyShopItems = [],
  shopItems = []
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

  const SKIN_TINT_SLOTS = ['avatar', 'base_body', 'hand_grip', 'face_eyes', 'face_mouth', 'hair'];

  const [handOpacity, setHandOpacity] = useState(1.0);
  const [showHandPreview, setShowHandPreview] = useState(true);
  const [previewGripType, setPreviewGripType] = useState<string | null>(null); // For avatars/base_body to preview hands

  const [editingGender, setEditingGender] = useState<'male' | 'female'>('male');

  const DUAL_POSITION_SLOTS = ['weapon', 'head', 'eyes', 'back', 'hands', 'shoulder', 'accessory', 'body', 'face', 'base_body', 'face_eyes', 'face_mouth', 'hair', 'hand_grip'];
  const showDualPositioning = DUAL_POSITION_SLOTS.includes(formData.slot);

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

  const CREATOR_SLOTS = ['avatar', 'base_body', 'face_eyes', 'face_mouth', 'hair', 'face', 'body'];

  React.useEffect(() => {
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
      if (SKIN_TINT_SLOTS.includes(editingItem.slot)) {
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

  const getGenderValue = (): string | string[] | null => {
    const g = formData.gender;
    if (Array.isArray(g)) {
      if (g.length === 0) return null;
      if (g.length === 1) return g[0];
      return g;
    }
    return (g as string) || null;
  };

  const handleSaveMask = async (base64Png: string) => {
    setUploading(true);
    try {
      // Convert base64 to Blob
      const response = await fetch(base64Png);
      const blob = await response.blob();
      const file = new File([blob], `mask_${Date.now()}.png`, { type: 'image/png' });

      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error('Not authenticated');

      const formDataUpload = new FormData();
      formDataUpload.append('file', file);
      
      const uploadResponse = await fetch('/api/admin/upload', {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: formDataUpload
      });
      
      if (!uploadResponse.ok) {
        throw new Error('Failed to upload mask image');
      }
      
      const uploadData = await uploadResponse.json();
      const maskUrl = uploadData.path || uploadData.url || uploadData.publicUrl;
      
      setFormData(prev => ({ ...prev, eraser_mask_url: maskUrl }));
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

      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error('Not authenticated');

      const formDataUpload = new FormData();
      formDataUpload.append('file', file);

      const uploadResponse = await fetch('/api/admin/upload', {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: formDataUpload
      });

      if (!uploadResponse.ok) throw new Error('Failed to upload mask image');

      const uploadData = await uploadResponse.json();
      const maskUrl = uploadData.path || uploadData.url || uploadData.publicUrl;

      setFormData(prev => ({ ...prev, eraser_mask_url_female: maskUrl }));
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
      image_base_url: SKIN_TINT_SLOTS.includes(formData.slot) ? (editingItem?.image_base_url ?? null) : undefined,
      skin_tint_hex: SKIN_TINT_SLOTS.includes(formData.slot) ? (skinColor || null) : undefined,
      thumbnail_url: editingItem?.thumbnail_url || '',
      slot: formData.slot,
      bonuses,
      is_animated: isAnimated,
      price: parseInt((target.elements.namedItem('itemPrice') as HTMLInputElement)?.value || formData.price || '0'),
      gem_price: gemPrice,
      rarity: formData.rarity,
      gender: getGenderValue(),
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
      onboarding_available: CREATOR_SLOTS.includes(formData.slot) ? onboardingAvailable : false,
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
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session?.access_token) {
          console.error('Session missing or no access token found', session);
          throw new Error('Not authenticated - please log in again');
        }

        console.log('Starting upload with token length:', session.access_token.length);

        const formDataUpload = new FormData();
        formDataUpload.append('file', selectedFile);
        const uploadResponse = await fetch('/api/admin/upload', {
          method: 'POST',
          headers: { Authorization: `Bearer ${session.access_token}` },
          body: formDataUpload
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

    if (SKIN_TINT_SLOTS.includes(formData.slot) && selectedBaseLayerFile) {
      setUploading(true);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) throw new Error('Not authenticated - please log in again');
        const baseFormData = new FormData();
        baseFormData.append('file', selectedBaseLayerFile);
        const baseRes = await fetch('/api/admin/upload', {
          method: 'POST',
          headers: { Authorization: `Bearer ${session.access_token}` },
          body: baseFormData
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
        const thumbnailFormData = new FormData();
        thumbnailFormData.append('file', selectedThumbnailFile);
        const { data: { session: thumbSession } } = await supabase.auth.getSession();
        const res = await fetch('/api/admin/upload', {
          method: 'POST',
          headers: thumbSession?.access_token ? { Authorization: `Bearer ${thumbSession.access_token}` } : {},
          body: thumbnailFormData
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
    
    setPositioning(prev => {
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

  const genderValues = Array.isArray(formData.gender) ? formData.gender : [formData.gender].filter(Boolean);

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
                      options={[
                        { value: 'str', label: 'Strength (STR)' },
                        { value: 'spd', label: 'Speed (SPD)' },
                        { value: 'end', label: 'Endurance (END)' },
                        { value: 'int', label: 'Intelligence (INT)' },
                        { value: 'defense', label: 'Defense' },
                        { value: 'attack_damage', label: 'Attack Damage' },
                        { value: 'crit_percentage', label: 'Crit Percentage (%)' },
                        { value: 'crit_damage', label: 'Crit Damage (x)' },
                        { value: 'xp_boost', label: 'XP Boost (%)' },
                        { value: 'coin_boost', label: 'Coin Boost (%)' },
                        { value: 'lck', label: 'Luck (LCK)' },
                        { value: 'per', label: 'Perception (PER)' },
                        { value: 'wil', label: 'Will (WIL)' }
                      ]}
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

            <div>
              <CustomDropdown
                label="Item Effects"
                value={effectType}
                options={[
                  { value: 'none', label: 'None' },
                  { value: 'heal', label: 'Heal (consumable)' },
                  { value: 'buff', label: 'Buff (stat + duration)' },
                  { value: 'give_exp', label: 'Give EXP' },
                  { value: 'give_gold', label: 'Give Gold' },
                  { value: 'calling_card', label: 'Calling card (skin_id)' },
                  { value: 'capture_tool', label: 'Capture Tool (pet catching)' },
                  { value: 'custom', label: 'Custom (raw JSON)' }
                ]}
                onChange={(value) => setEffectType(value as typeof effectType)}
                isOpen={effectTypeOpen}
                onToggle={() => setEffectTypeOpen(!effectTypeOpen)}
              />
              {effectType === 'capture_tool' && (
                <div className="mt-2 space-y-3 p-3 bg-purple-900/10 border border-purple-500/20 rounded-lg">
                  <div className="flex items-center justify-between">
                    <label className="block text-[10px] font-black uppercase text-purple-400">Capture Bonus</label>
                    <span className="text-[9px] text-gray-500 font-bold">Adds to base catch rate</span>
                  </div>
                  <input
                    type="number"
                    step="0.05"
                    min="0"
                    max="1"
                    value={effectCaptureBonus}
                    onChange={(e) => setEffectCaptureBonus(parseFloat(e.target.value) || 0)}
                    className="w-full bg-black border border-gray-800 rounded-lg p-2 text-sm text-white focus:border-purple-500 outline-none"
                    placeholder="e.g. 0.1 for +10% chance"
                  />
                  <p className="text-[9px] text-gray-500 italic">0.1 = +10% chance. Most wild pets have a 0.3 (30%) base rate.</p>
                  
                  <div className="flex items-center gap-3 pt-1">
                    <input
                      type="checkbox"
                      id="effect-capture-consumable"
                      checked={effectIsConsumable}
                      onChange={(e) => setEffectIsConsumable(e.target.checked)}
                      className="w-4 h-4 text-purple-600 bg-gray-700 border-gray-600 rounded focus:ring-purple-500 focus:ring-2"
                    />
                    <label htmlFor="effect-capture-consumable" className="text-xs font-bold text-gray-300 cursor-pointer">
                      Is Consumable? (Used up on attempt)
                    </label>
                  </div>
                </div>
              )}
              {effectType === 'heal' && (
                <div className="mt-2">
                  <label className="block text-[10px] font-black uppercase text-gray-500 mb-1">Amount (HP)</label>
                  <input type="number" min={1} value={effectHealAmount} onChange={(e) => setEffectHealAmount(Number(e.target.value) || 0)} className="w-full bg-black border border-gray-700 rounded px-3 py-2 text-sm text-white" />
                </div>
              )}
              {effectType === 'buff' && (
                <div className="mt-2 space-y-2">
                  <div>
                    <CustomDropdown
                      label="Stat"
                      value={effectBuffStat}
                      options={[
                        { value: 'str', label: 'Strength' },
                        { value: 'spd', label: 'Speed' },
                        { value: 'end', label: 'Endurance' },
                        { value: 'int', label: 'Intelligence' },
                        { value: 'defense', label: 'Defense' },
                        { value: 'attack_damage', label: 'Attack Damage' },
                        { value: 'crit_percentage', label: 'Crit %' },
                        { value: 'crit_damage', label: 'Crit Damage' }
                      ]}
                      onChange={setEffectBuffStat}
                      isOpen={effectBuffStatOpen}
                      onToggle={() => setEffectBuffStatOpen(!effectBuffStatOpen)}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] font-black uppercase text-gray-500 mb-1">Value</label>
                      <input type="number" value={effectBuffValue} onChange={(e) => setEffectBuffValue(Number(e.target.value) ?? 0)} className="w-full bg-black border border-gray-700 rounded px-3 py-2 text-sm text-white" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black uppercase text-gray-500 mb-1">Duration (sec)</label>
                      <input type="number" min={0} value={effectBuffDuration} onChange={(e) => setEffectBuffDuration(Number(e.target.value) ?? 0)} className="w-full bg-black border border-gray-700 rounded px-3 py-2 text-sm text-white" />
                    </div>
                  </div>
                </div>
              )}
              {effectType === 'give_exp' && (
                <div className="mt-2">
                  <label className="block text-[10px] font-black uppercase text-gray-500 mb-1">Amount (EXP)</label>
                  <input type="number" min={0} value={effectGiveExpAmount} onChange={(e) => setEffectGiveExpAmount(Number(e.target.value) || 0)} className="w-full bg-black border border-gray-700 rounded px-3 py-2 text-sm text-white" />
                </div>
              )}
              {effectType === 'give_gold' && (
                <div className="mt-2">
                  <label className="block text-[10px] font-black uppercase text-gray-500 mb-1">Amount (Coins)</label>
                  <input type="number" min={0} value={effectGiveGoldAmount} onChange={(e) => setEffectGiveGoldAmount(Number(e.target.value) || 0)} className="w-full bg-black border border-gray-700 rounded px-3 py-2 text-sm text-white" />
                </div>
              )}
              {effectType === 'calling_card' && (
                <div className="mt-2">
                  <label className="block text-[10px] font-black uppercase text-gray-500 mb-1">Skin ID (matches CARD_SKINS)</label>
                  <input type="text" value={effectCallingCardSkinId} onChange={(e) => setEffectCallingCardSkinId(e.target.value)} placeholder="e.g. magma, galaxy, default" className="w-full bg-black border border-gray-700 rounded px-3 py-2 text-sm text-white placeholder-gray-500" />
                </div>
              )}
              {effectType === 'custom' && (
                <div className="mt-2">
                  <label className="block text-[10px] font-black uppercase text-gray-500 mb-1">JSON Config</label>
                  <textarea id="item-effects" rows={4} value={itemEffectsJson} onChange={(e) => setItemEffectsJson(e.target.value)} placeholder='e.g., {"type": "heal", "amount": 50}' className="w-full bg-black border border-gray-700 rounded px-3 py-2 text-sm text-white font-mono placeholder-gray-500 focus:border-red-500 focus:outline-none z-10 relative" />
                  <p className="text-[10px] text-gray-500 mt-1">Use JSON for custom effect shapes.</p>
                </div>
              )}
            </div>

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
                    setPositioning(prev => ({ ...prev, selectedAvatar: value as 'male' | 'female' | 'nonbinary' | 'male_base_body' | 'female_base_body' }));
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

          <div className="relative">
            <div className="absolute top-4 right-4 z-20 flex flex-col gap-2">
              <button
                type="button"
                onClick={() => setPreviewZoom(prev => Math.min(prev + 0.1, 3.0))}
                className="w-8 h-8 bg-gray-800/80 hover:bg-gray-700 text-white rounded-full flex items-center justify-center border border-gray-600 font-bold transition-colors"
                title="Zoom In"
              >
                +
              </button>
              <button
                type="button"
                onClick={() => setPreviewZoom(prev => Math.max(prev - 0.1, 0.5))}
                className="w-8 h-8 bg-gray-800/80 hover:bg-gray-700 text-white rounded-full flex items-center justify-center border border-gray-600 font-bold transition-colors"
                title="Zoom Out"
              >
                -
              </button>
              <button
                type="button"
                onClick={() => setPreviewZoom(1.0)}
                className="w-8 h-8 bg-gray-800/80 hover:bg-gray-700 text-white rounded-full flex items-center justify-center border border-gray-600 text-[10px] font-black transition-colors"
                title="Reset Zoom"
              >
                1:1
              </button>
            </div>
            
            <div className="md:overflow-visible">
              <div 
                className={`w-[520px] h-[520px] flex-shrink-0 mx-auto p-1 bg-green-400 relative custom-scrollbar ${previewZoom > 1 ? 'overflow-auto' : 'overflow-hidden'}`}
              >
                <div 
                  className="relative"
                  style={{ 
                    width: 512 * previewZoom, 
                    height: 512 * previewZoom,
                    margin: previewZoom <= 1 ? '0 auto' : undefined
                  }}
                >
                  <div 
                    className="w-[512px] h-[512px] bg-red-950 relative"
                    style={{ transform: `scale(${previewZoom})`, transformOrigin: 'top left' }}
                  >
                    {/* Base Avatar Reference Layer */}
                    {!['avatar', 'base_body'].includes(formData.slot) && (
                      <div className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 5 }}>
                        <div 
                          className="absolute inset-0 w-full h-full"
                          style={currentMaskUrl && (formData.eraser_mask_targets?.includes('base_body') || formData.eraser_mask_targets?.includes('avatar')) ? {
                            WebkitMaskImage: `url(${currentMaskUrl})`,
                            maskImage: `url(${currentMaskUrl})`,
                            WebkitMaskSize: 'contain',
                            WebkitMaskPosition: 'center',
                            WebkitMaskRepeat: 'no-repeat'
                          } : {}}
                        >
                          {(() => {
                            const isBaseBodyAvatar = positioning.selectedAvatar === 'male_base_body' || positioning.selectedAvatar === 'female_base_body';
                            const baseItem = positioning.selectedAvatar === 'male_base_body' ? maleBaseBodyItem : femaleBaseBodyItem;
                            
                            if (isBaseBodyAvatar && baseItem) {
                              return (
                                <div className="absolute inset-0 w-full h-full">
                                  {/* Silhouette */}
                                  {(baseItem.image_base_url || baseItem.image_url) && (
                                    <div
                                      className="absolute inset-0 w-full h-full"
                                      style={{
                                        backgroundColor: baseItem.skin_tint_hex || '#FFDBAC',
                                        WebkitMaskImage: `url(${baseItem.image_base_url || baseItem.image_url})`,
                                        maskImage: `url(${baseItem.image_base_url || baseItem.image_url})`,
                                        WebkitMaskSize: 'contain',
                                        maskSize: 'contain',
                                        WebkitMaskPosition: 'center',
                                        maskPosition: 'center',
                                        WebkitMaskRepeat: 'no-repeat',
                                        maskRepeat: 'no-repeat'
                                      }}
                                    />
                                  )}
                                  {/* Outlines */}
                                  {baseItem.image_url && baseItem.image_url !== baseItem.image_base_url && (
                                    <img 
                                      src={baseItem.image_url} 
                                      alt="Base Avatar Outlines" 
                                      className="absolute inset-0 w-full h-full object-contain z-10" 
                                    />
                                  )}
                                </div>
                              );
                            }
                            
                            return <img src={getAvatarImage()} alt="Base Avatar" className="absolute inset-0 w-full h-full object-contain" />;
                          })()}
                        </div>
                      </div>
                    )}

                    {SKIN_TINT_SLOTS.includes(formData.slot) && (baseLayerPreviewUrl || baseLayerFetchedUrl || editingItem?.image_base_url || (['base_body', 'hand_grip'].includes(formData.slot) && (previewUrl || editingItem?.image_url))) ? (
                      <div
                        className="absolute"
                        style={{
                          left: `${128 + (editingGender === 'female' ? positioning.offsetXFemale : positioning.offsetX)}px`,
                          top: `${128 + (editingGender === 'female' ? positioning.offsetYFemale : positioning.offsetY)}px`,
                          width: 512,
                          height: 512,
                          zIndex: positioning.zIndex,
                          transform: `translate(-50%, -50%) scale(${editingGender === 'female' ? positioning.scaleFemale : positioning.scale}) rotate(${editingGender === 'female' ? positioning.rotationFemale : positioning.rotation}deg)`,
                          transformOrigin: 'center',
                          cursor: isDragging ? 'grabbing' : 'grab'
                        }}
                        onMouseDown={handleMouseDown}
                      >
                        {(() => {
                          const baseUrl = baseLayerFetchedUrl || baseLayerPreviewUrl || editingItem?.image_base_url || (['base_body', 'hand_grip'].includes(formData.slot) ? (previewUrl || editingItem?.image_url) : '') || '';
                          return (
                            <div
                              className="absolute inset-0 w-full h-full"
                              style={{
                                backgroundColor: skinColor,
                                WebkitMaskImage: `url(${baseUrl})`,
                                maskImage: `url(${baseUrl})`,
                                WebkitMaskSize: 'contain',
                                maskSize: 'contain',
                                WebkitMaskPosition: 'center',
                                maskPosition: 'center',
                                WebkitMaskRepeat: 'no-repeat',
                                maskRepeat: 'no-repeat'
                              }}
                              aria-hidden
                            />
                          );
                        })()}
                        {(previewUrl || editingItem?.image_url) && (
                          <img
                            src={previewUrl || editingItem?.image_url || ''}
                            alt="Detail layer"
                            className="absolute inset-0 w-full h-full object-contain pointer-events-none select-none"
                            style={{ 
                              zIndex: 1,
                              mixBlendMode: (formData.slot === 'hand_grip' || formData.slot === 'base_body') ? 'multiply' : 'normal'
                            }}
                          />
                        )}
                      </div>
                    ) : (
                      <>
                        {/* Ghost Hand Preview for Weapons & Avatars */}
                        {(() => {
                          const activePreviewGrip = formData.slot === 'weapon' ? formData.grip_type : (['avatar', 'base_body'].includes(formData.slot) ? previewGripType : null);
                          
                          if (!activePreviewGrip || !showHandPreview) return null;

                          const targetGender = editingGender === 'female' ? 'female' : 'male';
                          const handItem = shopItems.find((i: any) => {
                            if (i.slot !== 'hand_grip' || i.grip_type !== activePreviewGrip) return false;
                            const itemGender = Array.isArray(i.gender) ? i.gender : [i.gender];
                            return itemGender.includes(targetGender) || itemGender.includes('unisex');
                          });
                          
                          if (!handItem?.image_url) return null;

                          const isFemaleHand = targetGender === 'female';
                          const hScale = (isFemaleHand && handItem.scale_female !== null && handItem.scale_female !== undefined) ? handItem.scale_female : (handItem.scale || 1);
                          const hX = (isFemaleHand && handItem.offset_x_female !== null && handItem.offset_x_female !== undefined) ? handItem.offset_x_female : (handItem.offset_x || 0);
                          const hY = (isFemaleHand && handItem.offset_y_female !== null && handItem.offset_y_female !== undefined) ? handItem.offset_y_female : (handItem.offset_y || 0);
                          const hRot = (isFemaleHand && handItem.rotation_female !== null && handItem.rotation_female !== undefined) ? handItem.rotation_female : (handItem.rotation || 0);
                          
                          // Use overridden Z-index if available for this weapon (formData)
                          let hZIndex = handItem.z_index ?? 90;
                          if (formData.slot === 'weapon' && formData.hand_grip_z_index_override !== null) {
                            hZIndex = formData.hand_grip_z_index_override;
                          }

                          return (
                            <div className="absolute inset-0 w-full h-full" style={{ zIndex: hZIndex }}>
                              <div
                                className="absolute inset-0 w-full h-full pointer-events-none"
                                style={currentMaskUrl && formData.eraser_mask_targets?.includes('hand_grip') ? {
                                  WebkitMaskImage: `url(${currentMaskUrl})`,
                                  maskImage: `url(${currentMaskUrl})`,
                                  WebkitMaskSize: 'contain',
                                  maskSize: 'contain',
                                  WebkitMaskPosition: 'center',
                                  maskPosition: 'center',
                                  WebkitMaskRepeat: 'no-repeat',
                                  maskRepeat: 'no-repeat'
                                } : {}}
                              >
                                <div 
                                  className="absolute"
                                  style={{
                                    left: `${128 + hX}px`,
                                    top: `${128 + hY}px`,
                                    width: 512,
                                    height: 512,
                                    transform: `translate(-50%, -50%) scale(${hScale}) rotate(${hRot}deg)`,
                                    transformOrigin: 'center',
                                    opacity: handOpacity,
                                  }}
                                >
                                  {/* Tinted Background */}
                                  <div
                                    className="absolute inset-0 w-full h-full"
                                    style={{
                                      backgroundColor: skinColor,
                                      WebkitMaskImage: `url(${handItem.image_base_url || handItem.image_url})`,
                                      maskImage: `url(${handItem.image_base_url || handItem.image_url})`,
                                      WebkitMaskSize: 'contain',
                                      maskSize: 'contain',
                                      WebkitMaskPosition: 'center',
                                      maskPosition: 'center',
                                      WebkitMaskRepeat: 'no-repeat',
                                      maskRepeat: 'no-repeat'
                                    }}
                                  />
                                  {/* Black Lines (Multiply) */}
                                  <img 
                                    src={handItem.image_url} 
                                    alt="Ghost Hand Lines" 
                                    className="absolute inset-0 w-full h-full object-contain"
                                    style={{ mixBlendMode: 'multiply' }}
                                  />
                                </div>
                              </div>
                            </div>
                          );
                        })()}

                        {previewUrl && (
                          <div className="absolute inset-0 w-full h-full" style={{ zIndex: positioning.zIndex }}>
                            {/* 1. Stationary Mask Container: This spans the full 512x512 area so coordinates align */}
                            <div
                              className="absolute inset-0 w-full h-full pointer-events-none"
                              style={
                                currentMaskUrl && formData.eraser_mask_targets?.includes(formData.slot)
                                  ? {
                                      WebkitMaskImage: `url(${currentMaskUrl})`,
                                      maskImage: `url(${currentMaskUrl})`,
                                      WebkitMaskSize: 'contain',
                                      maskSize: 'contain',
                                      WebkitMaskPosition: 'center',
                                      maskPosition: 'center',
                                      WebkitMaskRepeat: 'no-repeat',
                                      maskRepeat: 'no-repeat',
                                    }
                                  : {}
                              }
                            >
                              {/* 2. Draggable Item: This moves around INSIDE the masked area */}
                              <div
                                className="absolute pointer-events-auto"
                                style={{
                                  left: `${128 + (editingGender === 'female' ? positioning.offsetXFemale : positioning.offsetX)}px`,
                                  top: `${128 + (editingGender === 'female' ? positioning.offsetYFemale : positioning.offsetY)}px`,
                                  transform: `translate(-50%, -50%) scale(${editingGender === 'female' ? positioning.scaleFemale : positioning.scale}) rotate(${editingGender === 'female' ? positioning.rotationFemale : positioning.rotation}deg)`,
                                  transformOrigin: 'center',
                                  cursor: isDragging ? 'grabbing' : 'grab',
                                }}
                                onMouseDown={handleMouseDown}
                              >
                                {isAnimated && animConfig.frameWidth > 0 ? (
                                  <AnimatedEquip 
                                    src={previewUrl} 
                                    frameWidth={animConfig.frameWidth} 
                                    frameHeight={animConfig.frameHeight} 
                                    totalFrames={animConfig.totalFrames} 
                                    fps={animConfig.fps} 
                                  />
                                ) : (
                                  <img 
                                    src={previewUrl} 
                                    alt="Item Preview" 
                                    style={{ width: 'auto', height: 'auto', maxWidth: 'none', maxHeight: 'none' }} 
                                    className="pointer-events-none select-none" 
                                  />
                                )}
                              </div>
                            </div>
                          </div>
                        )}
                      </>
                    )}
                    <div className="absolute inset-0 pointer-events-none">
                      <div className="absolute left-1/2 top-0 bottom-0 w-px bg-red-600" />
                      <div className="absolute top-1/2 left-0 right-0 h-px bg-red-600" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
            {/* Removed Avatar Stage text */}
            {SKIN_TINT_SLOTS.includes(formData.slot) && (
              <div className="mt-3 space-y-2">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">Skin color (base layer tint)</p>
                <div className="flex flex-wrap items-center gap-2">
                  {[
                    { hex: '#FFDBAC', label: 'Light' },
                    { hex: '#F1C27D', label: 'Light warm' },
                    { hex: '#E0AC69', label: 'Medium light' },
                    { hex: '#C68642', label: 'Tan' },
                    { hex: '#B87333', label: 'Filipino brown' },
                    { hex: '#A0522D', label: 'Brown' },
                    { hex: '#8D5524', label: 'Light skin Black' },
                    { hex: '#5C3317', label: 'Dark brown' },
                    { hex: '#3D2314', label: 'Dark skin' },
                    { hex: '#2C1810', label: 'Black' },
                  ].map(({ hex, label }) => (
                    <button
                      key={hex}
                      type="button"
                      onClick={() => setSkinColor(hex)}
                      className={`w-8 h-8 rounded-full border-2 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-gray-900 transition-all ${skinColor === hex ? 'border-red-500 ring-2 ring-red-500 ring-offset-2 ring-offset-gray-900 scale-110' : 'border-gray-600 hover:border-red-500'}`}
                      style={{ backgroundColor: hex }}
                      title={label}
                    />
                  ))}
                  <div className="relative group">
                    <input
                      type="color"
                      value={skinColor}
                      onChange={(e) => setSkinColor(e.target.value)}
                      className="w-8 h-8 rounded-full border-2 border-gray-600 cursor-pointer overflow-hidden p-0"
                      title="Custom Color"
                    />
                    <div className="absolute -inset-1 rounded-full border-2 border-transparent group-hover:border-red-500 pointer-events-none transition-colors" />
                  </div>
                </div>
              </div>
            )}
          </div>

            <div className="bg-gray-900/40 p-3 md:p-4 rounded-lg space-y-2 md:space-y-3">
            <h4 className="text-sm font-black uppercase tracking-widest text-red-400 text-center">Position Controls</h4>
            
            {showDualPositioning && (
              <div className="flex justify-center mb-4">
                <div className="bg-gray-800 p-1 rounded-lg flex gap-1">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingGender('male');
                      // Ensure the canvas matches what they clicked
                      if (positioning.selectedAvatar === 'female' || positioning.selectedAvatar === 'female_base_body') {
                        setPositioning(prev => ({ ...prev, selectedAvatar: 'male' }));
                      }
                    }}
                    className={`px-4 py-1.5 rounded text-xs font-bold transition-colors ${editingGender === 'male' ? 'bg-cyan-600 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-700'}`}
                  >
                    Male Offsets
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingGender('female');
                      // Ensure the canvas matches what they clicked
                      if (positioning.selectedAvatar === 'male' || positioning.selectedAvatar === 'male_base_body') {
                        setPositioning(prev => ({ ...prev, selectedAvatar: 'female' }));
                      }
                    }}
                    className={`px-4 py-1.5 rounded text-xs font-bold transition-colors ${editingGender === 'female' ? 'bg-pink-600 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-700'}`}
                  >
                    Female Offsets
                  </button>
                </div>
              </div>
            )}
            
            {/* Hand Preview Controls */}
            {((formData.slot === 'weapon' && formData.grip_type) || ['avatar', 'base_body'].includes(formData.slot)) && (
              <div className="border border-purple-500/30 bg-purple-900/10 p-3 rounded-lg mb-4">
                <div className="flex items-center justify-between mb-2">
                  <h5 className="text-xs font-bold text-purple-400 uppercase">Ghost Hand Preview</h5>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="showHandPreview"
                      checked={showHandPreview}
                      onChange={(e) => setShowHandPreview(e.target.checked)}
                      className="w-3 h-3 text-purple-600 rounded focus:ring-purple-500"
                    />
                    <label htmlFor="showHandPreview" className="text-[10px] text-gray-400 font-bold cursor-pointer">Show</label>
                  </div>
                </div>

                {/* Avatar/Body: Grip Selector for Color Check */}
                {['avatar', 'base_body'].includes(formData.slot) && (
                   <div className="mb-3">
                      <label className="block text-[10px] font-bold text-gray-400 mb-1">Test Grip Style</label>
                      <select 
                        value={previewGripType || ''} 
                        onChange={(e) => setPreviewGripType(e.target.value || null)}
                        className="w-full bg-gray-900 border border-purple-500/30 rounded px-2 py-1.5 text-xs text-gray-200 focus:ring-1 focus:ring-purple-500 outline-none"
                      >
                        <option value="">None</option>
                        {['All Around', 'Caster', 'Shield', 'Wand'].map(type => (
                          <option key={type} value={type}>{type}</option>
                        ))}
                      </select>
                   </div>
                )}

                {showHandPreview && ((formData.slot === 'weapon' && formData.grip_type) || previewGripType) && (
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 mb-1">
                      Opacity: {Math.round(handOpacity * 100)}%
                    </label>
                    <input
                      type="range"
                      min={0}
                      max={1}
                      step={0.05}
                      value={handOpacity}
                      onChange={(e) => setHandOpacity(parseFloat(e.target.value))}
                      className="w-full h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer slider-purple"
                    />
                    {formData.slot === 'weapon' && formData.hand_grip_z_index_override !== null && (
                      <p className="text-[9px] text-purple-300 mt-2 font-bold bg-purple-900/30 p-1.5 rounded inline-block">
                        Previewing with Z-Index Override: {formData.hand_grip_z_index_override}
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}

            <div className="grid grid-cols-2 gap-3 md:gap-4">
              <div>
                <div className="flex justify-between mb-2">
                  <label className="text-sm font-bold text-gray-300">Offset X</label>
                  <span className="text-sm text-gray-400">
                    {editingGender === 'female' ? positioning.offsetXFemale : positioning.offsetX}px
                  </span>
                </div>
                <input 
                  type="range" 
                  min={-512} max={512} 
                  value={editingGender === 'female' ? positioning.offsetXFemale : positioning.offsetX} 
                  onChange={(e) => setPositioning(prev => {
                    const val = parseInt(e.target.value);
                    if (editingGender === 'female') {
                      return { ...prev, offsetXFemale: val };
                    }
                    // Sync mode: update both if they are currently same
                    if (prev.offsetXFemale === prev.offsetX) {
                      return { ...prev, offsetX: val, offsetXFemale: val };
                    }
                    return { ...prev, offsetX: val };
                  })} 
                  className={`w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer ${editingGender === 'female' ? 'slider-pink' : 'slider-red'}`} 
                />
              </div>
              <div>
                <div className="flex justify-between mb-2">
                  <label className="text-sm font-bold text-gray-300">Offset Y</label>
                  <span className="text-sm text-gray-400">
                    {editingGender === 'female' ? positioning.offsetYFemale : positioning.offsetY}px
                  </span>
                </div>
                <input 
                  type="range" 
                  min={-512} max={512} 
                  value={editingGender === 'female' ? positioning.offsetYFemale : positioning.offsetY} 
                  onChange={(e) => setPositioning(prev => {
                    const val = parseInt(e.target.value);
                    if (editingGender === 'female') {
                      return { ...prev, offsetYFemale: val };
                    }
                    // Sync mode: update both if they are currently same
                    if (prev.offsetYFemale === prev.offsetY) {
                      return { ...prev, offsetY: val, offsetYFemale: val };
                    }
                    return { ...prev, offsetY: val };
                  })} 
                  className={`w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer ${editingGender === 'female' ? 'slider-pink' : 'slider-red'}`} 
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-300 mb-2">
                Z-Index: {positioning.zIndex} (Layer: {(positioning.zIndex / 10).toFixed(1)})
              </label>
              <input
                type="range"
                  min={-20}
                  max={100}
                value={positioning.zIndex}
                onChange={(e) => setPositioning(prev => ({ ...prev, zIndex: parseInt(e.target.value) }))}
                className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider-red"
              />
              <div className="text-[10px] text-gray-500 mt-1 space-y-0.5">
                  <p>Higher Z-Index = closer to the camera (drawn on top). Negative values render behind the base silhouette.</p>
                  <p>Background: <span className="text-gray-300">-20</span> · Base body: <span className="text-gray-300">0–9</span>.</p>
                <p>
                  Suggested creator layers — Back items (capes / weapons): <span className="text-gray-300">-20 – -1</span>,
                  Body/Clothes: <span className="text-gray-300">10–19</span>, Mouth: <span className="text-gray-300">20–29</span>, Eyes: <span className="text-gray-300">30–39</span>,
                  Hair: <span className="text-gray-300">40–49</span>, Face accessories: <span className="text-gray-300">50–59</span>.
                </p>
              </div>
            </div>
            <div>
              <div className="flex justify-between mb-2">
                <label className="text-sm font-bold text-gray-300">Rotation</label>
                <span className="text-sm text-gray-400">
                  {editingGender === 'female' ? positioning.rotationFemale : positioning.rotation}°
                </span>
              </div>
              <input
                type="range"
                min={-180}
                max={180}
                value={editingGender === 'female' ? positioning.rotationFemale : positioning.rotation}
                onChange={(e) => setPositioning(prev => {
                  const val = parseInt(e.target.value);
                  if (editingGender === 'female') {
                    return { ...prev, rotationFemale: val };
                  }
                  // Sync mode: update both if they are currently same
                  if (prev.rotationFemale === prev.rotation) {
                    return { ...prev, rotation: val, rotationFemale: val };
                  }
                  return { ...prev, rotation: val };
                })}
                className={`w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer ${editingGender === 'female' ? 'slider-pink' : 'slider-red'}`}
              />
              <div className="text-[10px] text-gray-500 mt-1">Rotate item from -180° to 180°</div>
            </div>
            <div>
              <div className="flex justify-between mb-2">
                <label className="text-sm font-bold text-gray-300">Scale</label>
                <span className="text-sm text-gray-400">
                  {(editingGender === 'female' ? positioning.scaleFemale : positioning.scale).toFixed(2)}x
                </span>
              </div>
              <input 
                type="range" min={0.1} max={3} step={0.01} 
                value={editingGender === 'female' ? positioning.scaleFemale : positioning.scale} 
                onChange={(e) => setPositioning(prev => {
                  const val = parseFloat(e.target.value);
                  if (editingGender === 'female') {
                    return { ...prev, scaleFemale: val };
                  }
                  // Sync mode: update both if they are currently same
                  if (prev.scaleFemale === prev.scale) {
                    return { ...prev, scale: val, scaleFemale: val };
                  }
                  return { ...prev, scale: val };
                })} 
                className={`w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer ${editingGender === 'female' ? 'slider-pink' : 'slider-red'}`} 
              />
              <div className="text-[10px] text-gray-500 mt-1">Resize item: 0.10x (tiny) to 3.00x (huge)</div>
            </div>
          </div>
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
              // Find secondary reference (e.g. Hand for Weapon, or Weapon for Hand)
              let secondaryRef = undefined;
              
              const activePreviewGrip = formData.slot === 'weapon' ? formData.grip_type : (formData.slot === 'hand_grip' ? formData.grip_type : null);
              
              const paintForFemale = showMaskPainterForFemale;
              const maskGender = paintForFemale ? 'female' : 'male';
              const currentMaskUrl = paintForFemale ? formData.eraser_mask_url_female : formData.eraser_mask_url;

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
