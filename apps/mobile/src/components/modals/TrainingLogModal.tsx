import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Modal, ActivityIndicator, Alert, TextInput, StyleSheet, Image } from 'react-native';
import { BlurView } from 'expo-blur';
import { X, Check, Plus, Flame, Utensils, Activity } from 'lucide-react-native';
import { Audio } from 'expo-av';
import { MotiView, AnimatePresence } from 'moti';
import { LinearGradient } from 'expo-linear-gradient';

import { api as trainingApi } from '@/api/training';
import { api as nutritionApi } from '@/api/nutrition';
import { supabase } from '@/lib/supabase';

import ExerciseItem from '../ExerciseItem';
import DeployMissionForm from './DeployMissionForm';
import AddFoodForm from './AddFoodForm';
import HologramPet from '@/components/HologramPet';
import HologramOverlay from '../HologramOverlay';
import { useTutorial } from '@/context/TutorialContext';
import { HunterLogModal } from './HunterLogModal';
import DietLogSection from '../DietLogSection';
import RecoveryTimerSection from '../RecoveryTimerSection';

interface TrainingLogModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: any;
  initialTab?: 'training' | 'nutrition';
  onUpdate?: () => void; // Callback to refresh parent data
  handleClaimReward?: (type: string, size: string) => Promise<void>;
  setUser?: (user: any) => void;
}

import { useNotification } from '@/contexts/NotificationContext';

