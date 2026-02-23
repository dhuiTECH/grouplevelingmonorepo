'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

// 1. Static Assets (Things that live in Frontend code)
const CLASS_ASSETS: Record<string, { subtitle: string; icon: string; image: string; color: string; stats_visual: Record<string, number> }> = {
  Assassin: {
    subtitle: 'VELOCITY & PRECISION',
    icon: '/classes/assassinicon.webp',
    image: '/classes/assassin.webp',
    color: 'from-purple-600/40 to-black/80',
    stats_visual: { agility: 95, strength: 55, vitality: 40 },
  },
  Fighter: {
    subtitle: 'INTENSITY & STRENGTH',
    icon: '/classes/fightericon.webp',
    image: '/classes/fighter.webp',
    color: 'from-orange-600/40 to-black/80',
    stats_visual: { agility: 55, strength: 95, vitality: 70 },
  },
  Tanker: {
    subtitle: 'STAMINA & ENDURANCE',
    icon: '/classes/tankericon.webp',
    image: '/classes/tanker.webp',
    color: 'from-blue-600/40 to-black/80',
    stats_visual: { agility: 30, strength: 75, vitality: 95 },
  },
  Ranger: {
    subtitle: 'PERCEPTION & FOCUS',
    icon: '/classes/rangericon.webp',
    image: '/classes/ranger.webp',
    color: 'from-emerald-600/40 to-black/80',
    stats_visual: { agility: 85, strength: 50, vitality: 60 },
  },
  Mage: {
    subtitle: 'TECHNICAL & CORE',
    icon: '/classes/mageicon.webp',
    image: '/classes/mage.webp',
    color: 'from-cyan-600/40 to-black/80',
    stats_visual: { agility: 70, strength: 40, vitality: 60 },
  },
  Healer: {
    subtitle: 'RECOVERY & CONSISTENCY',
    icon: '/classes/healericon.webp',
    image: '/classes/healer.webp',
    color: 'from-green-600/40 to-black/80',
    stats_visual: { agility: 50, strength: 45, vitality: 85 },
  },
};

