import React from 'react';
import CustomDropdown from '../CustomDropdown';

interface RequirementsSectionProps {
  formData: any;
  setFormData: React.Dispatch<React.SetStateAction<any>>;
  safeFormData: any;
  classReqOpen: boolean;
  setClassReqOpen: React.Dispatch<React.SetStateAction<boolean>>;
  isStackable: boolean;
  setIsStackable: React.Dispatch<React.SetStateAction<boolean>>;
  isSellable: boolean;
  setIsSellable: React.Dispatch<React.SetStateAction<boolean>>;
  isGlobal: boolean;
  setIsGlobal: React.Dispatch<React.SetStateAction<boolean>>;
  onboardingAvailable: boolean;
  setOnboardingAvailable: React.Dispatch<React.SetStateAction<boolean>>;
  CREATOR_SLOTS: string[];
}

export const RequirementsSection: React.FC<RequirementsSectionProps> = ({
  formData,
  setFormData,
  safeFormData,
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
  CREATOR_SLOTS,
}) => {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-black uppercase text-gray-300 mb-1">Minimum Level</label>
          <input
            type="number"
            value={safeFormData.min_level}
            onChange={(e) => setFormData({ ...formData, min_level: e.target.value })}
            placeholder="1"
            min={1}
            max={999}
            className="w-full bg-black border border-gray-700 rounded px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-red-500 focus:outline-none z-10 relative"
          />
        </div>
        <div>
          <CustomDropdown
            label="Class Requirement"
            value={safeFormData.class_req}
            options={[
              { value: 'All', label: 'All Classes' },
              { value: 'Assassin', label: 'Assassin' },
              { value: 'Fighter', label: 'Fighter' },
              { value: 'Mage', label: 'Mage' },
              { value: 'Tanker', label: 'Tanker' },
              { value: 'Ranger', label: 'Ranger' },
              { value: 'Healer', label: 'Healer' },
            ]}
            onChange={(value) => setFormData({ ...formData, class_req: value })}
            isOpen={classReqOpen}
            onToggle={() => setClassReqOpen(!classReqOpen)}
          />
        </div>
      </div>

      <div className="flex items-center gap-3 p-3 bg-gray-800/30 rounded-lg border border-gray-600/50">
        <input
          type="checkbox"
          id="no-restrictions"
          checked={safeFormData.no_restrictions}
          onChange={(e) => setFormData({ ...formData, no_restrictions: e.target.checked })}
          className="w-4 h-4 text-cyan-600 bg-gray-700 border-gray-600 rounded focus:ring-cyan-500 focus:ring-2"
        />
        <label htmlFor="no-restrictions" className="text-sm font-bold text-gray-200 cursor-pointer">
          No Restrictions - Available to All Players
        </label>
        <div className="text-xs text-gray-400 ml-auto">{formData.no_restrictions ? 'Unrestricted' : 'Restricted'}</div>
      </div>

      <div className="flex items-center gap-3 p-3 bg-gray-800/30 rounded-lg border border-gray-600/50">
        <input
          type="checkbox"
          id="is-stackable"
          checked={isStackable}
          onChange={(e) => setIsStackable(e.target.checked)}
          className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-600 focus:ring-2"
        />
        <label htmlFor="is-stackable" className="text-sm font-bold text-gray-200 cursor-pointer">
          Is Stackable? (e.g., Potions, Currency)
        </label>
        <div className="text-xs text-gray-400 ml-auto">{isStackable ? 'Stackable' : 'Unique'}</div>
      </div>

      <div className="flex items-center gap-3 p-3 bg-gray-800/30 rounded-lg border border-gray-600/50">
        <input
          type="checkbox"
          id="is-sellable"
          checked={isSellable}
          onChange={(e) => setIsSellable(e.target.checked)}
          disabled={['base_body', 'face_eyes', 'face_mouth', 'hair'].includes(formData.slot)}
          className="w-4 h-4 text-cyan-600 bg-gray-700 border-gray-600 rounded focus:ring-cyan-500 focus:ring-2 disabled:opacity-50 disabled:cursor-not-allowed"
        />
        <label htmlFor="is-sellable" className="text-sm font-bold text-gray-200 cursor-pointer">
          {['base_body', 'face_eyes', 'face_mouth', 'hair'].includes(formData.slot)
            ? 'Not in shop (creator slot)'
            : 'Sellable (show in public shop)'}
        </label>
      </div>

      <div className="flex items-center gap-3 p-3 bg-gray-800/30 rounded-lg border border-gray-600/50">
        <input
          type="checkbox"
          id="is-global"
          checked={isGlobal}
          onChange={(e) => setIsGlobal(e.target.checked)}
          className="w-4 h-4 text-yellow-600 bg-gray-700 border-gray-600 rounded focus:ring-yellow-500 focus:ring-2"
        />
        <label htmlFor="is-global" className="text-sm font-bold text-gray-200 cursor-pointer">
          Is Global Item? (Available everywhere)
        </label>
        <div className="text-xs text-gray-400 ml-auto">{isGlobal ? 'Global' : 'Regional/Limited'}</div>
      </div>

      {CREATOR_SLOTS.includes(formData.slot) && (
        <div className="flex items-center gap-3 p-3 bg-gray-800/30 rounded-lg border border-gray-600/50">
          <input
            type="checkbox"
            id="onboarding-available"
            checked={onboardingAvailable}
            onChange={(e) => setOnboardingAvailable(e.target.checked)}
            className="w-4 h-4 text-green-600 bg-gray-700 border-gray-600 rounded focus:ring-green-500 focus:ring-2"
          />
          <label htmlFor="onboarding-available" className="text-sm font-bold text-gray-200 cursor-pointer">
            Show in Avatar Lab (onboarding and /avatar-lab)
          </label>
        </div>
      )}
    </div>
  );
};
