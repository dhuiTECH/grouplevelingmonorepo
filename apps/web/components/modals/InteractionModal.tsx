'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, ChevronRight, FastForward } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { WorldMapNode } from '@/hooks/useExploration';

interface DialogueLine {
  npc_name?: string;
  text?: string;
  voice_line_url?: string;
  image_url?: string;
}

interface ActionButton {
  label?: string;
  target_event?: string;
}

interface InteractionModalProps {
  visible: boolean;
  onClose: () => void;
  activeInteraction: WorldMapNode | null;
  onOpenShop?: () => void;
  onAction?: (event: string) => void;
  availableQuests?: any[];
  userQuests?: any[];
  onAcceptQuest?: (questId: string) => void;
  onClaimQuestReward?: (questId: string) => void;
}

// --- Typewriter Component ---
const TypewriterText = ({ text, speed = 30, onComplete }: { text: string, speed?: number, onComplete?: () => void }) => {
  const [displayedText, setDisplayedText] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    setDisplayedText('');
    setCurrentIndex(0);
  }, [text]);

  useEffect(() => {
    if (currentIndex < text.length) {
      const timeout = setTimeout(() => {
        setDisplayedText(prev => prev + text[currentIndex]);
        setCurrentIndex(prev => prev + 1);
      }, speed);
      return () => clearTimeout(timeout);
    } else if (onComplete) {
      onComplete();
    }
  }, [currentIndex, text, speed, onComplete]);

  return <>{displayedText}</>;
};

function getWelcomeText(node: WorldMapNode): string {
  const data = node.interaction_data as Record<string, unknown> | undefined;
  if (data?.welcome_text && typeof data.welcome_text === 'string') return data.welcome_text;
  return `Welcome to ${node.name}.`;
}

function getActionButtons(node: WorldMapNode): ActionButton[] {
  const data = node.interaction_data as Record<string, unknown> | undefined;
  const raw = data?.action_buttons;
  if (Array.isArray(raw)) return raw as ActionButton[];
  return [];
}

function getDialogueScript(node: WorldMapNode): DialogueLine[] {
  const data = node.interaction_data as Record<string, unknown> | undefined;
  const raw = data?.dialogue_script;
  if (Array.isArray(raw)) return raw as DialogueLine[];
  return [];
}

