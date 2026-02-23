"use client";

import { useState, useEffect } from 'react';
import { User } from '@/lib/types';

interface TempleProps {
  user: User;
  onClose?: () => void;
  setUser?: (user: User) => void;
  showNotification?: (message: string, type: 'success' | 'error') => void;
}

export default function Temple({ user, onClose, setUser, showNotification }: TempleProps) {
  const [timeUntilUnlock, setTimeUntilUnlock] = useState<number | null>(null);

  useEffect(() => {
    if (user.next_advancement_attempt) {
      const updateTimer = () => {
        const now = new Date().getTime();
        const unlockTime = new Date(user.next_advancement_attempt!).getTime();
        const timeLeft = unlockTime - now;

        if (timeLeft > 0) {
          setTimeUntilUnlock(Math.ceil(timeLeft / 1000));
        } else {
          setTimeUntilUnlock(null);
        }
      };

      updateTimer();
      const interval = setInterval(updateTimer, 1000);
      return () => clearInterval(interval);
    } else {
      setTimeUntilUnlock(null);
    }
  }, [user.next_advancement_attempt]);

  const isAtAdvancementLevel = () => {
    const level = user.level || 1;
    return [30, 60, 90, 120].includes(level);
  };

  const getCurrentAdvancementQuest = () => {
    const level = user.level || 1;
    const currentClass = user.current_class || 'None';

    if (!isAtAdvancementLevel()) {
      return null;
    }

    return getClassQuest(currentClass, level);
  };

  const getTitleForTier = (className: string, tier: number) => {
    const titles: Record<string, Record<number, string>> = {
      'Assassin': {
        0: 'Novice Assassin',
        1: 'Silent Blade',
        2: 'Phantom Stalker',
        3: 'Shadow Monarch'
      },
      'Fighter': {
        0: 'Brawler',
        1: 'Striker',
        2: 'Berserker',
        3: 'God of War'
      },
      'Tanker': {
        0: 'Squire',
        1: 'Shield-Bearer',
        2: 'Iron Wall',
        3: 'Immortal Aegis'
      },
      'Mage': {
        0: 'Acolyte',
        1: 'Sorcerer',
        2: 'Archmage',
        3: 'Ruler of Mana'
      },
      'Healer': {
        0: 'Apprentice Monk',
        1: 'Sanctum Weaver',
        2: 'Luminous Archpriest',
        3: 'Saint of Beginning'
      },
      'Ranger': {
        0: 'Novice Tracker',
        1: 'Wind-Walker',
        2: 'Storm-Bolt Sniper',
        3: 'Monarch of the Hunt'
      }
    };

    return titles[className]?.[tier] || `Tier ${tier} ${className}`;
  };

  const handleAdvancementAttempt = async () => {
    try {
      if (!isAtAdvancementLevel()) {
        showNotification?.('You must be at a milestone level (30, 60, 90, or 120) to attempt advancement.', 'error');
        return;
      }

      if (timeUntilUnlock !== null) {
        showNotification?.('The Temple is currently sealed. Please wait for the lockout to expire.', 'error');
        return;
      }

      const successRate = 0.7;
      const isSuccess = Math.random() < successRate;

      if (isSuccess) {
        const currentTier = user.rank_tier || 0;
        const newTier = currentTier + 1;
        const newTitle = getTitleForTier(user.current_class || 'None', newTier);

        const response = await fetch('/api/user', {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            rank_tier: newTier,
            current_title: newTitle,
            next_advancement_attempt: null,
          }),
        });

        if (response.ok) {
          const updatedUser = await response.json();
          if (typeof setUser === 'function') {
            setUser(updatedUser);
          }
          showNotification?.(`🎉 Advancement successful! You are now ${newTitle}!`, 'success');
        } else {
          showNotification?.('Failed to update advancement.', 'error');
        }
      } else {
        const sevenDaysFromNow = new Date();
        sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

        const response = await fetch('/api/user', {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            next_advancement_attempt: sevenDaysFromNow.toISOString(),
          }),
        });

        if (response.ok) {
          const updatedUser = await response.json();
          if (typeof setUser === 'function') {
            setUser(updatedUser);
          }
          showNotification?.('💀 Advancement failed! The Temple is now sealed for 7 days.', 'error');
        } else {
          showNotification?.('Failed to update advancement attempt.', 'error');
        }
      }
    } catch (error) {
      console.error('Error during advancement attempt:', error);
      showNotification?.('Error occurred during advancement attempt.', 'error');
    }
  };

  const getClassQuest = (className: string, level: number) => {
    const quests: Record<string, Record<number, { title: string; description: string; requirements: string[]; rewards: string[] }>> = {
      'Assassin': {
        60: {
          title: 'Silent Blade',
          description: 'Master the art of speed and precision in combat.',
          requirements: ['Complete 10 high-intensity cardio sessions', 'Achieve 95%+ accuracy in challenges', 'Unlock 3 assassin-specific skills'],
          rewards: ['+15 SPD', '+10 LCK', 'Agile Strike ability', 'Exclusive assassin equipment']
        },
        90: {
          title: 'Phantom Stalker',
          description: 'Become a master of speed and deadly precision.',
          requirements: ['Complete 25 elite cardio challenges', 'Achieve 99%+ accuracy', 'Master all assassin abilities'],
          rewards: ['+20 SPD', '+15 LCK', '+10 PER', 'Phantom Dash ability', 'Legendary assassin gear']
        },
        120: {
          title: 'Shadow Monarch',
          description: 'Transcend speed itself and become the ultimate predator.',
          requirements: ['Complete 50 god-tier cardio trials', 'Perfect accuracy record', 'Attain speed divinity'],
          rewards: ['Shadow Monarch Form', 'God-tier equipment', 'Reality-warping speed', 'Monarch status']
        }
      },
      'Fighter': {
        60: {
          title: 'Striker',
          description: 'Forge your body into an unstoppable force of strength.',
          requirements: ['Complete 15 intense weightlifting sessions', 'Achieve 90%+ performance goals', 'Master basic strength techniques'],
          rewards: ['+15 STR', '+10 END', 'Power Strike ability', 'Enhanced fighter equipment']
        },
        90: {
          title: 'Berserker',
          description: 'Channel raw power and dominate with overwhelming strength.',
          requirements: ['Complete 30 legendary HIIT battles', '95%+ performance rate', 'Master all strength skills'],
          rewards: ['+20 STR', '+15 END', '+10 WIL', 'Berserker Rage', 'Mythical fighter gear']
        },
        120: {
          title: 'God of War',
          description: 'Ascend to godhood through sheer physical dominance.',
          requirements: ['Complete 60 divine strength trials', 'Perfect performance record', 'Attain strength divinity'],
          rewards: ['Divine Strength', 'God-tier weapons', 'Reality-warping power', 'Warrior Monarch']
        }
      },
      'Tanker': {
        60: {
          title: 'Shield-Bearer',
          description: 'Build an unbreakable constitution that withstands any challenge.',
          requirements: ['Complete 20 endurance cycling sessions', 'Maintain peak performance', 'Master stamina techniques'],
          rewards: ['+20 CON', '+10 WIL', 'Endurance Shield', 'Heavy tank equipment']
        },
        90: {
          title: 'Iron Wall',
          description: 'Become an immovable force of pure resilience.',
          requirements: ['Survive 40 legendary endurance sieges', 'Perfect stamina record', 'Master all tank abilities'],
          rewards: ['+25 CON', '+15 WIL', '+10 STR', 'Iron Wall stance', 'Legendary tank armor']
        },
        120: {
          title: 'Immortal Aegis',
          description: 'Transcend mortality to become the ultimate bastion of endurance.',
          requirements: ['Survive 80 divine endurance cataclysms', 'Perfect resilience record', 'Attain constitution divinity'],
          rewards: ['Immortal Defense', 'God-tier armor', 'Reality-enduring abilities', 'Guardian Monarch']
        }
      },
      'Mage': {
        60: {
          title: 'Sorcerer',
          description: 'Master technical precision and core intelligence.',
          requirements: ['Complete 12 advanced core/pilates sessions', 'Master 5 technical skills', 'Achieve 90%+ form accuracy'],
          rewards: ['+15 INT', '+10 WIL', 'Technical Mastery', 'Enhanced mage robes']
        },
        90: {
          title: 'Archmage',
          description: 'Command intelligence that rivals divine comprehension.',
          requirements: ['Complete 28 legendary technical challenges', 'Master 15 core techniques', '95%+ precision rate'],
          rewards: ['+20 INT', '+15 WIL', '+10 PER', 'Archmage Aura', 'Mythical mage artifacts']
        },
        120: {
          title: 'Ruler of Mana',
          description: 'Become the living embodiment of intellectual supremacy.',
          requirements: ['Complete 55 divine technical rituals', 'Perfect core mastery', 'Attain intelligence divinity'],
          rewards: ['Sovereign Intelligence', 'God-tier artifacts', 'Reality-comprehending abilities', 'Magic Monarch']
        }
      },
      'Healer': {
        60: {
          title: 'Sanctum Weaver',
          description: 'Master the art of recovery and restorative vitality.',
          requirements: ['Complete 500 minutes of consistent recovery activities', 'Complete 10 stretching challenges', 'Master 4 recovery techniques'],
          rewards: ['+15 VIT', '+10 WIL', 'Restorative Touch', 'Sacred healer garments']
        },
        90: {
          title: 'Luminous Archpriest',
          description: 'Command vitality itself and defy physical limitations.',
          requirements: ['Complete 2000 minutes of legendary recovery', 'Complete 25 healing sessions', 'Master 12 vitality abilities'],
          rewards: ['+20 VIT', '+15 WIL', '+10 PER', 'Vitality Aura', 'Divine healer relics']
        },
        120: {
          title: 'Saint of Beginning',
          description: 'Transcend vitality to become the ultimate force of restoration.',
          requirements: ['Complete 5000 minutes of divine recovery', 'Complete 60 sacred resurrections', 'Attain vitality divinity'],
          rewards: ['Immortal Vitality', 'God-tier relics', 'Reality-restoring abilities', 'Savior Monarch']
        }
      },
      'Ranger': {
        60: {
          title: 'Sensory Adept',
          description: 'Master heightened awareness and sensory perception.',
          requirements: ['Complete 14 perception training sessions', 'Achieve 95%+ situational awareness', 'Master 3 sensory enhancement skills'],
          rewards: ['+10 SPD', '+15 PER', 'Eagle Eye ability', 'Enhanced ranger gear']
        },
        90: {
          title: 'Perception Sage',
          description: 'Command reality through unparalleled awareness and insight.',
          requirements: ['Complete 32 legendary awareness challenges', '99%+ sensory accuracy', 'Master all perception abilities'],
          rewards: ['+15 SPD', '+20 PER', '+10 LCK', 'Mind\'s Eye', 'Mythical ranger artifacts']
        },
        120: {
          title: 'Omniscient Monarch',
          description: 'Become the living embodiment of perfect perception and foresight.',
          requirements: ['Complete 65 divine awareness trials', 'Perfect sensory record', 'Attain perception divinity'],
          rewards: ['Omniscient Dominion', 'God-tier artifacts', 'Reality-seeing abilities', 'Perception Monarch']
        }
      }
    };

    return quests[className]?.[level] || {
      title: 'Unknown Quest',
      description: 'This advancement quest is not yet implemented.',
      requirements: ['Contact system administrator'],
      rewards: ['TBD']
    };
  };

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const currentQuest = getCurrentAdvancementQuest();

  if (!isAtAdvancementLevel()) {
    const nextMilestone = Math.min(...[30, 60, 90, 120].filter(level => level > (user.level || 1)));
    const currentLevel = user.level || 1;
    return (
      <div className="h-screen bg-black text-white flex flex-col items-center justify-center p-4 relative overflow-hidden font-sans">
        <div className="text-center space-y-4 animate-in fade-in zoom-in duration-1000">
          <div className="inline-block">
            <div className="w-16 h-16 mx-auto mb-3 border-4 border-cyan-500 rounded-full animate-spin border-t-transparent"></div>
          </div>

          <h1 className="text-xl font-header font-black uppercase tracking-widest text-cyan-400 drop-shadow-[0_0_8px_rgba(34,211,238,0.8)]">
            🏛️ ADVANCEMENT TEMPLE
          </h1>

          <div className="system-glass p-6 max-w-sm">
            <h2 className="text-xl font-header font-black text-cyan-300 mb-3 uppercase tracking-wide">
              System Message
            </h2>
            <p className="text-gray-300 text-sm leading-relaxed mb-3">
              The System is analyzing your potential. Reach a milestone level to unlock advancement.
            </p>
            <div className="text-center">
              <div className="text-3xl font-header font-black text-red-400 mb-2">
                {currentLevel}/{nextMilestone || 120}
              </div>
              <p className="text-sm text-gray-400 uppercase tracking-widest">
                Next Milestone: Level {nextMilestone || 120}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="px-6 py-3 clip-tech-button bg-cyan-600 hover:bg-cyan-500 text-white font-black uppercase text-sm tracking-widest shadow-[0_0_15px_rgba(34,211,238,0.4)] transition-all hover:shadow-[0_0_25px_rgba(34,211,238,0.6)]"
          >
            ← Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (timeUntilUnlock !== null) {
    return (
      <div className="h-screen bg-black text-white flex flex-col items-center justify-center p-4 relative overflow-hidden font-sans">
        <div className="text-center space-y-4 animate-in fade-in zoom-in duration-1000">
          <div className="inline-block">
            <div className="w-16 h-16 mx-auto mb-3 border-4 border-red-500 rounded-full animate-pulse"></div>
          </div>

          <h1 className="text-xl font-header font-black uppercase tracking-widest text-red-400 drop-shadow-[0_0_8px_rgba(239,68,68,0.8)]">
            🏛️ TEMPLE SEALED
          </h1>

          <div className="system-glass p-6 max-w-sm border border-red-500/50">
            <h2 className="text-xl font-header font-black text-red-300 mb-3 uppercase tracking-wide">
              Temple Cooldown Active
            </h2>
            <p className="text-gray-300 text-sm leading-relaxed mb-3">
              The advancement ritual has recently been performed. The temple must recover its power before another advancement can begin.
            </p>
            <div className="text-center">
              <div className="text-3xl font-header font-black text-red-400 mb-2 font-mono">
                {formatTime(timeUntilUnlock)}
              </div>
              <p className="text-sm text-gray-400 uppercase tracking-widest">
                Time Until Next Advancement
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="px-6 py-3 clip-tech-button bg-red-600 hover:bg-red-500 text-white font-black uppercase text-sm tracking-widest shadow-[0_0_15px_rgba(239,68,68,0.4)] transition-all hover:shadow-[0_0_25px_rgba(239,68,68,0.6)]"
          >
            ← Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-black text-white flex flex-col items-center justify-center p-4 relative overflow-hidden font-sans">
      <div className="text-center space-y-4 animate-in fade-in zoom-in duration-1000">
        <div className="inline-block">
          <div className="w-16 h-16 mx-auto mb-3 border-4 border-yellow-500 rounded-full animate-pulse"></div>
        </div>

        <h1 className="text-xl font-header font-black uppercase tracking-widest text-yellow-400 drop-shadow-[0_0_8px_rgba(234,179,8,0.8)]">
          🏛️ ADVANCEMENT TEMPLE
        </h1>

        <div className="system-glass p-6 max-w-xl">
          <div className="text-center mb-3">
            <h2 className="text-xl font-header font-black text-cyan-400 uppercase tracking-wide mb-2">
              Quest Trial: {currentQuest?.title || 'Unknown Quest'}
            </h2>
            <p className="text-sm text-gray-300">
              Level {user.level} Advancement Quest
            </p>
            <p className="text-xs text-yellow-400 mt-2">
              Current Rank: {getTitleForTier(user.current_class || 'None', user.rank_tier || 0)}
            </p>
          </div>

          {currentQuest ? (
            <div className="space-y-6">
              <div className="text-center">
                <p className="text-gray-300 text-sm leading-relaxed mb-3">
                  {currentQuest.description}
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <h3 className="text-base font-header font-black text-green-400 uppercase tracking-wide">
                    Requirements
                  </h3>
                  <ul className="space-y-2">
                    {currentQuest.requirements.map((req, index) => (
                      <li key={index} className="flex items-start gap-2 text-sm text-gray-300">
                        <span className="text-green-400 mt-1">•</span>
                        <span>{req}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="space-y-3">
                  <h3 className="text-base font-header font-black text-yellow-400 uppercase tracking-wide">
                    Rewards
                  </h3>
                  <ul className="space-y-2">
                    {currentQuest.rewards.map((reward, index) => (
                      <li key={index} className="flex items-start gap-2 text-sm text-gray-300">
                        <span className="text-yellow-400 mt-1">★</span>
                        <span>{reward}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="text-center pt-4 space-y-4">
                <button
                  onClick={handleAdvancementAttempt}
                  disabled={timeUntilUnlock !== null || !isAtAdvancementLevel()}
                  className={`px-6 py-3 clip-tech-button font-header font-black text-base uppercase tracking-widest transition-all hover:scale-105 ${
                    timeUntilUnlock !== null || !isAtAdvancementLevel()
                      ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                      : 'bg-gradient-to-r from-yellow-600 to-yellow-500 hover:from-yellow-500 hover:to-yellow-400 text-black shadow-[0_0_20px_rgba(234,179,8,0.6)] hover:shadow-[0_0_30px_rgba(234,179,8,0.8)]'
                  }`}
                >
                  ⚡ ATTEMPT ADVANCEMENT ⚡
                </button>

                <div className="text-center space-y-2">
                  <p className="text-xs text-yellow-400 uppercase tracking-widest">
                    ⚠️ 70% Success Rate • 7-Day Lockout on Failure
                  </p>
                  <p className="text-xs text-gray-500 uppercase tracking-widest">
                    This action cannot be undone
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center">
              <h3 className="text-xl font-header font-black text-cyan-400 mb-3">
                Maximum Power Achieved
              </h3>
              <p className="text-gray-300 text-sm">
                You have reached the pinnacle of power. No further advancements are available.
              </p>
            </div>
          )}
        </div>

        <button
          onClick={onClose}
          className="px-6 py-3 clip-tech-button bg-cyan-600 hover:bg-cyan-500 text-white font-black uppercase text-sm tracking-widest shadow-[0_0_15px_rgba(34,211,238,0.4)] transition-all hover:shadow-[0_0_25px_rgba(34,211,238,0.6)]"
        >
          ← Return to Dashboard
        </button>
      </div>
    </div>
  );
}
