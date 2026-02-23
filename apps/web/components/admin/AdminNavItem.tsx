import React from 'react';

interface AdminNavItemProps {
  id: string;
  icon: React.ComponentType<any>;
  label: string;
  active: boolean;
  onClick: (tab: string) => void;
}

export default function AdminNavItem({
  id,
  icon: Icon,
  label,
  active,
  onClick
}: AdminNavItemProps) {
  return (
    <button
      onClick={() => onClick(id)}
      onTouchEnd={(e) => {
        e.preventDefault();
        onClick(id);
      }}
      className={`flex flex-col items-center justify-center p-2 mx-1 md:p-3 md:mx-2 transition-all touch-manipulation rounded-lg min-w-[70px] md:min-w-0 ${
        active
          ? 'text-white bg-red-600/20 border border-red-400/50 shadow-[0_0_15px_rgba(239,68,68,0.4)]'
          : 'text-gray-500 hover:text-gray-300 active:text-red-300 hover:bg-gray-800/30'
      }`}
    >
      <Icon size={20} className={`md:w-6 md:h-6 ${active ? 'text-red-400' : ''}`} />
      <span className="text-[9px] md:text-[10px] uppercase font-black mt-1 tracking-tighter leading-tight text-center max-w-16 truncate">
        {label}
      </span>
    </button>
  );
}
