import React, { useState, useMemo } from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform, Dimensions } from 'react-native';
import { BlurView } from 'expo-blur';
import { User } from '@/types/user';
import { X } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Svg, Line } from 'react-native-svg';
import { SkillTreeTab } from '@/components/tabs/SkillTreeTab';
import { calculateDerivedStats } from '@/utils/stats';
import { supabase } from '@/lib/supabase';
import { useNotification } from '@/contexts/NotificationContext';
import HologramOverlay from '@/components/HologramOverlay';
import { useTutorial } from '@/context/TutorialContext';
import { useGameData } from '@/hooks/useGameData';

// --- CONSTANTS ---
const THEME = {
  background: '#02040a',
  panelBg: 'rgba(0, 34, 68, 0.3)',
  panelBorder: 'rgba(0, 210, 255, 0.2)',
  primary: '#00d2ff',
  secondary: '#0066ff',
  text: '#e6ffff',
  trackBg: '#020612',
};

const BASE_ATTRS: { label: string; statKey: keyof User; desc: string; classRec: string; }[] = [
  { label: 'STR', statKey: 'str_stat', desc: 'Physical Attack (ATK)', classRec: 'FIG, TNK' },
  { label: 'SPD', statKey: 'spd_stat', desc: 'Crit Chance & Evasion', classRec: 'ASN' },
  { label: 'END', statKey: 'end_stat', desc: 'Max HP & Defense', classRec: 'TNK' },
  { label: 'INT', statKey: 'int_stat', desc: 'Max MP & Magic (MATK)', classRec: 'MAG' },
  { label: 'VIT', statKey: 'wil_stat', desc: 'HP & Stamina Regen', classRec: 'HLR' }, // Using 'wil_stat' for VIT as per existing mapping
  { label: 'LCK', statKey: 'lck_stat', desc: 'Drop rate & gold yield', classRec: 'ALL' },
];

// --- COMPONENTS ---

const Scanlines = () => (
  <View style={StyleSheet.absoluteFill} pointerEvents="none">
    {[...Array(250)].map((_, i) => (
      <View
        key={i}
        style={{
          height: 1,
          backgroundColor: 'rgba(0, 210, 255, 0.03)',
          marginTop: 3,
        }}
      />
    ))}
  </View>
);

const SideAccents = () => (
  <>
    <View style={[styles.sideAccent, { left: 0 }]} />
    <View style={[styles.sideAccent, { right: 0 }]} />
  </>
);

const MechanicalBorder = ({ position }: { position: 'top' | 'bottom' }) => (
  <View style={[styles.mechBorderContainer, position === 'top' ? { top: 0 } : { bottom: 0 }]}>
    <LinearGradient
      colors={['transparent', '#00d2ff', '#e6ffff', '#00d2ff', 'transparent']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0 }}
      style={styles.mechBorderGradient}
    />
    <View style={styles.mechInnerLine} />
  </View>
);

const VitalBar = ({ label, current, max, type }: { label: string, current: number, max: number, type: 'hp' | 'mp' | 'exp' }) => {
  let gradientColors = ['#8a0000', '#ff003c']; // HP
  if (type === 'mp') gradientColors = ['#0033cc', '#0099ff'];
  if (type === 'exp') gradientColors = ['#0e7490', '#22d3ee'];

  const percent = Math.min(100, Math.max(0, (current / max) * 100));

  return (
    <View style={styles.vitalBarContainer}>
      <View style={styles.vitalHeader}>
        <Text style={styles.vitalLabel}>{label}</Text>
        <Text style={styles.vitalValue}>{Math.floor(current)} / {Math.floor(max)}</Text>
      </View>
      <View style={styles.vitalTrack}>
        <LinearGradient
          colors={gradientColors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[styles.vitalFill, { width: `${percent}%` }]}
        />
      </View>
    </View>
  );
};

const AttributeRow = ({ label, value, description, classRec, onIncrease, canAdd }: any) => (
  <View style={styles.attrRow}>
    <View style={styles.attrInfo}>
      <View style={styles.attrLabelRow}>
        <Text style={styles.attrLabel}>{label}</Text>
        <View style={styles.classRecBadge}>
          <Text style={styles.classRecText}>{classRec}</Text>
        </View>
      </View>
      <Text style={styles.attrDesc}>{description}</Text>
    </View>
    
    <View style={styles.attrRight}>
      <Text style={styles.attrValue}>{value}</Text>
      {canAdd && (
        <TouchableOpacity onPress={onIncrease} style={styles.plusBtn} activeOpacity={0.7}>
          <Svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={THEME.primary} strokeWidth="2.5" strokeLinecap="square">
            <Line x1="12" y1="4" x2="12" y2="20" />
            <Line x1="4" y1="12" x2="20" y2="12" />
          </Svg>
        </TouchableOpacity>
      )}
    </View>
  </View>
);

