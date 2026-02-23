'use client';

import React from 'react';
import { motion } from 'framer-motion';

interface NavItemProps {
  id: string;
  icon: React.ComponentType<any> | string;
  label: string;
  isActive?: boolean;
  onClick?: () => void;
}

const NavItem = ({ id, icon, label, isActive, onClick }: NavItemProps) => {
  return (
    <motion.button
      onClick={onClick}
      className="relative flex flex-col items-center justify-center h-20 min-w-0 hover:bg-transparent focus:outline-none"
      style={{ WebkitTapHighlightColor: 'transparent' }}
    >

      {/* Icon: 3D floating effect - floats above when active */}
      <div
        className={`transition-all duration-400 relative ${
          isActive
            ? "opacity-100 drop-shadow-[0_0_8px_rgba(59,130,246,0.7),0_0_16px_rgba(59,130,246,0.4)] shadow-[0_6px_12px_rgba(0,0,0,0.4),0_2px_4px_rgba(0,0,0,0.2)] scale-150 -translate-y-3 z-10"
            : "opacity-40 grayscale scale-100 translate-y-0 z-0"
        }`}
      >
        {typeof icon === 'string' ? (
          <img src={icon} alt={label} className="w-8 h-8" />
        ) : (
          React.createElement(icon, { size: 28 })
        )}
      </div>

      {/* Label: Clean text without glow */}
      <span className={`absolute bottom-0 font-black uppercase tracking-tighter transition-all duration-400 ${
        isActive
          ? 'text-[10px] text-blue-400 scale-105'
          : 'text-[8px] text-gray-500 opacity-0 scale-100'
      }`}>
        {label}
      </span>
    </motion.button>
  );
};

interface GameBottomNavProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export default function GameBottomNav({ activeTab, setActiveTab }: GameBottomNavProps) {
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 bg-slate-900/60 backdrop-blur-md px-2 pb-6 z-50 flex items-center justify-around max-w-lg mx-auto rounded-t-3xl border-t border-white/10 h-20"
      style={{
        WebkitTransform: 'translateZ(0)',
        transform: 'translateZ(0)',
        WebkitUserSelect: 'none',
        userSelect: 'none',
        WebkitTouchCallout: 'none',
        WebkitTapHighlightColor: 'transparent'
      }}
    >
      <NavItem id="worldmap" icon="/Worldmap.png" label="World" isActive={activeTab === 'worldmap'} onClick={() => setActiveTab('worldmap')} />
      <NavItem id="inventory" icon="/huntericon.png" label="Hunter" isActive={activeTab === 'inventory'} onClick={() => setActiveTab('inventory')} />
      <NavItem id="dashboard" icon="/system.png" label="System" isActive={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} />
      <NavItem id="shop" icon="/shopicon.png" label="Shop" isActive={activeTab === 'shop'} onClick={() => setActiveTab('shop')} />
      <NavItem id="leaderboard" icon="/leaderboard.png" label="Social" isActive={activeTab === 'leaderboard'} onClick={() => setActiveTab('leaderboard')} />
    </nav>
  );
}
