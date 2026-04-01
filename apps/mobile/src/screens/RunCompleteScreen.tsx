import React, { useRef, useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Modal, Pressable, ScrollView, Dimensions } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import * as Sharing from 'expo-sharing';
import { EndingRunCard } from '@/components/EndingRunCard';
import { useAuth } from '@/contexts/AuthContext';
import { useAudio } from '@/contexts/AudioContext';
import { useGameData } from '@/hooks/useGameData';
import { supabase } from '@/lib/supabase';
import { DialogueScene } from '@/components/DialogueScene';
import { ChestOpeningModal } from '@/components/modals/ChestOpeningModal';

const { width: WINDOW_WIDTH } = Dimensions.get('window');

const CAVE_OF_SHADOWS_DEMO = {
  runData: {
    distance: 10000,
    duration: 55 * 60 + 33,
    routeCoordinates: [] as Array<{ latitude: number; longitude: number }>,
    elevationGain: 180,
    timeToTargetSeconds: 52 * 60 + 10,
  },
  dungeon: {
    id: '425dc861-6ce0-4ef3-bde3-79c71ae47f8e', name: 'Cave of Shadows', difficulty: 'E-Rank',
    tier: '5k', target_distance_meters: 5000, xp_reward: 500, coin_reward: 100,
    boss: 'Shadow Stalker', requirement: '5km',
    image_url: 'https://eydnmdgxyqrwfrecoylb.supabase.co/storage/v1/object/public/Dungeons/dungeon-images/centralpark.jpg',
  },
};

