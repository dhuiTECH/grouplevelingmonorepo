import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, Image, Alert, ActivityIndicator, Dimensions, Platform } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useAuth, resolveAvatar } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { LinearGradient } from 'expo-linear-gradient';
import { MotiView } from 'moti'; 
import { useAudio } from '@/contexts/AudioContext';
import { playClassVoiceOver, stopClassVoiceOver } from '@/utils/audioPlayer';
import { debounce } from '@/utils/debounce';
import { playHunterSound } from '@/utils/audio';
import { SystemClassSelectionButton } from '@/components/avatar/AvatarSystemUi';

// --- ASSET IMPORTS ---
const classImages = {
  Assassin: require('../../assets/classes/assassin.webp'),
  Fighter: require('../../assets/classes/fighter.webp'),
  Tanker: require('../../assets/classes/tanker.webp'),
  Ranger: require('../../assets/classes/ranger.webp'),
  Mage: require('../../assets/classes/mage.webp'),
  Healer: require('../../assets/classes/healer.webp'),
};

const classIcons = {
  Assassin: require('../../assets/classes/assassinicon.webp'),
  Fighter: require('../../assets/classes/fightericon.webp'),
  Tanker: require('../../assets/classes/tankericon.webp'),
  Ranger: require('../../assets/classes/rangericon.webp'),
  Mage: require('../../assets/classes/mageicon.webp'),
  Healer: require('../../assets/classes/healericon.webp'),
};

// ⚔️ TITLE MAPPING (Matches your Temple logic)
const INITIAL_TITLES: Record<string, string> = {
  Assassin: 'Novice Assassin',
  Fighter: 'Brawler',
  Tanker: 'Squire',
  Ranger: 'Novice Tracker',
  Mage: 'Acolyte',
  Healer: 'Apprentice Monk',
};

const CLASSES = [
  { 
    id: 'Assassin', 
    name: 'ASSASSIN', 
    subtitle: 'VELOCITY & PRECISION', 
    desc: 'Precision & Speed. Silent execution.', 
    image: classImages.Assassin, 
    icon: classIcons.Assassin, 
    stats: { agility: 95, strength: 55, vitality: 50 } 
  },
  { 
    id: 'Fighter', 
    name: 'FIGHTER', 
    subtitle: 'INTENSITY & STRENGTH', 
    desc: 'Intensity & Strength. Peak power.', 
    image: classImages.Fighter, 
    icon: classIcons.Fighter, 
    stats: { agility: 55, strength: 95, vitality: 70 } 
  },
  { 
    id: 'Tanker', 
    name: 'TANKER', 
    subtitle: 'STAMINA & ENDURANCE', 
    desc: 'Unyielding Defense. Ultimate shield.', 
    image: classImages.Tanker, 
    icon: classIcons.Tanker, 
    stats: { agility: 40, strength: 75, vitality: 95 } 
  },
  { 
    id: 'Ranger', 
    name: 'RANGER', 
    subtitle: 'PERCEPTION & FOCUS', 
    desc: 'Perception & Range. Survival master.', 
    image: classImages.Ranger, 
    icon: classIcons.Ranger, 
    stats: { agility: 80, strength: 60, vitality: 60 } 
  },
  { 
    id: 'Mage', 
    name: 'MAGE', 
    subtitle: 'TECHNICAL & CORE', 
    desc: 'Intellect & Power. Arcane control.', 
    image: classImages.Mage, 
    icon: classIcons.Mage, 
    stats: { agility: 60, strength: 40, vitality: 50 } 
  },
  { 
    id: 'Healer', 
    name: 'HEALER', 
    subtitle: 'RECOVERY & CONSISTENCY', 
    desc: 'Spirit & Support. Life preservation.', 
    image: classImages.Healer, 
    icon: classIcons.Healer, 
    stats: { agility: 50, strength: 45, vitality: 85 } 
  },
];

