import type { ChangeEvent, Dispatch, SetStateAction } from "react";

export interface AddShopItemFormProps {
  onAdd: (item: any) => void;
  onEdit: (item: any) => void;
  onCancel: () => void;
  editingItem?: any;
  gachaCollections: any[];
  baseBodyShopItems?: any[];
  shopItems?: any[];
}

export interface MaskPainterSecondaryReference {
  url: string;
  offsetX: number;
  offsetY: number;
  scale: number;
  rotation: number;
  zIndex?: number;
  opacity?: number;
  useFullSize?: boolean;
  isAnimated?: boolean;
  animConfig?:
    | {
        frameWidth: number;
        frameHeight: number;
        totalFrames: number;
        fps: number;
      }
    | undefined;
}

export interface ShopItemFormFieldsProps {
  formData: any;
  setFormData: Dispatch<SetStateAction<any>>;
  safeFormData: any;
  handleFileChange: (e: ChangeEvent<HTMLInputElement>) => void;
  editingItem?: any;
  previewUrl: string | null;
  isVideoPreview: boolean;
  selectedFile: File | null;
  selectedThumbnailFile: File | null;
  selectedBaseLayerFile: File | null;
  setSelectedThumbnailFile: (f: File | null) => void;
  setThumbnailCleared: (v: boolean) => void;
  thumbnailCleared: boolean;
  setSelectedBaseLayerFile: (f: File | null) => void;
  slotOpen: boolean;
  setSlotOpen: (v: boolean) => void;
  gripTypeOpen: boolean;
  setGripTypeOpen: (v: boolean) => void;
  weaponTypeOpen: boolean;
  setWeaponTypeOpen: (v: boolean) => void;
  bonuses: Array<{ type: string; value: number }>;
  setBonuses: Dispatch<SetStateAction<Array<{ type: string; value: number }>>>;
  bonusTypeOpenIndex: number | null;
  setBonusTypeOpenIndex: Dispatch<SetStateAction<number | null>>;
  gachaCollections: any[];
  classReqOpen: boolean;
  setClassReqOpen: (v: boolean) => void;
  isStackable: boolean;
  setIsStackable: (v: boolean) => void;
  itemCategory: string;
  setItemCategory: (v: string) => void;
  isSellable: boolean;
  setIsSellable: (v: boolean) => void;
  isGlobal: boolean;
  setIsGlobal: (v: boolean) => void;
  onboardingAvailable: boolean;
  setOnboardingAvailable: (v: boolean) => void;
  effectType: any;
  setEffectType: (v: any) => void;
  effectHealAmount: number;
  setEffectHealAmount: (v: number) => void;
  effectBuffStat: string;
  setEffectBuffStat: (v: string) => void;
  effectBuffValue: number;
  setEffectBuffValue: (v: number) => void;
  effectBuffDuration: number;
  setEffectBuffDuration: (v: number) => void;
  effectGiveExpAmount: number;
  setEffectGiveExpAmount: (v: number) => void;
  effectGiveGoldAmount: number;
  setEffectGiveGoldAmount: (v: number) => void;
  effectCallingCardSkinId: string;
  setEffectCallingCardSkinId: (v: string) => void;
  effectCaptureBonus: number;
  setEffectCaptureBonus: (v: number) => void;
  effectIsConsumable: boolean;
  setEffectIsConsumable: (v: boolean) => void;
  itemEffectsJson: string;
  setItemEffectsJson: (v: string) => void;
  effectTypeOpen: boolean;
  setEffectTypeOpen: (v: boolean) => void;
  effectBuffStatOpen: boolean;
  setEffectBuffStatOpen: (v: boolean) => void;
  gemPrice: number | null;
  setGemPrice: (v: number | null) => void;
  rarityOpen: boolean;
  setRarityOpen: (v: boolean) => void;
  collectionOpen: boolean;
  setCollectionOpen: (v: boolean) => void;
  isGachaExclusive: boolean;
  setIsGachaExclusive: (v: boolean) => void;
  collectionId: string | null;
  setCollectionId: (v: string | null) => void;
  collectionName: string;
  setCollectionName: (v: string) => void;
  isAnimated: boolean;
  setIsAnimated: (v: boolean) => void;
  animConfig: any;
  setAnimConfig: (v: any) => void;
  setShowMaskPainter: (v: boolean) => void;
  setShowMaskPainterForFemale: (v: boolean) => void;
}
