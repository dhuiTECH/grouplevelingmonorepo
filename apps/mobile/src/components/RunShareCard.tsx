import React, { useRef, useImperativeHandle, forwardRef } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import ViewShot from "react-native-view-shot";
import MapView, { Polyline, PROVIDER_GOOGLE } from '@/utils/maps';
import { LinearGradient } from 'expo-linear-gradient';
import { LayeredAvatar } from './LayeredAvatar';

const { width } = Dimensions.get('window');
const CARD_W = width * 0.85;
const CARD_H = CARD_W * 1.4; // Story Aspect Ratio

export const RunShareCard = forwardRef(({ runData, dungeon, user }: any, ref) => {
  const shotRef = useRef<ViewShot>(null);

  // Allow the parent screen to trigger the screenshot
  useImperativeHandle(ref, () => ({
    capture: async () => {
      return await shotRef.current?.capture();
    }
  }));

  // Center map on the run path
  const startPoint = runData.routeCoordinates[0] || { latitude: 0, longitude: 0 };

  return (
    <ViewShot ref={shotRef} options={{ format: "png", quality: 0.9 }}>
      <View style={styles.card}>
        
        {/* 1. BACKGROUND MAP */}
        <View style={styles.mapContainer}>
          <MapView
            provider={PROVIDER_GOOGLE}
            style={StyleSheet.absoluteFill}
            initialRegion={{
              latitude: startPoint.latitude,
              longitude: startPoint.longitude,
              latitudeDelta: 0.01,
              longitudeDelta: 0.01,
            }}
            customMapStyle={DARK_MAP_STYLE}
            scrollEnabled={false} // Static map
            zoomEnabled={false}
          >
            <Polyline 
              coordinates={runData.routeCoordinates} 
              strokeColor="#fbbf24" 
              strokeWidth={8} 
            />
          </MapView>
          {/* Dark Gradient Overlay for readability */}
          <LinearGradient 
            colors={['transparent', 'rgba(2, 6, 23, 0.95)']} 
            style={StyleSheet.absoluteFill} 
          />
        </View>

        {/* 2. THE AVATAR (Hero Shot) */}
        <View style={styles.avatarPos}>
            <LayeredAvatar user={user} size={200} />
        </View>

        {/* 3. STATS & BADGES */}
        <View style={styles.content}>
          <Text style={styles.missionComplete}>MISSION COMPLETE</Text>
          <Text style={styles.dungeonName}>{dungeon.name.toUpperCase()}</Text>

          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <Text style={styles.label}>DISTANCE</Text>
              <Text style={styles.value}>{(runData.distance / 1000).toFixed(2)}km</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.label}>TIME</Text>
              <Text style={styles.value}>
                {new Date(runData.duration * 1000).toISOString().substr(14, 5)}
              </Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.label}>XP</Text>
              <Text style={[styles.value, { color: '#fbbf24' }]}>+{dungeon.xp_reward}</Text>
            </View>
          </View>
        </View>

        {/* Branding */}
        <View style={styles.brandTag}>
            <Text style={styles.brandText}>FITNESS RPG</Text>
        </View>
      </View>
    </ViewShot>
  );
});

const styles = StyleSheet.create({
  card: { width: CARD_W, height: CARD_H, backgroundColor: '#0f172a', borderRadius: 24, overflow: 'hidden', borderWidth: 2, borderColor: '#334155', alignSelf: 'center' },
  mapContainer: { flex: 1 },
  avatarPos: { position: 'absolute', top: 80, alignSelf: 'center', zIndex: 10 },
  content: { position: 'absolute', bottom: 0, width: '100%', padding: 24, paddingBottom: 40 },
  missionComplete: { color: '#22d3ee', fontWeight: '900', fontSize: 12, letterSpacing: 2, marginBottom: 4, textAlign: 'center' },
  dungeonName: { color: 'white', fontWeight: '900', fontSize: 24, fontStyle: 'italic', marginBottom: 20, textAlign: 'center' },
  statsRow: { flexDirection: 'row', justifyContent: 'space-around', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 12, padding: 16 },
  statBox: { alignItems: 'center' },
  label: { color: '#94a3b8', fontSize: 10, fontWeight: 'bold' },
  value: { color: 'white', fontSize: 20, fontWeight: '900' },
  brandTag: { position: 'absolute', top: 20, left: 20, backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 4 },
  brandText: { color: 'white', fontWeight: '900', fontSize: 10, letterSpacing: 1 }
});

const DARK_MAP_STYLE = [
  { "elementType": "geometry", "stylers": [{ "color": "#242f3e" }] },
  { "elementType": "labels.text.fill", "stylers": [{ "color": "#746855" }] },
  { "featureType": "road", "elementType": "geometry", "stylers": [{ "color": "#38414e" }] }
];