export default function ClassSelectionPage() {
  const [dbClasses, setDbClasses] = useState<any[]>([]);
  const [selectedId, setSelectedId] = useState('Fighter');
  const [time, setTime] = useState('');
  const [userId, setUserId] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const fetchClasses = async () => {
      const { data } = await supabase.from('classes').select('*');
      if (data) setDbClasses(data);
    };
    fetchClasses();

    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user?.id) setUserId(session.user.id);
    };
    getSession();

    const updateTime = () => {
      const now = new Date();
      setTime(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true }));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleConfirm = async () => {
    if (!userId) {
      alert('Dev Mode: Selection simulated (No User ID). Sign in to save your class.');
      return;
    }

    const selectedClassData = dbClasses.find((c) => c.name === selectedId);
    if (!selectedClassData) return;

    const { error } = await supabase
      .from('users')
      .update({
        current_class: selectedClassData.name,
        max_hp: selectedClassData.base_hp,
        max_mp: selectedClassData.base_mp,
        current_hp: selectedClassData.base_hp,
        current_mp: selectedClassData.base_mp,
        level: 1,
        experience: 0,
      })
      .eq('id', userId);

    if (error) console.error(error);
    else router.push('/dashboard');
  };

  const classesToRender = dbClasses.map((dbCls) => {
    const assets = CLASS_ASSETS[dbCls.name] || CLASS_ASSETS['Fighter'];
    return {
      ...dbCls,
      ...assets,
      id: dbCls.name,
    };
  });

  if (classesToRender.length === 0) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        Loading Classes...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050a15] text-white relative overflow-hidden font-ui select-none">
      {/* Onboarding Style Background */}
      <video
        autoPlay
        loop
        muted
        playsInline
        className="absolute inset-0 w-full h-full object-cover opacity-20 z-0"
      >
        <source src="/hologram.webm" type="video/webm" />
      </video>
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-slate-900/40 blur-[100px] rounded-full animate-pulse" />
      </div>
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10 pointer-events-none z-0" />

      {/* Grid Overlay */}
      <div
        className="absolute inset-0 opacity-2 pointer-events-none z-0"
        style={{ backgroundImage: 'radial-gradient(#22d3ee 0.5px, transparent 0.5px)', backgroundSize: '24px 24px' }}
      />

      {/* HUD: Top Bar */}
      <header className="fixed top-0 left-0 w-full p-4 md:p-8 flex justify-between items-start z-50 pointer-events-none">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-[10px] font-mono text-cyan-400/70 uppercase tracking-[0.2em]">
            <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-pulse" />
            SYSTEM_STATUS: ONLINE
          </div>
          <div className="text-[10px] font-mono text-white/40 uppercase tracking-[0.2em]">
            MODE: SELECTION
          </div>
        </div>

        <div className="text-right space-y-1">
          <div className="text-[10px] font-mono text-white/40 uppercase tracking-[0.2em]">
            LOCAL_NODE: 04
          </div>
          <div className="text-xs md:text-sm font-mono text-cyan-400 tracking-widest uppercase">
            {time}
          </div>
        </div>
      </header>

      {/* HUD: Corner Brackets */}
      <div className="fixed inset-0 pointer-events-none z-40">
        <div className="absolute top-10 left-10 w-8 h-8 border-t-2 border-l-2 border-cyan-500/30" />
        <div className="absolute top-10 right-10 w-8 h-8 border-t-2 border-r-2 border-cyan-500/30" />
        <div className="absolute bottom-24 left-10 w-8 h-8 border-b-2 border-l-2 border-cyan-500/30" />
        <div className="absolute bottom-24 right-10 w-8 h-8 border-b-2 border-r-2 border-cyan-500/30" />
      </div>

      <main className="relative pt-12 pb-12 px-4 md:px-12 flex flex-col items-center min-h-screen">
        {/* Title Section */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-6 sm:mb-12 relative w-full"
        >
          <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-32 h-[1px] bg-gradient-to-r from-transparent via-cyan-500 to-transparent opacity-50" />
          <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-48 h-[1px] bg-gradient-to-r from-transparent via-cyan-500 to-transparent opacity-50" />

          <h1
            className="text-4xl sm:text-5xl md:text-7xl tracking-tighter text-white uppercase break-words"
            style={{ textShadow: '0 0 10px #3b82f6, 0 0 20px #3b82f6' }}
          >
            CLASS SELECTION
          </h1>

          <p className="mt-3 text-[10px] sm:text-xs md:text-sm uppercase tracking-[0.3em] sm:tracking-[0.4em] text-blue-200 opacity-60 flex items-center justify-center gap-3">
            SELECT YOUR COMBAT ARCHETYPE
          </p>

          <div className="mt-4 hidden sm:flex items-center justify-center gap-4 text-[8px] font-mono text-white/20 uppercase tracking-widest">
            <span className="text-cyan-500/40">ID: 0x7F4B</span>
            <div className="w-8 h-px bg-white/10" />
            NEURAL LINK: STABLE
            <div className="w-8 h-px bg-white/10" />
            <span className="text-cyan-500/40">VER: 1.0.4</span>
          </div>
        </motion.div>

        {/* Classes Carousel/Grid */}
        <div className="w-full max-w-7xl flex flex-row items-stretch md:items-center justify-center gap-1 sm:gap-2 h-[500px] sm:h-[600px] md:h-[700px] px-2 sm:px-0 mx-auto">
          {classesToRender.map((cls) => {
            const isSelected = selectedId === cls.name;

            return (
              <motion.div
                key={cls.id}
                layoutId={`card-${cls.id}`}
                onClick={() => setSelectedId(cls.name)}
                className={`relative group cursor-pointer transition-all duration-500 overflow-hidden ${
                  isSelected
                    ? 'flex-[6] md:flex-none md:w-[450px] h-full md:h-[700px] z-20'
                    : 'flex-1 md:flex-none md:w-[100px] h-full md:h-[600px] grayscale opacity-40 hover:opacity-70 z-10'
                }`}
              >
                <div
                  className={`absolute inset-0 rounded-sm border-2 transition-all duration-500 z-30 pointer-events-none ${
                    isSelected
                      ? 'border-white shadow-[0_0_60px_rgba(34,211,238,0.8),inset_0_0_20px_rgba(34,211,238,0.4)] brightness-150'
                      : 'border-white/10 group-hover:border-white/30'
                  }`}
                />

                <div className="absolute inset-0 overflow-hidden rounded-sm">
                  <div
                    className={`absolute inset-0 bg-cover bg-center transition-all duration-700 ${isSelected ? 'scale-110 brightness-125 contrast-110' : 'scale-100'}`}
                    style={{ backgroundImage: `url(${cls.image})` }}
                  />
                  <div
                    className={`absolute inset-0 bg-gradient-to-t ${cls.color} transition-opacity duration-500 ${isSelected ? 'opacity-0' : 'opacity-80 mix-blend-multiply'}`}
                  />
                </div>

                <AnimatePresence>
                  {!isSelected && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="absolute inset-0 flex items-center justify-center p-2"
                    >
                      <span className="font-bold text-lg sm:text-2xl md:text-3xl rotate-180 [writing-mode:vertical-lr] uppercase tracking-widest text-white/50 group-hover:text-white transition-colors">
                        {cls.name}
                      </span>
                    </motion.div>
                  )}
                </AnimatePresence>

                <AnimatePresence>
                  {isSelected && (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 20 }}
                      className="absolute inset-x-0 bottom-0 p-4 sm:p-8 pt-20 flex flex-col justify-end gap-3 sm:gap-6 bg-gradient-to-t from-black/90 via-black/50 to-transparent"
                    >
                      <div className="space-y-1 sm:space-y-2">
                        <div className="flex items-center gap-2 sm:gap-4">
                          <img src={cls.icon} alt={cls.name} className="w-20 h-20 sm:w-32 sm:h-32 object-contain" />
                          <h2
                            className="text-3xl sm:text-6xl font-bold uppercase tracking-tighter text-white"
                            style={{ textShadow: '0 0 10px rgba(59, 130, 246, 0.5)' }}
                          >
                            {cls.name}
                          </h2>
                        </div>
                        <p className="text-[8px] sm:text-[10px] uppercase tracking-[0.2em] sm:tracking-[0.3em] text-blue-400 font-bold">
                          {cls.subtitle}
                        </p>
                        <p className="text-[10px] sm:text-xs text-white/70 leading-relaxed font-ui max-w-full sm:max-w-[280px]">
                          {cls.description || 'Class description unavailable.'}
                        </p>
                        <div className="flex gap-4 text-xs font-mono pt-2">
                          <span className="text-green-400">BASE HP: {cls.base_hp}</span>
                          <span className="text-blue-400">BASE MP: {cls.base_mp}</span>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>

        {/* Action Button Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex-1 w-full flex flex-col items-center justify-center gap-4 z-50 px-4 py-8 md:py-12 relative"
        >
          <button
            onClick={handleConfirm}
            className="w-full max-w-sm group relative px-10 py-4 bg-black/60 border border-cyan-500/50 hover:border-cyan-400 transition-all clip-tech-button"
          >
            <div className="absolute inset-0 bg-cyan-500/10 group-hover:bg-cyan-500/20 transition-all" />
            <span className="relative z-10 font-black text-white uppercase tracking-widest flex items-center justify-center gap-3">
              CONFIRM SELECTION
              <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" />
            </span>
          </button>

          <div className="flex items-center gap-6 text-[8px] font-mono text-white/30 uppercase tracking-[0.4em]">
            <span>DATA_VERSION: 1.0.4</span>
            <div className="w-1 h-1 bg-white/20 rounded-full" />
            <span>ENCRYPTION: AES-256</span>
            <div className="w-1 h-1 bg-white/20 rounded-full" />
            <span>LINK_QUALITY: 100%</span>
          </div>
        </motion.div>
      </main>

      <div className="h-safe-bottom" />
    </div>
  );
}