interface StatusWindowModalProps {
  visible: boolean;
  onClose: () => void;
  user: User | null;
  setUser: (user: User | null) => void;
}

export const StatusWindowModal: React.FC<StatusWindowModalProps> = ({ visible, onClose, user, setUser }) => {
  const { showNotification } = useNotification();
  const { step } = useTutorial();
  const { totalStats } = useGameData();
  const [activeTab, setActiveTab] = useState('stats');
  const [allocating, setAllocating] = useState(false);

  const derivedStats = useMemo(() => user ? calculateDerivedStats(user) : {}, [user]);
  
  const displayHP = useMemo(() => {
    const max = derivedStats.maxHP || 1;
    const current = user?.current_hp ?? max;
    return { current: Math.min(current, max), max };
  }, [user?.current_hp, derivedStats.maxHP]);

  const displayMP = useMemo(() => {
    const max = derivedStats.maxMP || 1;
    const current = user?.current_mp ?? max;
    return { current: Math.min(current, max), max };
  }, [user?.current_mp, derivedStats.maxMP]);

  const handleAllocStat = async (statKey: keyof User) => {
    if (!user || !setUser) return;
    const points = user.unassigned_stat_points ?? 0;
    if (points <= 0) return;
    
    const currentVal = (user[statKey] as number) ?? 10;
    const newVal = currentVal + 1;
    const newPoints = points - 1;
    
    const updatedUser: User = {
      ...user,
      [statKey]: newVal,
      unassigned_stat_points: newPoints,
    };
    
    const derived = calculateDerivedStats(updatedUser);
    updatedUser.max_hp = derived.maxHP;
    updatedUser.max_mp = derived.maxMP;
    updatedUser.current_hp = derived.maxHP;
    updatedUser.current_mp = derived.maxMP;
    
    setUser(updatedUser);
    setAllocating(true);
    
    const { error } = await supabase
      .from('profiles')
      .update({
        [statKey]: newVal,
        unassigned_stat_points: newPoints,
        max_hp: derived.maxHP,
        max_mp: derived.maxMP,
        current_hp: derived.maxHP,
        current_mp: derived.maxMP,
      })
      .eq('id', user.id);
      
    setAllocating(false);
    
    if (error) {
      setUser(user);
      showNotification('Failed to save stat.', 'error');
      return;
    }
    
    const label = BASE_ATTRS.find(a => a.statKey === statKey)?.label ?? statKey;
    showNotification(`${label} +1 (now ${newVal})`, 'success');
  };

  if (!user) return null;

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={true}
      onRequestClose={onClose}
    >
      <BlurView intensity={20} style={styles.backdrop}>
        {/* Main Modal Window */}
        <View style={styles.modalWindow}>
          <Scanlines />
          {/* Mechanical Borders */}
          <MechanicalBorder position="top" />
          <MechanicalBorder position="bottom" />

          {/* Close Button */}
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <X size={24} color={THEME.primary} />
          </TouchableOpacity>

          {/* Header Section */}
          <View style={styles.header}>
            <View style={styles.titleBox}>
              <View style={styles.exclamationIcon}>
                <Text style={styles.exclamationText}>!</Text>
              </View>
              <Text style={styles.headerTitle}>STATUS</Text>
            </View>

            <View style={styles.playerInfo}>
              <Text style={styles.playerName}>{user.current_title || 'PLAYER'}</Text>
              <Text style={styles.playerLevel}>
                Level {user.level} {user.current_class}
              </Text>
            </View>
          </View>

          {/* Tabs */}
          <View style={styles.tabContainer}>
            <TouchableOpacity 
              style={styles.tabButton}
              onPress={() => setActiveTab('stats')}
            >
              <Text style={[styles.tabText, activeTab === 'stats' && styles.activeTabText]}>STATS</Text>
              {activeTab === 'stats' && <View style={styles.activeTabLine} />}
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.tabButton}
              onPress={() => setActiveTab('skills')}
            >
              <Text style={[styles.tabText, activeTab === 'skills' && styles.activeTabText]}>SKILLS</Text>
              {activeTab === 'skills' && <View style={styles.activeTabLine} />}
            </TouchableOpacity>
          </View>

          {/* Content Area */}
          <View style={styles.contentArea}>
            {activeTab === 'stats' ? (
              <ScrollView 
                style={styles.scrollView} 
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
              >
                {/* Vitals Panel */}
                <View style={styles.panel}>
                  <VitalBar label="HP" current={displayHP.current} max={displayHP.max} type="hp" />
                  <VitalBar label="MP" current={displayMP.current} max={displayMP.max} type="mp" />
                  <VitalBar label="EXP" current={user.exp % 1000} max={1000} type="exp" />
                </View>

                {/* Attributes Panel */}
                <View style={styles.panel}>
                  {BASE_ATTRS.map((attr, idx) => {
                    const value = (user[attr.statKey] as number) ?? 10;
                    const canAdd = (user.unassigned_stat_points ?? 0) > 0 && !allocating;
                    return (
                      <View key={attr.label}>
                        <AttributeRow 
                          label={attr.label}
                          value={value}
                          description={attr.desc}
                          classRec={attr.classRec}
                          canAdd={canAdd}
                          onIncrease={() => handleAllocStat(attr.statKey)}
                        />
                        {idx !== BASE_ATTRS.length - 1 && <View style={styles.divider} />}
                      </View>
                    );
                  })}
                </View>

                {/* Equipment Stats */}
                {totalStats && Object.keys(totalStats).length > 0 && (
                  <View style={[styles.panel, { marginTop: 20 }]}>
                    <Text style={[styles.attrLabel, { marginBottom: 10 }]}>Equipment Bonuses</Text>
                    <View style={styles.equipStatsGrid}>
                      {Object.entries(totalStats).map(([stat, value]) => {
                         const displayValue = typeof value === 'object' ? 0 : value;
                         if (displayValue === 0) return null;

                         const typeName = stat.replace(/_/g, ' ').toUpperCase();
                         const suffix = stat.includes('percentage') || stat === 'xp_boost' ? '%' : stat === 'crit_damage' ? 'x' : '';

                         return (
                           <View key={stat} style={styles.equipStatItem}>
                             <Text style={styles.equipStatLabel}>{typeName}</Text>
                             <Text style={styles.equipStatValue}>+{displayValue}{suffix}</Text>
                           </View>
                         );
                      })}
                    </View>
                  </View>
                )}

                {/* Unassigned Points Notice */}
                {(user.unassigned_stat_points ?? 0) > 0 && (
                  <View style={styles.unassignedContainer}>
                    <Text style={styles.unassignedText}>
                      {user.unassigned_stat_points} UNASSIGNED POINT{(user.unassigned_stat_points ?? 0) !== 1 ? 'S' : ''}
                    </Text>
                    <Text style={styles.unassignedSubText}>TAP [+] TO ALLOCATE</Text>
                  </View>
                )}
                
                <View style={{ height: 20 }} />
              </ScrollView>
            ) : (
              <SkillTreeTab />
            )}
          </View>
          
          {step === 'NAV_STATS' && <HologramOverlay />}
        </View>
      </BlurView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(2, 4, 10, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalWindow: {
    width: '95%',
    maxWidth: 420,
    height: Math.min(Dimensions.get('window').height * 0.85, 850),
    backgroundColor: 'rgba(4, 12, 28, 0.95)',
    borderWidth: 1,
    borderColor: 'rgba(0, 210, 255, 0.3)',
    borderRadius: 2,
    overflow: 'hidden',
    position: 'relative',
    shadowColor: '#0066ff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 30,
    elevation: 10,
  },
  sideAccent: {
    position: 'absolute',
    top: 40,
    bottom: 40,
    width: 1,
    backgroundColor: 'rgba(0, 210, 255, 0.4)',
    shadowColor: '#00d2ff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 10,
    zIndex: 10,
  },
  
  // Mechanical Borders
  mechBorderContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 8,
    zIndex: 20,
  },
  mechBorderGradient: {
    width: '100%',
    height: '100%',
  },
  mechInnerLine: {
    position: 'absolute',
    top: 3, // Roughly centered in 8px height
    left: '5%',
    right: '5%',
    height: 1,
    backgroundColor: '#00d2ff',
    shadowColor: '#00d2ff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 8,
  },

  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    zIndex: 30,
    padding: 8,
  },

  // Header
  header: {
    alignItems: 'center',
    paddingTop: 32,
    paddingBottom: 24,
  },
  titleBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: 'rgba(0, 210, 255, 0.5)',
    backgroundColor: 'rgba(0, 102, 255, 0.2)',
    paddingHorizontal: 24,
    paddingVertical: 8,
    shadowColor: '#00d2ff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
  },
  exclamationIcon: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#FFFFFF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 8,
  },
  exclamationText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
    fontFamily: Platform.OS === 'ios' ? 'serif' : 'serif', // Fallback
    textShadowColor: '#FFFFFF',
    textShadowRadius: 4,
  },
  headerTitle: {
    color: '#e6ffff',
    fontSize: 20,
    fontWeight: 'bold',
    letterSpacing: 4,
    textShadowColor: '#00d2ff',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
    fontFamily: 'Exo2-Bold',
  },
  playerInfo: {
    marginTop: 20,
    alignItems: 'center',
  },
  playerName: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
    letterSpacing: 2,
    textTransform: 'uppercase',
    fontFamily: 'Exo2-Bold',
  },
  playerLevel: {
    color: '#00d2ff',
    fontSize: 12,
    marginTop: 4,
    letterSpacing: 3,
    textShadowColor: 'rgba(0, 210, 255, 0.5)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
    textTransform: 'uppercase',
    fontFamily: 'Exo2-Regular',
  },

  // Tabs
  tabContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 210, 255, 0.3)',
    marginHorizontal: 24,
    marginBottom: 24,
  },
  tabButton: {
    flex: 1,
    paddingBottom: 12,
    alignItems: 'center',
    position: 'relative',
  },
  tabText: {
    color: 'rgba(0, 210, 255, 0.5)',
    fontSize: 12,
    fontWeight: 'bold',
    letterSpacing: 2,
    fontFamily: 'Exo2-Regular',
  },
  activeTabText: {
    color: '#e6ffff',
    textShadowColor: '#00d2ff',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
    fontFamily: 'Exo2-Bold',
  },
  activeTabLine: {
    position: 'absolute',
    bottom: -1,
    width: '100%',
    height: 2,
    backgroundColor: '#00d2ff',
    shadowColor: '#00d2ff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 10,
  },

  // Content
  contentArea: {
    flex: 1,
    overflow: 'hidden',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 48,
  },
  
  // Panels
  panel: {
    backgroundColor: 'rgba(0, 34, 68, 0.3)',
    borderWidth: 1,
    borderColor: 'rgba(0, 210, 255, 0.2)',
    padding: 16,
    marginBottom: 24,
    shadowColor: '#0066ff', // Inset shadow sim (simulated with bg/border)
  },
  
  // Vital Bars
  vitalBarContainer: {
    marginBottom: 16,
  },
  vitalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 6,
  },
  vitalLabel: {
    color: '#00d2ff',
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 2,
    fontFamily: 'Exo2-Regular',
  },
  vitalValue: {
    color: '#FFFFFF',
    fontSize: 11,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    letterSpacing: 1,
  },
  vitalTrack: {
    height: 8,
    backgroundColor: '#020612',
    borderWidth: 1,
    borderColor: 'rgba(0, 210, 255, 0.3)',
    borderRadius: 99,
    overflow: 'hidden',
  },
  vitalFill: {
    height: '100%',
    borderRadius: 99,
  },

  // Attribute Rows
  attrRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(0, 210, 255, 0.1)',
  },
  attrInfo: {
    flex: 1,
  },
  attrLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  attrLabel: {
    color: '#e6ffff',
    fontSize: 14,
    fontWeight: 'bold',
    letterSpacing: 2,
    textShadowColor: '#00d2ff',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
    fontFamily: 'Exo2-Bold',
  },
  classRecBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderWidth: 1,
    borderColor: 'rgba(0, 210, 255, 0.3)',
    backgroundColor: 'rgba(0, 210, 255, 0.05)',
    borderRadius: 2,
  },
  classRecText: {
    color: '#00d2ff',
    fontSize: 8,
    fontWeight: 'bold',
    fontFamily: 'Exo2-Bold',
    letterSpacing: 0.5,
  },
  attrDesc: {
    color: 'rgba(0, 210, 255, 0.6)',
    fontSize: 9,
    fontWeight: '500',
    letterSpacing: 1,
    textTransform: 'uppercase',
    fontFamily: 'Exo2-Regular',
  },
  attrRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
  },
  attrValue: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    textShadowColor: '#e6ffff',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 5,
  },
  plusBtn: {
    width: 28,
    height: 28,
    borderWidth: 1,
    borderColor: '#00d2ff',
    backgroundColor: 'rgba(0, 210, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#00d2ff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 5,
  },

  // Equipment Stats
  equipStatsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'space-between',
  },
  equipStatItem: {
    width: '48%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 210, 255, 0.1)',
  },
  equipStatLabel: {
    color: '#94A3B8',
    fontSize: 10,
    fontWeight: 'bold',
    fontFamily: 'Exo2-Regular',
  },
  equipStatValue: {
    color: '#34D399',
    fontSize: 10,
    fontWeight: 'bold',
    fontFamily: 'Exo2-Regular',
  },

  // Unassigned
  unassignedContainer: {
    marginTop: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 170, 0, 0.4)',
    backgroundColor: 'rgba(255, 170, 0, 0.05)',
    alignItems: 'center',
  },
  unassignedText: {
    color: '#ffaa00',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 1,
    fontFamily: 'Exo2-Regular',
  },
  unassignedSubText: {
    color: 'rgba(255, 170, 0, 0.8)',
    fontSize: 10,
    marginTop: 4,
    letterSpacing: 1,
    fontFamily: 'Exo2-Regular',
  },
});
