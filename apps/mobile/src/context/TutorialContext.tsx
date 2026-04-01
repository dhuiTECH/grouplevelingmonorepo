import React, { createContext, useContext, useState, useEffect } from 'react';
import { LayoutRectangle } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '@/contexts/AuthContext';
import { useAudio } from '@/contexts/AudioContext';
import { navigationRef } from '@/navigation/navigationRef';
import { supabase } from '@/lib/supabase';

export type TutorialStep = 
  | 'IDLE'            
  | 'INTRO_HOME'      
  | 'TRAINING_CARD'   
  | 'TRAINING_LOG_MODAL'
  | 'TRAINING_LOG_DIET'
  | 'NAV_SHOP'
  | 'NAV_SHOP_MAGIC'
  | 'NAV_SHOP_GACHA'
  | 'NAV_INVENTORY'   
  | 'NAV_STATS'
  | 'NAV_SOCIAL'
  | 'NAV_MAP'
  | 'TUTORIAL_END'
  | 'COMPLETED';

interface TutorialContextType {
  step: TutorialStep;
  nextStep: () => void;
  setStep: (step: TutorialStep) => void;
  targetRef: (node: any) => void;
  position: LayoutRectangle | null;
  showTutorialChest: boolean;
  setShowTutorialChest: (show: boolean) => void;
  completeTutorial: () => void;
}

const TutorialContext = createContext<TutorialContextType | null>(null);

