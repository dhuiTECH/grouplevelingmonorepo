import React, { useState, useEffect, useMemo, useRef } from "react";
import { View, Text, Image, ScrollView, TouchableOpacity, ActivityIndicator, Dimensions, Animated, Easing, ImageSourcePropType, StyleSheet, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { MotiView } from 'moti';
import * as Haptics from 'expo-haptics';
import { Audio, Video, ResizeMode } from 'expo-av';
import { ChevronRight, Dices } from 'lucide-react-native';
import { supabase } from "@/lib/supabase";
import LayeredAvatar from "@/components/LayeredAvatar";
import { User } from "@/types/user";
import { useAuth } from "@/contexts/AuthContext";
import { useAudio } from '@/contexts/AudioContext';
import { findFemaleDefaultBodyShopItemIndex } from "@/utils/femaleBodyDefault";

// Assets
const BG_STONE = require("../../assets/stone-bg.jpg");
const RUNIC_CIRCLE = require("../../assets/runic-circle.png");
const AVATAR_ICONS = {
  Base: require("../../assets/Avatarscreenicons/Base.png"),
  Eyes: require("../../assets/Avatarscreenicons/Eyes.png"),
  Mouth: require("../../assets/Avatarscreenicons/Mouth.png"),
  Hair: require("../../assets/Avatarscreenicons/Hair.png"),
  Face: require("../../assets/Avatarscreenicons/Face.png"),
  Body: require("../../assets/Avatarscreenicons/Body.png"),
};

// Constants
const PART_SLOTS = ["face_eyes", "face_mouth", "hair", "face", "body"] as const;
const SLOT_LABELS: Record<string, string> = {
  base: "Base",
  face_eyes: "Eyes",
  face_mouth: "Mouth",
  hair: "Hair",
  face: "Face",
  body: "Body",
};

const SKIN_TONES = [
  { hex: "#FFDBAC", label: "Light" },
  { hex: "#F1C27D", label: "Light warm" },
  { hex: "#E0AC69", label: "Medium light" },
  { hex: "#C68642", label: "Tan" },
  { hex: "#B87333", label: "Filipino brown" },
  { hex: "#A0522D", label: "Brown" },
  { hex: "#8D5524", label: "Light skin Black" },
  { hex: "#5C3317", label: "Dark brown" },
  { hex: "#3D2314", label: "Dark skin" },
];

export default function AvatarScreen({ navigation }: any) {
  const { user } = useAuth();
  const { playTrack } = useAudio();

  useEffect(() => {
    playTrack('Onboarding Screen - Before Tutorial Overlay');
  }, [playTrack]);

  // State
  const [loading, setLoading] = useState(true);
  const [apiBases, setApiBases] = useState<any[]>([]);
  const [apiParts, setApiParts] = useState<any[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>("base");
  const [selectedBaseIndex, setSelectedBaseIndex] = useState(0);
  const [selectedPartIndex, setSelectedPartIndex] = useState<Record<string, number>>({});
  const [skinTint, setSkinTint] = useState("#FFDBAC");

  // Animation Values
  const spinValue = useRef(new Animated.Value(0)).current;
  const impactScale = useRef(new Animated.Value(1)).current;
  const flashOpacity = useRef(new Animated.Value(0)).current;
  
  // Audio
  const [sound, setSound] = useState<Audio.Sound>();

  const screenWidth = Dimensions.get('window').width;
  const avatarSize = Math.min(screenWidth * 0.9, 400);

  // Load Sound
  useEffect(() => {
    async function loadSound() {
      const { sound } = await Audio.Sound.createAsync(
        require('../../assets/sounds/changeselection.mp3')
      );
      setSound(sound);
    }
    loadSound();
    return () => {
      if (sound) {
        sound.unloadAsync();
      }
    };
  }, []);

  // Play Sound Helper
  const playSelectionSound = async () => {
    if (sound) {
      try {
        await sound.replayAsync();
      } catch (error) {
        console.log('Error playing sound:', error);
      }
    }
  };

  const triggerSelectionFeedback = async () => {
    playSelectionSound();
    
    // Haptics
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    // Bounce Effect
    impactScale.setValue(1);
    Animated.sequence([
        Animated.timing(impactScale, {
            toValue: 0.97,
            duration: 50,
            useNativeDriver: true,
        }),
        Animated.spring(impactScale, {
            toValue: 1,
            friction: 5,
            useNativeDriver: true,
        })
    ]).start();

    // Flash Effect (subtler)
    flashOpacity.setValue(0);
    Animated.sequence([
        Animated.timing(flashOpacity, {
            toValue: 0.18,
            duration: 70,
            useNativeDriver: true,
        }),
        Animated.timing(flashOpacity, {
            toValue: 0,
            duration: 280,
            useNativeDriver: true,
        })
    ]).start();
  };

  // Setup Animations
  useEffect(() => {
    // Spin Animation
    Animated.loop(
      Animated.timing(spinValue, {
        toValue: 1,
        duration: 25000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();
  }, []);

  // Fetch Data
  useEffect(() => {
    async function loadData() {
      setLoading(true);
      const { data, error } = await supabase
        .from('shop_items')
        .select('*')
        .eq('is_active', true)
        .in('slot', ['base_body', ...PART_SLOTS]);

      if (!error && data) {
        // 1. Separate bases and parts first
        // Also filter by onboarding_available if that's a requirement
        // Assuming the column exists on shop_items
        const activeData = data.filter((i: any) => i.onboarding_available !== false);

        // Ensure MALE bases appear first in the list
        const bases = activeData
          .filter((i: any) => i.slot === 'base_body')
          .sort((a: any, b: any) => {
            const getGender = (item: any) => {
              if (!item.gender) return 'other';
              const raw = Array.isArray(item.gender) ? item.gender[0] : item.gender;
              return typeof raw === 'string' ? raw.toLowerCase() : 'other';
            };

            const order = (g: string) => {
              if (g === 'male') return 0;
              if (g === 'female') return 1;
              return 2; // non-binary / other
            };

            return order(getGender(a)) - order(getGender(b));
          });

        // Parts for other slots
        const parts = activeData.filter((i: any) => PART_SLOTS.includes(i.slot));
        
        setApiBases(bases);
        setApiParts(parts);
        if (bases.length > 0 && bases[0].skin_tint_hex) {
          setSkinTint(bases[0].skin_tint_hex);
        }
      }
      setLoading(false);
    }
    loadData();
  }, []);

  const selectedBase = apiBases[selectedBaseIndex];

  const partsBySlot = useMemo(() => {
    // Determine the gender of the currently selected base body
    // If no base selected yet, default to 'male' or whatever needed
    let currentBaseGender = 'male'; 
    if (selectedBase && selectedBase.gender) {
        // Handle array or string
        const g = Array.isArray(selectedBase.gender) ? selectedBase.gender[0] : selectedBase.gender;
        currentBaseGender = g.toLowerCase();
    }

    const out: Record<string, any[]> = {};
    for (const slot of PART_SLOTS) {
      // Filter parts by the SELECTED BASE'S GENDER
      const items = apiParts.filter(p => {
         if (p.slot !== slot) return false;
         
         // Gender check against currentBaseGender
         if (!p.gender) return true; // No restriction
         
         const itemGenders = Array.isArray(p.gender) 
            ? p.gender.map((g: string) => g.toLowerCase())
            : [p.gender.toLowerCase()];
            
         if (itemGenders.includes('unisex') || itemGenders.includes('all')) return true;
         
         return itemGenders.includes(currentBaseGender);
      });

      // Add "None" option for Face slot only
      if (slot === 'face') {
        out[slot] = [{ id: null, name: "None", slot: 'face' }, ...items];
      } else {
        out[slot] = items;
      }
    }
    return out;
  }, [apiParts, selectedBase]);

  // Female base: default body row to white shirt when `body` index not chosen yet (e.g. first paint, data load)
  useEffect(() => {
    if (!selectedBase) return;
    let baseGender = "male";
    if (selectedBase.gender) {
      const g = Array.isArray(selectedBase.gender) ? selectedBase.gender[0] : selectedBase.gender;
      baseGender = String(g).toLowerCase();
    }
    if (baseGender !== "female") return;
    const bodyList = partsBySlot["body"];
    if (!bodyList?.length) return;
    const idx = findFemaleDefaultBodyShopItemIndex(bodyList);
    if (idx < 0) return;
    setSelectedPartIndex((prev) => {
      if (prev.body !== undefined) return prev;
      return { ...prev, body: idx };
    });
  }, [selectedBase, partsBySlot]);

  const currentOptions = activeCategory === "base" ? apiBases : partsBySlot[activeCategory] || [];
  const currentSelectionIndex = activeCategory === "base" ? selectedBaseIndex : (selectedPartIndex[activeCategory] ?? 0);

  // When the base body changes (e.g. switching genders), reset part selections
  // so we don't point at indices that are no longer valid for the new base.

  const handleSelect = (index: number) => {
    triggerSelectionFeedback();
    if (activeCategory === "base") {
      setSelectedBaseIndex(index);
      const newBase = apiBases[index];
      let baseGender = "male";
      if (newBase?.gender) {
        const g = Array.isArray(newBase.gender) ? newBase.gender[0] : newBase.gender;
        baseGender = String(g).toLowerCase();
      }
      const nextParts: Record<string, number> = {};
      if (baseGender === "female") {
        const bodyItems = apiParts.filter((p) => {
          if (p.slot !== "body") return false;
          if (!p.gender) return true;
          const itemGenders = Array.isArray(p.gender)
            ? p.gender.map((x: string) => x.toLowerCase())
            : [String(p.gender).toLowerCase()];
          if (itemGenders.includes("unisex") || itemGenders.includes("all")) return true;
          return itemGenders.includes(baseGender);
        });
        const bi = findFemaleDefaultBodyShopItemIndex(bodyItems);
        if (bi >= 0) nextParts.body = bi;
      }
      setSelectedPartIndex(nextParts);
      if (newBase?.skin_tint_hex) {
        setSkinTint(newBase.skin_tint_hex);
      }
    } else {
      setSelectedPartIndex(prev => ({ ...prev, [activeCategory]: index }));
    }
  };

  const handleSkinSelect = (hex: string) => {
    setSkinTint(hex);
    Haptics.selectionAsync();
  };

  const handleRandomize = () => {
    if (apiBases.length === 0) return;

    // 1. Pick a random base
    const randomBaseIdx = Math.floor(Math.random() * apiBases.length);
    const randomBase = apiBases[randomBaseIdx];
    
    // 2. Determine available parts for this base's gender
    let baseGender = 'male';
    if (randomBase && randomBase.gender) {
        const g = Array.isArray(randomBase.gender) ? randomBase.gender[0] : randomBase.gender;
        baseGender = g.toLowerCase();
    }

    const newPartIndices: Record<string, number> = {};
    for (const slot of PART_SLOTS) {
        const items = apiParts.filter(p => {
            if (p.slot !== slot) return false;
            if (!p.gender) return true;
            const itemGenders = Array.isArray(p.gender) 
                ? p.gender.map((g: string) => g.toLowerCase())
                : [p.gender.toLowerCase()];
            if (itemGenders.includes('unisex') || itemGenders.includes('all')) return true;
            return itemGenders.includes(baseGender);
        });

        // Add "None" for face slot
        const availableCount = slot === 'face' ? items.length + 1 : items.length;
        if (availableCount > 0) {
            newPartIndices[slot] = Math.floor(Math.random() * availableCount);
        }
    }

    if (baseGender === "female") {
      const bodyItems = apiParts.filter((p) => {
        if (p.slot !== "body") return false;
        if (!p.gender) return true;
        const itemGenders = Array.isArray(p.gender)
          ? p.gender.map((x: string) => x.toLowerCase())
          : [String(p.gender).toLowerCase()];
        if (itemGenders.includes("unisex") || itemGenders.includes("all")) return true;
        return itemGenders.includes(baseGender);
      });
      const bi = findFemaleDefaultBodyShopItemIndex(bodyItems);
      if (bi >= 0) newPartIndices.body = bi;
    }

    // 3. Pick random skin tone
    const randomSkin = SKIN_TONES[Math.floor(Math.random() * SKIN_TONES.length)].hex;

    // 4. Update states
    setSelectedBaseIndex(randomBaseIdx);
    setSelectedPartIndex(newPartIndices);
    setSkinTint(randomSkin);
    
    // Trigger feedback
    triggerSelectionFeedback();
  };

  const syntheticUser = useMemo(() => {
    const baseImage = selectedBase?.image_url;
    const baseSilhouette = selectedBase?.image_base_url;
    const cosmetics = [];

    if (selectedBase?.id) {
      cosmetics.push({
        id: `preview-base`,
        equipped: true,
        shop_items: selectedBase
      });
    }
    for (const slot of PART_SLOTS) {
      const idx = selectedPartIndex[slot] ?? 0;
      const item = partsBySlot[slot]?.[idx];
      if (item?.id) {
        cosmetics.push({
          id: `preview-${slot}`,
          equipped: true,
          shop_items: item
        });
      }
    }

    return {
      id: 'preview-user',
      name: 'Hunter',
      avatar_url: baseImage,
      base_body_url: baseImage,
      base_body_silhouette_url: baseSilhouette,
      base_body_tint_hex: skinTint,
      cosmetics: cosmetics as any,
      email: '',
      level: 1,
      exp: 0,
      coins: 0,
      gems: 0,
      current_class: 'none',
      gender: 'neutral',
      onboarding_completed: false,
      submittedIds: [],
      slotsUsed: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
      current_hp: 100,
      max_hp: 100,
      current_mp: 50,
      max_mp: 50,
    } as User;
  }, [selectedBase, selectedPartIndex, partsBySlot, skinTint]);

  const handleFinalize = async () => {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    navigation.navigate('ClassSelection', {
      avatarConfig: {
        ...syntheticUser,
        base_body_tint_hex: skinTint,
      }
    });
  };

  // Interpolate spin value
  const spin = spinValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg']
  });

  if (loading) {
    return (
      <View className="flex-1 bg-black items-center justify-center">
        <ActivityIndicator color="#06b6d4" size="large"/>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-black">
      <Video
        source={require('../../assets/Hologram.mp4')}
        style={[StyleSheet.absoluteFill, { opacity: 0.3 }]}
        resizeMode={ResizeMode.COVER}
        shouldPlay isLooping isMuted
      />
      <BlurView intensity={20} tint="dark" className="absolute inset-0" />
      
      <SafeAreaView className="flex-1">
        {/* --- NEW SYSTEM HUD HEADER --- */}
        <View style={styles.header}>
          <View>
            <View style={styles.statusRow}>
              <View style={styles.statusDot} />
              <Text style={styles.statusText}>SYSTEM_STATUS: ONLINE</Text>
            </View>
            <Text style={styles.modeText}>MODE: AVATAR_GEN</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <TouchableOpacity 
              onPress={handleRandomize}
              style={styles.randomBtn}
              activeOpacity={0.7}
            >
              <Dices size={14} color="#22d3ee" />
              <Text style={styles.randomText}>RANDOMIZE</Text>
            </TouchableOpacity>
            <Text style={styles.modeText}>LOCAL_NODE: 04</Text>
          </View>
        </View>

        {/* Main Content */}
        <View className="flex-1 justify-between">
          {/* Avatar Preview */}
          <View className="items-center mt-2">
            <Animated.View 
              className="items-center justify-center relative" 
              style={{ 
                  width: avatarSize, 
                  height: avatarSize,
                  transform: [{ scale: impactScale }] 
              }}
            >
              <Animated.Image 
                  source={RUNIC_CIRCLE}
                  className="absolute w-[170%] h-[170%] opacity-40"
                  resizeMode="contain"
                  style={{ 
                    transform: [{ rotate: spin }],
                    tintColor: '#22d3ee',
                  }}
                  blurRadius={Platform.OS === 'ios' ? 10 : 5}
              />
              <Animated.Image 
                  source={RUNIC_CIRCLE}
                  className="absolute w-[155%] h-[155%] opacity-70"
                  resizeMode="contain"
                  style={{ 
                    transform: [{ rotate: spin }],
                    shadowColor: '#22d3ee',
                    shadowOffset: { width: 0, height: 0 },
                    shadowOpacity: 0.8,
                    shadowRadius: 25,
                  }}
              />
              <LayeredAvatar 
                  user={syntheticUser} 
                  size={avatarSize} 
                  hideBackground 
                  square 
                  style={{ backgroundColor: 'transparent' }}
              />
              
              {/* Flash Overlay */}
              <Animated.View 
                pointerEvents="none"
                style={{
                  position: 'absolute',
                  top: 0, left: 0, right: 0, bottom: 0,
                  backgroundColor: 'rgba(56, 189, 248, 0.5)', // softer cyan
                  opacity: flashOpacity,
                  borderRadius: 16,
                  zIndex: 999
                }}
              />
            </Animated.View>
          </View>

          {/* Bottom Controls: Categories, Options, Finalize */}
          <View>
            {/* Skin Tone Selector (only when Base tab is active) */}
            {activeCategory === 'base' && (
              <View style={{ paddingHorizontal: 20, paddingVertical: 12, marginBottom: 15 }}>
                <Text style={styles.sectionLabel}>SKIN TONE RECALIBRATION</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ gap: 8, paddingHorizontal: 16, paddingVertical: 10, alignItems: 'center' }}
                >
                  {SKIN_TONES.map((tone) => (
                    <TouchableOpacity
                      key={tone.hex}
                      onPress={() => handleSkinSelect(tone.hex)}
                      style={[
                        styles.colorCircle,
                        { backgroundColor: tone.hex },
                        skinTint === tone.hex && styles.colorCircleActive
                      ]}
                    />
                  ))}
                </ScrollView>
              </View>
            )}
            {/* Category Tabs */}
            <View className="px-3 py-4 mt-2">
              <View className="flex-row justify-center gap-4" style={{ marginBottom: 20 }}>
                <CategoryBtn
                  label="Base"
                  iconSource={AVATAR_ICONS.Base}
                  active={activeCategory === 'base'}
                  onPress={() => setActiveCategory('base')}
                />
                <CategoryBtn
                  label={SLOT_LABELS['face_eyes']}
                  iconSource={AVATAR_ICONS.Eyes}
                  active={activeCategory === 'face_eyes'}
                  onPress={() => setActiveCategory('face_eyes')}
                />
                <CategoryBtn
                  label={SLOT_LABELS['face_mouth']}
                  iconSource={AVATAR_ICONS.Mouth}
                  active={activeCategory === 'face_mouth'}
                  onPress={() => setActiveCategory('face_mouth')}
                />
              </View>

              <View className="flex-row justify-center gap-4 mb-4">
                <CategoryBtn
                  label={SLOT_LABELS['hair']}
                  iconSource={AVATAR_ICONS.Hair}
                  active={activeCategory === 'hair'}
                  onPress={() => setActiveCategory('hair')}
                />
                <CategoryBtn
                  label={SLOT_LABELS['face']}
                  iconSource={AVATAR_ICONS.Face}
                  active={activeCategory === 'face'}
                  onPress={() => setActiveCategory('face')}
                />
                <CategoryBtn
                  label={SLOT_LABELS['body']}
                  iconSource={AVATAR_ICONS.Body}
                  active={activeCategory === 'body'}
                  onPress={() => setActiveCategory('body')}
                />
              </View>
            </View>

            {/* Options Grid */}
            <View className="h-32 bg-black/30 w-full justify-center">
                <BlurView intensity={30} tint="dark" className="absolute inset-0" />
                <ScrollView
                  horizontal
                  contentContainerStyle={{ paddingHorizontal: 10, gap: 10, alignItems: 'center' }}
                  showsHorizontalScrollIndicator={false}
                >
                {currentOptions.map((item, idx) => {
                    const isSelected = idx === currentSelectionIndex;
                return (
                    <TouchableOpacity 
                        key={item.id ?? idx} 
                        onPress={() => handleSelect(idx)}
                        style={[
                          styles.optionCard,
                          isSelected ? styles.optionCardSelected : styles.optionCardUnselected
                        ]}
                    >
                        {item.thumbnail_url || item.image_url ? (
                          <Image
                            source={{ uri: item.thumbnail_url || item.image_url }}
                            className="w-full h-full"
                            resizeMode="cover"
                          />
                        ) : (
                          <Text style={styles.noneText}>None</Text>
                        )}
                    </TouchableOpacity>
                    )
                })}
                </ScrollView>
            </View>

            {/* Footer / Finalize */}
            <View style={{ alignItems: 'center', paddingTop: 10, paddingBottom: 30 }}>
              <TouchableOpacity
                onPress={handleFinalize}
                activeOpacity={0.85}
                style={styles.finalizeBtn}
              >
                <Text style={styles.finalizeText}>CLASS SELECTION</Text>
                <ChevronRight size={16} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
}

function CategoryBtn({ label, iconSource, active, onPress }: { label: string; iconSource: ImageSourcePropType; active: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity 
      onPress={onPress}
      style={[
        styles.categoryBtn,
        active ? styles.categoryBtnActive : styles.categoryBtnInactive
      ]}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <Image
          source={iconSource}
          style={[styles.categoryIcon, { opacity: active ? 1 : 0.4 }]}
          resizeMode="contain"
        />
        <Text style={[
          styles.categoryBtnText,
          active ? { color: '#fff' } : { color: 'rgba(6, 182, 212, 0.4)' }
        ]}>{label}</Text>
      </View>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  header: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    paddingHorizontal: 20, 
    paddingVertical: 10, 
    zIndex: 10 
  },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  statusDot: { width: 6, height: 6, backgroundColor: '#06b6d4', borderRadius: 3 },
  statusText: { 
    color: 'rgba(34,211,238,0.7)', 
    fontSize: 10, 
    fontFamily: 'Exo2-Regular', 
    fontWeight: 'bold' 
  },
  modeText: { 
    color: 'rgba(255,255,255,0.4)', 
    fontSize: 10, 
    fontFamily: 'Exo2-Regular', 
    marginTop: 2 
  },
  technicalText: {
    color: '#fff',
    fontFamily: 'Exo2-Regular',
    fontWeight: 'bold',
    letterSpacing: 2,
    fontSize: 10,
  },
  categoryBtn: {
    minWidth: 100, // Increased width
    height: 40, // Reduced height
    marginHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: 4,
  },
  categoryBtnActive: {
    backgroundColor: 'rgba(6, 182, 212, 0.2)',
    borderColor: '#22d3ee',
  },
  categoryBtnInactive: {
    backgroundColor: 'rgba(10, 16, 26, 0.8)',
    borderColor: 'rgba(26, 42, 64, 0.5)',
  },
  categoryIcon: {
    width: 30,
    height: 30,
  },
  categoryBtnText: {
    fontSize: 9,
    fontFamily: 'Exo2-Regular',
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  optionCard: {
    width: 80,
    height: 80,
    borderRadius: 4,
    borderWidth: 1,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionCardSelected: {
    borderColor: '#ffffff',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    shadowColor: '#ffffff',
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 10,
  },
  optionCardUnselected: {
    borderColor: 'rgba(34, 211, 238, 0.2)',
    backgroundColor: 'rgba(17, 24, 39, 0.6)',
  },
  noneText: {
    color: '#06b6d4',
    fontSize: 10,
    fontFamily: 'Exo2-Regular',
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  sectionLabel: {
    color: '#06b6d4',
    fontSize: 10,
    fontFamily: 'Exo2-Regular',
    fontWeight: 'bold',
    marginBottom: 8,
    letterSpacing: 1,
  },
  colorCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  colorCircleActive: {
    borderWidth: 2,
    borderColor: '#fff',
    transform: [{ scale: 1.1 }],
  },
  finalizeBtn: {
    width: '90%',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderWidth: 1,
    borderColor: '#22d3ee',
    paddingVertical: 15,
    borderRadius: 2,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
  },
  finalizeText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 3,
  },
  randomBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(34, 211, 238, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(34, 211, 238, 0.3)',
    marginBottom: 4,
  },
  randomText: {
    color: '#22d3ee',
    fontSize: 9,
    fontFamily: 'Exo2-Regular',
    fontWeight: 'bold',
    letterSpacing: 1,
  },
});