export default function RunCompleteScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  
  // Refs for 4 cards
  const cardRef = useRef<any>(null);
  const cardMinimalRef = useRef<any>(null);
  const cardStickerRef = useRef<any>(null);
  const cardPartyStickerRef = useRef<any>(null);
  
  const runRecordedRef = useRef(false);
  const [sharing, setSharing] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const { user, setUser } = useAuth();
  const { shopItems } = useGameData();
  const { stopBackgroundMusic } = useAudio();

  // RNG Event States
  const [isScanning, setIsScanning] = useState(false);
  const [rngEvent, setRngEvent] = useState<any>(null);
  const [showDialogue, setShowDialogue] = useState(false);
  const [showChest, setShowChest] = useState(false);
  const [chestType, setChestType] = useState<'small' | 'silver' | 'medium' | 'large'>('small');
  const [partySize, setPartySize] = useState(1);
  const [partyMembers, setPartyMembers] = useState<any[]>([]);

  const { runData: paramRunData, dungeon: paramDungeon, demo, isInParty = false } = route.params || {};
  const isDemo = demo === true;
  const runData = isDemo ? CAVE_OF_SHADOWS_DEMO.runData : paramRunData;
  const dungeon = isDemo ? CAVE_OF_SHADOWS_DEMO.dungeon : paramDungeon;

  useEffect(() => {
    if (isDemo || !paramRunData || !paramDungeon || !user?.id || runRecordedRef.current) return;
    runRecordedRef.current = true;

    const targetMeters = Number(paramDungeon.target_distance_meters) || 5000;
    const distanceMeters = Math.round(Number(paramRunData.distance) || 0);
    const durationSeconds = Math.round(Number(paramRunData.duration) || 0);
    const elevationGainMeters = Math.max(0, Math.round(Number(paramRunData.elevationGain) || 0));
    const rawTimeToTarget =
      paramRunData.timeToTargetSeconds != null && !Number.isNaN(Number(paramRunData.timeToTargetSeconds))
        ? Math.round(Number(paramRunData.timeToTargetSeconds))
        : null;

    // Be slightly lenient with distance (allow completion at 99% of target)
    // This helps with rounding issues or GPS jitter near the finish line
    const completed = distanceMeters >= (targetMeters * 0.99);
    const timeToTargetForDb = completed ? (rawTimeToTarget ?? durationSeconds) : null;

    const recordRunAndFetchEvent = async () => {
      console.log(`[RunComplete] Recording run: user=${user.id} dungeon=${paramDungeon.id} distance=${distanceMeters} duration=${durationSeconds} completed=${completed}`);
      
      const { error: runError } = await supabase.from('dungeon_runs').insert({
        user_id: user.id,
        dungeon_id: paramDungeon.id,
        distance_meters: distanceMeters,
        duration_seconds: durationSeconds,
        completed,
        elevation_gain_meters: elevationGainMeters,
        time_to_target_seconds: timeToTargetForDb,
      });
      
      if (runError) {
        console.error('[RunComplete] Failed to record dungeon run:', runError);
        // Reset ref so it can retry if the user navigates back/forth or if we add a retry button
        runRecordedRef.current = false;
        return;
      }
      
      console.log('[RunComplete] Dungeon run recorded successfully');

      if (completed && (paramDungeon.xp_reward || paramDungeon.coin_reward)) {
        const xp = Number(paramDungeon.xp_reward) || 0;
        const coins = Number(paramDungeon.coin_reward) || 0;
        
        console.log(`[RunComplete] Claiming rewards: xp=${xp} coins=${coins}`);
        
        const { data: profile, error: profileFetchError } = await supabase.from('profiles').select('exp, coins').eq('id', user.id).single();
        
        if (profileFetchError) {
          console.error('[RunComplete] Failed to fetch profile for rewards:', profileFetchError);
        } else if (profile) {
          const newExp = (Number(profile.exp) || 0) + xp;
          const newCoins = (Number(profile.coins) || 0) + coins;
          
          const { error: profileUpdateError } = await supabase.from('profiles').update({ exp: newExp, coins: newCoins }).eq('id', user.id);
          
          if (profileUpdateError) {
            console.error('[RunComplete] Failed to update profile rewards:', profileUpdateError);
          } else {
            setUser?.({ ...user, exp: newExp, coins: newCoins });
            console.log('[RunComplete] Profile rewards updated successfully');
          }
        }
        
        const { error: activityError } = await supabase.from('activities').insert({
          hunter_id: user.id, name: paramDungeon.name || 'Dungeon', type: 'dungeon',
          distance: distanceMeters, elapsed_time: durationSeconds, xp_earned: xp, coins_earned: coins, claimed: true,
        });
        
        if (activityError) {
          console.error('[RunComplete] Failed to record activity:', activityError);
        } else {
          console.log('[RunComplete] Activity recorded successfully');
        }
      }

      // RNG event (dialogue/chest) only when mission was completed (distance met)
      if (completed) {
        setIsScanning(true);
        try {
          let currentPartySize = 1;
          if (isInParty && user.current_party_id) {
            const { data: members, error: membersError } = await supabase
              .from('party_members')
              .select(`
                hunter_id,
                profiles:hunter_id (
                  id, 
                  hunter_name, 
                  avatar, 
                  level, 
                  hunter_rank,
                  cosmetics:user_cosmetics(
                    id,
                    equipped,
                    shop_item_id,
                    shop_items:shop_item_id(*)
                  )
                )
              `)
              .eq('party_id', user.current_party_id);

            if (!membersError && members) {
              currentPartySize = members.length;
              const formattedMembers = members.map((m: any) => ({
                ...m.profiles,
                name: m.profiles.hunter_name // Map hunter_name to name for EndingRunCard
              }));
              setPartyMembers(formattedMembers);
            }
          }
          setPartySize(currentPartySize);

          const lckBonus = (user.lck_stat || 10) / 100;
          const eventChance = 0.3 + (partySize * 0.05) + lckBonus;
          const roll = Math.random();

          if (roll < eventChance) {
            const typeRoll = Math.random();
            if (typeRoll < 0.7) {
              const { data: nodes } = await supabase.from('world_map_nodes').select('*').eq('is_random_event', true);
              if (nodes && nodes.length > 0) {
                const node = nodes[Math.floor(Math.random() * nodes.length)];
                setRngEvent({ type: node.interaction_type === 'BATTLE' ? 'BATTLE' : 'SCENE', data: node });
                setShowDialogue(true);
              }
            } else {
              const rarityRoll = Math.random();
              let selectedRarity: 'small' | 'silver' | 'medium' | 'large' = 'small';
              if (rarityRoll > 0.95) selectedRarity = 'large';
              else if (rarityRoll > 0.8) selectedRarity = 'medium';
              else if (rarityRoll > 0.5) selectedRarity = 'silver';
              setChestType(selectedRarity);
              setShowChest(true);
            }
          }
        } catch (err) {
          console.error('Error in RNG logic:', err);
        } finally {
          setIsScanning(false);
        }
      }
    };

    recordRunAndFetchEvent();
  }, [isDemo, paramRunData, paramDungeon, user, setUser]);

  useEffect(() => {
    stopBackgroundMusic();
  }, [stopBackgroundMusic]);
  
  if (!runData || !dungeon || !user) {
      return (
          <View style={styles.container}>
              <Text style={{ color: 'white' }}>Error: Run data missing.</Text>
              <TouchableOpacity onPress={() => navigation.navigate('Home')}>
                  <Text style={{ color: '#22d3ee', marginTop: 20 }}>Return Home</Text>
              </TouchableOpacity>
          </View>
      );
  }

  // --- EXPO GO SAFE SHARE LOGIC ---
  const handleShare = async () => {
    setSharing(true);
    try {
      let activeRef;

      if (activeIndex === 0) activeRef = cardRef;
      else if (activeIndex === 1) activeRef = cardMinimalRef;
      else if (activeIndex === 2) activeRef = cardStickerRef;
      else activeRef = cardPartyStickerRef;

      const uri = await activeRef.current?.capture();
      if (!uri) throw new Error("Failed to capture image");

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri);
      }
    } catch (e) {
      console.error(e);
      alert('Failed to share card');
    } finally {
      setSharing(false);
    }
  };

  const onScroll = (event: any) => {
    const slide = Math.round(event.nativeEvent.contentOffset.x / WINDOW_WIDTH);
    if (slide !== activeIndex) {
      setActiveIndex(slide);
    }
  };

  const getVariantForIndex = (index: number): 'full' | 'minimal' | 'sticker' | 'party_sticker' => {
    if (index === 0) return 'full';
    if (index === 1) return 'minimal';
    if (index === 2) return 'sticker';
    return 'party_sticker';
  };

  return (
    <View style={styles.container}>
      {isScanning && (
        <View style={styles.scanningOverlay}>
          <ActivityIndicator size="large" color="#00e5ff" />
          <Text style={styles.scanningText}>SCANNING SURROUNDINGS...</Text>
        </View>
      )}

      {showDialogue && rngEvent && (
        <Modal visible={showDialogue} transparent animationType="fade">
          <DialogueScene
            visible={showDialogue}
            nodeName={rngEvent.data?.name || "Random Event"}
            backgroundUrl={rngEvent.data?.modal_image_url || rngEvent.data?.image_url}
            npcSpriteUrl={rngEvent.data?.icon_url}
            dialogueScript={rngEvent.data?.interaction_data?.script || []}
            interactionType={rngEvent.type}
            onClose={() => setShowDialogue(false)}
            onBattleStart={() => {
              setShowDialogue(false);
              navigation.navigate('Battle', { 
                encounterId: rngEvent.data?.encounter_id,
                isBoss: rngEvent.data?.interaction_data?.is_boss || false,
                partySize: partySize
              });
            }}
          />
        </Modal>
      )}

      <ChestOpeningModal
        isOpen={showChest}
        chestType={chestType}
        onAnimationComplete={() => setShowChest(false)}
      />

      {/* THE 3-CARD CAROUSEL */}
      <View style={styles.carouselContainer}>
        <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false} onScroll={onScroll} scrollEventThrottle={16}>
          {/* Slide 0: Full */}
          <View style={styles.slide}>
            <Pressable onPress={() => setIsModalVisible(true)}>
              <EndingRunCard ref={cardRef} runData={runData} user={user} missionName={dungeon.name} variant="full" dungeonImage={{ uri: dungeon.image_url }} allShopItems={shopItems} />
            </Pressable>
          </View>

          {/* Slide 1: Minimal */}
          <View style={styles.slide}>
            <Pressable onPress={() => setIsModalVisible(true)}>
              <EndingRunCard ref={cardMinimalRef} runData={runData} user={user} missionName={dungeon.name} variant="minimal" dungeonImage={{ uri: dungeon.image_url }} allShopItems={shopItems} />
            </Pressable>
          </View>

          {/* Slide 2: Sticker (Transparent) */}
          <View style={styles.slide}>
            <Pressable onPress={() => setIsModalVisible(true)}>
              <View style={styles.stickerPreviewBackground}>
                <EndingRunCard
                  ref={cardStickerRef}
                  runData={runData}
                  user={user}
                  missionName={dungeon.name}
                  variant="sticker"
                  dungeonImage={{ uri: dungeon.image_url }}
                  allShopItems={shopItems}
                />
              </View>
            </Pressable>
          </View>

          {/* Slide 3: Party Sticker (Transparent Collage) - Only if party exists */}
          {partyMembers.length > 0 && (
            <View style={styles.slide}>
              <Pressable onPress={() => setIsModalVisible(true)}>
                <View style={styles.stickerPreviewBackground}>
                  <EndingRunCard
                    ref={cardPartyStickerRef}
                    runData={runData}
                    user={user}
                    missionName={dungeon.name}
                    variant="party_sticker"
                    partyMembers={partyMembers}
                    dungeonImage={{ uri: dungeon.image_url }}
                    allShopItems={shopItems}
                  />
                </View>
              </Pressable>
            </View>
          )}
        </ScrollView>

        <View style={styles.pagination}>
          {[0, 1, 2, ...(partyMembers.length > 0 ? [3] : [])].map((i) => (
            <View key={i} style={[styles.dot, activeIndex === i && styles.activeDot]} />
          ))}
        </View>
        
        <Text style={styles.tapHint}>SWIPE FOR VARIANT • TAP TO VIEW</Text>
      </View>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.shareBtn} onPress={handleShare} disabled={sharing}>
            {sharing ? <ActivityIndicator color="#0f172a" /> : <Text style={styles.shareText}>{activeIndex >= 2 ? "SHARE STICKER" : "SHARE CARD"}</Text>}
        </TouchableOpacity>

        <TouchableOpacity style={styles.homeBtn} onPress={() => navigation.navigate('Home')}>
          <Text style={styles.homeText}>RETURN TO BASE</Text>
        </TouchableOpacity>
      </View>

      <Modal visible={isModalVisible} transparent={false} animationType="fade" onRequestClose={() => setIsModalVisible(false)}>
        <Pressable style={styles.modalContainer} onPress={() => setIsModalVisible(false)}>
          <View style={[styles.modalContent, activeIndex >= 2 && styles.stickerPreviewBackground]}>
             <EndingRunCard 
              runData={runData} user={user} missionName={dungeon.name} animate={true}
              variant={getVariantForIndex(activeIndex)}
              partyMembers={partyMembers}
              dungeonImage={{ uri: dungeon.image_url }} allShopItems={shopItems}
            />
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#020617', alignItems: 'center', justifyContent: 'center' },
  scanningOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(2,6,23,0.9)', zIndex: 50, justifyContent: 'center', alignItems: 'center' },
  scanningText: { color: '#00e5ff', marginTop: 15, fontWeight: '900', letterSpacing: 2 },
  carouselContainer: { height: WINDOW_WIDTH + 100, width: WINDOW_WIDTH },
  slide: { width: WINDOW_WIDTH, alignItems: 'center', justifyContent: 'center' },
  pagination: { flexDirection: 'row', justifyContent: 'center', marginTop: 20, gap: 8 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#334155' },
  activeDot: { backgroundColor: '#22d3ee', width: 12 },
  footer: { marginTop: 20, width: '80%', gap: 15 },
  shareBtn: { backgroundColor: '#22d3ee', paddingVertical: 16, borderRadius: 12, alignItems: 'center' },
  shareText: { color: '#0f172a', fontWeight: '900', fontSize: 16, letterSpacing: 1 },
  homeBtn: { paddingVertical: 16, alignItems: 'center' },
  homeText: { color: '#64748b', fontWeight: 'bold' },
  tapHint: { color: '#94a3b8', fontSize: 10, fontWeight: '800', textAlign: 'center', marginTop: 15, letterSpacing: 2, opacity: 0.6 },
  modalContainer: { flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' },
  modalContent: { alignItems: 'center' },
  stickerPreviewBackground: { 
    // Adds a subtle checkerboard or gray box behind the transparent sticker in the UI preview 
    // so it doesn't just disappear against the dark app background
    backgroundColor: '#0f172a', 
    borderRadius: 16, 
    borderWidth: 1, 
    borderColor: '#334155', 
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center'
  },
  stickerPreviewText: {
    color: '#22d3ee', fontSize: 12, fontWeight: '900', letterSpacing: 1
  },
  stickerHelpBox: {
    position: 'absolute',
    bottom: 15,
    backgroundColor: 'rgba(0,0,0,0.6)',
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
    width: '85%',
    zIndex: 10,
  },
  stickerHelpText: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 4,
  }
});