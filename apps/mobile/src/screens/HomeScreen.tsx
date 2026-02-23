import React, { useState, useCallback, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  SafeAreaView, 
  Image, 
  RefreshControl, 
  TouchableOpacity,
  Dimensions,
  Platform,
  ActivityIndicator
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useAuth } from '@/contexts/AuthContext';
import { useAudio } from '@/contexts/AudioContext';
import { Settings } from 'lucide-react-native';
import { playHunterSound } from '@/utils/audio';
import { useNotification } from '@/contexts/NotificationContext';
import { useTutorial } from '@/context/TutorialContext';
import { useDailyStepsProgress } from '@/hooks/useDailyStepsProgress';
import { useDungeons } from '@/hooks/useDungeons';

import { HunterHeader } from '@/components/HunterHeader';
import { StatusWindowModal } from '@/components/modals/StatusWindowModal';
import VitalitySection from '@/components/VitalitySection';
import TrainingWidget from '@/components/TrainingWidget';
import DungeonView from '@/components/DungeonView';

import TrainingLogModal from '@/components/modals/TrainingLogModal';
import WeeklyFeedbackModal from '@/components/modals/WeeklyFeedbackModal';
import { api as trainingApi } from '@/api/training';
import { useWeeklyReset } from '@/hooks/useWeeklyReset';
import { ChestOpeningModal } from '@/components/modals/ChestOpeningModal';
import { supabase } from '@/lib/supabase';

const HomeScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { user, setUser } = useAuth();
  const { startBackgroundMusic, playTrack } = useAudio();
  const { showNotification } = useNotification();
  const { step, targetRef } = useTutorial();
  const { stepsToday } = useDailyStepsProgress();
  const { dungeons, loading: dungeonsLoading } = useDungeons();
  const [refreshing, setRefreshing] = useState(false);
  const isResetDue = useWeeklyReset(user);
  const [showWeeklyResetModal, setShowWeeklyResetModal] = useState(false);
  
  // Test Chest State
  const [showTestChest, setShowTestChest] = useState(false);

  useEffect(() => {
    if (isResetDue) {
      setShowWeeklyResetModal(true);
    }
  }, [isResetDue]);

  const handleWeeklyReset = async (rating: number) => {
      if (!user?.id) return;
      const res = await trainingApi.resetWeeklyTraining(user.id, rating);
      if (res.success) {
          setShowWeeklyResetModal(false);
          // Update user context to reflect reset
          setUser({ ...user, last_reset: new Date().toISOString() });
          showNotification("SYSTEM RESET COMPLETE", "success");
          onRefresh(); 
      } else {
          showNotification("RESET FAILED", "error");
      }
  };

  const handleTestChest = () => {
    setShowTestChest(true);
  };

  const handleChestComplete = async () => {
    setShowTestChest(false);
    if (user) {
      const rewardAmount = 100;
      const newCoins = (user.coins || 0) + rewardAmount;
      setUser({ ...user, coins: newCoins });
      try {
        await supabase.from('profiles').update({ coins: newCoins }).eq('id', user.id);
        showNotification(`+${rewardAmount} COINS`, 'success');
      } catch (error) {
        showNotification('Failed to save rewards', 'error');
      }
    }
  };

  useFocusEffect(
    useCallback(() => {
      // For first-time users, keep onboarding music until tutorial starts
      if (user?.tutorial_completed) {
        playTrack('Dashboard');
      } else {
        playTrack('Onboarding Screen - Before Tutorial Overlay');
      }
    }, [playTrack, user?.tutorial_completed])
  );

  const [showStatusWindow, setShowStatusWindow] = useState(false);
  const [isTrainingLogVisible, setIsTrainingLogVisible] = useState(false);
  const [initialTrainingTab, setInitialTrainingTab] = useState<'training' | 'nutrition'>('training');

  // Only play onboarding BGM when tutorial hasn't started or is fully completed
  useEffect(() => {
    if (step === 'IDLE' || step === 'COMPLETED') {
      startBackgroundMusic();
    }
  }, [startBackgroundMusic, step]);

  useEffect(() => {
    if (step === 'TRAINING_LOG_MODAL' || step === 'TRAINING_LOG_DIET') {
      setIsTrainingLogVisible(true);
    } else if (isTrainingLogVisible && step !== 'TRAINING_LOG_MODAL' && step !== 'TRAINING_LOG_DIET' && step !== 'IDLE' && step !== 'COMPLETED') {
      // Close modal if tutorial moves past this step, but only if it was opened by tutorial
      // Actually, just closing it when step changes is safer for tutorial flow
      setIsTrainingLogVisible(false);
    }
  }, [step, isTrainingLogVisible]);

  // Auto-open Status Window when tutorial is explaining stats/skills
  useEffect(() => {
    if (step === 'NAV_STATS') {
      setShowStatusWindow(true);
    } else if (
      showStatusWindow &&
      step !== 'NAV_STATS' &&
      step !== 'IDLE' &&
      step !== 'COMPLETED'
    ) {
      setShowStatusWindow(false);
    }
  }, [step, showStatusWindow]);

  const handleOpenTrainingLog = (tab: 'training' | 'nutrition') => {
    setInitialTrainingTab(tab);
    setIsTrainingLogVisible(true);
  };

  useEffect(() => {
    if (user && !user.current_class) {
      const timer = setTimeout(() => {
        navigation.navigate('ClassSelection');
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [user]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => {
      setRefreshing(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }, 1500);
  }, []);

  if (!user) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#00ffff" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#020617', '#0f172a', '#020617']}
        style={styles.gradientBg}
      />
      <SafeAreaView style={{ flex: 1 }}>
        <HunterHeader 
          user={user} 
          setShowStatusWindow={setShowStatusWindow}
          fastBoot={false}
          setFastBoot={() => {}}
          toggleIncognito={() => {}}
        />
        <StatusWindowModal 
          visible={showStatusWindow} 
          onClose={() => setShowStatusWindow(false)} 
          user={user}
          setUser={setUser}
        />
        <WeeklyFeedbackModal 
          visible={showWeeklyResetModal} 
          onConfirm={handleWeeklyReset} 
        />
        <TrainingLogModal 
          isOpen={isTrainingLogVisible} 
          onClose={() => setIsTrainingLogVisible(false)} 
          user={user} 
          initialTab={initialTrainingTab}
        />
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#06b6d4" />
          }
        >
          {/* Vitality Section */}
          <VitalitySection 
            user={user} 
            level={user.level} 
            setSelectedAvatar={() => {}} 
          />

          {/* Training Widget */}
          <View ref={step === 'TRAINING_CARD' ? targetRef : undefined} collapsable={false}>
            <TrainingWidget
              user={user}
              trainingProtocol={{}}
              nutritionLogs={[]}
              onOpenModal={handleOpenTrainingLog}
              onClaimChest={() => {}}
              onClaimStepsReward={() => {}}
              dailySteps={stepsToday}
            />
          </View>

          {/* Special Instances */}
          <DungeonView
            user={user}
            dungeons={dungeons}
            activeTab="dashboard"
            onNavigate={() => {}}
            showNotification={() => {}}
            setUser={setUser}
            level={user.level}
            rank="E-RANK"
            onAvatarClick={() => {}}
            selectedDungeon={null}
            setSelectedDungeon={() => {}}
          />

          {/* Standard Gates / Manual Submission Section */}
          <View style={styles.sectionHeader}>
            <Image source={require('../../assets/gates.png')} style={styles.sectionIcon} />
            <Text style={styles.sectionTitle}>STANDARD GATES</Text>
          </View>

          <View style={styles.manualCard}>
             <LinearGradient
               colors={['rgba(15, 23, 42, 0.8)', 'rgba(30, 41, 59, 0.5)']}
               style={styles.cardInner}
             >
               <View style={styles.manualHeader}>
                 <View style={styles.manualIconBg}>
                    <Text style={styles.manualIcon}>🖼️</Text>
                 </View>
                 <View>
                   <Text style={styles.manualTitle}>MANUAL SUBMISSION <Text style={styles.xpText}>2X EXP/GOLD</Text></Text>
                   <Text style={styles.manualSubtitle}>Upload physical activities/strava screenshot</Text>
                 </View>
               </View>

               <TouchableOpacity 
                 style={styles.uploadBtn}
                 onPress={() => playHunterSound('click')}
               >
                 <Text style={styles.uploadBtnText}>UPLOAD SCREENSHOT</Text>
               </TouchableOpacity>
             </LinearGradient>
          </View>

          <View style={{ height: 100 }} />

          {/* TEST BUTTON - REMOVE IN PROD */}
          <TouchableOpacity
            style={styles.testChestBtn}
            onPress={handleTestChest}
          >
            <Text style={styles.testChestBtnText}>[DEBUG] OPEN TEST CHEST</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>

      <ChestOpeningModal
        isOpen={showTestChest}
        chestType="medium"
        onAnimationComplete={handleChestComplete}
      />
    </View>
  );
};


