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
  Pressable,
  Dimensions,
  Platform,
  ActivityIndicator
} from 'react-native';
import { MotiView } from 'moti';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useAuth } from '@/contexts/AuthContext';
import { useAudio } from '@/contexts/AudioContext';
import { Settings, Users } from 'lucide-react-native';
import { useNotification } from '@/contexts/NotificationContext';
import { useTutorial } from '@/context/TutorialContext';
import { useDailyStepsProgress } from '@/hooks/useDailyStepsProgress';
import { useGameData } from '@/hooks/useGameData';

import { HunterHeader } from '@/components/HunterHeader';
import { ClearedGatesSection } from '@/components/ClearedGatesSection';
import { StatusWindowModal } from '@/components/modals/StatusWindowModal';
import VitalitySection from '@/components/VitalitySection';
import TrainingWidget from '@/components/TrainingWidget';
import TrainingLogModal from '@/components/modals/TrainingLogModal';
import WeeklyFeedbackModal from '@/components/modals/WeeklyFeedbackModal';
import { api as trainingApi } from '@/api/training';
import { useWeeklyReset } from '@/hooks/useWeeklyReset';
import { ChestOpeningModal } from '@/components/modals/ChestOpeningModal';
import { LevelUpModal } from '@/components/modals/LevelUpModal';
import { InviteFriendsModal } from '@/components/modals/InviteFriendsModal';
import { supabase } from '@/lib/supabase';

const HomeScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { user, setUser } = useAuth();
  const { startBackgroundMusic, playTrack } = useAudio();
  const { showNotification } = useNotification();
  const { step, targetRef } = useTutorial();
  const { stepsToday } = useDailyStepsProgress();
  const { shopItems } = useGameData();
  const [clearedGatesRefresh, setClearedGatesRefresh] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const isResetDue = useWeeklyReset(user);
  const [showWeeklyResetModal, setShowWeeklyResetModal] = useState(false);
  
  // Test Chest State
  const [showTestChest, setShowTestChest] = useState(false);
  const [showLevelUpPreview, setShowLevelUpPreview] = useState(false);
  const [gateRadarPartyModalVisible, setGateRadarPartyModalVisible] = useState(false);

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
    setClearedGatesRefresh((k) => k + 1);
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

          {/* Special Gates — Gate Radar */}
          <View style={styles.specialGatesSection}>
            <View style={styles.specialGatesHeader}>
              <Image
                source={require('../../assets/special instances.png')}
                style={styles.specialGatesIcon}
              />
              <Text style={styles.specialGatesHeaderTitle}>SPECIAL GATES</Text>
            </View>

            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                navigation.navigate('DungeonDiscovery');
              }}
              style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => [
                styles.gateRadarCard,
                (pressed || hovered) && styles.gateRadarCardActive,
              ]}
              android_ripple={{ color: 'rgba(34, 211, 238, 0.25)', borderless: false }}
            >
              <View style={styles.gateRadarScanClip}>
                <MotiView
                  pointerEvents="none"
                  style={[StyleSheet.absoluteFill, styles.gateRadarRing]}
                  from={{ opacity: 0.45, scale: 0.98 }}
                  animate={{ opacity: 0, scale: 1.06 }}
                  transition={{
                    type: 'timing',
                    duration: 2200,
                    loop: true,
                    repeatReverse: false,
                  }}
                />
                <MotiView
                  pointerEvents="none"
                  style={[StyleSheet.absoluteFill, styles.gateRadarRing]}
                  from={{ opacity: 0.35, scale: 0.98 }}
                  animate={{ opacity: 0, scale: 1.06 }}
                  transition={{
                    type: 'timing',
                    duration: 2200,
                    loop: true,
                    repeatReverse: false,
                    delay: 750,
                  }}
                />
                <LinearGradient colors={['#0f172a', '#020617']} style={styles.gateRadarGradient}>
                  <View style={styles.gateRadarTitleRow}>
                    <MotiView
                      animate={{ opacity: [0.85, 1, 0.85] }}
                      transition={{ type: 'timing', duration: 1800, loop: true }}
                    >
                      <Ionicons name="radio-outline" size={18} color="#22d3ee" />
                    </MotiView>
                    <Text style={styles.gateRadarTitle}>GATE RADAR</Text>
                  </View>
                  <Text style={styles.gateRadarBody}>
                    Nearby dungeon gates show on the map. Scan to pick a gate, run the route, and clear it.
                  </Text>
                  <View style={styles.gateRadarCtaButton}>
                    <Ionicons name="scan-outline" size={20} color="#020617" />
                    <Text style={styles.gateRadarCtaButtonText}>Initiate scan</Text>
                  </View>
                </LinearGradient>
              </View>
            </Pressable>
          </View>

          {/* Cleared Gates — you & friends */}
          <View style={styles.sectionHeader}>
            <Image source={require('../../assets/gates.png')} style={styles.sectionIcon} />
            <Text style={styles.sectionTitle}>CLEARED GATES</Text>
          </View>

          <ClearedGatesSection
            currentUserId={user.id}
            shopItems={shopItems}
            refreshKey={clearedGatesRefresh}
          />

          <View style={{ height: 100 }} />

          {/* TEST BUTTON - REMOVE IN PROD */}
          <TouchableOpacity
            style={styles.testChestBtn}
            onPress={handleTestChest}
          >
            <Text style={styles.testChestBtnText}>[DEBUG] OPEN TEST CHEST</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.testLevelUpBtn}
            onPress={() => setShowLevelUpPreview(true)}
          >
            <Text style={styles.testLevelUpBtnText}>[DEBUG] LEVEL UP (full flow)</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.debugRunCompleteBtn}
            onPress={() =>
              navigation.navigate('RunComplete', {
                demo: true,
                runData: {},
                dungeon: {},
              })
            }
          >
            <Text style={styles.debugRunCompleteBtnText}>[DEBUG] RUN COMPLETE (cards)</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>

      <ChestOpeningModal
        isOpen={showTestChest}
        chestType="medium"
        onAnimationComplete={handleChestComplete}
      />

      <LevelUpModal
        visible={showLevelUpPreview}
        user={user}
        fromLevel={user?.level ?? 7}
        toLevel={(user?.level ?? 7) + 1}
        onClose={() => setShowLevelUpPreview(false)}
        preview
        autoPlay
      />

      <InviteFriendsModal
        visible={gateRadarPartyModalVisible}
        onClose={() => setGateRadarPartyModalVisible(false)}
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
    fontFamily: 'Exo2-Regular',
  },
  specialGatesSection: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  specialGatesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  specialGatesIcon: {
    width: 24,
    height: 24,
    marginRight: 8,
    resizeMode: 'contain',
  },
  specialGatesHeaderTitle: {
    fontSize: 10,
    fontWeight: '900',
    color: '#ef4444',
    letterSpacing: 4,
    flex: 1,
    fontFamily: 'Exo2-Regular',
  },
  gateRadarCard: {
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(34, 211, 238, 0.28)',
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
  },
  gateRadarCardActive: {
    borderColor: 'rgba(34, 211, 238, 0.65)',
    shadowColor: '#22d3ee',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 14,
    elevation: 6,
  },
  gateRadarScanClip: {
    borderRadius: 14,
    overflow: 'hidden',
    position: 'relative',
  },
  gateRadarRing: {
    borderRadius: 14,
    borderWidth: 2,
    borderColor: 'rgba(34, 211, 238, 0.5)',
  },
  gateRadarGradient: {
    padding: 18,
    zIndex: 1,
  },
  gateRadarTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  gateRadarTitle: {
    fontFamily: 'Exo2-Regular',
    fontSize: 11,
    fontWeight: '900',
    color: '#22d3ee',
    letterSpacing: 3,
    textTransform: 'uppercase',
  },
  gateRadarBody: {
    fontFamily: 'Exo2-Regular',
    fontSize: 11,
    fontWeight: '600',
    color: '#64748b',
    lineHeight: 17,
    letterSpacing: 0.2,
    marginTop: 10,
  },
  gateRadarCtaButton: {
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#22d3ee',
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: 12,
    shadowColor: '#06b6d4',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 4,
  },
  gateRadarCtaButtonText: {
    color: '#020617',
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  gateRadarPostRunHint: {
    fontFamily: 'Exo2-Regular',
    fontSize: 9,
    fontWeight: '600',
    color: '#475569',
    lineHeight: 14,
    letterSpacing: 0.2,
    marginTop: 10,
  },
  gateRadarPartyBtn: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(34, 211, 238, 0.35)',
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
  },
  gateRadarPartyBtnText: {
    fontFamily: 'Exo2-Regular',
    fontSize: 11,
    fontWeight: '800',
    color: '#94a3b8',
    letterSpacing: 0.5,
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
  testLevelUpBtn: {
    marginHorizontal: 20,
    marginBottom: 24,
    paddingVertical: 14,
    paddingHorizontal: 20,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(0, 255, 255, 0.75)',
    backgroundColor: 'rgba(2, 12, 32, 0.92)',
    shadowColor: '#00ffff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 14,
    elevation: 8,
  },
  testLevelUpBtnText: {
    color: '#e6ffff',
    fontFamily: 'Montserrat-Bold',
    fontSize: 12,
    letterSpacing: 3,
    textTransform: 'uppercase',
    textShadowColor: 'rgba(0, 210, 255, 0.8)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  debugRunCompleteBtn: {
    marginHorizontal: 20,
    marginBottom: 28,
    paddingVertical: 14,
    paddingHorizontal: 20,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(34, 211, 238, 0.55)',
    backgroundColor: 'rgba(15, 23, 42, 0.95)',
    borderRadius: 12,
  },
  debugRunCompleteBtnText: {
    color: '#22d3ee',
    fontFamily: 'Exo2-Regular',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 2,
  },
});

export default HomeScreen;
