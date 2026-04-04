import React, { useEffect, useCallback, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Platform,
} from 'react-native';
import MapView, { Polyline } from '@/utils/maps';
import { useRoute, useNavigation, useFocusEffect } from '@react-navigation/native';
import { useBackgroundRunRecorder } from '@/hooks/useBackgroundRunRecorder';
import { uploadRun } from '@/lib/runUpload';
import { insertFreeHuntFromRecordingSession } from '@/lib/freeHuntUpload';
import { readRecordingPathCoordinates } from '@/lib/readRecordingPath';
import { resetRecordingSession } from '@/lib/runRecordingDb';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAudio } from '@/contexts/AudioContext';
import { InviteFriendsModal } from '@/components/modals/InviteFriendsModal';
import { Users } from 'lucide-react-native';

const DungeonTrackerScreen = () => {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { dungeon, mode } = route.params || {};
  const isFreeRun = mode === 'free_run';
  const { stopBackgroundMusic, playTrack } = useAudio();

  const [inviteModalVisible, setInviteModalVisible] = useState(false);
  const [uploading, setUploading] = useState(false);
  const autoStartCancelledRef = useRef(false);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [livePathCoords, setLivePathCoords] = useState<{ latitude: number; longitude: number }[]>([]);

  const {
    isRecording: isTracking,
    distance,
    duration,
    startRecording: startRun,
    stopRecording: stopRun,
  } = useBackgroundRunRecorder();

  /** One immediate start + one delayed retry; then inline error + Try again (native only). */
  useEffect(() => {
    if (Platform.OS === 'web') return;
    if (isTracking) {
      setGpsError(null);
      return;
    }
    if (autoStartCancelledRef.current) return;

    let cancelled = false;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;

    async function attemptStart() {
      if (autoStartCancelledRef.current) return;
      const ok = await startRun();
      if (cancelled || autoStartCancelledRef.current) return;
      if (ok) {
        setGpsError(null);
        return;
      }
      retryTimer = setTimeout(async () => {
        if (cancelled || autoStartCancelledRef.current) return;
        const ok2 = await startRun();
        if (cancelled || autoStartCancelledRef.current) return;
        if (ok2) {
          setGpsError(null);
          return;
        }
        setGpsError(
          'Could not start GPS. Allow location access and background location (Always) in system settings, then tap Try again.'
        );
      }, 1500);
    }

    setGpsError(null);
    void attemptStart();

    return () => {
      cancelled = true;
      if (retryTimer) clearTimeout(retryTimer);
    };
  }, [isTracking, startRun]);

  /** Poll SQLite for recorded points while scouting (MVP; see plan for future hook-based path). */
  useEffect(() => {
    if (!isFreeRun || Platform.OS === 'web' || !isTracking) {
      if (!isTracking) setLivePathCoords([]);
      return;
    }
    let cancelled = false;
    const tick = async () => {
      const rows = await readRecordingPathCoordinates();
      if (!cancelled) {
        setLivePathCoords(rows.map((r) => ({ latitude: r.lat, longitude: r.lng })));
      }
    };
    void tick();
    const id = setInterval(() => {
      void tick();
    }, 1000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [isFreeRun, isTracking]);

  const onRetryGps = useCallback(() => {
    setGpsError(null);
    void (async () => {
      const ok = await startRun();
      if (ok) setGpsError(null);
      else
        setGpsError(
          'Could not start GPS. Allow location access and background location (Always) in system settings, then tap Try again.'
        );
    })();
  }, [startRun]);

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
        <TouchableOpacity
          onPress={() => {
            autoStartCancelledRef.current = true;
            navigation.goBack();
          }}
          style={styles.backButton}
        >
          <Ionicons name="chevron-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {isFreeRun ? 'Scouting for Mana...' : 'SYSTEM TRACKER'}
        </Text>
        <View style={styles.headerRight}>
          <TouchableOpacity
            style={styles.headerIconBtn}
            onPress={() => setInviteModalVisible(true)}
            activeOpacity={0.85}
            accessibilityLabel="Party invites"
          >
            <Users size={20} color="#22d3ee" />
          </TouchableOpacity>
          {dungeon ? (
            <TouchableOpacity
              style={styles.headerLeaderboardBtn}
              onPress={() => {
                navigation.navigate('DungeonLeaderboard', { dungeon });
              }}
              activeOpacity={0.85}
              accessibilityLabel="Open leaderboard for this gate"
            >
              <Image
                source={require('../../assets/icons/goldtrophy.png')}
                style={styles.headerLeaderboardIcon}
              />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      {/* MAP BACKGROUND */}
      <MapView
        style={styles.map}
        showsUserLocation
        followsUserLocation={isTracking}
        userInterfaceStyle="dark"
      >
        {Platform.OS !== 'web' && isFreeRun && livePathCoords.length >= 2 ? (
          <Polyline
            coordinates={livePathCoords}
            strokeColor="rgba(34, 211, 238, 0.92)"
            strokeWidth={4}
            lineCap="round"
            lineJoin="round"
          />
        ) : null}
      </MapView>

      {/* OVERLAY UI */}
      <LinearGradient
        colors={['transparent', 'rgba(2, 6, 23, 0.9)', '#020617']}
        style={styles.overlay}
      >
        <View style={styles.statsContainer}>
           <Text style={styles.dungeonName}>
             {isFreeRun ? 'FREE ROAM' : dungeon?.name?.toUpperCase() || 'UNKNOWN ZONE'}
           </Text>
           <Text style={styles.objectiveText}>
             {isFreeRun
               ? isTracking
                 ? 'SCOUTING — YOUR PATH IS DRAWN ON THE MAP'
                 : gpsError
                   ? 'GPS COULD NOT START'
                   : 'RUN ANYWHERE — MANA FLOWS WHERE YOU MOVE'
               : isTracking
                 ? 'RECORDING — END RUN WHEN FINISHED'
                 : gpsError
                   ? 'GPS COULD NOT START'
                   : 'OBJECTIVE: RECORD A ROUTE — WE WILL MATCH YOU TO A GLOBAL DUNGEON'}
           </Text>
           
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
             gpsError ? (
               <View style={styles.gpsErrorBlock}>
                 <Text style={styles.gpsErrorText}>{gpsError}</Text>
                 <TouchableOpacity style={styles.gpsRetryBtn} onPress={onRetryGps} activeOpacity={0.9}>
                   <Text style={styles.gpsRetryBtnText}>TRY AGAIN</Text>
                 </TouchableOpacity>
               </View>
             ) : (
               <View style={styles.autoStartRow}>
                 <ActivityIndicator size="small" color="#22d3ee" />
                 <Text style={styles.autoStartText}>
                   {Platform.OS === 'web'
                     ? 'Recording requires the mobile app'
                     : 'Connecting GPS…'}
                 </Text>
               </View>
             )
           ) : (
             <TouchableOpacity
               style={[styles.btnStop, uploading && styles.btnDisabled]}
               disabled={uploading}
               onPress={async () => {
                 if (uploading) return;
                 setUploading(true);
                 try {
                   const report = await stopRun();
                   if (isFreeRun) {
                     const insert = await insertFreeHuntFromRecordingSession();
                     navigation.navigate('RunComplete', {
                       runData: {
                         ...report,
                         distance: insert.distanceMeters,
                         xpEarned: insert.xpEarned,
                         encodedPolyline: insert.encodedPolyline,
                         recordedViaGlobalEngine: false,
                       },
                       mode: 'free_run',
                     });
                   } else {
                     const upload = await uploadRun(report.duration);
                     navigation.navigate('RunComplete', {
                       runData: {
                         ...report,
                         encodedPolyline: upload.encodedPolyline,
                         recordedViaGlobalEngine: true,
                       },
                       dungeon,
                       matchResult: { matchedDungeonId: upload.matchedDungeonId },
                     });
                   }
                 } catch (e) {
                   console.error('[DungeonTracker] upload failed', e);
                   alert(e instanceof Error ? e.message : 'Failed to upload run');
                   if (isFreeRun) {
                     try {
                       await resetRecordingSession();
                     } catch {
                       /* ignore */
                     }
                   }
                 } finally {
                   setUploading(false);
                 }
               }}
             >
               {uploading ? (
                 <ActivityIndicator color="#fff" />
               ) : (
                 <Text style={styles.btnText}>{isFreeRun ? 'END SCOUT RUN' : 'END RUN & UPLOAD'}</Text>
               )}
             </TouchableOpacity>
           )}
        </View>
      </LinearGradient>

      <InviteFriendsModal 
        visible={inviteModalVisible}
        onClose={() => setInviteModalVisible(false)}
        dungeonId={dungeon?.id}
      />
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
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  backButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 22,
  },
  headerTitle: {
    flex: 1,
    marginHorizontal: 6,
    textAlign: 'center',
    fontFamily: 'Exo2-Regular',
    color: '#22d3ee',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.9)',
    borderWidth: 1,
    borderColor: 'rgba(34, 211, 238, 0.35)',
  },
  headerLeaderboardBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.9)',
    borderWidth: 1,
    borderColor: '#fbbf24',
  },
  headerLeaderboardIcon: {
    width: 24,
    height: 24,
    resizeMode: 'contain',
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
  btnDisabled: {
    backgroundColor: '#334155',
    shadowOpacity: 0,
    opacity: 0.8,
  },
  btnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 2,
  },
  autoStartRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingVertical: 20,
    width: '100%',
  },
  autoStartText: {
    color: '#94a3b8',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 1,
  },
  gpsErrorBlock: {
    paddingVertical: 12,
    gap: 12,
    width: '100%',
  },
  gpsErrorText: {
    color: '#fecaca',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 18,
  },
  gpsRetryBtn: {
    backgroundColor: 'rgba(34,211,238,0.2)',
    paddingVertical: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(34,211,238,0.45)',
    alignItems: 'center',
  },
  gpsRetryBtnText: {
    color: '#22d3ee',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 2,
  },
});

export default DungeonTrackerScreen;
