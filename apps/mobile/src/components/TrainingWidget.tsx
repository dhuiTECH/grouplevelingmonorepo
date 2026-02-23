import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Platform } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { Footprints } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { api as nutritionApi } from '@/api/nutrition';
import { api as trainingApi } from '@/api/training';
import QuickFoodEntryModal from './modals/QuickFoodEntryModal';
import { useNotification } from '@/contexts/NotificationContext';

interface TrainingWidgetProps {
  user: any;
  trainingProtocol: any;
  nutritionLogs: any[];
  onOpenModal: (tab: 'training' | 'nutrition') => void;
  onClaimChest: () => void;
  onClaimStepsReward: () => void;
  dailySteps?: number;
}

const TrainingWidget: React.FC<TrainingWidgetProps> = ({ 
  user, 
  onOpenModal, 
  onClaimChest, 
  onClaimStepsReward,
  dailySteps,
}) => {
  const { showNotification } = useNotification();
  const [activeTab, setActiveTab] = useState<'training' | 'nutrition'>('training');
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const days = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
  const currentDay = days[new Date().getDay() === 0 ? 6 : new Date().getDay() - 1];

  const [nutritionTotals, setNutritionTotals] = useState({
    protein: 0,
    carbs: 0,
    fats: 0,
    calories: 0,
  });
  const [localProtocol, setLocalProtocol] = useState<any[]>([]);
  const [localNutritionLogs, setLocalNutritionLogs] = useState<any[]>([]);

  useEffect(() => {
    if (user?.id) {
      loadNutritionData();
      loadTrainingData();
    }
  }, [user]);

  const loadNutritionData = async () => {
    try {
      const response = await nutritionApi.getNutritionLogs(user.id);
      if (response.success && response.data) {
        const today = new Date().toISOString().split('T')[0];
        const todaysLogs = response.data.filter((log: any) => log.created_at.startsWith(today));
        
        const totals = todaysLogs.reduce((acc: any, log: any) => ({
          protein: acc.protein + (log.protein || 0),
          carbs: acc.carbs + (log.carbs || 0),
          fats: acc.fats + (log.fats || 0),
          calories: acc.calories + (log.calories || 0),
        }), { protein: 0, carbs: 0, fats: 0, calories: 0 });

        setNutritionTotals(totals);
      }
    } catch (error) {
      console.error('Failed to load nutrition data', error);
    }
  };

  const loadTrainingData = async () => {
    try {
      const response = await trainingApi.getTrainingProtocol(user.id);
      if (response.success && response.data) {
        setLocalProtocol(response.data);
      }
    } catch (error) {
      console.error('Failed to load training protocol', error);
    }
  };

  const handleSaveQuickFood = async (data: any) => {
    try {
      // Add hunter_id and day_of_week
      const payload = {
        ...data,
        hunter_id: user.id,
        day_of_week: days[new Date().getDay() === 0 ? 6 : new Date().getDay() - 1] === 'MON' ? 'Monday' : 
                     days[new Date().getDay() === 0 ? 6 : new Date().getDay() - 1] === 'TUE' ? 'Tuesday' :
                     days[new Date().getDay() === 0 ? 6 : new Date().getDay() - 1] === 'WED' ? 'Wednesday' :
                     days[new Date().getDay() === 0 ? 6 : new Date().getDay() - 1] === 'THU' ? 'Thursday' :
                     days[new Date().getDay() === 0 ? 6 : new Date().getDay() - 1] === 'FRI' ? 'Friday' :
                     days[new Date().getDay() === 0 ? 6 : new Date().getDay() - 1] === 'SAT' ? 'Saturday' : 'Sunday'
      };

      const res = await nutritionApi.createNutritionLog([payload]);
      if (res.success) {
        showNotification("RATION LOGGED", "success");
        loadNutritionData();
      } else {
        showNotification("FAILED TO LOG", "error");
      }
    } catch (error) {
      console.error(error);
      showNotification("ERROR LOGGING", "error");
    }
  };

  const effectiveSteps = dailySteps ?? user?.daily_steps ?? 0;

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['rgba(15, 23, 42, 0.9)', 'rgba(30, 41, 59, 0.6)']}
        style={styles.card}
      >
        {/* Tabs */}
        <View style={styles.tabs}>
          <TouchableOpacity 
            style={activeTab === 'training' ? styles.activeTab : styles.tab}
            onPress={() => setActiveTab('training')}
          >
            <Text style={activeTab === 'training' ? styles.activeTabText : styles.tabText}>[ TRAINING ]</Text>
            {activeTab === 'training' && <View style={styles.activeTabIndicator} />}
          </TouchableOpacity>
          <TouchableOpacity 
            style={activeTab === 'nutrition' ? styles.activeTab : styles.tab}
            onPress={() => setActiveTab('nutrition')}
          >
            <Text style={activeTab === 'nutrition' ? styles.activeDietTabText : styles.tabText}>[ DIETARY ]</Text>
            {activeTab === 'nutrition' && <View style={styles.activeDietTabIndicator} />}
          </TouchableOpacity>
        </View>

        {/* Days of Week */}
        <TouchableOpacity onPress={() => onOpenModal(activeTab)}>
          <View style={styles.daysContainer}>
            {days.map((day, index) => {
              const isActive = day === currentDay;
              const fullDay =
                index === 0 ? 'Monday' :
                index === 1 ? 'Tuesday' :
                index === 2 ? 'Wednesday' :
                index === 3 ? 'Thursday' :
                index === 4 ? 'Friday' :
                index === 5 ? 'Saturday' :
                'Sunday';

              let isCompleted = false;
              if (activeTab === 'training') {
                const dayExercises = localProtocol.filter((ex: any) => ex.day_of_week === fullDay);
                const completedCategories = new Set(
                  dayExercises.filter((ex: any) => ex.is_completed).map((ex: any) => ex.category || ex.activity_type)
                );
                isCompleted = completedCategories.size >= 1;
              } else {
                isCompleted = localNutritionLogs.filter((log: any) => log.day_of_week === fullDay).length >= 3;
              }

              return (
                <View key={day} style={styles.dayItem}>
                  <Text style={[styles.dayText, isActive && styles.activeDayText]}>{day}</Text>
                  <View style={[
                    styles.dayCheck, 
                    isCompleted ? styles.checkedDay : styles.uncheckedDay,
                    isActive && styles.activeDayCheck
                  ]}>
                    {isCompleted && (
                      <Text style={styles.checkIcon}>✓</Text>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        </TouchableOpacity>

        {/* Stats and Streak */}
        <View style={styles.bottomSection}>
          <TouchableOpacity 
            style={styles.statsRow}
            onPress={() => setIsQuickAddOpen(true)}
          >
            <View style={styles.statItem}>
              <View style={styles.statHeader}>
                <Text style={styles.statLabel}>P</Text>
              </View>
              <Text style={styles.statValue}>{nutritionTotals.protein}g</Text>
            </View>
            <View style={styles.statItem}>
              <View style={styles.statHeader}>
                <Text style={styles.statLabel}>C</Text>
              </View>
              <Text style={styles.statValue}>{nutritionTotals.carbs}g</Text>
            </View>
            <View style={styles.statItem}>
              <View style={styles.statHeader}>
                <Text style={styles.statLabel}>F</Text>
              </View>
              <Text style={styles.statValue}>{nutritionTotals.fats}g</Text>
            </View>
            <View style={styles.statItem}>
              <View style={styles.statHeader}>
                <Svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="#fbbf24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <Path d="M12 2v10" />
                  <Path d="M18.4 6.6a9 9 0 1 1-12.8 0" />
                </Svg>
              </View>
              <Text style={styles.statValue}>{nutritionTotals.calories}</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.streakCard} 
            onPress={user?.weekly_streak_count >= 7 ? onClaimChest : () => onOpenModal(activeTab)}
          >
            <View>
              <Text style={styles.streakLabel}>WEEKLY STREAK: {user?.weekly_streak_count || 0}/7</Text>
            </View>
            <Image 
              source={require('../../assets/icons/mediumchest.png')} 
              style={styles.chestIcon} 
            />
          </TouchableOpacity>
        </View>

        {/* Progress Bar */}
        <View style={styles.progressSection}>
          <View style={styles.progressHeader}>
            <Footprints size={14} color="#22d3ee" />
            <Text style={styles.progressValue}>{effectiveSteps} / 10,000</Text>
          </View>
          <View style={styles.progressBarBg}>
            <View
              style={[
                styles.progressBarFill,
                { width: `${Math.min(((effectiveSteps || 0) / 10000) * 100, 100)}%` },
              ]}
            />
          </View>
          <TouchableOpacity style={styles.chestReward} onPress={onClaimStepsReward}>
             <Image
               source={require('../../assets/icons/silverchest.png')}
               style={[
                 styles.miniRewardChest,
                 effectiveSteps >= 10000 ? { opacity: 1 } : {},
               ]}
             />
          </TouchableOpacity>
        </View>
      </LinearGradient>
      
      <QuickFoodEntryModal
        visible={isQuickAddOpen}
        onClose={() => setIsQuickAddOpen(false)}
        onSave={handleSaveQuickFood}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  card: {
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(6, 182, 212, 0.1)',
  },
  tabs: {
    flexDirection: 'row',
    marginBottom: 24,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  activeTab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    position: 'relative',
  },
  activeTabIndicator: {
    position: 'absolute',
    bottom: -1,
    height: 2,
    width: '100%',
    backgroundColor: '#06b6d4',
    shadowColor: '#06b6d4',
    shadowOpacity: 1,
    shadowRadius: 8,
  },
  tabText: {
    fontSize: 12,
    fontWeight: '900',
    color: '#64748b',
    letterSpacing: 1,
    fontFamily: 'Exo2-Regular',
  },
  activeTabText: {
    fontSize: 12,
    fontWeight: '900',
    color: '#06b6d4',
    letterSpacing: 1,
    textShadowColor: 'rgba(6, 182, 212, 0.5)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
    fontFamily: 'Exo2-Regular',
  },
  activeDietTabText: {
    fontSize: 12,
    fontWeight: '900',
    color: '#f97316',
    letterSpacing: 1,
    textShadowColor: 'rgba(248, 113, 113, 0.5)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
    fontFamily: 'Exo2-Regular',
  },
  activeDietTabIndicator: {
    position: 'absolute',
    bottom: -1,
    height: 2,
    width: '100%',
    backgroundColor: '#f97316',
    shadowColor: '#f97316',
    shadowOpacity: 1,
    shadowRadius: 8,
  },
  daysContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  dayItem: {
    alignItems: 'center',
    gap: 12,
  },
  dayText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#64748b',
    fontFamily: 'Exo2-Regular',
  },
  activeDayText: {
    color: '#06b6d4',
  },
  dayCheck: {
    width: 32,
    height: 40,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    transform: [{ skewX: '-5deg' }],
  },
  uncheckedDay: {
    backgroundColor: '#0f172a',
    borderColor: '#1e293b',
  },
  checkedDay: {
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    borderColor: 'rgba(34, 197, 94, 0.4)',
  },
  activeDayCheck: {
    borderColor: '#06b6d4',
    borderWidth: 1,
    shadowColor: '#06b6d4',
    shadowOpacity: 0.3,
    shadowRadius: 5,
  },
  checkIcon: {
    color: '#22c55e',
    fontSize: 14,
    fontWeight: 'bold',
  },
  bottomSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    gap: 12,
  },
  statsRow: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#0f172a',
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  statHeader: {
    height: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statLabel: {
    fontSize: 8,
    fontWeight: '900',
    color: '#3b82f6',
    fontFamily: 'Exo2-Regular',
  },
  statValue: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#fff',
    fontFamily: 'Exo2-Regular',
  },
  streakCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#0f172a',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  streakLabel: {
    fontSize: 9,
    fontWeight: '900',
    color: '#94a3b8',
    letterSpacing: 0.5,
    fontFamily: 'Exo2-Regular',
  },
  chestIcon: {
    width: 24,
    height: 24,
    resizeMode: 'contain',
  },
  progressSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#0f172a',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  progressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  progressValue: {
    fontSize: 9,
    color: '#64748b',
    fontWeight: 'bold',
    fontFamily: 'Exo2-Regular',
  },
  progressBarBg: {
    flex: 1,
    height: 6,
    backgroundColor: '#1e293b',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#06b6d4',
    borderRadius: 3,
  },
  chestReward: {
    padding: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 6,
  },
  miniRewardChest: {
    width: 16,
    height: 16,
    opacity: 0.5,
  }
});

export default TrainingWidget;