export default function TrainingLogModal({ 
  isOpen, 
  onClose, 
  user, 
  initialTab = 'training',
  onUpdate,
  handleClaimReward,
  setUser
}: TrainingLogModalProps) {
  const { showNotification } = useNotification();
  const { step } = useTutorial();
  // State
  const [activeTab, setActiveTab] = useState<'training' | 'nutrition'>(initialTab);
  const [selectedJournalDay, setSelectedJournalDay] = useState<string>('Monday');
  const [loading, setLoading] = useState(false);
  
  // Data
  const [localProtocol, setLocalProtocol] = useState<any[]>([]);
  const [localNutritionLogs, setLocalNutritionLogs] = useState<any[]>([]);
  const [userTargets, setUserTargets] = useState<any>(null);
  const [rewardedPathsToday, setRewardedPathsToday] = useState<Set<string>>(new Set());
  
  // Reward Modal State
  const [showReward, setShowReward] = useState(false);
  const [earnedExp, setEarnedExp] = useState(0);
  const [earnedCoins, setEarnedCoins] = useState(0);

  // Sound Refs
  const completeSoundRef = useRef<Audio.Sound | null>(null);

  // Pre-load sound
  useEffect(() => {
    let isMounted = true;
    async function loadSound() {
      try {
        const { sound } = await Audio.Sound.createAsync(
          require('../../../assets/sounds/complete.mp3')
        );
        if (isMounted) {
          completeSoundRef.current = sound;
        } else {
          await sound.unloadAsync();
        }
      } catch (error) {
        console.log('Error pre-loading complete sound:', error);
      }
    }
    loadSound();
    return () => {
      isMounted = false;
      if (completeSoundRef.current) {
        completeSoundRef.current.unloadAsync();
      }
    };
  }, []);

  // Modals
  const [isDeployModalOpen, setIsDeployModalOpen] = useState(false);
  const [deployPathName, setDeployPathName] = useState<string | null>(null);
  const [editingMissionId, setEditingMissionId] = useState<string | null>(null);
  const [deployFormData, setDeployFormData] = useState<{ name: string; sets: any[] }>({ name: '', sets: [] });
  
  const [isFoodModalOpen, setIsFoodModalOpen] = useState(false);
  const [isInitializingCategory, setIsInitializingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [firstExerciseName, setFirstExerciseName] = useState('');

  // Timers
  const [restTimer, setRestTimer] = useState(0);
  const [restTimerInitial, setRestTimerInitial] = useState(0);
  const [isRestTimerActive, setIsRestTimerActive] = useState(false);
  
  const todayName = useMemo(() => {
    return ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][new Date().getDay()];
  }, []);

  const isTodaySelected = selectedJournalDay === todayName;

  // Sound Effect
  const playSound = async (soundFile: any) => {
    try {
      // Use pre-loaded sound if available for better performance
      if (soundFile === require('../../../assets/sounds/complete.mp3') && completeSoundRef.current) {
        await completeSoundRef.current.replayAsync();
        return;
      }
      const { sound } = await Audio.Sound.createAsync(soundFile);
      await sound.playAsync();
      // Cleanup for one-off sounds
      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          sound.unloadAsync();
        }
      });
    } catch (error) {
      console.log('Error playing sound', error);
    }
  };

  // --- Data Fetching ---

  const fetchData = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);

    try {
      const [protocolRes, nutritionRes, targetsRes, rewardedRes] = await Promise.all([
        trainingApi.getTrainingProtocol(user.id),
        nutritionApi.getNutritionLogs(user.id),
        supabase.from('profiles').select('target_calories, target_protein, target_carbs, target_fats').eq('id', user.id).maybeSingle(),
        supabase.from('activities').select('type').eq('hunter_id', user.id).eq('name', 'Training Reward').gte('created_at', new Date().toISOString().split('T')[0])
      ]);

      if (protocolRes.success) setLocalProtocol(protocolRes.data || []);
      if (nutritionRes.success) setLocalNutritionLogs(nutritionRes.data || []);
      if (targetsRes.data) setUserTargets(targetsRes.data);
      if (rewardedRes.data) setRewardedPathsToday(new Set(rewardedRes.data.map(r => r.type)));

    } catch (error) {
      console.error(error);
      showNotification("Failed to load data", "error");
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  const isTutorialStep = step === 'TRAINING_LOG_MODAL' || step === 'TRAINING_LOG_DIET';

  useEffect(() => {
    if (isOpen) {
      setSelectedJournalDay(todayName);
      if (!isTutorialStep) {
        fetchData();
      } else {
        setLoading(false);
      }
      setActiveTab(initialTab);
    }
  }, [isOpen, initialTab, todayName, fetchData, isTutorialStep]);

  useEffect(() => {
    if (step === 'TRAINING_LOG_DIET') {
      setActiveTab('nutrition');
    } else if (step === 'TRAINING_LOG_MODAL') {
      setActiveTab('training');
    }
  }, [step]);

  // --- Computed ---

  const sectorsInDatabase = useMemo(() => {
    const baseSectors = ['Strength'];
    if (!localProtocol) return baseSectors;
    const dynamicSectors = Array.from(new Set(
      localProtocol
        .filter(ex => ex.day_of_week === selectedJournalDay && !['System', 'Recovery', 'Strength'].includes(ex.activity_type))
        .map(ex => ex.category || ex.activity_type)
    )).sort();
    return [...baseSectors, ...dynamicSectors];
  }, [localProtocol, selectedJournalDay]);

  const dayExercisesBySector = useMemo(() => {
    const grouped: Record<string, any[]> = {};
    sectorsInDatabase.forEach(sector => {
      grouped[sector] = (localProtocol || []).filter(ex => ex.day_of_week === selectedJournalDay && (ex.category === sector || ex.activity_type === sector));
    });
    return grouped;
  }, [localProtocol, selectedJournalDay, sectorsInDatabase]);

  const getDayCompletionStatus = (day: string) => {
      if (activeTab === 'training') {
          const dayExercises = localProtocol.filter(ex => ex.day_of_week === day);
          const completedCategories = new Set(dayExercises.filter(ex => ex.is_completed).map(ex => ex.category || ex.activity_type)).size;
          return completedCategories >= 1;
      } else {
          return localNutritionLogs.filter(log => log.day_of_week === day).length >= 3;
      }
  };

  const nutritionTotals = useMemo(() => {
    const dayLogs = localNutritionLogs.filter(log => log.day_of_week === selectedJournalDay);
    return dayLogs.reduce((acc, curr) => ({
      cals: acc.cals + (curr.calories || 0),
      prot: acc.prot + (curr.protein || 0),
      carbs: acc.carbs + (curr.carbs || 0),
      fats: acc.fats + (curr.fats || 0)
    }), { cals: 0, prot: 0, carbs: 0, fats: 0 });
  }, [localNutritionLogs, selectedJournalDay]);

  // --- Handlers: Training ---

  const handleToggleComplete = async (missionId: string, currentStatus: boolean, category: string) => {
      if (!isTodaySelected) return showNotification("Can only complete missions today", "error");
      
      const newStatus = !currentStatus;
      
      // Optimistic update
      setLocalProtocol(prev => prev.map(ex => ex.id === missionId ? { ...ex, is_completed: newStatus } : ex));

      const res = await trainingApi.updateTrainingProtocol(missionId, { is_completed: newStatus });
      if (!res.success) {
          showNotification("Sync Failed", "error");
          fetchData(); // Revert
          return;
      }

      if (newStatus) {
          playSound(require('../../../assets/sounds/complete.mp3'));
          
          if (!rewardedPathsToday.has(category)) {
             // Logic for rewards... simplified for RN: Just claim if it's the first time
             // Check standard path completion
             let shouldReward = false;
             let xp = 0, coins = 0;

             if (category === 'Strength') {
                 const strengthCompleted = localProtocol.filter(ex => ex.category === 'Strength' && ex.day_of_week === todayName && (ex.id === missionId ? true : ex.is_completed)).length;
                 if (strengthCompleted >= 5) {
                     shouldReward = true; xp = 15; coins = 5;
                 }
             } else {
                 shouldReward = true; xp = 7; coins = 3;
             }

             if (shouldReward) {
                 const claimRes = await trainingApi.claimTrainingReward(user.id, category, xp, coins, 0, true);
                 if (claimRes.success) {
                     // showNotification(`+${xp} XP | +${coins} COINS`, 'success');
                     setRewardedPathsToday(prev => new Set([...prev, category]));
                     if (setUser) setUser({ ...user, exp: claimRes.newExp, coins: claimRes.newCoins });

                     setEarnedExp(xp);
                     setEarnedCoins(coins);
                     setShowReward(true);
                 }
             }
          }
      }
  };

  const handleUpdateSet = async (id: string, idx: number, field: string, val: any) => {
      const ex = localProtocol.find(e => e.id === id);
      if (!ex) return;
      
      const newSets = [...(ex.sets_data || [])];
      if (newSets[idx]) {
          newSets[idx] = { ...newSets[idx], [field]: val };
      }

      setLocalProtocol(prev => prev.map(e => e.id === id ? { ...e, sets_data: newSets } : e));
      await trainingApi.updateTrainingProtocol(id, { sets_data: newSets });
  };

  const handleAddSet = async (id: string) => {
      const ex = localProtocol.find(e => e.id === id);
      if (!ex) return;
      const newSet = ex.category === 'Strength' ? { weight: '', reps: '' } : { km: 0, mins: 0 };
      const newSets = [...(ex.sets_data || []), newSet];
      setLocalProtocol(prev => prev.map(e => e.id === id ? { ...e, sets_data: newSets } : e));
      await trainingApi.updateTrainingProtocol(id, { sets_data: newSets });
  };

  const handleRemoveSet = async (id: string, idx: number) => {
      const ex = localProtocol.find(e => e.id === id);
      if (!ex) return;
      const newSets = ex.sets_data.filter((_: any, i: number) => i !== idx);
      setLocalProtocol(prev => prev.map(e => e.id === id ? { ...e, sets_data: newSets } : e));
      await trainingApi.updateTrainingProtocol(id, { sets_data: newSets });
  };

  const handleDuplicateSet = async (id: string, idx: number) => {
      const ex = localProtocol.find(e => e.id === id);
      if (!ex) return;
      const newSets = [...(ex.sets_data || [])];
      newSets.splice(idx + 1, 0, { ...ex.sets_data[idx], completed: false });
      setLocalProtocol(prev => prev.map(e => e.id === id ? { ...e, sets_data: newSets } : e));
      await trainingApi.updateTrainingProtocol(id, { sets_data: newSets });
  };

  const handleTerminateObjective = async (id: string) => {
      const res = await trainingApi.deleteTrainingProtocol(id);
      if (res.success) {
          setLocalProtocol(prev => prev.filter(e => e.id !== id));
          showNotification("Terminated", "success");
      }
  };

  const handleSaveMission = async (name: string, sets: any[]) => {
      if (!deployPathName) return;
      
      const payload = {
          hunter_id: user.id,
          day_of_week: selectedJournalDay,
          activity_type: deployPathName,
          category: deployPathName,
          exercise_name: name.toUpperCase(),
          sets_data: sets,
          is_completed: false
      };

      let res;
      if (editingMissionId) {
          res = await trainingApi.updateTrainingProtocol(editingMissionId, { exercise_name: name.toUpperCase(), sets_data: sets });
      } else {
          res = await trainingApi.createTrainingProtocol(payload);
      }

      if (res.success) {
          showNotification(editingMissionId ? "Mission Updated" : "Mission Deployed", "success");
          fetchData();
          setIsDeployModalOpen(false);
          setEditingMissionId(null);
      } else {
          showNotification("Failed to save", "error");
      }
  };

  const handleCreateCategory = async () => {
      if (!newCategoryName.trim() || !firstExerciseName.trim()) return showNotification("Fields required", "error");
      const payload = {
          hunter_id: user.id,
          day_of_week: selectedJournalDay,
          activity_type: newCategoryName.toUpperCase(),
          category: newCategoryName.toUpperCase(),
          exercise_name: firstExerciseName.toUpperCase(),
          sets_data: [{ weight: '', reps: '' }],
          is_completed: false
      };
      
      const res = await trainingApi.createTrainingProtocol(payload);
      if (res.success) {
          showNotification("Path Initialized", "success");
          fetchData();
          setIsInitializingCategory(false);
          setNewCategoryName(''); setFirstExerciseName('');
      }
  };

  // --- Handlers: Nutrition ---

  const handleSaveFood = async (foodData: any) => {
      const payload = Array.isArray(foodData) ? foodData.map((f: any) => ({ ...f, hunter_id: user.id, day_of_week: selectedJournalDay })) : [{ ...foodData, hunter_id: user.id, day_of_week: selectedJournalDay }];
      
      const res = await nutritionApi.createNutritionLog(payload);
      if (res.success) {
          showNotification("Nutrition Logged", "success");
          setIsFoodModalOpen(false);
          fetchData();
          
          // Check 3/3 Reward
          const todayLogs = localNutritionLogs.filter(log => log.day_of_week === todayName).length + payload.length;
          if (isTodaySelected && todayLogs >= 3 && user.last_nutrition_reward_at !== new Date().toISOString().split('T')[0]) {
             if (handleClaimReward) {
                 await handleClaimReward('special', 'small');
                 const { error } = await supabase.from('profiles').update({ last_nutrition_reward_at: new Date().toISOString().split('T')[0] }).eq('id', user.id);
                 
                 if (!error) {
                    setEarnedExp(10);
                    setEarnedCoins(5);
                    setShowReward(true);
                 }
             }
          }
      } else {
          showNotification("Failed to log", "error");
      }
  };

  const handleDeleteFood = async (id: string) => {
      const res = await nutritionApi.deleteNutritionLog(id);
      if (res.success) {
          setLocalNutritionLogs(prev => prev.filter(l => l.id !== id));
          showNotification("Entry Deleted", "success");
      }
  };

  // --- Timer ---
  useEffect(() => {
      let interval: NodeJS.Timeout;
      if (isRestTimerActive && restTimer > 0) {
          interval = setInterval(() => {
              setRestTimer(prev => {
                  if (prev <= 1) {
                      setIsRestTimerActive(false);
                      return 0;
                  }
                  return prev - 1;
              });
          }, 1000);
      }
      return () => clearInterval(interval);
  }, [isRestTimerActive, restTimer]);

  if (!isOpen) return null;

  return (
    <Modal visible={isOpen} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <BlurView intensity={40} tint="dark" style={{ flex: 1 }}>
        <View style={{ flex: 1, backgroundColor: '#131524' }}>
            {/* Header */}
            <View style={styles.headerBlock}>
                <View style={styles.headerRow}>
                    <View style={styles.titleBadge}>
                        <Image
                          source={require('../../../assets/journal.png')}
                          style={styles.titleIcon}
                          resizeMode="contain"
                        />
                        <Text style={styles.titleText}>Hunter's Training Log</Text>
                    </View>
                    <TouchableOpacity onPress={onClose} style={styles.closeBtn} hitSlop={8}>
                        <X size={20} color="#22d3ee" />
                    </TouchableOpacity>
                </View>

                {/* Days Grid */}
                <View style={styles.daysRow}>
                    {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(day => {
                        const isCompleted = getDayCompletionStatus(day);
                        const isSelected = selectedJournalDay === day;
                        const activeColor = activeTab === 'training' ? '#22d3ee' : '#f59e0b';
                        
                        return (
                            <TouchableOpacity 
                                key={day} 
                                onPress={() => setSelectedJournalDay(day)}
                                style={[
                                    styles.dayPill,
                                    isSelected ? {
                                        borderColor: activeColor,
                                        backgroundColor: activeColor + '15',
                                        shadowColor: activeColor,
                                        shadowOffset: { width: 0, height: 0 },
                                        shadowOpacity: 0.6,
                                        shadowRadius: 8,
                                        elevation: 4,
                                    } : styles.dayPillInactive
                                ]}
                            >
                                <Text style={[
                                    styles.dayPillText, 
                                    isSelected && { color: activeColor, fontWeight: '900' }
                                ]} numberOfLines={1}>
                                    {day.substring(0, 3)}
                                </Text>
                                {isCompleted && (
                                    <View style={[styles.dayCheck, { backgroundColor: activeColor, borderColor: '#000' }]}>
                                        <Check size={8} color="#000" />
                                    </View>
                                )}
                            </TouchableOpacity>
                        );
                    })}
                </View>

                {/* Tabs */}
                <View style={styles.tabsRow}>
                    <TouchableOpacity 
                        onPress={() => setActiveTab('training')} 
                        style={[styles.tab, activeTab === 'training' && styles.tabTraining]}
                    >
                        <Text style={[styles.tabText, activeTab === 'training' && styles.tabTextTraining]}>[ TRAINING ]</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                        onPress={() => setActiveTab('nutrition')} 
                        style={[styles.tab, activeTab === 'nutrition' && styles.tabNutrition]}
                    >
                        <Text style={[styles.tabText, activeTab === 'nutrition' && styles.tabTextNutrition]}>[ DIET LOG ]</Text>
                    </TouchableOpacity>
                </View>
            </View>

            {/* Content */}
            {activeTab === 'training' ? (
                <>
                <ScrollView className="flex-1 p-4" contentContainerStyle={{ paddingBottom: 100 }}>
                    {loading && <ActivityIndicator size="large" color="#22d3ee" />}
                    {!loading && (
                        <View className="space-y-6">
                            {sectorsInDatabase.map(pathName => {
                                const exercises = dayExercisesBySector[pathName] || [];
                                const isStrength = pathName === 'Strength';
                                
                                const completedCount = exercises.filter(ex => ex.is_completed).length;
                                const totalCount = exercises.length;
                                const progressText = isStrength ? `(${completedCount}/5)` : `(${completedCount}/${totalCount})`;

                                return (
                                    <View key={pathName}>
                                        <View className="flex-row items-center gap-2 mb-3">
                                            <View className={`w-2 h-2 rounded-full ${isStrength ? 'bg-green-500' : 'bg-cyan-500'}`} />
                                            <Text style={[styles.pathLabelText, isStrength ? styles.pathLabelStrength : styles.pathLabelCardio]}>
                                                {pathName} PATH {progressText}
                                            </Text>
                                        </View>

                                        {exercises.length === 0 ? (
                                            <View className="p-6 bg-slate-900/40 rounded-lg border border-white/5 items-center">
                                                <Text className="text-gray-600 text-xs italic">No missions deployed</Text>
                                            </View>
                                        ) : (
                                            exercises.map(ex => (
                                                <ExerciseItem 
                                                key={ex.id} exercise={ex} isToday={isTodaySelected}
                                                onTerminate={handleTerminateObjective}
                                                onEdit={(e) => {
                                                    setDeployPathName(pathName);
                                                    setEditingMissionId(e.id);
                                                    setDeployFormData({ name: e.exercise_name, sets: e.sets_data || [] });
                                                    setIsDeployModalOpen(true);
                                                }}
                                                onToggleComplete={handleToggleComplete}
                                                onUpdateSet={handleUpdateSet}
                                                onRemoveSet={handleRemoveSet}
                                                onDuplicateSet={handleDuplicateSet}
                                                />
                                            ))
                                        )}
                                        
                                        {exercises.length > 0 && (
                                            <TouchableOpacity 
                                            onPress={() => handleAddSet(exercises[exercises.length-1].id)}
                                            className="items-end mb-2"
                                            >
                                                <Text style={styles.addSetText}>+ Add Set</Text>
                                            </TouchableOpacity>
                                        )}

                                        <TouchableOpacity 
                                        onPress={() => {
                                            setDeployPathName(pathName);
                                            setDeployFormData({ name: '', sets: isStrength ? [{weight:'', reps:''}] : [{km:'', mins:''}] });
                                            setEditingMissionId(null);
                                            setIsDeployModalOpen(true);
                                        }}
                                        style={styles.primaryButton}
                                        >
                                            <Plus size={14} color="#22d3ee" />
                                            <Text style={styles.primaryButtonText}>Deploy Mission</Text>
                                        </TouchableOpacity>
                                    </View>
                                );
                            })}

                            {!isInitializingCategory ? (
                                <TouchableOpacity onPress={() => setIsInitializingCategory(true)} style={styles.secondaryButton}>
                                    <Text style={styles.secondaryButtonText}>Initialize New Path</Text>
                                </TouchableOpacity>
                            ) : (
                                <View style={styles.initForm}>
                                    <TextInput 
                                        placeholder="PATH NAME [e.g. Running, Pilates]" 
                                        placeholderTextColor="#475569"
                                        style={styles.initInput}
                                        value={newCategoryName} 
                                        onChangeText={setNewCategoryName}
                                    />
                                    <TextInput 
                                        placeholder="FIRST MISSION [e.g. 10KM Run, Lagree]" 
                                        placeholderTextColor="#475569"
                                        style={[styles.initInput, styles.initInputLast]}
                                        value={firstExerciseName} 
                                        onChangeText={setFirstExerciseName}
                                    />
                                    <View style={styles.initActions}>
                                        <TouchableOpacity onPress={handleCreateCategory} style={styles.confirmBtn}><Text style={styles.confirmBtnText}>CONFIRM</Text></TouchableOpacity>
                                        <TouchableOpacity onPress={() => setIsInitializingCategory(false)} style={styles.cancelBtn}><Text style={styles.cancelBtnText}>CANCEL</Text></TouchableOpacity>
                                    </View>
                                </View>
                            )}
                        </View>
                    )}
                </ScrollView>

                {/* Footer Timer - same style as diet tab recovery timer */}
                <RecoveryTimerSection
                    timeLeft={restTimer}
                    initialSeconds={restTimerInitial || 300}
                    onPresetPress={(s) => { setRestTimer(s); setRestTimerInitial(s); setIsRestTimerActive(true); }}
                    onStop={() => { setIsRestTimerActive(false); setRestTimer(0); setRestTimerInitial(0); }}
                    isActive={isRestTimerActive}
                />
                </>
            ) : (
                <DietLogSection
                    nutritionTotals={nutritionTotals}
                    targetCalories={userTargets?.target_calories || 2000}
                    targetProtein={userTargets?.target_protein || 150}
                    targetCarbs={userTargets?.target_carbs || 200}
                    targetFats={userTargets?.target_fats || 65}
                    entryCount={localNutritionLogs.filter(l => l.day_of_week === selectedJournalDay).length}
                    onLogNewEntry={() => setIsFoodModalOpen(true)}
                >
                    <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 300 }}>
                        {localNutritionLogs.filter(l => l.day_of_week === selectedJournalDay).map(item => (
                            <View key={item.id} className="flex-row justify-between items-center bg-slate-900/50 p-3 rounded-lg mb-2 border border-white/5">
                                <View>
                                    <Text style={styles.dietEntryName}>{item.name}</Text>
                                    <Text style={styles.dietEntryMeta}>{item.calories} CALS | P:{item.protein} C:{item.carbs} F:{item.fats}</Text>
                                </View>
                                <TouchableOpacity onPress={() => handleDeleteFood(item.id)}>
                                    <X size={14} color="#ef4444" />
                                </TouchableOpacity>
                            </View>
                        ))}
                    </ScrollView>
                </DietLogSection>
            )}

            {/* Modals */}
            <Modal visible={isDeployModalOpen} transparent animationType="slide">
                <BlurView intensity={20} tint="dark" style={{flex:1, justifyContent:'center', padding:20}}>
                     <View className="bg-slate-900 border border-cyan-500/30 rounded-2xl p-6 h-[500px]">
                         <DeployMissionForm 
                            deployPathName={deployPathName!}
                            initialObjectiveName={deployFormData.name}
                            initialSets={deployFormData.sets}
                            onCancel={() => setIsDeployModalOpen(false)}
                            onConfirm={handleSaveMission}
                         />
                     </View>
                </BlurView>
            </Modal>

            <Modal visible={isFoodModalOpen} transparent animationType="slide">
                 <BlurView intensity={20} tint="dark" style={{flex:1, justifyContent:'center', padding:20}}>
                     <View className="bg-slate-900 border border-amber-500/30 rounded-2xl h-[600px]">
                         <AddFoodForm 
                            day={selectedJournalDay}
                            user={user}
                            isToday={isTodaySelected}
                            onCancel={() => setIsFoodModalOpen(false)}
                            onConfirm={handleSaveFood}
                         />
                     </View>
                 </BlurView>
            </Modal>
            
            {step === 'TRAINING_LOG_MODAL' && <HologramOverlay />}
            {step === 'TRAINING_LOG_DIET' && <HologramOverlay />}
        </View>
        
        {/* Reward Overlay - Renders absolutely positioned over the modal content */}
        <HunterLogModal 
            visible={showReward} 
            expAmount={earnedExp} 
            coinsAmount={earnedCoins} 
            onClose={() => setShowReward(false)} 
        />
      </BlurView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  headerBlock: {
    paddingHorizontal: 16,
    paddingTop: 48,
    paddingBottom: 16,
    backgroundColor: '#131524',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  titleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(34, 211, 238, 0.3)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: 'rgba(6, 182, 212, 0.08)',
  },
  titleIcon: {
    width: 18,
    height: 18,
    marginRight: 8,
  },
  titleText: {
    color: '#22d3ee',
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 2,
    fontSize: 12,
    fontFamily: 'Exo2-Regular',
  },
  closeBtn: {
    padding: 10,
    backgroundColor: '#334155',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  daysRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    gap: 6,
  },
  dayPill: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  dayPillInactive: {
    backgroundColor: '#1e293b',
    borderColor: 'rgba(255,255,255,0.05)',
  },
  dayPillText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    color: '#64748b',
    fontFamily: 'Exo2-Regular',
  },
  dayCheck: {
    position: 'absolute',
    top: -4,
    right: -4,
    borderRadius: 8,
    padding: 2,
    borderWidth: 1.5,
  },
  tabsRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  tab: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabTraining: { borderBottomColor: '#22d3ee' },
  tabNutrition: { borderBottomColor: '#f59e0b' },
  tabText: {
    fontFamily: 'Exo2-Regular',
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 2,
    fontSize: 11,
    color: '#6b7280',
  },
  tabTextTraining: { color: '#22d3ee' },
  tabTextNutrition: { color: '#f59e0b' },
  primaryButton: {
    width: '100%',
    paddingVertical: 14,
    backgroundColor: 'rgba(6, 182, 212, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(34, 211, 238, 0.3)',
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  primaryButtonText: {
    color: '#22d3ee',
    fontWeight: '700',
    textTransform: 'uppercase',
    fontSize: 12,
    fontFamily: 'Exo2-Regular',
  },
  secondaryButton: {
    marginTop: 24,
    paddingVertical: 16,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: 'rgba(6, 182, 212, 0.4)',
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonText: {
    fontFamily: 'Exo2-Regular',
    color: '#0e7490',
    fontWeight: '900',
    textTransform: 'uppercase',
    fontSize: 12,
  },
  initForm: {
    marginTop: 16,
    padding: 16,
    backgroundColor: 'rgba(0,0,0,0.4)',
    borderWidth: 1,
    borderColor: 'rgba(34, 211, 238, 0.3)',
    borderRadius: 14,
  },
  initInput: {
    fontFamily: 'Exo2-Regular',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(34, 211, 238, 0.5)',
    color: '#fff',
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 8,
    fontSize: 14,
  },
  initInputLast: { marginBottom: 16 },
  initActions: {
    flexDirection: 'row',
    gap: 10,
  },
  confirmBtn: {
    flex: 1,
    backgroundColor: '#0891b2',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmBtnText: {
    fontFamily: 'Exo2-Regular',
    color: '#fff',
    fontWeight: '700',
    fontSize: 12,
  },
  cancelBtn: {
    flex: 1,
    backgroundColor: '#475569',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    fontFamily: 'Exo2-Regular',
    color: '#e2e8f0',
    fontWeight: '700',
    fontSize: 12,
  },
  macroRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 20,
    alignItems: 'center',
  },
  macroCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 2,
    borderColor: 'rgba(245, 158, 11, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0f172a',
  },
  macroCals: {
    fontFamily: 'Exo2-Regular',
    fontSize: 22,
    fontWeight: '900',
    color: '#fbbf24',
  },
  macroTarget: {
    fontFamily: 'Exo2-Regular',
    fontSize: 9,
    color: 'rgba(245, 158, 11, 0.6)',
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  macroBars: {
    flex: 1,
    justifyContent: 'center',
    gap: 8,
  },
  nutritionCta: {
    width: '100%',
    paddingVertical: 16,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: 'rgba(245, 158, 11, 0.3)',
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  nutritionCtaText: {
    fontFamily: 'Exo2-Regular',
    color: '#f59e0b',
    fontWeight: '900',
    textTransform: 'uppercase',
    fontSize: 12,
  },
  pathLabelText: {
    fontFamily: 'Exo2-Regular',
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 1,
    fontSize: 12,
  },
  pathLabelStrength: { color: '#22c55e' },
  pathLabelCardio: { color: '#22d3ee' },
  emptyStateText: {
    fontFamily: 'Exo2-Regular',
    color: '#64748b',
    fontSize: 12,
    fontStyle: 'italic',
  },
  addSetText: {
    fontFamily: 'Exo2-Regular',
    fontSize: 10,
    color: '#64748b',
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  dietEntryName: {
    fontFamily: 'Exo2-Regular',
    color: '#fff',
    fontWeight: '700',
    textTransform: 'uppercase',
    fontSize: 12,
  },
  dietEntryMeta: {
    fontFamily: 'Exo2-Regular',
    fontSize: 9,
    color: '#9ca3af',
    marginTop: 4,
  },
});
