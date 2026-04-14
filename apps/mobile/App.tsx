import './src/polyfills';
import React, { useState, useEffect } from 'react';
import * as WebBrowser from 'expo-web-browser';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Modal, ActivityIndicator, View, Image } from 'react-native';
import * as Asset from 'expo-asset';
import { useFonts, Exo2_400Regular, Exo2_700Bold } from '@expo-google-fonts/exo-2';

import {
  Montserrat_100Thin,
  Montserrat_600SemiBold,
  Montserrat_700Bold,
  Montserrat_800ExtraBold,
} from '@expo-google-fonts/montserrat';
import { Lato_400Regular, Lato_700Bold, Lato_900Black } from '@expo-google-fonts/lato';
import { AppNavigator } from '@/navigation/AppNavigator';
import { AppProviders } from '@/contexts/AppProviders';
import Notification from '@/components/Notification';
import { useNotification } from '@/contexts/NotificationContext';
import HologramOverlay from '@/components/HologramOverlay';
import { navigationRef } from '@/navigation/navigationRef';
import { TutorialProvider, useTutorial } from '@/context/TutorialContext';
import { useAuth } from '@/contexts/AuthContext';
import { ChestOpeningModal } from '@/components/modals/ChestOpeningModal';
import { RewardModal } from '@/components/modals/RewardModal';
import { supabase } from '@/lib/supabase';
import { EncounterTransition } from '@/components/EncounterTransition';
import { initializeGlobalAudioMode } from '@/utils/audio';
import { useBootStore } from '@/store/useBootStore';
import { checkForUpdates } from '@/utils/syncEngine';
import BootScreen from '@/screens/BootScreen';

import Toast from 'react-native-toast-message';

WebBrowser.maybeCompleteAuthSession();

const TUTORIAL_REWARD_COINS = 50;

function TutorialOverlay({ isRewardModalVisible }: { isRewardModalVisible: boolean }) {
  const { step, showTutorialChest } = useTutorial();
  // Hide global overlay when a modal-specific overlay is used,
  // or when the tutorial reward chest or reward modal is open
  if (
    showTutorialChest ||
    isRewardModalVisible ||
    step === 'TRAINING_LOG_MODAL' ||
    step === 'TRAINING_LOG_DIET' ||
    step === 'NAV_STATS'
  ) {
    return null;
  }
  return <HologramOverlay />;
}

function TutorialRewardFlow({ onRewardModalVisibilityChange }: { onRewardModalVisibilityChange: (visible: boolean) => void }) {
  const { user, setUser } = useAuth();
  const { showTutorialChest, setShowTutorialChest, completeTutorial } = useTutorial();
  const [showRewardModal, setShowRewardModal] = useState(false);

  useEffect(() => {
    onRewardModalVisibilityChange(showRewardModal);
  }, [showRewardModal]);

  const handleChestComplete = () => {
    setShowTutorialChest(false);
    const uid = user?.id;
    if (uid && user) {
      const newCoins = (user.coins || 0) + TUTORIAL_REWARD_COINS;
      setUser({ ...user, coins: newCoins });
      void (async () => {
        try {
          const { error } = await supabase
            .from('profiles')
            .update({ coins: newCoins })
            .eq('id', uid);
          if (error) console.warn('[Tutorial] Chest coin sync:', error.message);
        } catch (e) {
          console.warn('[Tutorial] Chest coin sync failed:', e);
        }
      })();
    }
    requestAnimationFrame(() => setShowRewardModal(true));
  };

  const handleRewardClose = () => {
    // Defer close + persistence to next frame so touch / Reanimated can finish (avoids hard crashes on Claim)
    requestAnimationFrame(() => {
      setShowRewardModal(false);
      void completeTutorial();
    });
  };

  return (
    <>
      <ChestOpeningModal
        isOpen={showTutorialChest}
        chestType="small"
        onAnimationComplete={handleChestComplete}
      />
      <RewardModal
        visible={showRewardModal}
        onClose={handleRewardClose}
        title="Tutorial Reward"
        rewards={[{ type: 'coins', amount: TUTORIAL_REWARD_COINS }]}
      />
    </>
  );
}

function NotificationWrapper() {
  const { notification, hideNotification } = useNotification();

  if (!notification) return null;

  return (
    <Notification
      message={notification.message}
      type={notification.type}
      onHide={hideNotification}
    />
  );
}

export default function App(): React.ReactElement {
  const [isRewardModalVisible, setIsRewardModalVisible] = useState(false);
  const bootStep = useBootStore((s) => s.bootStep);

  useEffect(() => {
    void initializeGlobalAudioMode();
    void checkForUpdates();
  }, []);

  const [fontsLoaded] = useFonts({
    'Exo2-Regular': Exo2_400Regular,
    'Exo2-Bold': Exo2_700Bold,
    'Montserrat-Thin': Montserrat_100Thin,
    'Montserrat-SemiBold': Montserrat_600SemiBold,
    'Montserrat-Bold': Montserrat_700Bold,
    'Montserrat-ExtraBold': Montserrat_800ExtraBold,
    'Lato-Regular': Lato_400Regular,
    'Lato-Bold': Lato_700Bold,
    'Lato-Black': Lato_900Black,
  });

  if (!fontsLoaded) {
    return (
      <View style={{ flex: 1, backgroundColor: '#020617', justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#00e5ff" />
      </View>
    );
  }

  if (bootStep !== 'READY') {
    return <BootScreen />;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AppProviders>
          <NavigationContainer ref={navigationRef}>
            <TutorialProvider>
              <AppNavigator />
              <StatusBar style="auto" />
              <EncounterTransition />
              <TutorialOverlay isRewardModalVisible={isRewardModalVisible} />
              <TutorialRewardFlow onRewardModalVisibilityChange={setIsRewardModalVisible} />
            </TutorialProvider>
          </NavigationContainer>
          <NotificationWrapper />
          <Toast />
        </AppProviders>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