export const TutorialProvider = ({ children }: { children: React.ReactNode }) => {
  const { user, setUser } = useAuth();
  const { stopBackgroundMusic } = useAudio();
  const [step, setStep] = useState<TutorialStep>('IDLE');
  const [position, setPosition] = useState<LayoutRectangle | null>(null);
  const [showTutorialChest, setShowTutorialChest] = useState(false);

  useEffect(() => {
    // Reset state when user changes (e.g. logout/login)
    setStep('IDLE');
    setPosition(null);
  }, [user?.id]);

  useEffect(() => {
    const checkTutorialStatus = async () => {
      // Check for user existence and onboarding completion
      if (user?.onboarding_completed && user?.id) {
        
        // 1. Check DB first (Most reliable)
        const dbCompleted = user.tutorial_completed;

        // 2. Check AsyncStorage (Legacy/Fallback)
        const key = `tutorial_completed_v1_${user.id}`;
        let localCompleted = false;
        try {
          const hasSeen = await AsyncStorage.getItem(key);
          localCompleted = !!hasSeen;
        } catch (err) {
          console.error('[Tutorial] Storage Error:', err);
        }

        const isCompleted = dbCompleted || localCompleted;
          
        // Debugging log
        console.log(`[Tutorial] User: ${user.id}, Onboarding: ${user.onboarding_completed}, DB Completed: ${dbCompleted}, Local Completed: ${localCompleted}`);

        if (!isCompleted && step === 'IDLE') {
          console.log('[Tutorial] Starting intro sequence...');
          // Add a small delay to ensure we are on the Home screen
          setTimeout(() => {
            stopBackgroundMusic();
            // Permanently disable onboarding BGM after tutorial starts
            AsyncStorage.setItem('@app/bgm_disabled_after_tutorial', 'true').catch(() => {});
            setStep('INTRO_HOME');
          }, 1000);
        } else if (isCompleted && step !== 'COMPLETED' && step !== 'IDLE') {
           // If we think we are running, but DB says done, stop it.
           // But if step is IDLE, we just stay IDLE.
           // If step is something else, we might want to reset to COMPLETED.
           setStep('COMPLETED');
        } else if (isCompleted && step === 'IDLE') {
           setStep('COMPLETED'); 
        }
      }
    };
    checkTutorialStatus();
  }, [user?.onboarding_completed, user?.id, user?.tutorial_completed, step]);

  // Auto-Navigator logic
  useEffect(() => {
    const timer = setTimeout(() => {
      if (navigationRef.isReady()) {
        // INTRO_HOME and TRAINING_CARD are on 'System' (Home) tab
        // We need to navigate to 'Home' stack first, then the specific tab
        if (step === 'INTRO_HOME') {
          navigationRef.navigate('Home', { screen: 'System' } as never);
        }
        if (step === 'TRAINING_CARD') {
          navigationRef.navigate('Home', { screen: 'System' } as never);
        }
        
        // Auto-switch tabs based on step
        if (step === 'NAV_SHOP' || step === 'NAV_SHOP_MAGIC' || step === 'NAV_SHOP_GACHA') {
          navigationRef.navigate('Home', { screen: 'Shop' } as never);
        }
        if (step === 'NAV_INVENTORY') {
          navigationRef.navigate('Home', { screen: 'Hunter' } as never); // 'Hunter' is Inventory screen
        }
        if (step === 'NAV_STATS') {
          navigationRef.navigate('Home', { screen: 'System' } as never);
        }
        if (step === 'NAV_SOCIAL') {
          navigationRef.navigate('Home', { screen: 'Social' } as never);
        }
        if (step === 'NAV_MAP') {
          navigationRef.navigate('WorldMap' as never);
        }
        if (step === 'TUTORIAL_END') {
          navigationRef.navigate('Home', { screen: 'System' } as never);
        }
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [step]);

  const targetRef = (node: any) => {
    if (node) {
      // 300ms delay ensures the UI is fully laid out/transitioned before measuring
      setTimeout(() => {
        node.measure((fx: number, fy: number, w: number, h: number, px: number, py: number) => {
          setPosition({ x: px, y: py, width: w, height: h });
        });
      }, 300);
    }
  };

  const nextStep = () => {
    setPosition(null); // Clear highlight during transition
    
    if (step === 'INTRO_HOME') setStep('TRAINING_CARD');
    else if (step === 'TRAINING_CARD') setStep('TRAINING_LOG_MODAL');
    else if (step === 'TRAINING_LOG_MODAL') setStep('TRAINING_LOG_DIET');
    else if (step === 'TRAINING_LOG_DIET') setStep('NAV_SHOP');
    else if (step === 'NAV_SHOP') setStep('NAV_SHOP_MAGIC');
    else if (step === 'NAV_SHOP_MAGIC') setStep('NAV_SHOP_GACHA');
    else if (step === 'NAV_SHOP_GACHA') setStep('NAV_INVENTORY');
    else if (step === 'NAV_INVENTORY') setStep('NAV_STATS');
    else if (step === 'NAV_STATS') setStep('NAV_SOCIAL');
    else if (step === 'NAV_SOCIAL') setStep('NAV_MAP');
    else if (step === 'NAV_MAP') setStep('TUTORIAL_END');
  };

  const completeTutorial = async () => {
    setStep('COMPLETED');
    setShowTutorialChest(false);
    if (user?.id) {
      try {
        await AsyncStorage.setItem(`tutorial_completed_v1_${user.id}`, 'true');
      } catch (e) {
        console.warn('[Tutorial] AsyncStorage save failed:', e);
      }

      try {
        const { error } = await supabase
          .from('profiles')
          .update({ tutorial_completed: true })
          .eq('id', user.id);

        if (error) throw error;
      } catch (err) {
        console.error('[Tutorial] Failed to save completion to DB:', err);
      }

      // Keep auth context in sync so HomeScreen / audio hooks see completion immediately
      try {
        setUser({ ...user, tutorial_completed: true });
      } catch (e) {
        console.warn('[Tutorial] setUser after completion failed:', e);
      }
    }
  };

  return (
    <TutorialContext.Provider value={{ step, nextStep, setStep, targetRef, position, showTutorialChest, setShowTutorialChest, completeTutorial }}>
      {children}
    </TutorialContext.Provider>
  );
};

export const useTutorial = () => {
  const context = useContext(TutorialContext);
  if (!context) throw new Error("useTutorial must be used within a TutorialProvider");
  return context;
};
