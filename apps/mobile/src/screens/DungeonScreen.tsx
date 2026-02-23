import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Image,
  Alert,
  Dimensions,
  ActivityIndicator,
  Vibration,
  Platform,
  ImageBackground
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { MotiView, AnimatePresence } from 'moti';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { playHunterSound } from '../utils/audio';

// Icons/Assets
import goldIcon from '@assets/coinicon.png';
import monsterPlaceholder from '@assets/icon.png';
import gatesBg from '@assets/gates.png';

const { width, height } = Dimensions.get('window');

interface CombatLog {
  id: string;
  message: string;
  type: 'player' | 'monster' | 'system' | 'reward';
}

export const DungeonScreen: React.FC = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

  // State
  const [level, setLevel] = useState(1);
  const [health, setHealth] = useState(100);
  const [maxHealth] = useState(100);
  const [gold, setGold] = useState(0);
  const [monsterHealth, setMonsterHealth] = useState(50);
  const [maxMonsterHealth, setMaxMonsterHealth] = useState(50);
  const [monsterName, setMonsterName] = useState('Low-Rank Goblin');
  const [isFighting, setIsFighting] = useState(false);
  const [combatLogs, setCombatLogs] = useState<CombatLog[]>([]);
  const [monsterShake, setMonsterShake] = useState(0);
  const [playerShake, setPlayerShake] = useState(0);

  // Initialize
  useEffect(() => {
    addLog('System: You have entered the D-Rank Gate.', 'system');
    addLog(`System: Objective - Defeat ${monsterName}.`, 'system');
  }, []);

  const addLog = (message: string, type: CombatLog['type']) => {
    const newLog: CombatLog = {
      id: Math.random().toString(36).substr(2, 9),
      message,
      type,
    };
    setCombatLogs(prev => [newLog, ...prev].slice(0, 10));
  };

  const handleAttack = () => {
    if (isFighting || health <= 0) return;

    setIsFighting(true);
    playHunterSound('click');

    // Player Attack Phase
    setTimeout(() => {
      const damage = Math.floor(Math.random() * 15) + 10;
      const newMonsterHealth = Math.max(0, monsterHealth - damage);
      setMonsterHealth(newMonsterHealth);
      setMonsterShake(10);
      addLog(`You dealt ${damage} damage to ${monsterName}.`, 'player');
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      if (newMonsterHealth <= 0) {
        handleVictory();
      } else {
        // Monster Retaliation Phase
        setTimeout(() => {
          const monsterDamage = Math.floor(Math.random() * 8) + 4;
          const newPlayerHealth = Math.max(0, health - monsterDamage);
          setHealth(newPlayerHealth);
          setPlayerShake(10);
          addLog(`${monsterName} retaliated for ${monsterDamage} damage!`, 'monster');
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);

          if (newPlayerHealth <= 0) {
            handleDefeat();
          }

          setIsFighting(false);
          setMonsterShake(0);
          setPlayerShake(0);
        }, 800);
      }
    }, 400);
  };

  const handleVictory = () => {
    const reward = Math.floor(Math.random() * 50) + 20;
    setGold(prev => prev + reward);
    addLog(`Victory! ${monsterName} defeated.`, 'reward');
    addLog(`System: Reward acquired - ${reward} Gold.`, 'reward');
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    setTimeout(() => {
      const nextLevel = level + 1;
      const nextMaxHealth = 50 + nextLevel * 15;
      setLevel(nextLevel);
      setMonsterHealth(nextMaxHealth);
      setMaxMonsterHealth(nextMaxHealth);
      setMonsterName(`Level ${nextLevel} Skeleton Warrior`);
      addLog(`System: Progressing to Floor ${nextLevel}...`, 'system');
      setIsFighting(false);
      setMonsterShake(0);
    }, 1500);
  };

  const handleDefeat = () => {
    Alert.alert('System Error', 'Player health has reached 0. Vital signs failing.', [
      { text: 'EMERGENCY RECALL', onPress: () => navigation.goBack() }
    ]);
  };

  const renderHealthBar = (current: number, max: number, color: string) => {
    const percentage = (current / max) * 100;
    return (
      <View style={styles.healthBarBg}>
        <MotiView
          animate={{ width: `${percentage}%` }}
          transition={{ type: 'timing', duration: 300 }}
          style={[styles.healthBarFill, { backgroundColor: color }]}
        />
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <ImageBackground source={gatesBg} style={styles.bgImage} blurRadius={2}>
        <LinearGradient
          colors={['rgba(2, 6, 23, 0.95)', 'rgba(15, 23, 42, 0.7)', 'rgba(2, 6, 23, 0.95)']}
          style={StyleSheet.absoluteFill}
        />

        <SafeAreaView style={{ flex: 1, paddingTop: Platform.OS === 'android' ? insets.top : 0 }}>
          {/* Top HUD */}
          <View style={styles.hudTop}>
            <View style={styles.hudLeft}>
              <Text style={styles.hudLabel}>FLOOR</Text>
              <Text style={styles.hudValue}>{level}</Text>
            </View>
            <View style={styles.hudCenter}>
              <View style={styles.playerInfo}>
                <View style={styles.playerHealthLabel}>
                  <Text style={styles.hudLabel}>HP</Text>
                  <Text style={styles.hudValueSmall}>{health}/{maxHealth}</Text>
                </View>
                {renderHealthBar(health, maxHealth, '#ef4444')}
              </View>
            </View>
            <View style={styles.hudRight}>
              <Image source={goldIcon} style={styles.goldIcon} />
              <Text style={styles.hudValue}>{gold}</Text>
            </View>
          </View>

          {/* Monster Area */}
          <View style={styles.monsterStage}>
            <MotiView
              animate={{
                translateX: monsterShake,
                opacity: monsterHealth > 0 ? 1 : 0,
                scale: monsterHealth > 0 ? 1 : 0.8,
              }}
              style={styles.monsterContainer}
            >
              <View style={styles.monsterHeader}>
                <Text style={styles.monsterTitle}>{monsterName.toUpperCase()}</Text>
                {renderHealthBar(monsterHealth, maxMonsterHealth, '#22d3ee')}
              </View>

              <Image source={monsterPlaceholder} style={styles.monsterImage} />

              <View style={styles.monsterAuraContainer}>
                <MotiView
                  from={{ scale: 0.8, opacity: 0.2 }}
                  animate={{ scale: 1.2, opacity: 0.4 }}
                  transition={{ type: 'timing', duration: 2000, loop: true }}
                  style={styles.monsterAura}
                />
              </View>
            </MotiView>
          </View>

          {/* Combat Logs */}
          <View style={styles.logsContainer}>
            <View style={styles.terminalHeader}>
              <View style={styles.terminalDot} />
              <Text style={styles.terminalTitle}>COMBAT_LOGS_PROMPT</Text>
            </View>
            <ScrollView
              style={styles.logsScroll}
              contentContainerStyle={{ paddingVertical: 10 }}
              showsVerticalScrollIndicator={false}
            >
              {combatLogs.map(log => (
                <Text key={log.id} style={[
                  styles.logText,
                  log.type === 'player' && { color: '#60a5fa' },
                  log.type === 'monster' && { color: '#ef4444' },
                  log.type === 'system' && { color: '#22d3ee' },
                  log.type === 'reward' && { color: '#fbbf24' },
                ]}>
                  {`> ${log.message}`}
                </Text>
              ))}
            </ScrollView>
          </View>

          {/* Actions */}
          <View style={styles.actionsContainer}>
            <TouchableOpacity
              style={[styles.attackButton, isFighting && styles.buttonDisabled]}
              onPress={handleAttack}
              disabled={isFighting || health <= 0}
            >
              <LinearGradient
                colors={['#2563eb', '#1e40af']}
                style={styles.buttonGradient}
              >
                <Text style={styles.buttonText}>{isFighting ? 'COMBAT IN PROGRESS...' : 'STRIKE'}</Text>
              </LinearGradient>
              <View style={styles.buttonGlitch} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.recallButton}
              onPress={() => navigation.goBack()}
            >
              <Text style={styles.recallText}>RECALL</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </ImageBackground>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#020617',
  },
  bgImage: {
    flex: 1,
  },
  hudTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(34, 211, 238, 0.2)',
  },
  hudLeft: {
    alignItems: 'flex-start',
  },
  hudCenter: {
    flex: 1,
    paddingHorizontal: 30,
  },
  hudRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  hudLabel: {
    color: 'rgba(34, 211, 238, 0.6)',
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 2,
  },
  hudValue: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '900',
    fontFamily: 'Exo2-Regular',
  },
  hudValueSmall: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
    fontFamily: 'Exo2-Regular',
  },
  playerInfo: {
    width: '100%',
  },
  playerHealthLabel: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  goldIcon: {
    width: 16,
    height: 16,
  },
  healthBarBg: {
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 3,
    overflow: 'hidden',
    width: '100%',
  },
  healthBarFill: {
    height: '100%',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 5,
    elevation: 5,
  },
  monsterStage: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  monsterContainer: {
    alignItems: 'center',
    width: '100%',
    paddingHorizontal: 40,
  },
  monsterHeader: {
    width: '100%',
    marginBottom: 30,
    alignItems: 'center',
  },
  monsterTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: 4,
    marginBottom: 8,
    textAlign: 'center',
    textShadowColor: 'rgba(34, 211, 238, 0.5)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  monsterImage: {
    width: 220,
    height: 220,
    resizeMode: 'contain',
    zIndex: 10,
  },
  monsterAuraContainer: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    width: 300,
    height: 300,
    marginLeft: -150,
    marginTop: -150,
    justifyContent: 'center',
    alignItems: 'center',
  },
  monsterAura: {
    width: '100%',
    height: '100%',
    borderRadius: 150,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 2,
    borderColor: 'rgba(239, 68, 68, 0.2)',
  },
  logsContainer: {
    height: 180,
    backgroundColor: 'rgba(2, 6, 23, 0.8)',
    marginHorizontal: 20,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    padding: 10,
  },
  terminalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 5,
    opacity: 0.5,
  },
  terminalDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#22d3ee',
  },
  terminalTitle: {
    color: '#22d3ee',
    fontSize: 8,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  logsScroll: {
    flex: 1,
  },
  logText: {
    fontSize: 10,
    fontFamily: 'Exo2-Regular',
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  actionsContainer: {
    padding: 20,
    gap: 15,
  },
  attackButton: {
    height: 60,
    width: '100%',
    position: 'relative',
    overflow: 'hidden',
  },
  buttonGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 4,
  },
  buttonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 4,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonGlitch: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 4,
    height: '100%',
    backgroundColor: '#22d3ee',
  },
  recallButton: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  recallText: {
    color: 'rgba(255, 255, 255, 0.4)',
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 2,
    textDecorationLine: 'underline',
  },
});

export default DungeonScreen;
