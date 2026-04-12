import React, { useRef, useImperativeHandle, forwardRef, useMemo, useEffect } from 'react';
import { View, Text, StyleSheet, Dimensions, Animated, Easing } from 'react-native';
import { Image, ImageSource } from 'expo-image';
import ViewShot from "react-native-view-shot";
import { GlitchText } from '@/components/GlitchText';
import { LayeredAvatar } from '@/components/LayeredAvatar';
import Svg, { Polyline } from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';
import polyline from '@mapbox/polyline';
import { User } from '@/types/user';

const { width: WINDOW_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = WINDOW_WIDTH * 0.96; // Restore width to show some screen background
const CARD_HEIGHT = CARD_WIDTH; // Keep square aspect ratio

// Use same avatar size as OptimizedAvatarModal so LayeredAvatar (and back/wing layers) render identically
const AVATAR_SIZE = WINDOW_WIDTH < 640 ? Math.min(WINDOW_WIDTH - 32, 450) : 512;

const AnimatedPolyline = Animated.createAnimatedComponent(Polyline);

interface EndingRunCardProps {
  runData: {
    distance: number;
    /** Moving time (seconds), excludes pauses */
    duration: number;
    /** Wall-clock time when pauses occurred */
    elapsedSeconds?: number;
    routeCoordinates?: Array<{ latitude: number; longitude: number }>;
    /** Google-encoded polyline (same as tracker / upload); decoded for mini-map when routeCoordinates omitted */
    encodedPolyline?: string;
    /** Free roam / scouting XP (1 per 10 m) */
    xpEarned?: number;
  };
  user: User;
  missionName?: string;
  dungeonImage?: ImageSource;
  animate?: boolean;
  variant?: 'full' | 'minimal' | 'sticker' | 'party_sticker';
  /** Pass so LayeredAvatar can render hand grip for equipped weapon */
  allShopItems?: any[];
  partyMembers?: User[];
}

export const EndingRunCard = forwardRef(({ 
  runData, 
  user, 
  missionName, 
  dungeonImage, 
  animate = false, 
  variant = 'full', 
  allShopItems = [],
  partyMembers = []
}: EndingRunCardProps, ref) => {
  const shotRef = useRef<ViewShot>(null);
  const pulseAnim = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    if (animate) {
      // Pulse animation for tracker
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 0.8,
            duration: 2000,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 0.4,
            duration: 2000,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(0.4);
    }
  }, [animate, pulseAnim]);

  // Allow the parent screen to trigger the screenshot
  useImperativeHandle(ref, () => ({
    capture: async () => {
      if (shotRef.current && typeof shotRef.current.capture === 'function') {
        return await shotRef.current.capture();
      }
      return null;
    }
  }));

  // Format Data
  const distanceKm = (Math.ceil((runData.distance / 1000) * 10) / 10).toFixed(1) + ' km';
  
  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };
  const timeStr = formatTime(runData.duration);
  const elapsed =
    runData.elapsedSeconds != null &&
    Number.isFinite(runData.elapsedSeconds) &&
    runData.elapsedSeconds > runData.duration + 5
      ? formatTime(Math.floor(runData.elapsedSeconds))
      : null;

  // Calculate Pace (min/km)
  const paceVal = runData.distance > 0 ? (runData.duration / 60) / (runData.distance / 1000) : 0;
  const paceMin = Math.floor(paceVal);
  const paceSec = Math.round((paceVal - paceMin) * 60);
  const paceStr = `${paceMin}'${paceSec.toString().padStart(2, '0')}" /km`;

  /** Build lat/lng path for mini-map: explicit points, or decode from encodedPolyline (matches RunPolylineMap). */
  const routePointsForMiniMap = useMemo(() => {
    const downsample = (pts: { latitude: number; longitude: number }[]) => {
      if (pts.length <= 280) return pts;
      const step = Math.ceil(pts.length / 280);
      const out: { latitude: number; longitude: number }[] = [];
      for (let i = 0; i < pts.length; i += step) out.push(pts[i]);
      const last = pts[pts.length - 1];
      const lastOut = out[out.length - 1];
      if (
        lastOut.latitude !== last.latitude ||
        lastOut.longitude !== last.longitude
      ) {
        out.push(last);
      }
      return out;
    };

    if (runData.routeCoordinates && runData.routeCoordinates.length >= 2) {
      return downsample(runData.routeCoordinates);
    }
    if (runData.encodedPolyline && runData.encodedPolyline.length > 0) {
      const raw = polyline.decode(runData.encodedPolyline, 5);
      const pts = raw.map(([latitude, longitude]: [number, number]) => ({ latitude, longitude }));
      return pts.length >= 2 ? downsample(pts) : null;
    }
    return null;
  }, [runData.routeCoordinates, runData.encodedPolyline]);

  // Convert Route to SVG Points
  const svgRoute = useMemo(() => {
    const coords = routePointsForMiniMap;
    if (!coords || coords.length < 2) return "100,125 150,110 200,130 250,115"; // Subtle placeholder so you can see it's working

    let minLat = coords[0].latitude;
    let maxLat = coords[0].latitude;
    let minLon = coords[0].longitude;
    let maxLon = coords[0].longitude;

    coords.forEach(c => {
      if (c.latitude < minLat) minLat = c.latitude;
      if (c.latitude > maxLat) maxLat = c.latitude;
      if (c.longitude < minLon) minLon = c.longitude;
      if (c.longitude > maxLon) maxLon = c.longitude;
    });

    const padding = 40;
    const width = 350 - padding * 2;
    const height = 250 - padding * 2;
    
    // Check for zero dimension (single point or straight line edge cases)
    const latSpan = maxLat - minLat || 0.0001;
    const lonSpan = maxLon - minLon || 0.0001;

    return coords.map(c => {
      const x = padding + ((c.longitude - minLon) / lonSpan) * width;
      const y = padding + (1 - (c.latitude - minLat) / latSpan) * height; // Invert Y for latitude
      return `${x},${y}`;
    }).join(' ');
  }, [routePointsForMiniMap]);

  // 1. STANDARD LAYOUT (Full & Minimal)
  const renderStandard = () => (
    <View style={styles.card}>
      <View style={styles.avatarBackgroundContainer}>
        <View style={{ width: AVATAR_SIZE, height: AVATAR_SIZE, position: 'absolute', left: (CARD_HEIGHT - AVATAR_SIZE) / 2, top: (CARD_HEIGHT - AVATAR_SIZE) / 2, transform: [{ scale: CARD_HEIGHT / AVATAR_SIZE }] }}>
          <LayeredAvatar user={user} size={AVATAR_SIZE} square={true} allShopItems={allShopItems} hideBackground={false} />
        </View>
        <LinearGradient colors={['rgba(0,0,0,0.1)', 'rgba(0,0,0,0.3)', 'rgba(0,0,0,0.80)']} style={StyleSheet.absoluteFill} />
      </View>
      {(variant === 'full' || variant === 'sticker') && (
        <View style={styles.characterInfo}>
          <Text style={styles.characterName}>{user.hunter_name || user.name}</Text>
          {user.hunter_rank && <Text style={styles.characterRank}>RANK {user.hunter_rank}</Text>}
        </View>
      )}
      {(variant === 'full' || variant === 'sticker') && (
        <View style={styles.titleContainer}>
          <Text style={styles.title}>MISSION COMPLETE</Text>
          {missionName && <GlitchText text={missionName} style={styles.missionName} color="#22d3ee" />}
        </View>
      )}
      <Image source={require('../../assets/icons/groupleveling-logo.png')} style={styles.logo} contentFit="contain" />
      <View style={[styles.bottomSection, variant === 'minimal' && styles.bottomSectionMinimal]}>
        <View style={styles.footerContainer}>
          <View style={styles.statsColumn}>
            <View style={styles.statsContainer}>
              <View style={styles.dataItem}><Text style={styles.dataLabel}>DISTANCE</Text><Text style={styles.dataValue}>{distanceKm}</Text></View>
              <View style={styles.dataItem}><Text style={styles.dataLabel}>PACE</Text><Text style={styles.dataValue}>{paceStr}</Text></View>
              <View style={styles.dataItem}>
                <Text style={styles.dataLabel}>MOVING</Text>
                <Text style={styles.dataValue}>{timeStr}</Text>
                {elapsed ? <Text style={styles.dataElapsedHint}>Elapsed {elapsed}</Text> : null}
              </View>
            </View>
            {runData.xpEarned != null && !Number.isNaN(Number(runData.xpEarned)) ? (
              <View style={styles.xpEarnedRow}>
                <Text style={styles.dataLabel}>XP EARNED</Text>
                <Text style={styles.dataValue}>{Math.round(Number(runData.xpEarned))}</Text>
              </View>
            ) : null}
          </View>
          <View style={styles.miniMapContainer}>
            <Image source={require('../../assets/missionmap.webp')} style={styles.miniMapBackground} />
            <Svg height="100%" width="100%" viewBox="0 0 350 250">
              <AnimatedPolyline points={svgRoute} fill="none" stroke="rgba(34, 211, 238, 0.4)" strokeWidth="12" strokeLinecap="round" strokeLinejoin="round" opacity={pulseAnim as any} />
              <Polyline points={svgRoute} fill="none" stroke="#22d3ee" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
            </Svg>
          </View>
        </View>
      </View>
    </View>
  );

  // 2. TRANSPARENT STICKER LAYOUT
  const renderSticker = () => (
    <View style={styles.transparentCard} collapsable={false}>
      {/* Wrapper to control overlap without breaking the ViewShot bounding box */}
      <View style={styles.stickerAvatarWrapper}>
        <LayeredAvatar user={user} size={CARD_WIDTH * 0.70} square={true} allShopItems={allShopItems} hideBackground={true} />
      </View>
      
      <View style={styles.stickerStatsBox}>
        <Text style={styles.stickerTitle}>MISSION CLEARED</Text>
        <Image source={require('../../assets/icons/groupleveling-logo.png')} style={styles.logoSticker} contentFit="contain" />
        <View style={styles.stickerDataRow}>
          <View style={styles.stickerDataItem}><Text style={styles.stickerDataLabel}>DISTANCE</Text><Text style={styles.stickerDataValue}>{distanceKm}</Text></View>
          <View style={styles.stickerDataItem}><Text style={styles.stickerDataLabel}>PACE</Text><Text style={styles.stickerDataValue}>{paceStr}</Text></View>
          <View style={styles.stickerDataItem}><Text style={styles.stickerDataLabel}>MOVING</Text><Text style={styles.stickerDataValue}>{timeStr}</Text></View>
        </View>
        {runData.xpEarned != null && !Number.isNaN(Number(runData.xpEarned)) ? (
          <View style={styles.stickerXpRow}>
            <Text style={styles.stickerDataLabel}>XP</Text>
            <Text style={styles.stickerDataValue}>{Math.round(Number(runData.xpEarned))}</Text>
          </View>
        ) : null}
      </View>
    </View>
  );

  // 3. PARTY COLLAGE STICKER LAYOUT
  const renderPartySticker = () => {
    const members = partyMembers && partyMembers.length > 0 ? partyMembers : [user];
    // Scale avatar size based on count. 1-2 = large, 3+ = smaller grid
    const avatarSize = members.length <= 2 ? CARD_WIDTH * 0.55 : CARD_WIDTH * 0.40;
    
    return (
      <View style={styles.transparentCard} collapsable={false}>
        <View style={[
          styles.partyAvatarContainer, 
          members.length > 2 && styles.partyAvatarGrid
        ]}>
          {members.map((member, idx) => (
            <View 
              key={member.id + idx} 
              style={[
                styles.partyAvatarWrapper, 
                members.length === 2 && { 
                  marginLeft: idx === 0 ? 0 : -avatarSize * 0.25,
                  zIndex: 10 - idx 
                },
                members.length > 2 && {
                   margin: -avatarSize * 0.1,
                   zIndex: idx % 2 === 0 ? 5 : 6
                }
              ]}
            >
              <LayeredAvatar user={member} size={avatarSize} square={true} allShopItems={allShopItems} hideBackground={true} />
            </View>
          ))}
        </View>
        
        <View style={styles.stickerStatsBox}>
          <Text style={styles.stickerTitle}>PARTY MISSION CLEARED</Text>
          <Image source={require('../../assets/icons/groupleveling-logo.png')} style={styles.logoSticker} contentFit="contain" />
          <View style={styles.stickerDataRow}>
            <View style={styles.stickerDataItem}><Text style={styles.stickerDataLabel}>DISTANCE</Text><Text style={styles.stickerDataValue}>{distanceKm}</Text></View>
            <View style={styles.stickerDataItem}><Text style={styles.stickerDataLabel}>PACE</Text><Text style={styles.stickerDataValue}>{paceStr}</Text></View>
            <View style={styles.stickerDataItem}><Text style={styles.stickerDataLabel}>MOVING</Text><Text style={styles.stickerDataValue}>{timeStr}</Text></View>
          </View>
          {runData.xpEarned != null && !Number.isNaN(Number(runData.xpEarned)) ? (
            <View style={styles.stickerXpRow}>
              <Text style={styles.stickerDataLabel}>XP</Text>
              <Text style={styles.stickerDataValue}>{Math.round(Number(runData.xpEarned))}</Text>
            </View>
          ) : null}
        </View>
      </View>
    );
  };

  return (
    <ViewShot ref={shotRef} options={{ format: "png", quality: 1, result: "tmpfile" }}>
      {variant === 'sticker' && renderSticker()}
      {variant === 'party_sticker' && renderPartySticker()}
      {(variant === 'full' || variant === 'minimal') && renderStandard()}
    </ViewShot>
  );
});

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#000', 
    borderRadius: 16,
    overflow: 'hidden',
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    justifyContent: 'space-between',
    alignItems: 'center', // Center logo horizontally
    position: 'relative',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  cardSticker: {
    backgroundColor: 'transparent',
    borderWidth: 0,
    justifyContent: 'center',
  },
  avatarBackgroundContainer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: -2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#020617',
    overflow: 'hidden',
  },
  characterInfo: {
    position: 'absolute',
    top: 10,
    right: 10,
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 2,
  },
  characterName: {
    color: '#FFF',
    fontSize: 7,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1,
    opacity: 0.8,
    marginRight: 6,
  },
  characterRank: {
    color: '#22d3ee',
    fontSize: 7,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 1,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  titleContainer: {
    paddingTop: 50, // Use paddingTop to push content down from the top edge
    alignItems: 'center',
    zIndex: 1,
  },
  title: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '900',
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 3,
    fontStyle: 'italic',
    textShadowColor: 'rgba(34, 211, 238, 0.6)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  missionName: {
    marginTop: 4,
    color: '#22d3ee',
    fontSize: 14,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  logo: {
    width: 100,
    height: 30,
    opacity: 0.8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
    position: 'absolute',
    bottom: 78, // Position it from the bottom
    alignSelf: 'center', // Center it horizontally
  },
  logoSticker: {
    width: 100,
    height: 30,
    opacity: 0.8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
    marginBottom: 10,
    alignSelf: 'center',
  },
  bottomSection: {
    width: '100%',
    zIndex: 1,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  bottomSectionMinimal: {
    justifyContent: 'flex-end',
    flex: 1,
  },
  footerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center', // Vertically center stats and map
    width: '100%',
  },
  statsColumn: {
    flex: 1,
    marginRight: 15,
    alignItems: 'flex-end',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  dataItem: {
    alignItems: 'center', // Center label and value
    marginLeft: 20, // Space between stat items
  },
  dataLabel: {
    color: '#94a3b8', 
    fontSize: 9,
    fontWeight: '800',
    textTransform: 'uppercase',
    marginBottom: 4,
    letterSpacing: 1,
  },
  dataValue: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
    textShadowColor: 'rgba(0,0,0,0.7)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  dataElapsedHint: {
    color: '#64748b',
    fontSize: 8,
    fontWeight: '700',
    marginTop: 2,
    letterSpacing: 0.5,
  },
  miniMapContainer: {
    width: 60,
    height: 60,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(34, 211, 238, 0.3)',
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  miniMapBackground: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
  transparentCard: { 
    width: CARD_WIDTH, 
    minHeight: CARD_HEIGHT + 80, // 🔥 FORCES the ViewShot to capture the bottom stats
    backgroundColor: 'transparent', 
    alignItems: 'center', 
    justifyContent: 'center', 
    paddingBottom: 40, // Breathing room for the shadow
  },
  stickerAvatarWrapper: {
    zIndex: 2,
    marginBottom: -30, // We pull the avatar down over the box, instead of pulling the box up!
  },
  stickerStatsBox: { 
    padding: 20, 
    paddingTop: 35, // Extra padding at the top since the avatar covers it
    width: CARD_WIDTH * 0.9, 
    alignItems: 'center', 
    zIndex: 1, 
  },
  stickerTitle: { color: '#22d3ee', fontSize: 16, fontWeight: '900', fontStyle: 'italic', letterSpacing: 2, marginBottom: 15, textShadowColor: 'rgba(0,0,0,0.8)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 4 },
  stickerDataRow: { flexDirection: 'row', justifyContent: 'center', gap: 20, width: '100%' },
  stickerXpRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    marginTop: 10,
    width: '100%',
  },
  xpEarnedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 8,
  },
  stickerDataItem: { alignItems: 'center' },
  stickerDataLabel: { color: '#94a3b8', fontSize: 10, fontWeight: '800', letterSpacing: 1, marginBottom: 4 },
  stickerDataValue: { color: '#FFF', fontSize: 18, fontWeight: '900', fontVariant: ['tabular-nums'], textShadowColor: 'rgba(0,0,0,0.8)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3 },
  partyAvatarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
    marginBottom: -40,
    width: '100%',
  },
  partyAvatarGrid: {
    flexWrap: 'wrap',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  partyAvatarWrapper: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 15,
  },
});
