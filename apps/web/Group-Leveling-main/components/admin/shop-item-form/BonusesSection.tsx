import React from 'react';
import CustomDropdown from '../CustomDropdown';

interface Bonus {
  type: string;
  value: number;
}

interface BonusesSectionProps {
  bonuses: Bonus[];
  setBonuses: React.Dispatch<React.SetStateAction<Bonus[]>>;
  bonusTypeOpenIndex: number | null;
  setBonusTypeOpenIndex: React.Dispatch<React.SetStateAction<number | null>>;
}

export const BonusesSection: React.FC<BonusesSectionProps> = ({
  bonuses,
  setBonuses,
  bonusTypeOpenIndex,
  setBonusTypeOpenIndex,
}) => {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="block text-xs font-black uppercase text-gray-300">Bonuses (Up to 3)</label>
        <button
          type="button"
          onClick={() => bonuses.length < 3 && setBonuses([...bonuses, { type: 'spd', value: 0 }])}
          disabled={bonuses.length >= 3}
          className="px-2 py-1 bg-green-600 hover:bg-green-500 disabled:bg-gray-600 text-white text-xs rounded"
        >
          + Add Bonus
        </button>
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
                { value: 'wil', label: 'Will (WIL)' },
              ]}
              onChange={(value) => {
                const newBonuses = [...bonuses];
                newBonuses[index].type = value;
                setBonuses(newBonuses);
                setBonusTypeOpenIndex(null);
              }}
              isOpen={bonusTypeOpenIndex === index}
              onToggle={() => setBonusTypeOpenIndex((prev) => (prev === index ? null : index))}
            />
          </div>
          <div className="w-20">
            <input
              type="number"
              value={bonus.value}
              onChange={(e) => {
                const newBonuses = [...bonuses];
                newBonuses[index].value = parseFloat(e.target.value) || 0;
                setBonuses(newBonuses);
              }}
              step={bonus.type === 'xp_boost' || bonus.type === 'crit_percentage' ? '0.01' : bonus.type === 'crit_damage' ? '0.1' : '1'}
              min={bonus.type === 'crit_damage' ? 1 : 0}
              placeholder={bonus.type === 'crit_damage' ? '2.0' : '0'}
              className="w-full bg-black border border-gray-700 rounded px-2 py-1 text-sm text-white placeholder-gray-500"
            />
          </div>
          <button
            type="button"
            onClick={() => setBonuses(bonuses.filter((_, i) => i !== index))}
            className="px-2 py-1 bg-red-600 hover:bg-red-500 text-white text-xs rounded"
          >
            ×
          </button>
        </div>
      ))}
      {bonuses.length === 0 && (
        <div className="text-xs text-gray-500 italic p-2 bg-gray-800/30 rounded">
          No bonuses added yet
        </div>
      )}
      <div className="text-[10px] text-gray-500">Each bonus adds stat improvements to equipped characters</div>
    </div>
  );
};