export default function InteractionModal({
  visible,
  onClose,
  activeInteraction,
  onOpenShop,
  onAction,
  availableQuests = [],
  userQuests = [],
  onAcceptQuest,
  onClaimQuestReward,
}: InteractionModalProps) {
  const [dialogueIndex, setDialogueIndex] = useState(0);
  const [isTypingComplete, setIsTypingComplete] = useState(false);
  const voiceRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (visible) {
      setDialogueIndex(0);
      setIsTypingComplete(false);
    }
  }, [visible]);

  const dialogueScript = activeInteraction ? getDialogueScript(activeInteraction) : [];
  const currentLine = dialogueScript[dialogueIndex];
  const welcomeText = activeInteraction ? getWelcomeText(activeInteraction) : '';
  const actionButtons = activeInteraction ? getActionButtons(activeInteraction) : [];
  
  const showDialogue = dialogueScript.length > 0;
  
  // Scene visuals
  const scene = activeInteraction?.interaction_data?.scene as { scene_background_url?: string; scene_npc_sprite_url?: string } | undefined;
  const sceneBackground = scene?.scene_background_url || activeInteraction?.modal_image_url;
  const sceneNpcSprite = scene?.scene_npc_sprite_url;
  const portraitUrl = (showDialogue && currentLine?.image_url) ? currentLine.image_url : sceneNpcSprite;

  // Audio logic
  useEffect(() => {
    if (!visible || !showDialogue || !currentLine?.voice_line_url) return;
    if (voiceRef.current) {
      voiceRef.current.pause();
    }
    const audio = new Audio(currentLine.voice_line_url);
    voiceRef.current = audio;
    audio.play().catch(() => {});
    return () => {
      audio.pause();
      audio.src = '';
      voiceRef.current = null;
    };
  }, [visible, showDialogue, dialogueIndex, currentLine?.voice_line_url]);

  // Quest logic
  const nodeQuest = activeInteraction ? availableQuests.find(q => q.node_id === activeInteraction.id) : null;
  const userQuest = nodeQuest ? userQuests.find(uq => uq.quest_id === nodeQuest.id) : null;
  const isQuestAvailable = nodeQuest && !userQuest;
  const isQuestActive = userQuest && userQuest.status === 'active';
  const isQuestCompleted = userQuest && userQuest.status === 'completed';
  const isQuestClaimed = userQuest && userQuest.status === 'claimed';

  const handleAction = useCallback((targetEvent: string) => {
    if (targetEvent === 'OPEN_SHOP' && onOpenShop) {
      onOpenShop();
      onClose();
    } else if (onAction) {
      onAction(targetEvent);
    }
    onClose();
  }, [onOpenShop, onAction, onClose]);

  const handleNext = () => {
    if (!isTypingComplete) {
      setIsTypingComplete(true);
      return;
    }
    if (dialogueIndex < dialogueScript.length - 1) {
      setDialogueIndex(i => i + 1);
      setIsTypingComplete(false);
    } else if (activeInteraction?.interaction_type === 'BATTLE') {
      handleAction('START_BATTLE');
    } else {
      onClose();
    }
  };

  if (!visible || !activeInteraction) return null;

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] bg-black flex items-center justify-center overflow-hidden"
      >
        {/* Full-screen Background */}
        {sceneBackground && (
          <motion.div 
            initial={{ scale: 1.1 }}
            animate={{ scale: 1 }}
            className="absolute inset-0 z-0"
          >
            <img 
              src={sceneBackground} 
              alt="Background" 
              className="w-full h-full object-cover opacity-60 contrast-125 saturate-110"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-80" />
          </motion.div>
        )}

        {/* NPC Sprite Layer */}
        {sceneNpcSprite && (
          <motion.div 
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none"
          >
            <img 
              src={sceneNpcSprite} 
              alt="NPC" 
              className="max-h-[70%] w-auto object-contain drop-shadow-[0_0_30px_rgba(6,182,212,0.4)]"
            />
          </motion.div>
        )}

        {/* Close Button Top Right */}
        <button 
          onClick={onClose}
          className="absolute top-6 right-6 z-[110] p-2 rounded-full bg-black/40 border border-white/10 text-white/70 hover:text-white hover:bg-black/60 transition-all"
        >
          <X size={24} />
        </button>

        {/* Main Interface Wrapper */}
        <div className="relative w-full h-full flex flex-col justify-end p-4 md:p-8">
          
          {/* Quest Banner if available */}
          {nodeQuest && !isQuestClaimed && !showDialogue && (
            <motion.div 
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="absolute top-20 left-1/2 -translate-x-1/2 w-full max-w-lg px-4 z-50"
            >
              <div className="bg-slate-900/90 border-2 border-amber-500/50 rounded-2xl p-4 backdrop-blur-md shadow-2xl shadow-amber-900/20">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-black uppercase tracking-widest text-amber-400">
                    {isQuestAvailable ? 'New Quest' : isQuestActive ? 'Active Objective' : 'Quest Complete'}
                  </span>
                  {isQuestActive && <div className="animate-pulse w-2 h-2 bg-amber-500 rounded-full" />}
                </div>
                <h3 className="text-lg font-black text-white mb-1 uppercase italic tracking-tight">{nodeQuest.title}</h3>
                <p className="text-xs text-gray-300 mb-4">{nodeQuest.description}</p>
                
                <div className="flex items-center gap-3 mb-4">
                  {nodeQuest.rewards?.exp && <span className="text-[10px] font-bold text-cyan-400">+{nodeQuest.rewards.exp} XP</span>}
                  {nodeQuest.rewards?.coins && <span className="text-[10px] font-bold text-yellow-400">+{nodeQuest.rewards.coins} GOLD</span>}
                </div>

                {isQuestAvailable && (
                  <button 
                    onClick={() => onAcceptQuest?.(nodeQuest.id)}
                    className="w-full py-3 bg-amber-600 hover:bg-amber-500 text-white font-black uppercase text-xs rounded-xl shadow-lg transition-all"
                  >
                    Accept Contract
                  </button>
                )}
                {isQuestCompleted && (
                  <button 
                    onClick={() => onClaimQuestReward?.(nodeQuest.id)}
                    className="w-full py-3 bg-green-600 hover:bg-green-500 text-white font-black uppercase text-xs rounded-xl shadow-lg transition-all"
                  >
                    Claim Rewards
                  </button>
                )}
              </div>
            </motion.div>
          )}

          {/* JRPG Dialogue Box */}
          <motion.div 
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="w-full max-w-4xl mx-auto z-50"
          >
            <div className="relative bg-slate-950/90 backdrop-blur-xl border-t-2 border-x-2 border-cyan-500/30 rounded-t-3xl p-6 md:p-8 min-h-[220px] md:min-h-[260px] shadow-[0_-20px_50px_rgba(0,0,0,0.8)] overflow-hidden">
              
              {/* Decorative Corner Accents */}
              <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-cyan-400 rounded-tl-3xl opacity-50" />
              <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-cyan-400 rounded-tr-3xl opacity-50" />
              
              <div className="flex gap-6 md:gap-10">
                {/* Portrait */}
                {portraitUrl && (
                  <motion.div 
                    key={portraitUrl}
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="hidden md:block w-32 h-32 md:w-40 md:h-40 rounded-2xl border-2 border-cyan-500/30 bg-slate-900 overflow-hidden shrink-0 shadow-2xl"
                  >
                    <img src={portraitUrl} alt="Portrait" className="w-full h-full object-cover" />
                  </motion.div>
                )}

                {/* Text Content */}
                <div className="flex-1 min-w-0 flex flex-col">
                  {(showDialogue ? currentLine?.npc_name : activeInteraction.name) && (
                    <div className="mb-2">
                      <span className="text-[11px] md:text-xs font-black uppercase tracking-[0.3em] text-cyan-400 bg-cyan-950/40 px-3 py-1 rounded-full border border-cyan-500/20">
                        {showDialogue ? currentLine?.npc_name : activeInteraction.name}
                      </span>
                    </div>
                  )}

                  <div className="flex-1">
                    <p className="text-lg md:text-2xl font-bold text-gray-100 leading-relaxed md:leading-loose">
                      <TypewriterText 
                        key={`${dialogueIndex}-${showDialogue}`}
                        text={showDialogue ? (currentLine?.text || '') : welcomeText} 
                        speed={25}
                        onComplete={() => setIsTypingComplete(true)}
                      />
                    </p>
                  </div>

                  {/* Controls / Actions */}
                  <div className="mt-6 flex items-center justify-between">
                    <div className="flex gap-2">
                      {!showDialogue && actionButtons.map((btn, i) => (
                        <button
                          key={i}
                          onClick={() => handleAction(btn.target_event ?? 'NONE')}
                          className="px-6 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-black uppercase rounded-xl transition-all shadow-lg shadow-cyan-900/20"
                        >
                          {btn.label}
                        </button>
                      ))}
                    </div>

                    <div className="flex gap-3">
                      {showDialogue && dialogueIndex < dialogueScript.length - 1 && (
                        <button 
                          onClick={() => {
                            setDialogueIndex(dialogueScript.length - 1);
                            setIsTypingComplete(true);
                          }}
                          className="px-4 py-2 text-gray-500 hover:text-gray-300 text-[10px] font-black uppercase tracking-widest flex items-center gap-2"
                        >
                          <FastForward size={14} /> Skip
                        </button>
                      )}
                      
                      <button 
                        onClick={handleNext}
                        className="group flex items-center gap-3 px-8 py-3 bg-gradient-to-r from-cyan-600 to-blue-700 hover:from-cyan-500 hover:to-blue-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl shadow-blue-900/40 transition-all active:scale-95"
                      >
                        {isTypingComplete ? (
                          <>
                            {showDialogue && dialogueIndex < dialogueScript.length - 1 ? 'Next' : 
                             activeInteraction.interaction_type === 'BATTLE' ? 'Fight' : 'Continue'}
                            <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" />
                          </>
                        ) : (
                          'Skip Reveal'
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Progress Indicator for Dialogue */}
              {showDialogue && (
                <div className="absolute bottom-0 left-0 h-1 bg-cyan-500/20 w-full">
                  <motion.div 
                    className="h-full bg-cyan-400 shadow-[0_0_10px_#22d3ee]"
                    initial={{ width: 0 }}
                    animate={{ width: `${((dialogueIndex + 1) / dialogueScript.length) * 100}%` }}
                  />
                </div>
              )}
            </div>
          </motion.div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
