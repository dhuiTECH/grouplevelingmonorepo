// lib/cardSkins.ts
import type { Skin } from './types';

export const CARD_SKINS: Record<string, Skin> = {
  // 1. DEFAULT SKIN (Standard System Look)
  default: {
    id: 'default',
    name: 'Standard Issue',
    price: 0,
    style: 'border-[#A78BFA]/30 bg-[#0f0e13]', // Tailwind Border & Bg
    effect: '' 
  },
  
  // 2. MAGMA SKIN (CSS Example)
  magma: {
    id: 'magma',
    name: 'Molten Core',
    price: 1000,
    style: 'border-red-500 bg-[#1a0505] shadow-[0_0_15px_rgba(239,68,68,0.4)]',
    effect: 'animate-pulse' // Pulsing border effect
  },

  // 3. GALAXY SKIN (Image Example)
  // If you have a background image, put it in public/skins/galaxy.jpg
  galaxy: {
    id: 'galaxy',
    name: 'Cosmic Void',
    price: 5,
    style: 'border-cyan-400 shadow-[0_0_20px_rgba(34,211,238,0.3)]',
    backgroundImage: '/skins/galaxy_bg.jpg', // Path to your texture
    effect: ''
  }
};
