'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Gem, Award, Percent } from 'lucide-react';

interface RewardModalProps {
  isOpen: boolean;
  rank?: string;
  gemsEarned?: number;
  goldBuff?: number;
  expBuff?: number;
  onClose: () => void;
  rewards?: {
    title: string;
    coins: number;
    exp: number;
    gemsEarned?: number;
    statBoost?: Record<string, number>;
  } | null;
}

const RewardModal = ({ isOpen, rank, gemsEarned, goldBuff, expBuff, onClose, rewards }: RewardModalProps) => {

  const handleClaim = async () => {
    try {
      // Use the exact path where you placed the file
      const audio = new Audio('/sounds/claim-reward.mp3'); 
      audio.volume = 0.5;

      // Play and handle browser autoplay blocks
      await audio.play().catch(err => {
        console.warn("Audio blocked by browser:", err);
      });
    } catch (error) {
      console.error("Audio system error:", error);
    }

    // Trigger the claim logic in GameModals.tsx
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[100] p-4"
          // Removed onClick={() => setIsOpen(false)} to prevent crashes
        >
          <motion.div
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 20 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            className="bg-gradient-to-br from-[#0a192f] to-[#172a45] w-full max-w-md rounded-2xl border-2 border-yellow-500/50 shadow-2xl shadow-yellow-500/20 text-white overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-8 text-center">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1, rotate: 360 }}
                transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
              >
                <Award className="w-20 h-20 mx-auto text-yellow-400" />
              </motion.div>

              <h2 className="text-3xl font-bold mt-4 tracking-wider uppercase italic">
                {rewards ? rewards.title : "Season Concluded"}
              </h2>
              <p className="text-sm text-gray-400 mt-2">
                {rewards ? "Rewards extracted from the supply chest." : "Your efforts have been recognized by the Association."}
              </p>

              <div className="my-8 space-y-4">
                {rewards ? (
                  <>
                    <div className="bg-slate-800/50 p-4 rounded-lg flex justify-between items-center border border-slate-700">
                      <span className="font-semibold text-gray-300">Gold Acquired</span>
                      <div className="flex items-center gap-2">
                        <img src="/coinicon.png" alt="Coins" className="w-6 h-6" />
                        <span className="text-2xl font-bold text-yellow-400">+{rewards.coins}</span>
                      </div>
                    </div>
                    <div className="bg-slate-800/50 p-4 rounded-lg flex justify-between items-center border border-slate-700">
                      <span className="font-semibold text-gray-300">EXP Gained</span>
                      <div className="flex items-center gap-2">
                        <img src="/expcrystal.png" alt="EXP" className="w-6 h-6" />
                        <span className="text-2xl font-bold text-cyan-400">+{rewards.exp}</span>
                      </div>
                    </div>
                    {rewards.gemsEarned && rewards.gemsEarned > 0 && (
                      <div className="bg-slate-800/50 p-4 rounded-lg flex justify-between items-center border border-slate-700">
                        <span className="font-semibold text-gray-300">Gems Acquired</span>
                        <div className="flex items-center gap-2">
                          <Gem className="w-6 h-6 text-purple-400" />
                          <span className="text-2xl font-bold text-purple-400">+{rewards.gemsEarned}</span>
                        </div>
                      </div>
                    )}
                    {rewards.statBoost && (
                       <div className="bg-slate-800/50 p-4 rounded-lg flex justify-between items-center border border-cyan-500/30">
                         <span className="font-semibold text-gray-300">Stat Improvement</span>
                         <span className="text-xl font-bold text-green-400">
                           +{Object.values(rewards.statBoost)[0]} {Object.keys(rewards.statBoost)[0].replace('_stat', '').toUpperCase()}
                         </span>
                       </div>
                    )}
                  </>
                ) : (
                  <>
                    <div className="bg-slate-800/50 p-4 rounded-lg flex justify-between items-center border border-slate-700">
                      <span className="font-semibold text-gray-300">Association Rank</span>
                      <span className="text-2xl font-bold text-yellow-400">#{rank || '---'}</span>
                    </div>
                    <div className="bg-slate-800/50 p-4 rounded-lg flex justify-between items-center border border-slate-700">
                      <span className="font-semibold text-gray-300">Gem Reward</span>
                      <div className="flex items-center gap-2">
                        <Gem className="w-6 h-6 text-cyan-400" />
                        <span className="text-2xl font-bold text-cyan-400">+{gemsEarned || 0}</span>
                      </div>
                    </div>
                  </>
                )}
              </div>

              {!rewards && (
                <>
                  <h3 className="text-xl font-semibold mb-4 border-t border-yellow-500/20 pt-6">New Passive Buffs</h3>
                  <div className="flex justify-center gap-4">
                    <div className="bg-slate-800/50 p-4 rounded-lg flex-1 border border-green-500/20">
                      <div className="flex items-center justify-center gap-2">
                        <Percent className="w-4 h-4 text-green-400" />
                        <span className="text-sm font-bold text-green-400 uppercase">EXP</span>
                      </div>
                      <span className="text-2xl font-bold mt-1 block">+{expBuff || 0}%</span>
                    </div>
                    <div className="bg-slate-800/50 p-4 rounded-lg flex-1 border border-yellow-500/20">
                      <div className="flex items-center justify-center gap-2">
                        <Percent className="w-4 h-4 text-yellow-400" />
                        <span className="text-sm font-bold text-yellow-400 uppercase">Gold</span>
                      </div>
                      <span className="text-2xl font-bold mt-1 block">+{goldBuff || 0}%</span>
                    </div>
                  </div>
                </>
              )}
            </div>

            <motion.button
              whileHover={{ scale: 1.02, backgroundColor: '#facc15' }}
              whileTap={{ scale: 0.98 }}
              onClick={handleClaim}
              className="w-full bg-yellow-500 text-gray-900 font-black py-5 text-xl uppercase tracking-widest transition-all"
            >
              Claim Rewards
            </motion.button>

          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default RewardModal;