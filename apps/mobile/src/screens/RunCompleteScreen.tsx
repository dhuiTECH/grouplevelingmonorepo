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

// Hardcoded Cave of Shadows 5K card for social share (demo mode)
const CAVE_OF_SHADOWS_DEMO = {
  runData: {
    distance: 7000, // 7 km
    duration: 39 * 60 + 35, // 39:35, 5:39/km pace
    routeCoordinates: [],
  },
  dungeon: {
    id: '425dc861-6ce0-4ef3-bde3-79c71ae47f8e',
    name: 'Cave of Shadows',
    difficulty: 'E-Rank',
    tier: '5k',
    target_distance_meters: 5000,
    xp_reward: 500,
    coin_reward: 100,
    boss: 'Shadow Stalker',
    requirement: '5km',
    image_url: 'https://eydnmdgxyqrwfrecoylb.supabase.co/storage/v1/object/public/Dungeons/dungeon-images/centralpark.jpg',
  },
};

export default function RunCompleteScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const cardRef = useRef<any>(null);
  const cardMinimalRef = useRef<any>(null);
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

  // Data passed from the Tracker, or demo mode for share card
  const { runData: paramRunData, dungeon: paramDungeon, demo, isInParty = false } = route.params || {};
  const isDemo = demo === true;
  const runData = isDemo ? CAVE_OF_SHADOWS_DEMO.runData : paramRunData;
  const dungeon = isDemo ? CAVE_OF_SHADOWS_DEMO.dungeon : paramDungeon;

  // Record dungeon run to Supabase (special instances / leaderboard) — skip in demo
  useEffect(() => {
    if (isDemo || !paramRunData || !paramDungeon || !user?.id || runRecordedRef.current) return;
    runRecordedRef.current = true;

    const targetMeters = Number(paramDungeon.target_distance_meters) || 5000;
    const distanceMeters = Math.round(Number(paramRunData.distance) || 0);
    const durationSeconds = Math.round(Number(paramRunData.duration) || 0);
    const completed = distanceMeters >= targetMeters;

    const recordRunAndFetchEvent = async () => {
      // 1. Record the run
      const { error: runError } = await supabase.from('dungeon_runs').insert({
        user_id: user.id,
        dungeon_id: paramDungeon.id,
        distance_meters: distanceMeters,
        duration_seconds: durationSeconds,
        completed,
      });
      if (runError) {
        console.error('Failed to record dungeon run:', runError);
      }

      if (completed && (paramDungeon.xp_reward || paramDungeon.coin_reward)) {
        const xp = Number(paramDungeon.xp_reward) || 0;
        const coins = Number(paramDungeon.coin_reward) || 0;
        
        // Basic update - the RPC will handle the real multiplier logic if an event triggers
        const { data: profile } = await supabase.from('profiles').select('exp, coins').eq('id', user.id).single();
        if (profile) {
          const newExp = (Number(profile.exp) || 0) + xp;
          const newCoins = (Number(profile.coins) || 0) + coins;
          await supabase.from('profiles').update({ exp: newExp, coins: newCoins }).eq('id', user.id);
          setUser?.({ ...user, exp: newExp, coins: newCoins });
        }
        await supabase.from('activities').insert({
          hunter_id: user.id,
          name: paramDungeon.name || 'Dungeon',
          type: 'dungeon',
          distance: distanceMeters,
          elapsed_time: durationSeconds,
          xp_earned: xp,
          coins_earned: coins,
          claimed: true,
        });
      }

      // 2. Fetch RNG Event (Option B: Direct Supabase Fetch)
      setIsScanning(true);
          try {
            // Calculate Party Bonus
            let currentPartySize = 1;
            if (isInParty && user.current_party_id) {
              const { count } = await supabase
                .from('party_members')
                .select('*', { count: 'exact', head: true })
                .eq('party_id', user.current_party_id);
              currentPartySize = count || 1;
            }
            setPartySize(currentPartySize);

            const lckBonus = (user.lck_stat || 10) / 100;
        const eventChance = 0.3 + (partySize * 0.05) + lckBonus; 
        const roll = Math.random();

        if (roll < eventChance) {
          const typeRoll = Math.random();
          
          if (typeRoll < 0.7) {
            // 70% chance: World Node Scene (Random Event from world_map_nodes)
            const { data: nodes } = await supabase
              .from('world_map_nodes')
              .select('*')
              .eq('is_random_event', true);
            
            if (nodes && nodes.length > 0) {
              const node = nodes[Math.floor(Math.random() * nodes.length)];
              setRngEvent({
                type: node.interaction_type === 'BATTLE' ? 'BATTLE' : 'SCENE',
                data: node
              });
              setShowDialogue(true);
            }
          } else {
            // 30% chance: Chest
            const rarities: ('small' | 'silver' | 'medium' | 'large')[] = ['small', 'silver', 'medium', 'large'];
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
    };

    recordRunAndFetchEvent();
  }, [isDemo, paramRunData, paramDungeon, user, setUser]);

  useEffect(() => {
    // Kill music when on the ending card
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

  // --- SHARE LOGIC ---
  const handleShare = async () => {
    setSharing(true);
    try {
      // 1. Take Screenshot of active card
      const ref = activeIndex === 0 ? cardRef : cardMinimalRef;
      const uri = await ref.current?.capture();
      
      // 2. Open Native Share Dialog
      if (uri && await Sharing.isAvailableAsync()) {
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

  return (
    <View style={styles.container}>
      {/* RNG Scanning Overlay */}
      {isScanning && (
        <View style={styles.scanningOverlay}>
          <ActivityIndicator size="large" color="#00e5ff" />
          <Text style={styles.scanningText}>SCANNING SURROUNDINGS...</Text>
        </View>
      )}

      {/* RNG DIALOGUE SCENE */}
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

      {/* Chest Modal */}
      <ChestOpeningModal
        isOpen={showChest}
        chestType={chestType}
        onAnimationComplete={() => {
          setShowChest(false);
          // Maybe refresh user stats or show toast here
        }}
      />

      {/* THE CARDS SCROLLABLE */}
      <View style={styles.carouselContainer}>
        <ScrollView
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onScroll={onScroll}
          scrollEventThrottle={16}
        >
          <View style={styles.slide}>
            <Pressable 
              onPress={() => setIsModalVisible(true)}
            >
              <EndingRunCard 
                ref={cardRef} 
                runData={runData} 
                user={user} 
                missionName={dungeon.name}
                variant="full"
                dungeonImage={{ uri: dungeon.image_url }}
                allShopItems={shopItems}
              />
            </Pressable>
          </View>

          <View style={styles.slide}>
            <Pressable 
              onPress={() => setIsModalVisible(true)}
            >
              <EndingRunCard 
                ref={cardMinimalRef} 
                runData={runData} 
                user={user} 
                missionName={dungeon.name}
                variant="minimal"
                dungeonImage={{ uri: dungeon.image_url }}
                allShopItems={shopItems}
              />
            </Pressable>
          </View>
        </ScrollView>

        <View style={styles.pagination}>
          <View style={[styles.dot, activeIndex === 0 && styles.activeDot]} />
          <View style={[styles.dot, activeIndex === 1 && styles.activeDot]} />
        </View>
        
        <Text style={styles.tapHint}>SWIPE FOR VARIANT • TAP TO VIEW</Text>
      </View>

      {/* CONTROLS */}
      <View style={styles.footer}>
        <TouchableOpacity style={styles.shareBtn} onPress={handleShare} disabled={sharing}>
            {sharing ? <ActivityIndicator color="#0f172a" /> : <Text style={styles.shareText}>SHARE CARD</Text>}
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.homeBtn} 
          onPress={() => navigation.navigate('Home')} 
        >
          <Text style={styles.homeText}>RETURN TO BASE</Text>
        </TouchableOpacity>
      </View>

      {/* ANIMATED POPUP MODAL */}
      <Modal
        visible={isModalVisible}
        transparent={false}
        animationType="fade"
        onRequestClose={() => setIsModalVisible(false)}
      >
        <Pressable 
          style={styles.modalContainer}
          onPress={() => setIsModalVisible(false)}
        >
          <View style={styles.modalContent}>
             <EndingRunCard 
              runData={runData} 
              user={user} 
              missionName={dungeon.name}
              animate={true}
              variant={activeIndex === 0 ? 'full' : 'minimal'}
              dungeonImage={{ uri: dungeon.image_url }}
              allShopItems={shopItems}
            />
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#020617', alignItems: 'center', justifyContent: 'center' },
  carouselContainer: {
    height: WINDOW_WIDTH + 100,
    width: WINDOW_WIDTH,
  },
  slide: {
    width: WINDOW_WIDTH,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 20,
    gap: 8,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#334155',
  },
  activeDot: {
    backgroundColor: '#22d3ee',
    width: 12,
  },
  // title removed as it is now inside the card
  footer: { marginTop: 20, width: '80%', gap: 15 },
  shareBtn: { backgroundColor: '#22d3ee', paddingVertical: 16, borderRadius: 12, alignItems: 'center' },
  shareText: { color: '#0f172a', fontWeight: '900', fontSize: 16, letterSpacing: 1 },
  homeBtn: { paddingVertical: 16, alignItems: 'center' },
  homeText: { color: '#64748b', fontWeight: 'bold' },
  tapHint: {
    color: '#94a3b8',
    fontSize: 10,
    fontWeight: '800',
    textAlign: 'center',
    marginTop: 15,
    letterSpacing: 2,
    opacity: 0.6,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    alignItems: 'center',
  },
});
