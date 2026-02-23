import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Dimensions,
  ActivityIndicator,
  ScrollView,
  Platform
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MotiView, AnimatePresence } from 'moti';
import { Easing } from 'react-native-reanimated';
import { Video, ResizeMode } from 'expo-av';
import * as Haptics from 'expo-haptics';
import { ShopItemMedia } from './ShopItemMedia';
import { supabase } from '@/lib/supabase';
import { ShopItem } from '@/types/user';
import { playHunterSound } from '@/utils/audio';

// Assets
const coinIcon = require('../../assets/coinicon.png');
const gemIcon = require('../../assets/gemicon.png');
const gateImage = require('../../assets/gates.png'); 
const gachaIcon = require('../../assets/icons/gachapon.png');

const { width } = Dimensions.get('window');

interface GachaScreenProps {
  onSummon: (useGems: boolean, poolType: 'gate' | 'gachapon') => void;
  isSummoning: boolean;
  coins: number;
  gems: number;
}

export default function GachaScreen({ onSummon, isSummoning, coins, gems }: GachaScreenProps) {
  const [activePool, setActivePool] = useState<'gate' | 'gachapon'>('gate');
  const [theme, setTheme] = useState<any>(null);
  const [featuredAvatar, setFeaturedAvatar] = useState<ShopItem | null>(null);
  const [featuredItem, setFeaturedItem] = useState<ShopItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const handleSummon = (useGems: boolean) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    playHunterSound('click');
    onSummon(useGems, activePool);
  };

  useEffect(() => {
    async function fetchGachaData() {
      setIsLoading(true);
      try {
        const { data: themeData } = await supabase
          .from('gacha_collections')
          .select('*')
          .eq('is_active', true)
          .eq('pool_type', activePool)
          .maybeSingle();
        
        setTheme(themeData);

        if (themeData) {
          // 1. Fetch items linked via junction table
          const { data: junctionData } = await supabase
            .from('collection_items')
            .select('shop_item_id')
            .eq('collection_id', themeData.id);
          
          const junctionIds = junctionData?.map(d => d.shop_item_id) || [];

          // 2. Fetch all relevant items (direct column OR junction table)
          const { data: items } = await supabase
            .from('shop_items')
            .select('*')
            .or(`collection_id.eq.${themeData.id}${junctionIds.length > 0 ? `,id.in.(${junctionIds.join(',')})` : ''}`);
          
          const allItems = (items || []) as ShopItem[];
          
          // Prioritize Monarch, fallback to Legendary (Case-Insensitive)
          setFeaturedAvatar(
            allItems.find(i => i.slot === 'avatar' && i.rarity?.toLowerCase() === 'monarch') ||
            allItems.find(i => i.slot === 'avatar' && i.rarity?.toLowerCase() === 'legendary') ||
            null
          );

          setFeaturedItem(
            allItems.find(i => i.slot !== 'avatar' && i.rarity?.toLowerCase() === 'monarch') ||
            allItems.find(i => i.slot !== 'avatar' && i.rarity?.toLowerCase() === 'legendary') ||
            null
          );
        } else {
          setFeaturedAvatar(null);
          setFeaturedItem(null);
        }
      } catch (err) {
        console.error('Error fetching gacha data:', err);
      } finally {
        setIsLoading(false);
      }
    }
    fetchGachaData();
  }, [activePool]);

  const isAvatarMonarch = featuredAvatar?.rarity?.toLowerCase() === 'monarch';
  const isAvatarLegendary = featuredAvatar?.rarity?.toLowerCase() === 'legendary';
  const isItemMonarch = featuredItem?.rarity?.toLowerCase() === 'monarch';
  const isItemLegendary = featuredItem?.rarity?.toLowerCase() === 'legendary';
  const isAvatarPremium = isAvatarMonarch || isAvatarLegendary;
  const isItemPremium = isItemMonarch || isItemLegendary;

  return (
    <View style={styles.container}>
      {/* Global Hologram Overlay Texture */}
      <View style={styles.globalHologramOverlay} pointerEvents="none" />
      <View style={styles.gridDotsOverlay} pointerEvents="none" />

      {/* 1. TOP SELECTOR */}
      <View style={styles.poolTabs}>
        <TouchableOpacity
          onPress={() => setActivePool('gate')}
          activeOpacity={0.7}
          style={[
            styles.poolTab,
            activePool === 'gate' && styles.poolTabGateActive
          ]}
        >
          <Image 
            source={require('../../assets/icons/gachagates.png')} 
            style={[styles.poolTabIcon, activePool !== 'gate' && styles.dimmedIcon]} 
          />
          <Text style={[styles.poolTabText, activePool === 'gate' && styles.poolTabTextActive]}>
            GACHA GATES
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setActivePool('gachapon')}
          activeOpacity={0.7}
          style={[
            styles.poolTab,
            activePool === 'gachapon' && styles.poolTabGachaActive
          ]}
        >
          <Image 
            source={require('../../assets/icons/gachapon.png')} 
            style={[styles.poolTabIcon, activePool !== 'gachapon' && styles.dimmedIcon]} 
          />
          <Text style={[styles.poolTabText, activePool === 'gachapon' && styles.poolTabTextActive]}>
            GACHAPON
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* 2. HERO HEADER */}
        <View style={styles.bannerContainer}>
          <AnimatePresence exitBeforeEnter>
            <MotiView
              key={activePool}
              from={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ type: 'timing', duration: 600 }}
              style={StyleSheet.absoluteFill}
            >
              {theme?.cover_image_url?.endsWith('.mp4') ? (
                <Video
                  source={{ uri: theme.cover_image_url }}
                  style={styles.bannerImage}
                  resizeMode={ResizeMode.COVER}
                  shouldPlay
                  isLooping
                  isMuted
                />
              ) : (
                <Image
                  source={theme?.cover_image_url ? { uri: theme.cover_image_url } : gateImage}
                  style={styles.bannerImage}
                  resizeMode="cover"
                />
              )}
            </MotiView>
          </AnimatePresence>

          <LinearGradient
            colors={['transparent', 'rgba(13, 13, 18, 0.4)', 'rgba(13, 13, 18, 1)']}
            style={styles.bannerGradient}
          >
            <View style={styles.bannerTextContent}>
              <View style={styles.sectorRow}>
                <MotiView
                  from={{ opacity: 0.4, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ loop: true, type: 'timing', duration: 1000 }}
                  style={[styles.pingDot, { backgroundColor: activePool === 'gate' ? '#ef4444' : '#06b6d4' }]}
                />
                <Text style={[styles.sectorText, { color: activePool === 'gate' ? '#ef4444' : '#22d3ee' }]}>
                  {activePool === 'gate' ? 'SECTOR: GATE' : 'SECTOR: MATRIX'}
                </Text>
              </View>
              <Text style={styles.poolTitle}>{theme?.name || "Initializing..."}</Text>
              <Text style={styles.poolDescription} numberOfLines={2}>
                {theme?.description || "Accessing system data clusters..."}
              </Text>
            </View>
          </LinearGradient>
          
          {activePool === 'gate' && (
            <View style={styles.hudBadge}>
              <Text style={styles.hudLabel}>STATUS: <Text style={styles.hudValueActive}>ACTIVE_GATE</Text></Text>
              <Text style={styles.hudLoc}>LOC: 35.6895N / 139.6917E</Text>
            </View>
          )}
        </View>

        {/* 3. SUMMON KEYS */}
        <View style={styles.actionsContainer}>
          <TouchableOpacity
            onPress={() => handleSummon(false)}
            disabled={isSummoning || !theme}
            activeOpacity={0.8}
            style={styles.keyWrapper}
          >
            <LinearGradient
              colors={['#ef4444', '#991b1b']}
              style={styles.keyBorder}
            >
              <View style={styles.keyInner}>
                <Text style={styles.keyTitle}>GATES ENTRY</Text>
                <View style={styles.costContainer}>
                  <Image source={coinIcon} style={styles.costIcon} />
                  <Text style={styles.costValue}>500</Text>
                </View>
              </View>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => handleSummon(true)}
            disabled={isSummoning || !theme}
            activeOpacity={0.8}
            style={[styles.keyWrapper, styles.premiumKey]}
          >
            <LinearGradient
              colors={['#dc2626', '#450a0a']}
              style={styles.keyBorder}
            >
              <View style={styles.keyInner}>
                <MotiView
                  from={{ opacity: 0.1 }}
                  animate={{ opacity: 0.4 }}
                  transition={{ loop: true, type: 'timing', duration: 2000 }}
                  style={styles.keyPulse}
                />
                <Text style={[styles.keyTitle, { color: '#fee2e2' }]}>HIGHER SUMMON</Text>
                <View style={styles.costContainer}>
                  <Image source={gemIcon} style={styles.costIcon} />
                  <Text style={[styles.costValue, { color: '#dc2626' }]}>10</Text>
                </View>
              </View>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* 4. MANIFESTATION GRID */}
        <View style={styles.manifestationGrid}>
          {/* Avatar Module */}
          <View style={styles.moduleContainer}>
            <View style={styles.moduleLabelRow}>
              <View style={styles.moduleLine} />
              <Text style={styles.moduleLabel}>MONARCH AVATAR</Text>
              <View style={styles.moduleLine} />
            </View>

            <MotiView
              from={{ translateY: 0 }}
              animate={{ translateY: -12 }}
              transition={{ 
                loop: true, 
                type: 'timing', 
                duration: 3000, 
                easing: (t) => {
                  'worklet';
                  return Math.sin(t * Math.PI);
                }
              }}
              style={[
                styles.hologramCard,
                isAvatarMonarch && styles.monarchBorder,
                isAvatarLegendary && styles.legendaryBorder
              ]}
            >
              <View style={styles.scanline} />
              {isAvatarPremium && <View style={styles.goldSweep} />}
              
              <View style={styles.cornerTL} />
              <View style={styles.cornerBR} />

              <View style={styles.rarityBadge}>
                <Text style={styles.rarityText}>MONARCH TIER</Text>
              </View>

              <View style={styles.mediaContainer}>
                <ShopItemMedia 
                  item={featuredAvatar || { image_url: 'https://wyatvubfobfshqyfobqy.supabase.co/storage/v1/object/public/shop-items/NoobMan.png', name: 'Hunter' }} 
                  style={styles.media}
                />
              </View>

              <View style={styles.cardFooter}>
                <View style={styles.footerLine} />
                <Text style={styles.itemName} numberOfLines={1}>
                  {featuredAvatar?.name || '---'}
                </Text>
              </View>
            </MotiView>
          </View>

          {/* Gear Module */}
          <View style={styles.moduleContainer}>
            <View style={styles.moduleLabelRow}>
              <View style={styles.moduleLine} />
              <Text style={styles.moduleLabel}>LEGENDARY GEAR</Text>
              <View style={styles.moduleLine} />
            </View>

            <MotiView
              style={[
                styles.hologramCardSmall,
                isItemMonarch && styles.monarchBorder,
                isItemLegendary && styles.legendaryBorder
              ]}
            >
              <View style={styles.scanline} />
              
              <View style={styles.cornerTR} />
              <View style={styles.cornerBL} />

              <View style={styles.mediaContainerSmall}>
                <ShopItemMedia 
                  item={featuredItem || { image_url: 'https://wyatvubfobfshqyfobqy.supabase.co/storage/v1/object/public/shop-items/gemicon.png', name: 'Item' }} 
                  style={styles.media}
                />
              </View>

              <View style={styles.cardFooterSmall}>
                <View style={styles.footerLine} />
                <Text style={styles.itemNameSmall} numberOfLines={1}>
                  {featuredItem?.name || 'SCANNING...'}
                </Text>
                <Text style={[styles.manifestedLabel, isItemPremium && { color: '#eab308' }]}>
                  MANIFESTED GEAR
                </Text>
              </View>
            </MotiView>
          </View>
        </View>

        {/* 5. SYSTEM PROBABILITY FOOTER */}
        <View style={styles.probabilityFooter}>
          <View style={styles.ratesRow}>
            <Text style={[styles.rateText, { color: '#ef4444' }]}>MONARCH: 0.25%</Text>
            <Text style={[styles.rateText, { color: '#eab308' }]}>LEGENDARY: 1.0%</Text>
            <Text style={[styles.rateText, { color: '#a855f7' }]}>EPIC: 5.0%</Text>
          </View>
          <LinearGradient
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            colors={['transparent', 'rgba(255, 255, 255, 0.1)', 'transparent']}
            style={styles.footerDivider}
          />
        </View>
      </ScrollView>

      {/* Loading Overlay */}
      {isSummoning && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#22d3ee" />
          <Text style={styles.loadingText}>SUMMONING...</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0d0d12',
  },
  globalHologramOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    zIndex: 50,
  },
  gridDotsOverlay: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.05,
    zIndex: 0,
    // Note: Radial gradient for dots is hard in pure RN, usually an image or SVG is better.
    // For now we'll rely on the background color.
  },
  poolTabs: {
    flexDirection: 'row',
    padding: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderBottomWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    zIndex: 30,
  },
  poolTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    marginHorizontal: 4,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  poolTabGateActive: {
    backgroundColor: '#dc2626',
    borderColor: 'rgba(220, 38, 38, 0.4)',
    shadowColor: '#dc2626',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 5,
  },
  poolTabGachaActive: {
    backgroundColor: '#0891b2',
    borderColor: 'rgba(6, 182, 212, 0.4)',
    shadowColor: '#0891b2',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 5,
  },
  poolTabIcon: {
    width: 20,
    height: 20,
    resizeMode: 'contain',
  },
  dimmedIcon: {
    opacity: 0.5,
  },
  poolTabText: {
    fontSize: 9,
    fontWeight: '900',
    color: 'rgba(255, 255, 255, 0.4)',
    letterSpacing: 2,
  },
  poolTabTextActive: {
    color: '#fff',
  },
  scrollContent: {
    paddingBottom: 40,
  },
  bannerContainer: {
    height: 320,
    width: '100%',
    overflow: 'hidden',
    position: 'relative',
  },
  bannerImage: {
    width: '100%',
    height: '100%',
  },
  bannerGradient: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
    padding: 24,
    paddingBottom: 32,
  },
  bannerTextContent: {
    zIndex: 10,
  },
  sectorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  pingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  sectorText: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 4,
  },
  poolTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#fff',
    textTransform: 'uppercase',
    letterSpacing: -0.5,
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  poolDescription: {
    fontSize: 9,
    color: 'rgba(255, 255, 255, 0.5)',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: 10,
    maxWidth: 300,
    lineHeight: 14,
  },
  hudBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    padding: 6,
    borderRadius: 2,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    alignItems: 'flex-end',
  },
  hudLabel: {
    fontSize: 5,
    color: 'rgba(255, 255, 255, 0.4)',
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  hudValueActive: {
    color: '#ef4444',
  },
  hudLoc: {
    fontSize: 5,
    color: 'rgba(255, 255, 255, 0.2)',
    letterSpacing: 1,
    marginTop: 2,
  },
  actionsContainer: {
    flexDirection: 'row',
    gap: 16,
    paddingHorizontal: 24,
    marginTop: -28,
    zIndex: 20,
  },
  keyWrapper: {
    flex: 1,
    height: 56,
  },
  keyBorder: {
    flex: 1,
    padding: 1.5,
    borderRadius: 8,
  },
  keyInner: {
    flex: 1,
    backgroundColor: '#0d0d12',
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  premiumKey: {
    shadowColor: '#dc2626',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  keyPulse: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#dc2626',
  },
  keyTitle: {
    fontSize: 9,
    fontWeight: '900',
    color: '#fff',
    fontStyle: 'italic',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  costContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  costIcon: {
    width: 12,
    height: 12,
  },
  costValue: {
    fontSize: 10,
    fontWeight: '900',
    color: '#ef4444',
    letterSpacing: 1,
  },
  manifestationGrid: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
    paddingVertical: 40,
    paddingHorizontal: 16,
  },
  moduleContainer: {
    alignItems: 'center',
  },
  moduleLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  moduleLine: {
    height: 1,
    width: 16,
    backgroundColor: 'rgba(234, 179, 8, 0.2)',
  },
  moduleLabel: {
    fontSize: 7,
    fontWeight: '900',
    color: 'rgba(255, 255, 255, 0.3)',
    textTransform: 'uppercase',
    letterSpacing: 3,
    fontStyle: 'italic',
  },
  hologramCard: {
    width: 140,
    height: 220,
    backgroundColor: 'rgba(26, 26, 35, 0.8)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(234, 179, 8, 0.3)',
    padding: 12,
    alignItems: 'center',
    overflow: 'hidden',
  },
  hologramCardSmall: {
    width: 110,
    height: 160,
    backgroundColor: 'rgba(26, 26, 35, 0.8)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    padding: 12,
    alignItems: 'center',
    justifyContent: 'space-between',
    overflow: 'hidden',
  },
  monarchBorder: {
    borderColor: '#eab308',
    borderWidth: 2,
    shadowColor: '#eab308',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 15,
  },
  legendaryBorder: {
    borderColor: '#ffff00',
    borderWidth: 2,
    shadowColor: '#ffff00',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
  },
  scanline: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '20%',
    backgroundColor: 'rgba(234, 179, 8, 0.05)',
    zIndex: 2,
  },
  goldSweep: {
    position: 'absolute',
    top: 0,
    left: -100,
    width: 50,
    height: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    transform: [{ skewX: '-25deg' }],
  },
  mediaContainer: {
    width: '100%',
    height: 140,
    marginTop: 10,
  },
  mediaContainerSmall: {
    width: '100%',
    height: 80,
  },
  media: {
    width: '100%',
    height: '100%',
  },
  cardFooter: {
    width: '100%',
    alignItems: 'center',
    marginTop: 'auto',
    paddingBottom: 4,
  },
  cardFooterSmall: {
    width: '100%',
    alignItems: 'center',
  },
  footerLine: {
    height: 1,
    width: '100%',
    backgroundColor: 'rgba(234, 179, 8, 0.2)',
    marginBottom: 8,
  },
  itemName: {
    fontSize: 14,
    fontWeight: '900',
    color: '#eab308',
    fontStyle: 'italic',
    textTransform: 'uppercase',
    textAlign: 'center',
  },
  itemNameSmall: {
    fontSize: 9,
    fontWeight: '900',
    color: '#fff',
    textTransform: 'uppercase',
    textAlign: 'center',
  },
  manifestedLabel: {
    fontSize: 6,
    fontWeight: 'bold',
    color: '#06b6d4',
    textTransform: 'uppercase',
    letterSpacing: 2,
    marginTop: 4,
  },
  rarityBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: '#eab308',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 2,
    zIndex: 10,
  },
  rarityText: {
    fontSize: 6,
    fontWeight: '900',
    color: '#000',
  },
  cornerTL: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 16,
    height: 16,
    borderTopWidth: 2,
    borderLeftWidth: 2,
    borderColor: 'rgba(234, 179, 8, 0.5)',
  },
  cornerBR: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 16,
    height: 16,
    borderBottomWidth: 2,
    borderRightWidth: 2,
    borderColor: 'rgba(234, 179, 8, 0.5)',
  },
  cornerTR: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 12,
    height: 12,
    borderTopWidth: 1,
    borderRightWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  cornerBL: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    width: 12,
    height: 12,
    borderBottomWidth: 1,
    borderLeftWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  probabilityFooter: {
    marginTop: 20,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  ratesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    opacity: 0.4,
    marginBottom: 8,
  },
  rateText: {
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 2,
  },
  footerDivider: {
    height: 1,
    width: '100%',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
  },
  loadingText: {
    color: '#22d3ee',
    fontWeight: '900',
    marginTop: 16,
    letterSpacing: 2,
    fontSize: 10,
  },
});
