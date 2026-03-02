import React, { useRef, useImperativeHandle, forwardRef, useMemo, useEffect } from 'react';
import { View, Text, StyleSheet, Dimensions, Animated, Easing } from 'react-native';
import { Image, ImageSource } from 'expo-image';
import ViewShot from "react-native-view-shot";
import { GlitchText } from '@/components/GlitchText';
import { LayeredAvatar } from '@/components/LayeredAvatar';
import Svg, { Polyline } from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';
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
    duration: number;
    routeCoordinates?: Array<{ latitude: number; longitude: number }>;
  };
  user: User;
  missionName?: string;
  dungeonImage?: ImageSource;
  animate?: boolean;
  variant?: 'full' | 'minimal';
  /** Pass so LayeredAvatar can render hand grip for equipped weapon */
  allShopItems?: any[];
}

export const EndingRunCard = forwardRef(({ runData, user, missionName, dungeonImage, animate = false, variant = 'full', allShopItems = [] }: EndingRunCardProps, ref) => {
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
  const distanceKm = (runData.distance / 1000).toFixed(2) + ' km';
  
  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };
  const timeStr = formatTime(runData.duration);

  // Calculate Pace (min/km)
  const paceVal = runData.distance > 0 ? (runData.duration / 60) / (runData.distance / 1000) : 0;
  const paceMin = Math.floor(paceVal);
  const paceSec = Math.round((paceVal - paceMin) * 60);
  const paceStr = `${paceMin}'${paceSec.toString().padStart(2, '0')}" /km`;

  // Convert Route to SVG Points
  const svgRoute = useMemo(() => {
    const coords = runData.routeCoordinates;
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
  }, [runData.routeCoordinates]);

  return (
    <ViewShot ref={shotRef} options={{ format: "png", quality: 0.9 }}>
      <View style={styles.card}>
        {/* Full-Card Avatar Background: render at AVATAR_SIZE for correct layers, scale up to fill card */}
        <View style={styles.avatarBackgroundContainer}>
          <View
            style={{
              width: AVATAR_SIZE,
              height: AVATAR_SIZE,
              position: 'absolute',
              left: (CARD_HEIGHT - AVATAR_SIZE) / 2,
              top: (CARD_HEIGHT - AVATAR_SIZE) / 2,
              transform: [{ scale: CARD_HEIGHT / AVATAR_SIZE }],
            }}
          >
            <LayeredAvatar
              user={user}
              size={AVATAR_SIZE}
              square={true}
              allShopItems={allShopItems}
            />
          </View>
          {/* Subtle gradient to make bottom text really pop */}
          <LinearGradient
            colors={['rgba(0,0,0,0.1)', 'rgba(0,0,0,0.3)', 'rgba(0,0,0,0.80)']}
            style={StyleSheet.absoluteFill}
          />
        </View>

        {/* Character Info (Top Right) */}
        {variant === 'full' && (
          <View style={styles.characterInfo}>
            <Text style={styles.characterName}>{user.hunter_name || user.name}</Text>
            {user.hunter_rank && <Text style={styles.characterRank}>RANK {user.hunter_rank}</Text>}
          </View>
        )}

        {/* Card Title */}
        {variant === 'full' && (
          <View style={styles.titleContainer}>
            <Text style={styles.title}>MISSION COMPLETE</Text>
            {missionName && (
              <GlitchText 
                text={missionName}
                style={styles.missionName}
                color="#22d3ee"
              />
            )}
          </View>
        )}

        {/* Logo - Stays centered */}
        <Image 
          source={require('../../assets/icons/groupleveling-logo.png')} 
          style={styles.logo}
          contentFit="contain"
        />

        {/* Footer with Stats and Map */}
        <View style={[styles.bottomSection, variant === 'minimal' && styles.bottomSectionMinimal]}>
          <View style={styles.footerContainer}>
            {/* Stats on the left */}
            <View style={styles.statsContainer}>
              <View style={styles.dataItem}>
                <Text style={styles.dataLabel}>DISTANCE</Text>
                <Text style={styles.dataValue}>{distanceKm}</Text>
              </View>
              <View style={styles.dataItem}>
                <Text style={styles.dataLabel}>PACE</Text>
                <Text style={styles.dataValue}>{paceStr}</Text>
              </View>
              <View style={styles.dataItem}>
                <Text style={styles.dataLabel}>TIME</Text>
                <Text style={styles.dataValue}>{timeStr}</Text>
              </View>
            </View>

            {/* Mini-map on the right */}
            <View style={styles.miniMapContainer}>
              <Image 
                source={require('../../assets/missionmap.webp')} 
                style={styles.miniMapBackground} 
              />
              <Svg height="100%" width="100%" viewBox="0 0 350 250">
                <AnimatedPolyline
                  points={svgRoute}
                  fill="none"
                  stroke="rgba(34, 211, 238, 0.4)"
                  strokeWidth="12"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  opacity={pulseAnim as any}
                />
                <Polyline
                  points={svgRoute}
                  fill="none"
                  stroke="#22d3ee"
                  strokeWidth="4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </Svg>
            </View>
          </View>
        </View>
    </View>
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
  statsContainer: {
    flexDirection: 'row',
    flex: 1,
    justifyContent: 'flex-end', // Push stats to the right towards the map
    marginRight: 15, // Gap between stats and map
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
});
