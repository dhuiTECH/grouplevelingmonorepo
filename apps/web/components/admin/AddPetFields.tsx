"use client";

import React from 'react';

interface PetFieldsProps {
  formData: any;
  setFormData: (updater: any) => void;
}

export default function AddPetFields({ formData, setFormData }: PetFieldsProps) {
  return (
    <div className="mt-4 p-4 bg-purple-900/20 border border-purple-500/30 rounded-xl space-y-4 animate-in fade-in slide-in-from-top-2">
      <h3 className="text-xs font-black uppercase text-purple-400 tracking-widest">
        🐾 Pet Catching Protocols
      </h3>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-[10px] font-black uppercase text-gray-500 mb-1">
            Base Catch Rate (0.1 - 1.0)
          </label>
          <input
            type="number"
            step="0.1"
            min="0.1"
            max="1.0"
            value={formData.metadata?.base_catch_rate ?? 0.3}
            onChange={(e) =>
              setFormData((prev: any) => ({
                ...prev,
                metadata: {
                  ...(prev.metadata || {}),
                  base_catch_rate: parseFloat(e.target.value),
                },
              }))
            }
            className="w-full bg-black border border-purple-900/50 rounded-lg p-2 text-sm text-purple-400"
          />
        </div>

        <div>
          <label className="block text-[10px] font-black uppercase text-gray-500 mb-1">
            Flee Chance (per turn)
          </label>
          <input
            type="number"
            step="0.05"
            value={formData.metadata?.flee_rate ?? 0.1}
            onChange={(e) =>
              setFormData((prev: any) => ({
                ...prev,
                metadata: {
                  ...(prev.metadata || {}),
                  flee_rate: parseFloat(e.target.value),
                },
              }))
            }
            className="w-full bg-black border border-purple-900/50 rounded-lg p-2 text-sm text-white"
          />
        </div>
      </div>

      <p className="text-[9px] text-purple-300 italic">
        * Catch rate will triple as the pet&apos;s HP approaches 1 in the mobile app logic.
      </p>
    </div>
  );
}

