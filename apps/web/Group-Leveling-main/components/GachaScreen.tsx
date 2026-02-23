'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import { ShopItemMedia } from '@/components/ShopItemMedia';

interface GachaScreenProps {
  onSummon: (useGems: boolean, poolType: 'gate' | 'gachapon') => void;
  isSummoning: boolean;
  coins: number;
  gems: number;
}

export default function GachaScreen({ onSummon, isSummoning, coins, gems }: GachaScreenProps) {
  const [activePool, setActivePool] = useState<'gate' | 'gachapon'>('gate');
  const [theme, setTheme] = useState<any>(null);
  const [featuredAvatar, setFeaturedAvatar] = useState<any>(null);
  const [featuredItem, setFeaturedItem] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchGachaData() {
      setIsLoading(true);
      try {
        const { data: themeData } = await supabase
          .from('gacha_collections')
          .select('*')
          .eq('is_active', true)
          .eq('pool_type', activePool)
          .maybeSingle();
        
        setTheme(themeData);

        if (themeData) {
          // 1. Fetch items linked via junction table
          const { data: junctionData } = await supabase
            .from('collection_items')
            .select('shop_item_id')
            .eq('collection_id', themeData.id);
          
          const junctionIds = junctionData?.map(d => d.shop_item_id) || [];

          // 2. Fetch all relevant items (direct column OR junction table)
          const { data: items } = await supabase
            .from('shop_items')
            .select('*')
            .or(`collection_id.eq.${themeData.id}${junctionIds.length > 0 ? `,id.in.(${junctionIds.join(',')})` : ''}`);
          
          const allItems = items || [];
          
          // Prioritize Monarch, fallback to Legendary (Case-Insensitive)
          setFeaturedAvatar(
            allItems.find((i: any) => i.slot === 'avatar' && i.rarity?.toLowerCase() === 'monarch') ||
            allItems.find((i: any) => i.slot === 'avatar' && i.rarity?.toLowerCase() === 'legendary')
          );

          setFeaturedItem(
            allItems.find((i: any) => i.slot !== 'avatar' && i.rarity?.toLowerCase() === 'monarch') ||
            allItems.find((i: any) => i.slot !== 'avatar' && i.rarity?.toLowerCase() === 'legendary')
          );
        } else {
          setFeaturedAvatar(null);
          setFeaturedItem(null);
        }
      } catch (err) {
        console.error('Error fetching gacha data:', err);
      } finally {
        setIsLoading(false);
      }
    }
    fetchGachaData();
  }, [activePool]);

  // Logic Helpers
  const isAvatarMonarch = featuredAvatar?.rarity?.toLowerCase() === 'monarch';
  const isAvatarLegendary = featuredAvatar?.rarity?.toLowerCase() === 'legendary';
  const isItemMonarch = featuredItem?.rarity?.toLowerCase() === 'monarch';
  const isItemLegendary = featuredItem?.rarity?.toLowerCase() === 'legendary';
  const isAvatarPremium = isAvatarMonarch || isAvatarLegendary;
  const isItemPremium = isItemMonarch || isItemLegendary;

  return (
    <div className="flex flex-col h-full bg-[#0d0d12] text-white overflow-hidden rounded-[2rem] border border-white/5 shadow-2xl relative font-sans">
      <style jsx global>{`
        /* --- SOVEREIGN GOLD GLOW SYSTEM --- */
        @keyframes monarch-pulse-gold {
          0%, 100% { 
            box-shadow: 0 0 25px rgba(234, 179, 8, 0.5), inset 0 0 15px rgba(234, 179, 8, 0.3); 
            border-color: #eab308;
            filter: brightness(1);
          }
          50% { 
            box-shadow: 0 0 60px rgba(234, 179, 8, 0.8), inset 0 0 30px rgba(234, 179, 8, 0.5); 
            border-color: #fbbf24;
            filter: brightness(1.15);
          }
        }

        @keyframes gold-sweep {
          0% { left: -100%; }
          100% { left: 100%; }
        }

        .monarch-gold-glow {
          animation: monarch-pulse-gold 2s infinite ease-in-out !important;
          background: linear-gradient(to bottom, rgba(234, 179, 8, 0.15), rgba(0,0,0,0.8)) !important;
          border: 2px solid #eab308 !important;
          position: relative;
          isolation: isolate; /* CRITICAL: Allows aura to render outside background */
          z-index: 10;
        }

        .monarch-gold-glow::after {
          content: "";
          position: absolute;
          inset: -35px; /* Bleeds OUTSIDE the card */
          border-radius: inherit;
          background: radial-gradient(circle at center, rgba(255, 215, 0, 0.6) 0%, transparent 75%);
          filter: blur(20px);
          animation: radiating-pulse 2s infinite ease-in-out;
          pointer-events: none;
          z-index: -1;
        }

        @keyframes legendary-pulse-yellow {
          0%, 100% { 
            box-shadow: 0 0 20px rgba(255, 255, 0, 0.4), inset 0 0 12px rgba(255, 255, 0, 0.2); 
            border-color: #ffff00;
          }
          50% { 
            box-shadow: 0 0 45px rgba(255, 255, 0, 0.7), inset 0 0 20px rgba(255, 255, 0, 0.4); 
            border-color: #fde047;
          }
        }

        .legendary-yellow-glow {
          animation: legendary-pulse-yellow 3s infinite ease-in-out !important;
          background: linear-gradient(to bottom, rgba(255, 255, 0, 0.1), rgba(0,0,0,0.8)) !important;
          border: 2px solid #eab308 !important;
          position: relative;
          isolation: isolate;
          z-index: 10;
        }

        .legendary-yellow-glow::after {
          content: "";
          position: absolute;
          inset: -25px;
          border-radius: inherit;
          background: radial-gradient(circle at center, rgba(255, 255, 0, 0.4) 0%, transparent 70%);
          filter: blur(15px);
          animation: radiating-pulse 3s infinite ease-in-out;
          pointer-events: none;
          z-index: -1;
        }

        /* Moving Light Ray effect */
        .gold-shine-sweep {
          position: absolute;
          inset: 0;
          overflow: hidden;
          pointer-events: none;
          z-index: 5;
        }
        .gold-shine-sweep::before {
          content: "";
          position: absolute;
          top: 0;
          left: -100%;
          width: 50%;
          height: 100%;
          background: linear-gradient(to right, transparent, rgba(255, 255, 255, 0.3), transparent);
          transform: skewX(-25deg);
          animation: gold-sweep 3s infinite;
        }

        @keyframes icon-radiate-gold {
          0%, 100% { filter: drop-shadow(0 0 2px rgba(234, 179, 8, 0.4)); transform: scale(1); }
          50% { filter: drop-shadow(0 0 10px rgba(234, 179, 8, 0.8)); transform: scale(1.1); }
        }

        .icon-radiate-gold {
          animation: icon-radiate-gold 2s infinite ease-in-out;
        }

        @keyframes monarch-pulse-red {
          0% { box-shadow: 0 0 20px rgba(220, 38, 38, 0.4), inset 0 0 10px rgba(220, 38, 38, 0.2); border-color: #dc2626; }
          50% { box-shadow: 0 0 40px rgba(220, 38, 38, 0.6), inset 0 0 20px rgba(220, 38, 38, 0.4); border-color: #991b1b; }
          100% { box-shadow: 0 0 20px rgba(220, 38, 38, 0.4), inset 0 0 10px rgba(220, 38, 38, 0.2); border-color: #dc2626; }
        }

        .monarch-card-glow {
          animation: monarch-pulse-red 3s infinite ease-in-out;
          background: linear-gradient(to bottom, rgba(220, 38, 38, 0.15), transparent) !important;
          border-width: 2px !important;
          position: relative;
          overflow: hidden;
        }

        /* The Glitch "Mana" Streak */
        .monarch-card-glow::after {
          content: "";
          position: absolute;
          top: -100%;
          left: -100%;
          width: 300%;
          height: 300%;
          background: linear-gradient(
            45deg,
            transparent 45%,
            rgba(255, 255, 255, 0.1) 50%,
            transparent 55%
          );
          animation: mana-swipe 4s infinite linear;
          pointer-events: none;
        }

        @keyframes mana-swipe {
          0% { transform: translate(-20%, -20%); }
          100% { transform: translate(20%, 20%); }
        }

        /* --- BLACK HOLOGRAM CARD SYSTEM --- */
        @keyframes hologram-flicker {
          0%, 100% { opacity: 1; }
          33% { opacity: 0.98; }
          66% { opacity: 0.99; }
        }

        @keyframes hologram-scanline {
          0% { transform: translateY(-100%); }
          100% { transform: translateY(100%); }
        }

        .black-hologram {
          background: linear-gradient(135deg, rgba(26, 26, 35, 0.8) 0%, rgba(13, 13, 18, 0.9) 100%) !important;
          backdrop-blur: 12px !important;
          position: relative;
          overflow: hidden;
          animation: hologram-flicker 0.1s infinite;
        }

        .black-hologram::before {
          content: "";
          position: absolute;
          inset: 0;
          background-image: 
            linear-gradient(rgba(255, 255, 255, 0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255, 255, 255, 0.03) 1px, transparent 1px);
          background-size: 4px 4px;
          pointer-events: none;
          z-index: 1;
        }

        .black-hologram-scanline {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 20%;
          background: linear-gradient(to bottom, transparent, rgba(234, 179, 8, 0.05), transparent);
          animation: hologram-scanline 4s linear infinite;
          pointer-events: none;
          z-index: 2;
        }

        .monarch-gold-glow.black-hologram .black-hologram-scanline {
          background: linear-gradient(to bottom, transparent, rgba(234, 179, 8, 0.1), transparent);
        }

        /* --- GLOBAL HOLOGRAM SYSTEM --- */
        @keyframes global-hologram-flicker {
          0% { opacity: 0.99; }
          5% { opacity: 0.95; }
          10% { opacity: 0.99; }
          100% { opacity: 1; }
        }

        .screen-hologram-overlay {
          position: absolute;
          inset: 0;
          pointer-events: none;
          z-index: 50;
          background: linear-gradient(
            rgba(18, 16, 16, 0) 50%, 
            rgba(0, 0, 0, 0.1) 50%
          ), 
          linear-gradient(
            90deg, 
            rgba(255, 0, 0, 0.02), 
            rgba(0, 255, 0, 0.01), 
            rgba(0, 0, 255, 0.02)
          );
          background-size: 100% 3px, 3px 100%;
          opacity: 0.4;
        }

        .screen-glitch-effect {
          animation: global-hologram-flicker 4s infinite step-end;
        }
      `}</style>

      {/* GLOBAL HOLOGRAM OVERLAYS - Removed global dimming while keeping tech texture */}
      <div className="screen-hologram-overlay !opacity-[0.05]" />
      
      {/* FUTURISTIC GRID OVERLAY */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.05] z-0" 
           style={{ backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.2)_100%)] pointer-events-none z-[5]" />
      
      {/* 1. CLIP-TECH TOP SELECTOR */}
      <div className="relative z-30 flex p-3 bg-black/60 backdrop-blur-xl border-b border-white/10 shrink-0">
        <div className="flex w-full bg-white/5 rounded-lg p-1 gap-1 border border-white/5">
          <button
            onClick={() => setActivePool('gate')}
            className={`flex-1 relative py-2.5 px-4 rounded-md transition-all flex items-center justify-center gap-3 group ${
              activePool === 'gate'
                ? 'bg-red-600 text-white shadow-[0_0_20px_rgba(220,38,38,0.4)]'
                : 'text-white/40 hover:text-white/60 hover:bg-white/5'
            }`}
          >
            {activePool === 'gate' && (
              <motion.div layoutId="activeTab" className="absolute inset-0 bg-red-600 rounded-md -z-10" />
            )}
            <img 
              src="/icons/gachagates.png" 
              alt="Gates" 
              className={`w-5 h-5 object-contain ${activePool === 'gate' ? 'icon-radiate-gold' : 'opacity-50'}`} 
            /> 
            <span className="text-[9px] font-black uppercase tracking-[0.3em]">Gacha Gates</span>
          </button>
          
          <button
            onClick={() => setActivePool('gachapon')}
            className={`flex-1 relative py-2.5 px-4 rounded-md transition-all flex items-center justify-center gap-3 group ${
              activePool === 'gachapon'
                ? 'bg-cyan-600 text-white shadow-[0_0_20px_rgba(6,182,212,0.4)]'
                : 'text-white/40 hover:text-white/60 hover:bg-white/5'
            }`}
          >
            {activePool === 'gachapon' && (
              <motion.div layoutId="activeTab" className="absolute inset-0 bg-cyan-600 rounded-md -z-10" />
            )}
            <img 
              src="/icons/gachapon.png" 
              alt="Gachapon" 
              className={`w-5 h-5 object-contain ${activePool === 'gachapon' ? 'animate-bounce' : 'opacity-50'}`} 
            /> 
            <span className="text-[9px] font-black uppercase tracking-[0.3em]">Gachapon</span>
          </button>
        </div>
      </div>

      {/* 2. SYSTEM HERO HEADER */}
      <div className="relative h-[38%] shrink-0 w-full overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div 
            key={activePool}
            initial={{ opacity: 0, scale: 1.1 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.6 }}
            className="w-full h-full"
          >
            {theme?.cover_image_url?.match(/\.(mp4|webm|mov)$/i) ? (
              <video src={theme.cover_image_url} autoPlay loop muted playsInline className="w-full h-full object-cover" />
            ) : (
              <img src={theme?.cover_image_url || '/gates.png'} className="w-full h-full object-cover" alt="Banner" />
            )}
          </motion.div>
        </AnimatePresence>

        {/* Smooth Connection Gradient - Keeping the photo clear while blending with the next section */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0d0d12] via-[#0d0d12]/40 to-transparent opacity-100" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_2px,3px_100%] pointer-events-none opacity-[0.03]" />
        
        <div className="absolute bottom-10 left-8 z-10">
          <div className="flex items-center gap-2 mb-2">
            <div className={`w-1 h-1 rounded-full animate-ping ${activePool === 'gate' ? 'bg-red-500' : 'bg-cyan-500'}`} />
            <p className={`font-black text-[9px] tracking-[0.5em] uppercase drop-shadow-lg ${activePool === 'gate' ? 'text-red-500' : 'text-cyan-500'}`}>
              {activePool === 'gate' ? 'Sector: Gate' : 'Sector: Matrix'}
            </p>
          </div>
          <h1 className="text-xl sm:text-2xl font-black italic uppercase tracking-tighter text-white drop-shadow-[0_4px_15px_rgba(0,0,0,0.9)] leading-none">
            {theme?.name || "Initializing..."}
          </h1>
          {theme?.description && (
            <p className="text-white/50 text-[9px] uppercase tracking-[0.2em] mt-3 max-w-[320px] line-clamp-2 leading-relaxed font-medium">
              {theme.description}
            </p>
          )}
        </div>

        {/* HUD Data Badge - EXTREMELY SMALL & CORNERED - ONLY ON GATE SIDE */}
        {activePool === 'gate' && (
          <div className="absolute top-2 right-2 z-20">
            <div className="bg-black/40 backdrop-blur-md px-1.5 py-0.5 rounded-sm border border-white/5 flex flex-col items-end gap-0.5 shadow-2xl">
              <div className="flex items-center gap-1">
                <span className="text-[4px] font-mono text-white/40 uppercase tracking-widest leading-none">Status:</span>
                <span className="text-[5px] font-mono uppercase tracking-widest font-bold leading-none text-red-500">
                  Active_Gate
                </span>
              </div>
              <div className="text-[4px] font-mono text-white/20 uppercase tracking-[0.2em] leading-none">
                LOC: 35.6895N / 139.6917E
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 3. MODULAR SUMMON KEYS */}
      <div className="relative z-20 flex justify-center gap-5 px-8 -mt-7 shrink-0">
        <button 
          onClick={() => onSummon(false, activePool)}
          disabled={isSummoning || !theme}
          className="group relative flex-1 max-w-[170px] h-14 transition-all active:scale-95 disabled:opacity-50"
        >
          {/* Gates Entry: Red Neon Border */}
          <div className="absolute inset-0 p-[1.5px] rounded-lg bg-gradient-to-br from-red-500 to-red-800 group-hover:shadow-[0_0_20px_rgba(220,38,38,0.4)] transition-all">
            <div className="w-full h-full bg-[#0d0d12] rounded-[7px] flex flex-col items-center justify-center relative overflow-hidden">
               <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-white/20" />
               <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-white/20" />
               <span className="text-[10px] font-black text-white italic uppercase tracking-tighter mb-0.5">Gates Entry</span>
               <div className="flex items-center gap-2">
                 <img src="/coinicon.png" className="w-3 h-3" alt="C" />
                 <span className="text-[10px] font-black text-red-500 tracking-widest">500</span>
               </div>
            </div>
          </div>
        </button>

        <button 
          onClick={() => onSummon(true, activePool)}
          disabled={isSummoning || !theme}
          className={`group relative flex-1 max-w-[170px] h-14 transition-all active:scale-95 disabled:opacity-50 monarch-card-glow rounded-lg`}
        >
          {/* Higher Summon: Intense Red Neon Border + Sovereign Glow */}
          <div className="absolute inset-0 p-[1.5px] rounded-lg bg-gradient-to-br from-red-600 to-red-950 transition-all">
            <div className="w-full h-full bg-slate-900/90 rounded-[7px] flex flex-col items-center justify-center relative overflow-hidden">
               <div className="absolute top-0 right-0 w-2 h-2 border-t border-r border-white/20" />
               <div className="absolute bottom-0 left-0 w-2 h-2 border-b border-l border-white/20" />
               <span className="text-[10px] font-black text-white italic uppercase tracking-tighter mb-0.5 whitespace-nowrap text-red-100">Higher Summon</span>
               <div className="flex items-center gap-2">
                 <img src="/gemicon.png" className="w-3 h-3" alt="G" />
                 <span className="text-[10px] font-black text-red-600 tracking-widest">10</span>
               </div>
               {/* Intense Red Manifestation Pulse */}
               <motion.div 
                 animate={{ opacity: [0.1, 0.4, 0.1] }}
                 transition={{ repeat: Infinity, duration: 2 }}
                 className="absolute inset-0 bg-red-600/10 pointer-events-none" 
               />
            </div>
          </div>
        </button>
      </div>

      {/* 4. MANIFESTATION GRID */}
      <div className="flex-1 flex flex-col items-center justify-center px-2 sm:px-6 py-8 min-h-0 relative">
        
        <div className="w-full max-w-5xl flex flex-row items-center justify-center gap-2 sm:gap-16">
          
          {/* AVATAR MODULE */}
          <div className="flex flex-col items-center shrink-0 group sm:ml-0">
            <div className="flex items-center gap-1.5 sm:gap-2 mb-4">
               <div className="h-[1px] w-3 sm:w-6 bg-yellow-500/20" />
               <h3 className="text-[7px] sm:text-[8px] font-black text-white/30 uppercase tracking-[0.3em] sm:tracking-[0.6em] italic whitespace-nowrap">Monarch Avatar</h3>
               <div className="h-[1px] w-3 sm:w-6 bg-yellow-500/20" />
            </div>
            
            <motion.div 
              animate={{ y: [0, -12, 0] }}
              transition={{ repeat: Infinity, duration: 5, ease: "easeInOut" }}
              className={`relative w-[8.8rem] h-[13.5rem] sm:w-56 sm:h-80 rounded-2xl p-2 flex flex-col items-center transition-all black-hologram ${
                isAvatarMonarch ? 'monarch-gold-glow scale-105' : 
                isAvatarLegendary ? 'legendary-yellow-glow scale-105' : 
                'border border-yellow-500/30'
              }`}
            >
              {/* Scanline Effect */}
              <div className="black-hologram-scanline" />
              
              {/* Gold Shine Sweep for premium rarities */}
              {isAvatarPremium && (
                <div className="gold-shine-sweep" />
              )}
              {/* Corner Accents */}
              <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-yellow-500/50" />
              <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-yellow-500/50" />
              
              <div className="absolute top-3 right-3 flex flex-col items-end gap-1">
                <span className="bg-yellow-500 text-black text-[6px] font-black px-2 py-0.5 rounded uppercase tracking-tighter">Monarch Tier</span>
                <span className="text-[5px] font-mono text-white/20 uppercase tracking-widest">Ver: 2.0.26</span>
              </div>
              
              <div className={`h-full w-full relative transition-transform duration-700 group-hover:scale-105 ${
                  isAvatarMonarch ? 'drop-shadow-[0_0_30px_rgba(255,215,0,0.8)]' : 
                  isAvatarLegendary ? 'drop-shadow-[0_0_25px_rgba(255,255,0,0.6)]' :
                  'drop-shadow(0 0 20px rgba(0,0,0,1))'
                }`}>
                <ShopItemMedia 
                  item={featuredAvatar || { image_url: '/NoobMan.png', name: 'Hunter' }} 
                  className="w-full h-full object-contain"
                  animate={true}
                />
              </div>
              
              <div className="absolute bottom-4 inset-x-0 text-center px-4 z-10">
                <div className="h-[1px] w-full bg-gradient-to-r from-transparent via-yellow-500/20 to-transparent mb-2" />
                <p className="text-yellow-500 font-black italic text-base uppercase leading-none truncate tracking-tight drop-shadow-md">
                  {featuredAvatar?.name || '---'}
                </p>
              </div>

            </motion.div>
          </div>

          {/* GEAR MODULE */}
          <div className="flex flex-col items-center shrink-0 group">
            <div className="flex items-center gap-1.5 sm:gap-2 mb-4">
               <div className="h-[1px] w-2 sm:w-4 bg-cyan-500/20" />
               <h3 className="text-[7px] sm:text-[8px] font-black text-white/30 uppercase tracking-[0.3em] sm:tracking-[0.6em] italic whitespace-nowrap">Legendary Gear</h3>
               <div className="h-[1px] w-2 sm:w-4 bg-cyan-500/20" />
            </div>
            
            <motion.div 
              animate={isItemPremium ? {} : { 
                boxShadow: [
                  "0 0 20px rgba(34,211,238,0.05)",
                  "0 0 40px rgba(34,211,238,0.15)",
                  "0 0 20px rgba(34,211,238,0.05)"
                ]
              }}
              transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
              className={`relative w-26 h-36 sm:w-36 sm:h-52 rounded-2xl p-4 flex flex-col items-center justify-between transition-all black-hologram ${
                isItemMonarch ? 'monarch-gold-glow scale-105' :
                isItemLegendary ? 'legendary-yellow-glow scale-105' :
                'border border-white/10 shadow-2xl'
              }`}
            >
              {/* Scanline Effect */}
              <div className="black-hologram-scanline" />
              
              {/* Gold Shine Sweep for premium rarities */}
              {isItemPremium && (
                <div className="gold-shine-sweep" />
              )}
              <div className="absolute top-0 right-0 w-3 h-3 border-t border-r border-white/20" />
              <div className="absolute bottom-0 left-0 w-3 h-3 border-b border-l border-white/20" />

              <div className={`h-24 w-full relative transition-transform duration-500 ${
                   isItemMonarch ? 'drop-shadow-[0_0_30px_rgba(255,215,0,0.9)]' : 
                   isItemLegendary ? 'drop-shadow-[0_0_25px_rgba(255,255,0,0.7)]' :
                   'drop-shadow(0 0 20px rgba(34,211,238,0.2))'
                } group-hover:scale-110`}>
                <ShopItemMedia 
                  item={featuredItem || { image_url: '/gemicon.png', name: 'Item' }} 
                  className="w-full h-full object-contain"
                  animate={true}
                />
              </div>
              
              <div className="text-center w-full z-10">
                <div className="h-[1px] w-full bg-gradient-to-r from-transparent via-white/10 to-transparent mb-2" />
                <p className="text-[9px] font-black text-white uppercase truncate px-1 tracking-widest drop-shadow-md">{featuredItem?.name || 'Scanning...'}</p>
                <p className={`text-[6px] font-bold uppercase tracking-[0.3em] mt-1 opacity-60 ${
                  isItemPremium ? 'text-yellow-500' : 'text-cyan-400'
                }`}>Manifested Gear</p>
              </div>
            </motion.div>
          </div>

        </div>

        {/* 5. SYSTEM PROBABILITY FOOTER */}
        <div className="mt-auto pb-0 w-full max-w-lg mx-auto">
          <div className="flex items-center justify-between opacity-30 text-[8px] font-black uppercase tracking-[0.4em] mb-2 px-4">
             <span className="text-red-500">Monarch: 0.25%</span>
             <span className="text-yellow-500">Legendary: 1.0%</span>
             <span className="text-purple-500">Epic: 5.0%</span>
          </div>
          <div className="h-[1px] w-full bg-gradient-to-r from-transparent via-white/10 to-transparent" />
        </div>

      </div>
    </div>
  );
}
