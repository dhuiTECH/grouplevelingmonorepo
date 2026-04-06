"use client";

import React from "react";
import { MaskPainter } from "../MaskPainter";
import { buildMaskPainterSecondaryRef } from "./helpers";

interface ShopItemMaskPainterModalProps {
  show: boolean;
  onClose: () => void;
  shopItems: any[];
  formData: {
    slot: string;
    grip_type: string | null;
    eraser_mask_url: string | null;
    eraser_mask_url_female: string | null;
  };
  showMaskPainterForFemale: boolean;
  previewUrl: string | null;
  editingItem?: any;
  positioning: {
    offsetX: number;
    offsetY: number;
    offsetXFemale: number;
    offsetYFemale: number;
    scale: number;
    scaleFemale: number;
    rotation: number;
    rotationFemale: number;
  };
  isAnimated: boolean;
  animConfig: {
    frameWidth: number;
    frameHeight: number;
    totalFrames: number;
    fps: number;
  };
  onSaveMaskMale: (base64Png: string) => void;
  onSaveMaskFemale: (base64Png: string) => void;
}

export function ShopItemMaskPainterModal({
  show,
  onClose,
  shopItems,
  formData,
  showMaskPainterForFemale,
  previewUrl,
  editingItem,
  positioning,
  isAnimated,
  animConfig,
  onSaveMaskMale,
  onSaveMaskFemale,
}: ShopItemMaskPainterModalProps) {
  if (!show) return null;

  const paintForFemale = showMaskPainterForFemale;
  const maskGender = paintForFemale ? "female" : "male";
  const currentMaskUrl = paintForFemale
    ? formData.eraser_mask_url_female
    : formData.eraser_mask_url;

  const secondaryRef = buildMaskPainterSecondaryRef(shopItems, formData, maskGender);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="relative">
        <button
          type="button"
          onClick={onClose}
          className="absolute -top-10 right-0 text-white font-bold bg-red-600 px-3 py-1 rounded hover:bg-red-500"
        >
          Close
        </button>
        <MaskPainter
          baseReferenceUrl={maskGender === "female" ? "/NoobWoman.png" : "/NoobMan.png"}
          itemUrl={previewUrl || editingItem?.image_url || ""}
          maskUrl={currentMaskUrl}
          offsetX={paintForFemale ? positioning.offsetXFemale : positioning.offsetX}
          offsetY={paintForFemale ? positioning.offsetYFemale : positioning.offsetY}
          scale={paintForFemale ? positioning.scaleFemale : positioning.scale}
          rotation={paintForFemale ? positioning.rotationFemale : positioning.rotation}
          useFullSize={["base_body", "hand_grip"].includes(formData.slot)}
          isAnimated={isAnimated}
          animConfig={animConfig}
          secondaryReference={secondaryRef}
          onSaveMask={paintForFemale ? onSaveMaskFemale : onSaveMaskMale}
        />
      </div>
    </div>
  );
}
