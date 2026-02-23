import React from 'react';

interface FormInputProps {
  label: string;
  type?: 'text' | 'email' | 'textarea';
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  rows?: number;
}

export default function FormInput({
  label,
  type = 'text',
  placeholder = '',
  value,
  onChange,
  required = false,
  rows = 4,
}: FormInputProps) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-bold text-slate-500 uppercase tracking-wide ml-1">
        {label}
      </label>
      {type === 'textarea' ? (
        <textarea
          required={required}
          rows={rows}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full px-6 py-4 rounded-xl bg-slate-50 border-2 border-slate-100 focus:border-teal-400 focus:bg-white transition-all outline-none resize-none text-lg"
          placeholder={placeholder}
        />
      ) : (
        <input
          required={required}
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full px-6 py-4 rounded-xl bg-slate-50 border-2 border-slate-100 focus:border-teal-400 focus:bg-white transition-all outline-none text-lg"
          placeholder={placeholder}
        />
      )}
    </div>
  );
}