const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#020617',
  },
  gradientBg: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  profilePic: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#06b6d4',
  },
  userName: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '900',
  },
  userLevel: {
    color: '#06b6d4',
    fontSize: 10,
    fontWeight: 'bold',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  currencyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.8)',
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  coinContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
    gap: 6,
    borderWidth: 1,
    borderColor: '#fbbf24',
  },
  currencyIcon: {
    width: 14,
    height: 14,
    resizeMode: 'contain',
  },
  currencyValue: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  settingsBtn: {
    marginLeft: 4,
  },
  settingsIcon: {
    width: 18,
    height: 18,
    tintColor: '#64748b',
    resizeMode: 'contain',
  },
  scrollContent: {
    paddingTop: 10,
    paddingBottom: 40,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    marginVertical: 12,
  },
  sectionIcon: {
    width: 20,
    height: 20,
    resizeMode: 'contain',
  },
  sectionTitle: {
    fontSize: 10,
    fontWeight: '900',
    color: '#3b82f6',
    letterSpacing: 2,
  },
  manualCard: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  cardInner: {
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  manualHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  manualIconBg: {
    width: 32,
    height: 32,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  manualIcon: {
    fontSize: 16,
  },
  manualTitle: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#3b82f6',
  },
  xpText: {
    color: '#fbbf24',
    fontWeight: '900',
  },
  manualSubtitle: {
    fontSize: 8,
    color: '#64748b',
  },
  uploadBtn: {
    backgroundColor: '#2563eb',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  uploadBtnText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1,
  },
  testChestBtn: {
    backgroundColor: '#eab308',
    margin: 20,
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#facc15',
    shadowColor: '#eab308',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  testChestBtnText: {
    color: '#000',
    fontWeight: '900',
    letterSpacing: 1,
    fontSize: 12,
  },
});

export default HomeScreen;