const ClassSelectionScreen = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const insets = useSafeAreaInsets();
  const { user, setUser } = useAuth();
  const { playTrack } = useAudio();
  const [selectedClass, setSelectedClass] = useState<string>('Fighter'); 
  const [loading, setLoading] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  useEffect(() => {
    playTrack('Onboarding Screen - Before Tutorial Overlay');
  }, [playTrack]);

  const debouncedPlayVoiceOver = useRef(debounce((classId: string) => {
    playClassVoiceOver(classId);
  }, 300)).current;

  const { gender: genderParam, name: nameParam, avatarConfig } = route.params || {};
  const gender = genderParam ?? user?.gender ?? 'Male';
  const name = nameParam ?? user?.hunter_name ?? user?.name;

  useEffect(() => {
    const fetchProfile = async () => {
        if (!user) return;
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', user.id)
                .single();
            
            if (data) {
                if (setUser && (!user.name || user.name === 'User' || !user.gender)) {
                    setUser({
                        ...user,
                        name: data.hunter_name || user.name,
                        gender: data.gender || user.gender,
                        onboarding_completed: data.onboarding_completed
                    });
                }
            }
        } catch (e) {
            console.log('Error fetching profile in ClassSelection:', e);
        }
    };

    fetchProfile();

    if (user) {
      setIsCheckingAuth(false);
    } else {
      const timer = setTimeout(() => setIsCheckingAuth(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [user]);

  const handleClassSelect = (classId: string) => {
    Haptics.selectionAsync();
    setSelectedClass(classId);
    stopClassVoiceOver(); 
    debouncedPlayVoiceOver(classId); 
  };

  const handleConfirm = async () => {
    if (!selectedClass) return;
    
    const userId = user?.id || (await supabase.auth.getSession()).data.session?.user.id;
    if (!userId) {
       Alert.alert('Error', 'Critical: No user ID found.');
       return;
    }

    setLoading(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    try {
        let avatarUrl = 'NoobMan.png';
        if (gender === 'Female') avatarUrl = 'NoobWoman.png';
        else if (gender === 'Non-binary') avatarUrl = 'Noobnonbinary.png';

        // 🎯 1. GET THE CORRECT STARTING TITLE
        const startingTitle = INITIAL_TITLES[selectedClass] || 'Novice Hunter';

        // 🎯 2. UPSERT WITH TITLE & RANK 0 (include avatar tint/silhouette from Avatar screen)
        // Hardcode starting position to Seoul Node based on ID
        const SEOUL_NODE_ID = "11c88b0a-27d0-4366-a47e-293ff25ec285";
        const START_X = 24;
        const START_Y = 64;

        const { error } = await supabase
            .from('profiles')
            .upsert({
                id: userId,
                hunter_name: name || user?.name || 'Hunter', 
                email: user?.email,

                // Class & Title Logic
                current_class: selectedClass,
                current_title: startingTitle,
                rank_tier: 0,

                gender: gender || 'Male',
                avatar: avatarUrl,
                level: 1,
                coins: 100,
                onboarding_completed: true,
                onboarding_step: 'done',
                updated_at: new Date().toISOString(),

                // Spawn Point
                world_x: START_X,
                world_y: START_Y,

                base_body_silhouette_url: avatarConfig?.base_body_silhouette_url ?? user?.base_body_silhouette_url ?? null,
                base_body_tint_hex: avatarConfig?.base_body_tint_hex ?? user?.base_body_tint_hex ?? null,
                hair_tint_hex: avatarConfig?.hair_tint_hex ?? user?.hair_tint_hex ?? null,
            });

        if (error) throw error;

        // 🎯 2.5 UNEQUIP ALL EXISTING COSMETICS
        const { error: unequipError } = await supabase
            .from('user_cosmetics')
            .update({ equipped: false })
            .eq('hunter_id', userId);

        if (unequipError) {
             console.warn('Error unequipping cosmetics:', unequipError);
        }

        // 🎯 3. SAVE COSMETICS IF PRESENT
        if (avatarConfig?.cosmetics && avatarConfig.cosmetics.length > 0) {
            const cosmeticInserts = avatarConfig.cosmetics.map((c: any) => ({
                hunter_id: userId,
                shop_item_id: c.shop_items.id,
                equipped: true,
                acquired_at: new Date().toISOString()
            }));

            const { error: cosmeticError } = await supabase
                .from('user_cosmetics')
                .insert(cosmeticInserts);
            
            if (cosmeticError) {
                console.warn('Error saving cosmetics:', cosmeticError);
                // Don't throw here, as the main profile update succeeded
            }
        }

        playHunterSound('activation');
        
        Alert.alert('System Message', `Class Awakening Complete.\nWelcome, ${startingTitle}.`, [
             { text: 'ENTER', onPress: () => {
                // Update local user state AFTER user confirms
                if (user) {
                    setUser({
                        ...user,
                        current_class: selectedClass,
                        onboarding_completed: true,
                        onboarding_step: 'done',
                        gender: gender || user.gender || 'Male',
                        name: name || user.name || 'Hunter',
                        hunter_name: name || user.hunter_name || user.name || 'Hunter',
                        avatar_url: avatarUrl,
                        profilePicture: resolveAvatar(avatarUrl),
                        cosmetics: avatarConfig?.cosmetics || user.cosmetics || [],
                        base_body_silhouette_url: avatarConfig?.base_body_silhouette_url ?? user.base_body_silhouette_url,
                        base_body_tint_hex: avatarConfig?.base_body_tint_hex ?? user.base_body_tint_hex,
                        hair_tint_hex: avatarConfig?.hair_tint_hex ?? user.hair_tint_hex,
                        world_x: START_X,
                        world_y: START_Y,
                    });
                }
                const parent = navigation.getParent();
                if (parent) {
                  parent.reset({ index: 0, routes: [{ name: 'Home' }] });
                } else {
                  navigation.reset({ index: 0, routes: [{ name: 'Home' }] });
                }
             }}
        ]);

    } catch (error: any) {
        Alert.alert('Error', error.message);
    } finally {
        setLoading(false);
    }
  };

  if (isCheckingAuth) {
      return (
          <View style={[styles.container, styles.center]}>
              <ActivityIndicator size="large" color="#06b6d4" />
              <Text style={styles.loadingText}>SYNCHRONIZING SYSTEM...</Text>
          </View>
      );
  }

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#0f172a', '#020617']} style={StyleSheet.absoluteFill} />
      
      <Image 
        source={{ uri: 'https://grainy-gradients.vercel.app/noise.svg' }}
        style={[StyleSheet.absoluteFill, { opacity: 0.05 }]}
      />

      <SafeAreaView style={[styles.safeArea, { paddingTop: insets.top }]}>
        
        {/* HUD Header */}
        <View style={styles.header}>
          <View>
            <View style={styles.statusRow}>
                <View style={styles.statusDot} />
                <Text style={styles.statusText}>SYSTEM_STATUS: ONLINE</Text>
            </View>
            <Text style={styles.modeText}>MODE: CLASS_INITIATE</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={styles.modeText}>LOCAL_NODE: 04</Text>
          </View>
        </View>

        <View style={styles.titleContainer}>
            <Text style={styles.subTitle}>SELECT YOUR COMBAT ARCHETYPE</Text>
        </View>

        {/* --- VERTICAL PANE LAYOUT --- */}
        <View style={styles.paneContainer}>
            {CLASSES.map((cls) => {
                const isSelected = selectedClass === cls.id;
                
                return (
                    <MotiView
                        key={cls.id}
                        animate={{ flex: isSelected ? 5 : 1 }}
                        transition={{ type: 'timing', duration: 400 }}
                        style={[
                            styles.pane,
                            isSelected ? styles.paneSelected : styles.paneUnselected
                        ]}
                    >
                        <TouchableOpacity 
                            style={StyleSheet.absoluteFill} 
                            onPress={() => handleClassSelect(cls.id)}
                            activeOpacity={0.9}
                        >
                            <Image source={cls.image} style={styles.paneImage} />
                            
                            <LinearGradient
                                colors={
                                  isSelected 
                                    ? ['transparent', 'transparent', 'rgba(0,0,0,0.8)', '#000'] 
                                    : ['rgba(0,0,0,0.6)', 'rgba(0,0,0,0.8)']
                                }
                                locations={isSelected ? [0, 0.5, 0.8, 1] : [0, 1]}
                                style={StyleSheet.absoluteFill}
                            />

                            {!isSelected && (
                                <View style={styles.verticalTitleContainer}>
                                    <Text style={styles.verticalTitle}>{cls.name}</Text>
                                </View>
                            )}

                            {isSelected && (
                                <MotiView 
                                    from={{ opacity: 0, translateY: 10 }}
                                    animate={{ opacity: 1, translateY: 0 }}
                                    transition={{ delay: 100 }}
                                    style={styles.selectedContent}
                                >
                                    <View style={styles.titleRow}>
                                        <Image source={cls.icon} style={styles.iconImage} resizeMode="contain" />
                                        <Text style={styles.selectedTitle}>{cls.name}</Text>
                                    </View>
                                    <Text style={styles.selectedSubtitle}>{cls.subtitle}</Text>
                                    <Text style={styles.selectedDesc}>{cls.desc}</Text>

                                    <View style={styles.statsContainer}>
                                        {Object.entries(cls.stats).map(([stat, val]) => (
                                            <View key={stat} style={styles.statRow}>
                                                <View style={styles.statLabelRow}>
                                                    <Text style={styles.statLabel}>{stat}</Text>
                                                    <Text style={styles.statValue}>{val}</Text>
                                                </View>
                                                <View style={styles.statBarBg}>
                                                    <MotiView 
                                                        from={{ width: '0%' }}
                                                        animate={{ width: `${val}%` }}
                                                        transition={{ duration: 1000 }}
                                                        style={styles.statBarFill} 
                                                    />
                                                </View>
                                            </View>
                                        ))}
                                    </View>
                                </MotiView>
                            )}
                        </TouchableOpacity>
                    </MotiView>
                );
            })}
        </View>

        <View style={[styles.footer, { paddingBottom: insets.bottom + 10 }]}>
            {loading ? (
                <ActivityIndicator color="#06b6d4" />
            ) : (
                <SystemClassSelectionButton 
                    onPress={handleConfirm}
                    width={Dimensions.get('window').width * 0.9}
                    label="CONFIRM SELECTION"
                />
            )}
        </View>

      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#020617' },
  center: { justifyContent: 'center', alignItems: 'center' },
  safeArea: { flex: 1 },
  loadingText: { color: '#06b6d4', marginTop: 20, fontWeight: 'bold', letterSpacing: 2 },

  header: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 10, zIndex: 10 },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  statusDot: { width: 6, height: 6, backgroundColor: '#06b6d4', borderRadius: 3 },
  statusText: { color: 'rgba(34,211,238,0.7)', fontSize: 10, fontFamily: 'Exo2-Regular', fontWeight: 'bold' },
  modeText: { color: 'rgba(255,255,255,0.4)', fontSize: 10, fontFamily: 'Exo2-Regular', marginTop: 2 },

  titleContainer: { alignItems: 'center', marginBottom: 10, zIndex: 10 },
  subTitle: { fontSize: 10, color: '#bfdbfe', letterSpacing: 3, opacity: 0.6, marginTop: 4 },

  paneContainer: {
    flex: 1,
    flexDirection: 'row', 
    paddingHorizontal: 8,
    gap: 4,
    marginBottom: 80, 
  },
  pane: {
    height: '100%',
    borderRadius: 4,
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 1,
  },
  
  // WHITE GLOW
  paneSelected: {
    borderColor: '#ffffff', // White Border
    borderWidth: 2,         
    zIndex: 10,
    shadowColor: '#ffffff', // White Glow
    shadowOpacity: 0.8,
    shadowRadius: 15,
    elevation: 20,
  },
  
  paneUnselected: {
    borderColor: 'rgba(255,255,255,0.1)',
  },
  paneImage: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },

  verticalTitleContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  verticalTitle: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: 4,
    transform: [{ rotate: '-90deg' }],
    width: 400,
    textAlign: 'center',
  },

  selectedContent: {
    flex: 1,
    justifyContent: 'flex-end',
    padding: 20,
    paddingBottom: 40,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 10,
  },
  iconImage: {
    width: 44, height: 44,
  },

  selectedTitle: { fontSize: 11, fontWeight: '900', color: '#fff', letterSpacing: 1, flexShrink: 1 },
  selectedSubtitle: { fontSize: 10, color: '#06b6d4', fontWeight: 'bold', letterSpacing: 2, marginBottom: 8 },
  selectedDesc: { fontSize: 12, color: '#cbd5e1', lineHeight: 16, marginBottom: 20 },

  statsContainer: { gap: 8 },
  statRow: { gap: 4 },
  statLabelRow: { flexDirection: 'row', justifyContent: 'space-between' },
  statLabel: { fontSize: 9, color: 'rgba(255,255,255,0.6)', fontWeight: 'bold' },
  statValue: { fontSize: 9, color: '#06b6d4', fontWeight: 'bold' },
  statBarBg: { height: 3, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 2, overflow: 'hidden' },
  statBarFill: { height: '100%', backgroundColor: '#06b6d4' },

  footer: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    alignItems: 'center', justifyContent: 'center',
    paddingTop: 10,
  },
});

export default ClassSelectionScreen;