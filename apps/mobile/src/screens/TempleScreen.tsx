import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, SafeAreaView, ScrollView, Image, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { useNavigation } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { MotiView } from 'moti';

// ⚔️ RE-USE YOUR TITLE MAP HERE
const RANK_TITLES: Record<string, string[]> = {
  Assassin: ['Assassin Initiate', 'Shadow Blade', 'Phantom Stalker', 'Shadow Monarch'],
  Fighter: ['Fighter Recruit', 'Brawler', 'Berserker', 'God of War'],
  Tanker: ['Tanker Recruit', 'Iron Wall', 'Immortal Aegis', 'Shield Monarch'],
  Ranger: ['Ranger Recruit', 'Wind-Walker', 'Storm-Bolt Sniper', 'Monarch of the Hunt'],
  Mage: ['Mage Initiate', 'Archmage', 'Ruler of Mana', 'Spell Monarch'],
  Healer: ['Healer Initiate', 'Sanctum Weaver', 'Luminous Archpriest', 'Saint of Beginning'],
};

export const TempleScreen = () => {
  const { user, setUser } = useAuth();
  const navigation = useNavigation();
  const [loading, setLoading] = useState(false);
  const [timeLeft, setTimeLeft] = useState<string | null>(null);

  // 1. Lockout: derived from next_advancement_attempt (lockout date > now)
  const isLocked = Boolean(
    user?.next_advancement_attempt && new Date(user.next_advancement_attempt).getTime() > Date.now()
  );

  // 2. Countdown timer (includes minutes), updates every second while locked
  useEffect(() => {
    if (!user?.next_advancement_attempt) {
      setTimeLeft(null);
      return;
    }
    const tick = () => {
      const now = Date.now();
      const unlockDate = new Date(user.next_advancement_attempt!).getTime();
      const diff = unlockDate - now;

      if (diff <= 0) {
        setTimeLeft(null);
      } else {
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
        const minutes = Math.floor((diff / (1000 * 60)) % 60);
        setTimeLeft(`${days}d ${hours}h ${minutes}m`);
      }
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [user?.next_advancement_attempt]);

  // 3. Can attempt: level milestone (currentTier + 1) * 30 and not locked
  const currentLevel = user?.level || 1;
  const currentTier = user?.rank_tier ?? 0;
  const nextMilestone = (currentTier + 1) * 30; // 30, 60, 90...
  const canAttempt = currentLevel >= nextMilestone && !isLocked;

  // 3. Get Next Title
  const userClass = user?.current_class || 'Fighter';
  // Use the titles array directly. If currentTier is 0, we want index 0 (1st advancement).
  // Assuming rank_tier 0 means "No advancement yet".
  const nextTitle = RANK_TITLES[userClass]?.[currentTier] || 'Unknown Entity';

  const handleAttempt = async () => {
    setLoading(true);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

    try {
      if (!user?.id) throw new Error("User not found");

      // CALL THE "SYSTEM" (RPC Function)
      const { data, error } = await supabase.rpc('attempt_advancement', {
        user_id: user.id,
        current_level: currentLevel,
        new_title: nextTitle
      });

      if (error) throw error;

      if (data.success) {
        Alert.alert('ADVANCEMENT SUCCESSFUL', `You have transcended.\nNew Title: ${data.new_title ?? nextTitle}`);
        setUser({
          ...user,
          rank_tier: data.new_tier,
          current_title: data.new_title ?? nextTitle,
          next_advancement_attempt: null,
          unassigned_stat_points: (user.unassigned_stat_points ?? 0) + 5,
        });
        navigation.goBack();
      } else {
        if (data.lockout) {
          Alert.alert('ADVANCEMENT FAILED', 'The System rejects you.\nThe Temple is sealed for 7 days.');
          const lockoutStr = typeof data.lockout === 'string' ? data.lockout : data.lockout != null ? new Date(data.lockout).toISOString() : undefined;
          setUser({ ...user, next_advancement_attempt: lockoutStr ?? undefined });
        } else {
          Alert.alert('SYSTEM ERROR', data.message ?? 'Unknown error');
        }
      }

    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#0f172a', '#020617']} style={StyleSheet.absoluteFill} />
      
      {/* Background Ambience */}
      <Image 
        source={{ uri: 'https://grainy-gradients.vercel.app/noise.svg' }}
        style={[StyleSheet.absoluteFill, { opacity: 0.05 }]}
      />

      <SafeAreaView style={styles.content}>
        <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()}>
                <Ionicons name="close" size={24} color="#64748b" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>ADVANCEMENT TEMPLE</Text>
            <View style={{ width: 24 }} />
        </View>

        <View style={styles.cardContainer}>
            {isLocked ? (
                // --- LOCKED STATE ---
                <MotiView 
                    from={{ opacity: 0, scale: 0.9 }} 
                    animate={{ opacity: 1, scale: 1 }}
                    style={[styles.card, { borderColor: '#ef4444' }]}
                >
                    <Ionicons name="lock-closed" size={48} color="#ef4444" />
                    <Text style={[styles.statusTitle, { color: '#ef4444' }]}>TEMPLE SEALED</Text>
                    <Text style={styles.statusDesc}>
                        The System is recovering. You cannot attempt advancement yet.
                    </Text>
                    <View style={styles.timerBox}>
                        <Text style={styles.timerText}>{timeLeft ?? '—'}</Text>
                        <Text style={styles.timerLabel}>REMAINING</Text>
                    </View>
                </MotiView>
            ) : canAttempt ? (
                // --- READY STATE ---
                <MotiView 
                    from={{ opacity: 0, scale: 0.9 }} 
                    animate={{ opacity: 1, scale: 1 }}
                    style={[styles.card, { borderColor: '#eab308' }]}
                >
                    <Ionicons name="flame" size={48} color="#eab308" />
                    <Text style={[styles.statusTitle, { color: '#eab308' }]}>TRIAL AVAILABLE</Text>
                    <Text style={styles.statusDesc}>
                        You have reached Level {currentLevel}. The System acknowledges your power.
                    </Text>
                    
                    <View style={styles.questBox}>
                        <Text style={styles.questLabel}>QUEST:</Text>
                        <Text style={styles.questText}>"Prove your worth to the Monarchs."</Text>
                    </View>

                    <View style={styles.rewardRow}>
                        <Text style={styles.rewardLabel}>REWARD:</Text>
                        <Text style={styles.rewardValue}>{nextTitle}</Text>
                    </View>

                    <TouchableOpacity 
                        style={styles.attemptBtn}
                        onPress={handleAttempt}
                        disabled={loading}
                    >
                        {loading ? <Text style={styles.btnText}>COMMUNING...</Text> : <Text style={styles.btnText}>ATTEMPT ADVANCEMENT</Text>}
                    </TouchableOpacity>
                    <Text style={styles.riskText}>Risk: 7 Day Lockout on Failure</Text>
                </MotiView>
            ) : (
                // --- TOO WEAK STATE ---
                <MotiView style={[styles.card, { borderColor: '#64748b' }]}>
                    <Ionicons name="hand-left" size={48} color="#64748b" />
                    <Text style={[styles.statusTitle, { color: '#64748b' }]}>INSUFFICIENT POWER</Text>
                    <Text style={styles.statusDesc}>
                        You are Level {currentLevel}. You must reach Level {nextMilestone} to enter the trial.
                    </Text>
                    
                    <View style={styles.progressBar}>
                        <View style={[styles.progressFill, { width: `${(Math.min(currentLevel / nextMilestone, 1)) * 100}%` }]} />
                    </View>
                    <Text style={styles.progressText}>{currentLevel} / {nextMilestone}</Text>
                </MotiView>
            )}
        </View>

      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#020617' },
  content: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20 },
  headerTitle: { color: '#fff', fontSize: 16, fontWeight: '900', letterSpacing: 2 },
  
  cardContainer: { flex: 1, justifyContent: 'center', padding: 20 },
  card: {
    backgroundColor: 'rgba(15, 23, 42, 0.8)',
    borderWidth: 1,
    padding: 30,
    borderRadius: 8,
    alignItems: 'center',
    gap: 16
  },
  
  statusTitle: { fontSize: 24, fontWeight: '900', letterSpacing: 2, textAlign: 'center' },
  statusDesc: { color: '#94a3b8', textAlign: 'center', fontSize: 14, lineHeight: 22 },

  // Timer
  timerBox: { marginTop: 20, alignItems: 'center', backgroundColor: 'rgba(239, 68, 68, 0.1)', padding: 15, borderRadius: 4, width: '100%' },
  timerText: { color: '#ef4444', fontSize: 24, fontWeight: '900', fontFamily: 'Exo2-Regular' },
  timerLabel: { color: '#ef4444', fontSize: 10, letterSpacing: 2, marginTop: 4 },

  // Quest
  questBox: { width: '100%', backgroundColor: 'rgba(234, 179, 8, 0.1)', padding: 15, borderRadius: 4, marginTop: 10 },
  questLabel: { color: '#eab308', fontSize: 10, fontWeight: 'bold', marginBottom: 4 },
  questText: { color: '#fef08a', fontSize: 16, fontStyle: 'italic', fontWeight: 'bold' },
  
  rewardRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  rewardLabel: { color: '#64748b', fontSize: 12, fontWeight: 'bold' },
  rewardValue: { color: '#22d3ee', fontSize: 16, fontWeight: '900', letterSpacing: 1 },

  attemptBtn: { backgroundColor: '#eab308', width: '100%', padding: 16, alignItems: 'center', borderRadius: 2, marginTop: 10 },
  btnText: { color: '#000', fontWeight: '900', letterSpacing: 1 },
  riskText: { color: '#ef4444', fontSize: 10, fontWeight: 'bold' },

  // Progress
  progressBar: { width: '100%', height: 6, backgroundColor: '#1e293b', borderRadius: 3, marginTop: 20 },
  progressFill: { height: '100%', backgroundColor: '#64748b', borderRadius: 3 },
  progressText: { color: '#64748b', marginTop: 8, fontSize: 12, fontWeight: 'bold' }
});
