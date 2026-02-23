'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { User } from '@/lib/types';
import LayeredAvatar from '@/components/LayeredAvatar';
import PlayerCallingCard from '@/components/PlayerCallingCard';
import StatusWindow from '@/components/StatusWindow';
import TrainingLogModal from '@/components/TrainingLogModal';
import RewardModal from '@/components/RewardModal';
import ChestOpeningModal from '@/components/ChestOpeningModal';

interface GameModalsProps {
  // Avatar Viewer Modal
  selectedAvatar: User | null;
  setSelectedAvatar: (user: User | null) => void;
  user: User | null;

  // System Notification
  notification: { message: string; type: 'success' | 'error' } | null;

  // Purchase Confirmation Dialog
  purchaseConfirmation: {
    show: boolean;
    item: any;
    reason: string;
    type: 'level' | 'class';
  } | null;
  setPurchaseConfirmation: (confirmation: any) => void;
  handlePurchaseConfirmation: (confirmed: boolean) => void;
  isUploading: boolean;

  // Status Window Modal
  showStatusWindow: boolean;
  setShowStatusWindow: (show: boolean) => void;
  setUser: (user: any) => void;

  // Training Log Modal
  showTrainingModal: boolean;
  setShowTrainingModal: (show: boolean) => void;
  trainingProtocol: any[];
  nutritionLogs: any[];
  fetchProtocol: () => void;
  fetchNutrition: () => void;
  showNotification: (message: string, type?: 'success' | 'error') => void;
    handleClaimReward: (
    source: 'daily' | 'weekly' | 'streak' | 'special' | 'manual_daily' | 'manual_weekly',
    explicitType?: 'small' | 'silver' | 'medium' | 'large'
  ) => Promise<void>;

  // Reward Modals
  isChestAnimating: boolean;
  currentChestType: 'small' | 'silver' | 'medium' | 'large';
  onChestAnimationComplete?: () => void;
  rewardModalData: any;
  setRewardModalData: (data: any) => void;
  seasonRewardModalData: any;
  setSeasonRewardModalData: (data: any) => void;
  initialTab?: 'training' | 'nutrition';
}

