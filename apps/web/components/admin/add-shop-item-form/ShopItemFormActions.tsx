"use client";

import React from "react";
import { motion } from "framer-motion";
import { Loader2, CheckCircle } from "lucide-react";

interface ShopItemFormActionsProps {
  uploading: boolean;
  isSaving: boolean;
  saveStatus: "idle" | "saving" | "success";
  editingItem?: { id?: string } | null;
  onCancel: () => void;
}

export function ShopItemFormActions({
  uploading,
  isSaving,
  saveStatus,
  editingItem,
  onCancel,
}: ShopItemFormActionsProps) {
  return (
    <div className="flex gap-3 justify-center pt-6 border-t border-gray-800">
      <motion.button
        type="submit"
        form="shop-item-form"
        disabled={uploading || isSaving}
        className={`px-6 py-3 rounded-lg text-sm font-bold transition-all duration-200 ${saveStatus === "success" ? "bg-green-600 hover:bg-green-500 text-white" : "bg-red-600 hover:bg-red-500 disabled:bg-red-700 text-white"}`}
        animate={{ boxShadow: isSaving ? "0 0 20px rgba(6, 182, 212, 0.8)" : "none" }}
        transition={{ duration: 0.3 }}
      >
        {uploading ? (
          <>
            <Loader2 size={16} className="inline mr-2 animate-spin" />
            Uploading...
          </>
        ) : saveStatus === "saving" ? (
          <>
            <Loader2 size={16} className="inline mr-2 animate-spin" />
            Saving...
          </>
        ) : saveStatus === "success" ? (
          <>
            <CheckCircle size={16} className="inline mr-2" />
            {editingItem?.id ? "Updated successfully" : "Created successfully"}
          </>
        ) : editingItem ? (
          "Update Shop Item"
        ) : (
          "Create Shop Item"
        )}
      </motion.button>
      <button
        type="button"
        onClick={onCancel}
        disabled={uploading}
        className="px-6 py-3 bg-gray-600 hover:bg-gray-500 disabled:bg-gray-700 disabled:cursor-not-allowed text-white rounded-lg text-sm font-bold"
      >
        Cancel
      </button>
    </div>
  );
}
