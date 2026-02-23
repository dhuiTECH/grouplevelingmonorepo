import React, { useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import MapView, { Polyline } from '@/utils/maps';
import { useRoute, useNavigation, useFocusEffect } from '@react-navigation/native';
import { useRunTracker } from '@/hooks/useRunTracker';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAudio } from '@/contexts/AudioContext';

const DungeonTrackerScreen = () => {
  const route = useRoute<any>();
  const navigation = useNavigation();
  const { dungeon } = route.params || {};
  const { stopBackgroundMusic, playTrack } = useAudio();
  
  const { 
    isTracking, 
    distance, 
    duration, 
    routeCoordinates, 
    startRun, 
    stopRun 
  } = useRunTracker();

  // Play "Beginning Map" music when entering the tracker screen
  useFocusEffect(
    useCallback(() => {
      if (!isTracking) {
        playTrack('Beginning Map');
      }
    }, [isTracking, playTrack])
  );

  // Stop music ONLY when tracking is initialized
  useEffect(() => {
    if (isTracking) {
      stopBackgroundMusic();
    }
  }, [isTracking, stopBackgroundMusic]);

  // Format duration (seconds -> MM:SS)
  const formatTime = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Calculate Pace (min/km)
  const paceVal = distance > 0 ? (duration / 60) / (distance / 1000) : 0;
  const paceMin = Math.floor(paceVal);
  const paceSec = Math.round((paceVal - paceMin) * 60);
  const paceStr = distance > 0 ? `${paceMin}'${paceSec.toString().padStart(2, '0')}"` : "--'--\"";

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>SYSTEM TRACKER</Text>
      </View>

      {/* MAP BACKGROUND */}
      <MapView
        style={styles.map}
        showsUserLocation
        followsUserLocation
        userInterfaceStyle="dark"
      >
        <Polyline 
          coordinates={routeCoordinates}
          strokeColor="#06b6d4" // Cyan color
          strokeWidth={4}
        />
      </MapView>

      {/* OVERLAY UI */}
      <LinearGradient
        colors={['transparent', 'rgba(2, 6, 23, 0.9)', '#020617']}
        style={styles.overlay}
      >
        <View style={styles.statsContainer}>
           <Text style={styles.dungeonName}>{dungeon?.name?.toUpperCase() || 'UNKNOWN ZONE'}</Text>
           <Text style={styles.objectiveText}>OBJECTIVE: RUN {dungeon?.target_distance_meters || 5000} METERS</Text>
           
           <View style={styles.statsRow}>
             <View style={styles.statBox}>
               <Text style={styles.label}>DISTANCE</Text>
               <Text style={styles.value}>{distance.toFixed(0)}<Text style={styles.unit}>m</Text></Text>
             </View>
             
             <View style={styles.divider} />

             <View style={styles.statBox}>
               <Text style={styles.label}>PACE</Text>
               <Text style={styles.value}>{paceStr}</Text>
             </View>

             <View style={styles.divider} />

             <View style={styles.statBox}>
               <Text style={styles.label}>TIME</Text>
               <Text style={styles.value}>{formatTime(duration)}</Text>
             </View>
           </View>

           {!isTracking ? (
             <TouchableOpacity style={styles.btnStart} onPress={startRun}>
               <Text style={styles.btnText}>INITIALIZE TRACKING</Text>
             </TouchableOpacity>
           ) : (
             <TouchableOpacity style={styles.btnStop} onPress={() => {
                const report = stopRun();
                console.log("Run Report:", report);
                // Navigate to RunComplete with the data
                navigation.navigate('RunComplete', { 
                  runData: report, 
                  dungeon: dungeon 
                });
             }}>
               <Text style={styles.btnText}>COMPLETE MISSION</Text>
             </TouchableOpacity>
           )}
        </View>
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#020617',
  },
  header: {
    position: 'absolute',
    top: 50,
    left: 0,
    right: 0,
    zIndex: 10,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  backButton: {
    padding: 8,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 20,
    marginRight: 15,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 2,
  },
  map: {
    flex: 1,
  },
  overlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingTop: 40,
    paddingBottom: 40,
    paddingHorizontal: 20,
  },
  statsContainer: {
    alignItems: 'center',
  },
  dungeonName: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: 1,
    marginBottom: 5,
    textShadowColor: 'rgba(6, 182, 212, 0.5)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  objectiveText: {
    color: '#94a3b8',
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 2,
    marginBottom: 30,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 40,
    width: '100%',
    justifyContent: 'space-around',
  },
  statBox: {
    alignItems: 'center',
    flex: 1,
  },
  divider: {
    width: 1,
    height: 30,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  label: {
    color: '#64748b',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1,
    marginBottom: 5,
  },
  value: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
  },
  unit: {
    fontSize: 14,
    color: '#64748b',
  },
  btnStart: {
    backgroundColor: '#06b6d4',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 8,
    width: '100%',
    alignItems: 'center',
    shadowColor: '#06b6d4',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
  },
  btnStop: {
    backgroundColor: '#ef4444',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 8,
    width: '100%',
    alignItems: 'center',
    shadowColor: '#ef4444',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
  },
  btnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 2,
  },
});

export default DungeonTrackerScreen;
