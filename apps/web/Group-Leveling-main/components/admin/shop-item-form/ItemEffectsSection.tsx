import React from 'react';
import CustomDropdown from '../CustomDropdown';

interface ItemEffectsSectionProps {
  effectType: 'none' | 'heal' | 'buff' | 'give_exp' | 'give_gold' | 'calling_card' | 'capture_tool' | 'custom';
  setEffectType: React.Dispatch<React.SetStateAction<'none' | 'heal' | 'buff' | 'give_exp' | 'give_gold' | 'calling_card' | 'capture_tool' | 'custom'>>;
  effectTypeOpen: boolean;
  setEffectTypeOpen: React.Dispatch<React.SetStateAction<boolean>>;
  effectHealAmount: number;
  setEffectHealAmount: React.Dispatch<React.SetStateAction<number>>;
  effectBuffStat: string;
  setEffectBuffStat: React.Dispatch<React.SetStateAction<string>>;
  effectBuffValue: number;
  setEffectBuffValue: React.Dispatch<React.SetStateAction<number>>;
  effectBuffDuration: number;
  setEffectBuffDuration: React.Dispatch<React.SetStateAction<number>>;
  effectBuffStatOpen: boolean;
  setEffectBuffStatOpen: React.Dispatch<React.SetStateAction<boolean>>;
  effectGiveExpAmount: number;
  setEffectGiveExpAmount: React.Dispatch<React.SetStateAction<number>>;
  effectGiveGoldAmount: number;
  setEffectGiveGoldAmount: React.Dispatch<React.SetStateAction<number>>;
  effectCallingCardSkinId: string;
  setEffectCallingCardSkinId: React.Dispatch<React.SetStateAction<string>>;
  effectCaptureBonus: number;
  setEffectCaptureBonus: React.Dispatch<React.SetStateAction<number>>;
  effectIsConsumable: boolean;
  setEffectIsConsumable: React.Dispatch<React.SetStateAction<boolean>>;
  itemEffectsJson: string;
  setItemEffectsJson: React.Dispatch<React.SetStateAction<string>>;
}

export const ItemEffectsSection: React.FC<ItemEffectsSectionProps> = ({
  effectType,
  setEffectType,
  effectTypeOpen,
  setEffectTypeOpen,
  effectHealAmount,
  setEffectHealAmount,
  effectBuffStat,
  setEffectBuffStat,
  effectBuffValue,
  setEffectBuffValue,
  effectBuffDuration,
  setEffectBuffDuration,
  effectBuffStatOpen,
  setEffectBuffStatOpen,
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
}) => {
  return (
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
          { value: 'custom', label: 'Custom (raw JSON)' },
        ]}
        onChange={(value) => setEffectType(value as any)}
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
          <input
            type="number"
            min={1}
            value={effectHealAmount}
            onChange={(e) => setEffectHealAmount(Number(e.target.value) || 0)}
            className="w-full bg-black border border-gray-700 rounded px-3 py-2 text-sm text-white"
          />
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
                { value: 'crit_damage', label: 'Crit Damage' },
              ]}
              onChange={setEffectBuffStat}
              isOpen={effectBuffStatOpen}
              onToggle={() => setEffectBuffStatOpen(!effectBuffStatOpen)}
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[10px] font-black uppercase text-gray-500 mb-1">Value</label>
              <input
                type="number"
                value={effectBuffValue}
                onChange={(e) => setEffectBuffValue(Number(e.target.value) ?? 0)}
                className="w-full bg-black border border-gray-700 rounded px-3 py-2 text-sm text-white"
              />
            </div>
            <div>
              <label className="block text-[10px] font-black uppercase text-gray-500 mb-1">Duration (sec)</label>
              <input
                type="number"
                min={0}
                value={effectBuffDuration}
                onChange={(e) => setEffectBuffDuration(Number(e.target.value) ?? 0)}
                className="w-full bg-black border border-gray-700 rounded px-3 py-2 text-sm text-white"
              />
            </div>
          </div>
        </div>
      )}
      {effectType === 'give_exp' && (
        <div className="mt-2">
          <label className="block text-[10px] font-black uppercase text-gray-500 mb-1">Amount (EXP)</label>
          <input
            type="number"
            min={0}
            value={effectGiveExpAmount}
            onChange={(e) => setEffectGiveExpAmount(Number(e.target.value) || 0)}
            className="w-full bg-black border border-gray-700 rounded px-3 py-2 text-sm text-white"
          />
        </div>
      )}
      {effectType === 'give_gold' && (
        <div className="mt-2">
          <label className="block text-[10px] font-black uppercase text-gray-500 mb-1">Amount (Coins)</label>
          <input
            type="number"
            min={0}
            value={effectGiveGoldAmount}
            onChange={(e) => setEffectGiveGoldAmount(Number(e.target.value) || 0)}
            className="w-full bg-black border border-gray-700 rounded px-3 py-2 text-sm text-white"
          />
        </div>
      )}
      {effectType === 'calling_card' && (
        <div className="mt-2">
          <label className="block text-[10px] font-black uppercase text-gray-500 mb-1">Skin ID (matches CARD_SKINS)</label>
          <input
            type="text"
            value={effectCallingCardSkinId}
            onChange={(e) => setEffectCallingCardSkinId(e.target.value)}
            placeholder="e.g. magma, galaxy, default"
            className="w-full bg-black border border-gray-700 rounded px-3 py-2 text-sm text-white placeholder-gray-500"
          />
        </div>
      )}
      {effectType === 'custom' && (
        <div className="mt-2">
          <label className="block text-[10px] font-black uppercase text-gray-500 mb-1">JSON Config</label>
          <textarea
            id="item-effects"
            rows={4}
            value={itemEffectsJson}
            onChange={(e) => setItemEffectsJson(e.target.value)}
            placeholder='e.g., {"type": "heal", "amount": 50}'
            className="w-full bg-black border border-gray-700 rounded px-3 py-2 text-sm text-white font-mono placeholder-gray-500 focus:border-red-500 focus:outline-none z-10 relative"
          />
          <p className="text-[10px] text-gray-500 mt-1">Use JSON for custom effect shapes.</p>
        </div>
      )}
    </div>
  );
};
