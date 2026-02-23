import React from 'react';
import { ChevronDown } from 'lucide-react';

interface CustomDropdownProps {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
  isOpen: boolean;
  onToggle: () => void;
}

export default function CustomDropdown({
  label,
  value,
  options,
  onChange,
  isOpen,
  onToggle
}: CustomDropdownProps) {
  return (
    <div className="relative" data-dropdown>
      <label className="block text-xs font-black uppercase text-gray-300 mb-1">{label}</label>
      <button
        type="button"
        onClick={onToggle}
        className="w-full bg-black border border-gray-700 rounded px-3 py-2 text-sm text-white flex items-center justify-between hover:border-gray-600 transition-colors"
      >
        <span>{options.find(opt => opt.value === value)?.label || value}</span>
        <ChevronDown size={16} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      {isOpen && (
        <div className="absolute top-full left-0 right-0 bg-black border border-gray-700 rounded-b mt-1 z-50 max-h-48 overflow-y-auto">
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => {
                onChange(option.value);
                onToggle();
              }}
              className="w-full text-left px-3 py-2 text-sm text-white hover:bg-gray-800 transition-colors first:rounded-t"
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