export default function GameModals({
  selectedAvatar,
  setSelectedAvatar,
  user,
  notification,
  purchaseConfirmation,
  setPurchaseConfirmation,
  handlePurchaseConfirmation,
  isUploading,
  showStatusWindow,
  setShowStatusWindow,
  setUser,
  showTrainingModal,
  setShowTrainingModal,
  trainingProtocol,
  nutritionLogs,
  fetchProtocol,
  fetchNutrition,
  showNotification,
  handleClaimReward,
  isChestAnimating,
  currentChestType,
  onChestAnimationComplete,
  rewardModalData,
  setRewardModalData,
  seasonRewardModalData,
  setSeasonRewardModalData,
  initialTab
}: GameModalsProps) {

  // --- THE FIX IS HERE ---
  const handleClaimSeasonRewards = async () => {
    // Safety check: Don't run if data is missing
    if (!user || !user.id || !seasonRewardModalData) return;

    // 1. Capture the rewards into a variable
    const rewardsToClaim = { ...seasonRewardModalData };

    // 2. FORCE CLOSE IMMEDIATELY
    // We do this first so the window vanishes instantly. No waiting.
    setSeasonRewardModalData(null);

    // 3. UPDATE SCREEN LOCALLY
    // We show your new gems right away.
    setUser({
      ...user,
      gems: (user.gems || 0) + rewardsToClaim.gemsEarned,
      last_season_reward_claimed_at: new Date().toISOString(),
    });

    try {
      // 4. TELL SERVER IN BACKGROUND
      // Since you said Supabase is updating correctly, this part is already working!
      // We just fire this off and don't wait for it.
      await fetch('/api/user/claim-season-rewards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          gemsEarned: rewardsToClaim.gemsEarned,
          season: `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`
        }),
      });

      showNotification?.(`Claimed ${rewardsToClaim.gemsEarned} Gems!`, "success");

    } catch (error) {
      console.error('Network error claiming rewards:', error);
    }
  };
  // --- END OF FIX ---

  return (
    <>
      {/* Avatar Viewer Modal */}
      {selectedAvatar && (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-xl z-[200] flex items-center justify-center p-2 sm:p-4">
          <div className="system-glass w-fit max-w-[98vw] aspect-square relative flex flex-col rounded-2xl border border-white/10 shadow-2xl overflow-hidden">

            {/* Header */}
            <div className="absolute top-0 left-0 right-0 p-3 sm:p-4 z-50 flex justify-between items-start pointer-events-none">
              <div className="pointer-events-auto">
                <PlayerCallingCard
                  user={selectedAvatar}
                  referralCode={selectedAvatar.referral_code}
                  skinId={selectedAvatar.active_skin}
                  size="sm"
                  className="shadow-2xl border border-white/10"
                  isOwnCard={selectedAvatar.id === user?.id}
                />
              </div>
              <button
                onClick={() => setSelectedAvatar(null)}
                className="pointer-events-auto bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white px-4 py-1.5 rounded-lg text-[10px] font-black tracking-widest transition-all border border-red-500/20 backdrop-blur-md"
              >
                CLOSE
              </button>
            </div>

            {/* Content Area - Filling container perfectly */}
            <div className="relative bg-[#020617] flex items-center justify-center overflow-hidden">
              <LayeredAvatar
                user={selectedAvatar}
                size={typeof window !== 'undefined' ? (window.innerWidth < 640 ? Math.min(window.innerWidth - 16, 450) : 512) : 512}
                className="cursor-default"
                onAvatarClick={() => { }}
              />
            </div>
          </div>
        </div>
      )}

      {/* System Notification */}
      {notification && (
        <motion.div
          initial={{ opacity: 0, x: 300 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 300 }}
          transition={{ duration: 0.3 }}
          className="fixed top-4 right-4 z-[9999] max-w-sm"
        >
          <div className="system-glass border border-cyan-500/50 p-4 clip-tech-card">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse"></div>
              <div className="text-sm font-black uppercase tracking-widest text-cyan-400">
                [SYSTEM]
              </div>
            </div>
            <div className="mt-2 text-sm font-ui font-bold text-white">
              {notification.message}
            </div>
          </div>
        </motion.div>
      )}

      {/* Purchase Confirmation Dialog */}
      {purchaseConfirmation && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-[300] flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-red-500/30 rounded-lg p-6 max-w-md w-full clip-tech-card relative">
            {/* Close button */}
            <button
              onClick={() => setPurchaseConfirmation(null)}
              className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors text-xl font-bold"
            >
              ✕
            </button>

            <div className="text-center">
              {/* Warning Icon */}
              <div className="text-4xl mb-4">⚠️</div>

              {/* Title */}
              <h3 className="text-xl font-black italic text-white mb-4 uppercase tracking-tighter">
                SYSTEM REQUIREMENTS NOT MET
              </h3>

              {/* Item Info */}
              <div className="mb-4">
                <div className="text-sm text-blue-400 font-bold mb-2">{purchaseConfirmation.item.name}</div>
                <div className="text-xs text-red-400 font-bold mb-3">
                  {purchaseConfirmation.reason}
                </div>
                <div className="text-sm text-yellow-400 font-bold">
                  Do you want to purchase it anyway?
                </div>
              </div>

              {/* Price Info */}
              <div className="text-lg font-black text-green-400 mb-6">
                Cost: {purchaseConfirmation.item.price} coins
              </div>

              {/* Buttons */}
              <div className="flex gap-3 justify-center">
                <button
                  onClick={() => handlePurchaseConfirmation(false)}
                  className="px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white font-black uppercase tracking-wider border-b-4 border-gray-900 shadow-lg transition-all hover:brightness-110 active:border-b-0 active:translate-y-[4px]"
                  disabled={isUploading}
                >
                  NO
                </button>
                <button
                  onClick={() => handlePurchaseConfirmation(true)}
                  className="px-6 py-3 bg-green-600 hover:bg-green-500 text-white font-black uppercase tracking-wider border-b-4 border-green-900 shadow-lg transition-all hover:brightness-110 active:border-b-0 active:translate-y-[4px]"
                  disabled={isUploading}
                >
                  {isUploading ? 'PURCHASING...' : 'YES'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Status Window Modal */}
      {showStatusWindow && user && (
        <StatusWindow user={user} onClose={() => setShowStatusWindow(false)} setUser={setUser} showNotification={showNotification} />
      )}

      {/* Training Log Modal */}
      <TrainingLogModal
        initialTab={initialTab}
        isOpen={showTrainingModal}
        onClose={() => setShowTrainingModal(false)}
        user={user}
        trainingProtocol={trainingProtocol}
        nutritionLogs={nutritionLogs}
        onUpdate={fetchProtocol}
        onNutritionUpdate={fetchNutrition}
        showNotification={showNotification}
        setUser={setUser}
        handleClaimReward={handleClaimReward}
      />

      {/* Reward Modal - Chest Animation */}
      <ChestOpeningModal
        isOpen={isChestAnimating}
        chestType={currentChestType}
        onAnimationComplete={() => {
          if (onChestAnimationComplete) onChestAnimationComplete();
        }}
      />

      {/* Reward Modal - Pop-up */}
      <RewardModal
        isOpen={!!rewardModalData && !isChestAnimating || !!seasonRewardModalData}
        onClose={() => {
          if (seasonRewardModalData) {
            handleClaimSeasonRewards();
          } else {
            setRewardModalData(null);
          }
        }}
        rewards={rewardModalData}
        rank={seasonRewardModalData?.rank}
        gemsEarned={seasonRewardModalData?.gemsEarned}
        goldBuff={seasonRewardModalData?.goldBuff}
        expBuff={seasonRewardModalData?.expBuff}
      />
    </>
  );
}