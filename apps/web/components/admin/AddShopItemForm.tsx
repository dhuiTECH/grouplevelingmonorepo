"use client";

import React from "react";
import type { AddShopItemFormProps } from "./add-shop-item-form/types";
import { useAddShopItemForm } from "./add-shop-item-form/useAddShopItemForm";
import { ShopItemFormBasics } from "./add-shop-item-form/ShopItemFormBasics";
import { ShopItemFormMeta } from "./add-shop-item-form/ShopItemFormMeta";
import { ShopItemFormEffects } from "./add-shop-item-form/ShopItemFormEffects";
import { ShopItemFormPricingGacha } from "./add-shop-item-form/ShopItemFormPricingGacha";
import { ShopItemFormEraserMask } from "./add-shop-item-form/ShopItemFormEraserMask";
import { ShopItemPreviewStage } from "./add-shop-item-form/ShopItemPreviewStage";
import { ShopItemFormActions } from "./add-shop-item-form/ShopItemFormActions";
import { ShopItemMaskPainterModal } from "./add-shop-item-form/ShopItemMaskPainterModal";

const AddShopItemForm = React.memo(function AddShopItemForm(props: AddShopItemFormProps) {
  const v = useAddShopItemForm(props);

  return (
    <div className="space-y-4">
      <div className="text-center mb-6">
        <h3 className="text-lg font-header font-black uppercase tracking-widest text-red-400 drop-shadow-[0_0_8px_rgba(239,68,68,0.8)]">
          {v.editingItem?.id ? "Edit Shop Item" : v.editingItem ? "Duplicate Shop Item" : "Create Shop Item"}
        </h3>
        <p className="text-sm text-gray-400 mt-2">
          Upload an image, position it on the avatar, and save everything at once.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 md:gap-8">
        <div className="lg:col-span-2 space-y-3 md:space-y-4">
          <form id="shop-item-form" onSubmit={v.handleSubmit} className="space-y-4">
            <ShopItemFormBasics {...v.fieldsProps} />
            <ShopItemFormMeta {...v.fieldsProps} />
            <ShopItemFormEffects {...v.fieldsProps} />
            <ShopItemFormPricingGacha {...v.fieldsProps} />
            <ShopItemFormEraserMask {...v.fieldsProps} />
          </form>
        </div>

        <ShopItemPreviewStage {...v.previewProps} />
      </div>

      <ShopItemFormActions
        uploading={v.uploading}
        isSaving={v.isSaving}
        saveStatus={v.saveStatus}
        editingItem={v.editingItem}
        onCancel={v.onCancel}
      />

      <ShopItemMaskPainterModal
        show={v.showMaskPainter}
        onClose={() => v.setShowMaskPainter(false)}
        shopItems={v.shopItems}
        formData={v.formData}
        showMaskPainterForFemale={v.showMaskPainterForFemale}
        previewUrl={v.previewUrl}
        editingItem={v.editingItem}
        positioning={v.positioning}
        isAnimated={v.isAnimated}
        animConfig={v.animConfig}
        onSaveMaskMale={v.handleSaveMask}
        onSaveMaskFemale={v.handleSaveMaskFemale}
      />
    </div>
  );
});

export default AddShopItemForm;
