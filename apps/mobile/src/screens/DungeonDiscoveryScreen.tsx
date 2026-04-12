import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  Platform,
  Pressable,
  Image,
  Alert,
} from 'react-native';
import MapView, { Marker, Polyline } from '@/utils/maps';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import * as Location from 'expo-location';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '@/lib/supabase';
import { InviteFriendsModal } from '@/components/modals/InviteFriendsModal';
import { useBackgroundRunRecorder } from '@/hooks/useBackgroundRunRecorder';
import { uploadRun } from '@/lib/runUpload';
import { formatSupabaseErrorMessage } from '@/lib/supabaseErrors';
import { useAudio } from '@/contexts/AudioContext';
import { useAuth } from '@/contexts/AuthContext';
import { useGameData } from '@/hooks/useGameData';
import LayeredAvatar from '@/components/LayeredAvatar';

const RADAR_RADIUS_M = 10_000;
/** Centered-on-user span (~0.09° lat ≈ ~10km); keep in sync with post-GPS animate */
const RADAR_MAP_DELTA = 0.09;
/** Hunter position on map — small square so it reads as “you” vs gate pins */
const ME_MAP_AVATAR_SIZE = 44;
const ME_MARKER_OUTER = ME_MAP_AVATAR_SIZE + 8;

export interface NearbyDungeonRow {
  id: string;
  name: string;
  distance_meters: number;
  tier: string | null;
  xp_reward: number;
  coin_reward: number;
  image_url: string | null;
  entrance_lat: number;
  entrance_lon: number;
  distance_to_gate_meters: number;
  /** Total ascent along official route (m), from DEM when seeded */
  elevation_gain_meters?: number | null;
}

const E_GATE_MARKER_IMAGE = require('../../assets/gates/egate.png');

/** Horizontal spritesheet 384×96 → 4 frames @ 96×96 source; displayed at half size */
const E_GATE_SCALE = 0.5;
const E_GATE_SHEET_SOURCE_W = 384;
const E_GATE_SHEET_SOURCE_H = 96;
const E_GATE_FRAME_COUNT = 4;
const E_GATE_FRAME_W = (E_GATE_SHEET_SOURCE_W / E_GATE_FRAME_COUNT) * E_GATE_SCALE;
const E_GATE_SHEET_W = E_GATE_SHEET_SOURCE_W * E_GATE_SCALE;
const E_GATE_SHEET_H = E_GATE_SHEET_SOURCE_H * E_GATE_SCALE;
const E_GATE_FRAME_MS = 110;

/** All gates use egate.png for now; swap to tier-specific assets later */
function EGateMarkerSprite() {
  const [frame, setFrame] = useState(0);
  useEffect(() => {
    const id = setInterval(() => {
      setFrame((f) => (f + 1) % E_GATE_FRAME_COUNT);
    }, E_GATE_FRAME_MS);
    return () => clearInterval(id);
  }, []);
  return (
    <View style={styles.eGateSpriteClip} pointerEvents="none" collapsable={false}>
      <Image
        source={E_GATE_MARKER_IMAGE}
        style={[
          styles.eGateSpriteSheet,
          { transform: [{ translateX: -frame * E_GATE_FRAME_W }] },
        ]}
      />
    </View>
  );
}

function formatDistanceMeters(m: number): string {
  if (!Number.isFinite(m) || m < 0) return '—';
  if (m < 1000) return `${Math.round(m)} m`;
  return `${(m / 1000).toFixed(1)} km`;
}

/** PostgREST returns `geometry` as GeoJSON LineString for `path_line` */
function pathLineToCoords(pathLine: unknown): { latitude: number; longitude: number }[] {
  if (pathLine == null) return [];
  if (typeof pathLine === 'string') {
    try {
      return pathLineToCoords(JSON.parse(pathLine));
    } catch {
      return [];
    }
  }
  if (typeof pathLine === 'object' && 'type' in (pathLine as object)) {
    const g = pathLine as { type: string; coordinates?: number[][] };
    if (g.type === 'LineString' && Array.isArray(g.coordinates))
      return g.coordinates.map(([lng, lat]) => ({ latitude: lat, longitude: lng }));
  }
  return [];
}

/**
 * Frame the route with breathing room — not max zoom.
 * Extra margin + minimum deltas avoid “street level” framing on small loops.
 */
function regionForRouteComfortableFit(
  coords: { latitude: number; longitude: number }[],
  opts?: { margin?: number; shiftUpFrac?: number; minDelta?: number }
): {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
} | null {
  if (coords.length < 2) return null;
  const lats = coords.map((c) => c.latitude);
  const lngs = coords.map((c) => c.longitude);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  const midLng = (minLng + maxLng) / 2;
  const midLat = (minLat + maxLat) / 2;
  const margin = opts?.margin ?? 1.42;
  const minDelta = opts?.minDelta ?? 0.032;
  let latSpan = (maxLat - minLat) * margin;
  let lngSpan = (maxLng - minLng) * margin;
  latSpan = Math.max(latSpan, minDelta);
  lngSpan = Math.max(lngSpan, minDelta);
  const shiftUpFrac = opts?.shiftUpFrac ?? 0.05;
  const latitude = midLat + latSpan * shiftUpFrac;
  return {
    latitude,
    longitude: midLng,
    latitudeDelta: latSpan,
    longitudeDelta: lngSpan,
  };
}

export interface DungeonRunPayload {
  id: string;
  name: string;
  target_distance_meters: number;
  tier: string | null;
  xp_reward: number;
  coin_reward: number;
  image_url: string | null;
  globalLeaderboard: true;
}

export default function DungeonDiscoveryScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const mapRef = useRef<MapView>(null);
  const { user } = useAuth();
  const { shopItems } = useGameData();

  const { stopBackgroundMusic, playTrack } = useAudio();

  const {
    isRecording: isTracking,
    distance,
    duration,
    elapsedSeconds,
    isPaused,
    pauseReason,
    startRecording: startRun,
    stopRecording: stopRun,
    pauseRecording,
    resumeRecording,
  } = useBackgroundRunRecorder();

  const [runDungeon, setRunDungeon] = useState<DungeonRunPayload | null>(null);
  const [uploading, setUploading] = useState(false);

  const [loadingLocation, setLoadingLocation] = useState(true);
  const [loadingDungeons, setLoadingDungeons] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userCoords, setUserCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [dungeons, setDungeons] = useState<NearbyDungeonRow[]>([]);
  /** Official route line for the gate detail modal (from `global_dungeons.path_line`) */
  const [pathLineCoords, setPathLineCoords] = useState<{ latitude: number; longitude: number }[] | null>(null);

  const [modalVisible, setModalVisible] = useState(false);
  const [selected, setSelected] = useState<NearbyDungeonRow | null>(null);
  /** #1 on global pace leaderboard for the open gate modal (cosmetics merged for LayeredAvatar) */
  const [topRunner, setTopRunner] = useState<Record<string, unknown> | null>(null);
  const [topRunnerLoading, setTopRunnerLoading] = useState(false);
  const [partyModalVisible, setPartyModalVisible] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);

  const initialRegion = useMemo(() => {
    if (!userCoords) {
      return {
        latitude: 49.25,
        longitude: -122.98,
        latitudeDelta: 0.09,
        longitudeDelta: 0.09,
      };
    }
    return {
      latitude: userCoords.latitude,
      longitude: userCoords.longitude,
      latitudeDelta: RADAR_MAP_DELTA,
      longitudeDelta: RADAR_MAP_DELTA,
    };
  }, [userCoords]);

  const loadNearby = useCallback(async (lat: number, lng: number) => {
    setLoadingDungeons(true);
    setError(null);
    try {
      const { data, error: rpcError } = await supabase.rpc('get_nearby_dungeons', {
        user_lat: lat,
        user_lon: lng,
        radius_meters: RADAR_RADIUS_M,
      });
      if (rpcError) throw rpcError;
      setDungeons((data as NearbyDungeonRow[]) ?? []);
    } catch (e) {
      console.error('[DungeonDiscovery] get_nearby_dungeons', e);
      setError(e instanceof Error ? e.message : 'Failed to load nearby gates');
      setDungeons([]);
    } finally {
      setLoadingDungeons(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoadingLocation(true);
      setError(null);
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== Location.PermissionStatus.GRANTED) {
          setError('Location permission is required to scan for gates.');
          setLoadingLocation(false);
          return;
        }

        const pos = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        if (cancelled) return;

        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setUserCoords({ latitude: lat, longitude: lng });
        await loadNearby(lat, lng);
      } catch (e) {
        if (!cancelled) {
          console.error('[DungeonDiscovery] location', e);
          setError('Could not get your position.');
        }
      } finally {
        if (!cancelled) setLoadingLocation(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [loadNearby]);

  /** While recording a run, keep “you” marker synced with GPS (default dot would move; custom avatar must too) */
  useEffect(() => {
    if (!isTracking || Platform.OS === 'web') return;
    let mounted = true;
    let sub: Location.LocationSubscription | null = null;
    void (async () => {
      const fg = await Location.getForegroundPermissionsAsync();
      if (fg.status !== Location.PermissionStatus.GRANTED || !mounted) return;
      sub = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.Balanced,
          distanceInterval: 10,
          timeInterval: 1500,
        },
        (loc) => {
          if (mounted) {
            setUserCoords({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
          }
        }
      );
    })();
    return () => {
      mounted = false;
      sub?.remove();
    };
  }, [isTracking]);

  useEffect(() => {
    if (!userCoords || !mapRef.current) return;
    mapRef.current.animateToRegion(
      {
        latitude: userCoords.latitude,
        longitude: userCoords.longitude,
        latitudeDelta: RADAR_MAP_DELTA,
        longitudeDelta: RADAR_MAP_DELTA,
      },
      400
    );
  }, [userCoords]);

  /** Load route geometry when the gate modal is open so we can draw the official path */
  useEffect(() => {
    if (!modalVisible || !selected?.id) {
      setPathLineCoords(null);
      return;
    }
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from('global_dungeons')
        .select('path_line')
        .eq('id', selected.id)
        .single();
      if (cancelled) return;
      if (error) {
        console.warn('[DungeonDiscovery] path_line', error.message);
        setPathLineCoords(null);
        return;
      }
      const coords = pathLineToCoords(data?.path_line);
      setPathLineCoords(coords.length > 0 ? coords : null);
    })();
    return () => {
      cancelled = true;
    };
  }, [modalVisible, selected?.id]);

  /** Load #1 leaderboard row for gate modal (name + avatar) */
  useEffect(() => {
    if (!modalVisible || !selected?.id) {
      setTopRunner(null);
      setTopRunnerLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      setTopRunnerLoading(true);
      setTopRunner(null);
      try {
        const { data: rows, error } = await supabase
          .from('best_global_dungeon_times')
          .select('*')
          .eq('dungeon_id', selected.id)
          .order('leaderboard_score', { ascending: false })
          .limit(1);
        if (cancelled) return;
        if (error) {
          console.warn('[DungeonDiscovery] top runner', error.message);
          setTopRunner(null);
          return;
        }
        const row = rows?.[0];
        if (!row?.user_id) {
          setTopRunner(null);
          return;
        }
        const { data: prof } = await supabase
          .from('profiles')
          .select(`
            id,
            cosmetics:user_cosmetics(
              *,
              shop_items:shop_item_id(*)
            )
          `)
          .eq('id', row.user_id)
          .single();
        if (cancelled) return;
        setTopRunner({
          ...row,
          cosmetics: prof?.cosmetics ?? [],
        });
      } finally {
        if (!cancelled) setTopRunnerLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [modalVisible, selected?.id]);

  /** Show full route with modest zoom — not max zoom-in */
  useEffect(() => {
    if (!pathLineCoords?.length || pathLineCoords.length < 2 || !mapRef.current || Platform.OS === 'web') return;
    const region = regionForRouteComfortableFit(pathLineCoords, {
      margin: 1.58,
      minDelta: 0.045,
      shiftUpFrac: 0.05,
    });
    if (!region) return;
    const t = setTimeout(() => {
      mapRef.current?.animateToRegion(region, 450);
    }, 320);
    return () => clearTimeout(t);
  }, [pathLineCoords]);

  /** Clears gate choice — does not hide map callouts (those clear when you tap a different marker) */
  const closeGateModal = useCallback(() => {
    setModalVisible(false);
    setSelected(null);
    setPathLineCoords(null);
  }, []);

  const openMarker = useCallback((d: NearbyDungeonRow) => {
    if (runDungeon) return;
    setPathLineCoords(null);
    setSelected(d);
    setModalVisible(true);
  }, [runDungeon]);

  const dungeonPayloadFromSelected = useCallback((d: NearbyDungeonRow): DungeonRunPayload => {
    return {
      id: d.id,
      name: d.name,
      target_distance_meters: d.distance_meters,
      tier: d.tier,
      xp_reward: d.xp_reward,
      coin_reward: d.coin_reward,
      image_url: d.image_url,
      globalLeaderboard: true,
    };
  }, []);

  /** ENTER GATE only picks the dungeon — recording starts automatically (effect below). */
  const onEnterGate = useCallback(() => {
    if (!selected) return;
    const payload = dungeonPayloadFromSelected(selected);
    closeGateModal();
    setRunDungeon(payload);
  }, [selected, dungeonPayloadFromSelected, closeGateModal]);

  /** After ENTER GATE: one immediate GPS start + one delayed retry; then inline error + Try again. */
  useEffect(() => {
    if (!runDungeon) {
      setGpsError(null);
      return;
    }
    if (Platform.OS === 'web') return;
    if (isTracking) {
      setGpsError(null);
      return;
    }

    let cancelled = false;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;

    async function attemptStart() {
      const ok = await startRun();
      if (cancelled) return;
      if (ok) {
        setGpsError(null);
        return;
      }
      retryTimer = setTimeout(async () => {
        if (cancelled) return;
        const ok2 = await startRun();
        if (cancelled) return;
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
  }, [runDungeon?.id, isTracking, startRun]);

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

  useFocusEffect(
    useCallback(() => {
      if (!isTracking) playTrack('Beginning Map');
    }, [isTracking, playTrack])
  );

  useEffect(() => {
    if (isTracking) stopBackgroundMusic();
  }, [isTracking, stopBackgroundMusic]);

  const navigateToLeaderboard = useCallback(() => {
    if (!selected) return;
    const payload = dungeonPayloadFromSelected(selected);
    closeGateModal();
    navigation.navigate('DungeonLeaderboard', { dungeon: payload });
  }, [navigation, selected, dungeonPayloadFromSelected, closeGateModal]);

  const openLeaderboardForRun = useCallback(() => {
    if (runDungeon) navigation.navigate('DungeonLeaderboard', { dungeon: runDungeon });
  }, [navigation, runDungeon]);

  const formatTime = (totalSeconds: number) => {
    const s = Math.max(0, Math.floor(totalSeconds));
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const paceVal = distance > 0 ? (duration / 60) / (distance / 1000) : 0;
  const paceMin = Math.floor(paceVal);
  const paceSec = Math.round((paceVal - paceMin) * 60);
  const paceStr = distance > 0 ? `${paceMin}'${paceSec.toString().padStart(2, '0')}"` : "--'--\"";

  const handleBack = useCallback(() => {
    if (isTracking && runDungeon) {
      Alert.alert(
        'Leave this run?',
        'GPS will stop. You can scan again from Home.',
        [
          { text: 'Stay', style: 'cancel' },
          {
            text: 'Leave',
            style: 'destructive',
            onPress: async () => {
              try {
                await stopRun();
              } finally {
                setRunDungeon(null);
                navigation.goBack();
              }
            },
          },
        ]
      );
      return;
    }
    if (runDungeon && !isTracking) {
      setRunDungeon(null);
      return;
    }
    navigation.goBack();
  }, [isTracking, runDungeon, stopRun, navigation]);

  const onEndRun = useCallback(async () => {
    if (uploading || !runDungeon) return;
    setUploading(true);
    try {
      const report = await stopRun();
      const upload = await uploadRun(report.duration);
      navigation.navigate('RunComplete', {
        runData: {
          ...report,
          encodedPolyline: upload.encodedPolyline,
          recordedViaGlobalEngine: true,
        },
        dungeon: runDungeon,
        matchResult: { matchedDungeonId: upload.matchedDungeonId },
      });
    } catch (e) {
      console.error('[DungeonDiscovery] upload failed', e);
      alert(formatSupabaseErrorMessage(e) || 'Failed to upload run');
    } finally {
      setUploading(false);
    }
  }, [uploading, runDungeon, stopRun, navigation]);

  return (
    <View style={styles.root}>
      <LinearGradient colors={['#020617', '#0f172a', '#020617']} style={StyleSheet.absoluteFill} />

      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={handleBack} style={styles.backBtn} hitSlop={12}>
            <Ionicons name="chevron-back" size={24} color="#e2e8f0" />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerEyebrow}>{runDungeon ? 'RUN ACTIVE' : 'WORLD SCAN'}</Text>
            <Text style={styles.headerTitle}>{runDungeon ? 'GATE RUN' : 'GATE RADAR'}</Text>
          </View>
          <View style={styles.headerRight}>
            {runDungeon ? (
              <TouchableOpacity
                onPress={openLeaderboardForRun}
                style={styles.headerTrophyBtn}
                hitSlop={8}
                accessibilityLabel="Leaderboard"
              >
                <Image
                  source={require('../../assets/icons/goldtrophy.png')}
                  style={styles.headerTrophyIcon}
                />
              </TouchableOpacity>
            ) : null}
            <TouchableOpacity
              onPress={() => setPartyModalVisible(true)}
              style={styles.headerPartyBtn}
              hitSlop={8}
              accessibilityLabel="Squad invites"
            >
              <Ionicons name="people" size={22} color="#22d3ee" />
            </TouchableOpacity>
          </View>
        </View>

        {error ? (
          <View style={styles.banner}>
            <Text style={styles.bannerText}>{error}</Text>
          </View>
        ) : null}

        <View style={styles.mapWrap}>
          {(loadingLocation && !userCoords) || (!userCoords && !error) ? (
            <View style={styles.mapLoading}>
              <ActivityIndicator size="large" color="#22d3ee" />
              <Text style={styles.mapLoadingText}>Acquiring satellite lock…</Text>
            </View>
          ) : (
            <MapView
              ref={mapRef}
              style={styles.map}
              initialRegion={initialRegion}
              showsUserLocation={!user || Platform.OS === 'web'}
              followsUserLocation={isTracking}
              showsMyLocationButton={Platform.OS === 'android'}
              userInterfaceStyle="dark"
            >
              {Platform.OS !== 'web' && pathLineCoords && pathLineCoords.length >= 2 ? (
                <Polyline
                  coordinates={pathLineCoords}
                  strokeColor="rgba(34, 211, 238, 0.95)"
                  strokeWidth={4}
                  lineCap="round"
                  lineJoin="round"
                />
              ) : null}
              {userCoords &&
                dungeons.map((d) => (
                  <Marker
                    key={d.id}
                    coordinate={{ latitude: d.entrance_lat, longitude: d.entrance_lon }}
                    title={d.name}
                    description={formatDistanceMeters(d.distance_to_gate_meters)}
                    anchor={{ x: 0.5, y: 0.5 }}
                    tracksViewChanges={false}
                    onPress={() => openMarker(d)}
                  >
                    <EGateMarkerSprite />
                  </Marker>
                ))}
              {userCoords && user && Platform.OS !== 'web' ? (
                <Marker
                  coordinate={{
                    latitude: userCoords.latitude,
                    longitude: userCoords.longitude,
                  }}
                  anchor={{ x: 0.5, y: 0.5 }}
                  tracksViewChanges={false}
                  zIndex={1000}
                  pointerEvents="none"
                >
                  <View style={styles.meMarkerWrap} collapsable={false} pointerEvents="none">
                    <LayeredAvatar
                      user={user}
                      size={ME_MAP_AVATAR_SIZE}
                      allShopItems={shopItems}
                      isMoving={isTracking}
                    />
                  </View>
                </Marker>
              ) : null}
            </MapView>
          )}
          {Platform.OS !== 'web' && !runDungeon && userCoords && !loadingLocation && !error ? (
            <TouchableOpacity
              style={[styles.enterNewGateFloat, { bottom: Math.max(insets.bottom, 14) + 8 }]}
              onPress={() => navigation.navigate('DungeonTracker', { mode: 'free_run' })}
              activeOpacity={0.88}
              accessibilityLabel="Enter new gate — free roam scouting"
            >
              <Text style={styles.enterNewGateFloatText}>[ ENTER NEW GATE ]</Text>
            </TouchableOpacity>
          ) : null}
          {runDungeon ? (
            <LinearGradient
              colors={['transparent', 'rgba(2, 6, 23, 0.92)', '#020617']}
              style={[styles.runOverlay, { paddingBottom: Math.max(insets.bottom, 12) + 8 }]}
            >
              <Text style={styles.runDungeonName}>{(runDungeon.name || 'Gate').toUpperCase()}</Text>
              <Text style={styles.runObjective}>
                {isTracking
                  ? isPaused
                    ? pauseReason === 'manual'
                      ? 'PAUSED — TAP RESUME'
                      : 'AUTO-PAUSED — STANDING STILL'
                    : 'RECORDING — END WHEN FINISHED'
                  : Platform.OS === 'web'
                    ? 'Recording needs the mobile app'
                    : gpsError
                      ? 'GPS COULD NOT START'
                      : 'CONNECTING GPS — STAY ON THIS SCREEN'}
              </Text>
              <View style={styles.runStatsBlock}>
                <View style={styles.statsRow}>
                  <View style={styles.statBox}>
                    <Text style={styles.statLabel}>DISTANCE</Text>
                    <Text style={styles.statValue}>
                      {distance.toFixed(0)}
                      <Text style={styles.statUnit}>m</Text>
                    </Text>
                  </View>
                  <View style={styles.statDivider} />
                  <View style={styles.statBox}>
                    <Text style={styles.statLabel}>PACE</Text>
                    <Text style={styles.statValue}>{paceStr}</Text>
                  </View>
                  <View style={styles.statDivider} />
                  <View style={styles.statBox}>
                    <Text style={styles.statLabel}>MOVING</Text>
                    <Text style={styles.statValue}>{formatTime(duration)}</Text>
                  </View>
                </View>
                {isTracking && elapsedSeconds > duration + 5 ? (
                  <Text style={styles.runElapsedHint}>Elapsed {formatTime(elapsedSeconds)}</Text>
                ) : null}
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
                  <View style={styles.runLoadingRow}>
                    <ActivityIndicator size="small" color="#22d3ee" />
                    <Text style={styles.runLoadingText}>
                      {Platform.OS === 'web' ? 'Open the app on a phone to record' : 'Connecting GPS…'}
                    </Text>
                  </View>
                )
              ) : (
                <View style={styles.runActionsCol}>
                  <TouchableOpacity
                    style={[styles.runPauseBtn, isPaused && styles.runPauseBtnActive]}
                    disabled={uploading}
                    onPress={() => void (isPaused ? resumeRecording() : pauseRecording())}
                    activeOpacity={0.88}
                    accessibilityLabel={isPaused ? 'Resume recording' : 'Pause recording'}
                  >
                    <Text style={styles.runPauseBtnText}>{isPaused ? 'RESUME' : 'PAUSE'}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.runEndBtn, uploading && styles.runEndBtnDisabled]}
                    disabled={uploading}
                    onPress={onEndRun}
                  >
                    {uploading ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <Text style={styles.runEndText}>END RUN & UPLOAD</Text>
                    )}
                  </TouchableOpacity>
                </View>
              )}
            </LinearGradient>
          ) : null}
        </View>

      </SafeAreaView>

      <InviteFriendsModal
        visible={partyModalVisible}
        onClose={() => setPartyModalVisible(false)}
        dungeonId={runDungeon?.id ?? selected?.id}
      />

      <Modal visible={modalVisible} transparent animationType="fade" onRequestClose={closeGateModal}>
        <Pressable style={styles.modalBackdrop} onPress={closeGateModal}>
          <LinearGradient
            pointerEvents="none"
            colors={['rgba(2,6,23,0.14)', 'rgba(2,6,23,0.32)', 'rgba(2,6,23,0.52)']}
            locations={[0, 0.42, 1]}
            style={StyleSheet.absoluteFill}
          />
          <Pressable style={styles.modalCard} onPress={(e) => e.stopPropagation()}>
            <LinearGradient colors={['#0f172a', '#020617']} style={styles.modalGradient}>
              <View style={styles.modalHeaderRow}>
                <Text style={styles.modalEyebrow}>DUNGEON GATE</Text>
                <TouchableOpacity
                  style={styles.modalLeaderboardBtn}
                  onPress={navigateToLeaderboard}
                  activeOpacity={0.85}
                  accessibilityLabel="Open leaderboard for this gate"
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Image
                    source={require('../../assets/icons/goldtrophy.png')}
                    style={styles.modalLeaderboardIcon}
                  />
                </TouchableOpacity>
              </View>
              <Text style={styles.modalTitle}>{selected?.name ?? 'Unknown'}</Text>

              <View style={styles.modalTopRunner}>
                {topRunnerLoading ? (
                  <ActivityIndicator size="small" color="#22d3ee" />
                ) : topRunner ? (
                  <View style={styles.modalTopRunnerInner}>
                    <Text style={styles.modalTopRunnerRank}>#1</Text>
                    <LayeredAvatar
                      user={
                        {
                          ...topRunner,
                          name: (topRunner.hunter_name as string) || 'Unknown',
                          cosmetics: (topRunner.cosmetics as unknown[]) ?? [],
                        } as any
                      }
                      size={52}
                      allShopItems={shopItems}
                    />
                    <View style={styles.modalTopRunnerText}>
                      <Text style={styles.modalTopRunnerEyebrow}>TOP RUNNER</Text>
                      <Text style={styles.modalTopRunnerName} numberOfLines={1}>
                        {(topRunner.hunter_name as string) || 'Hunter'}
                      </Text>
                    </View>
                  </View>
                ) : (
                  <Text style={styles.modalNoRuns}>No leaderboard times yet</Text>
                )}
              </View>

              <Text style={styles.modalMeta}>
                Distance to gate:{' '}
                <Text style={styles.modalMetaStrong}>
                  {selected ? formatDistanceMeters(selected.distance_to_gate_meters) : '—'}
                </Text>
              </Text>
              {selected ? (
                <Text style={styles.modalMeta}>
                  Route length:{' '}
                  <Text style={styles.modalMetaStrong}>{formatDistanceMeters(selected.distance_meters)}</Text>
                </Text>
              ) : null}
              {selected != null && selected.elevation_gain_meters != null ? (
                <Text style={styles.modalMeta}>
                  Elevation gain:{' '}
                  <Text style={styles.modalMetaStrong}>{Math.round(selected.elevation_gain_meters)} m</Text>
                </Text>
              ) : null}
              {selected?.tier ? (
                <Text style={styles.modalTier}>Tier {selected.tier}</Text>
              ) : null}

              <TouchableOpacity style={styles.enterBtn} onPress={onEnterGate} activeOpacity={0.9}>
                <Text style={styles.enterBtnText}>ENTER GATE</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.closeLink} onPress={closeGateModal}>
                <Text style={styles.closeLinkText}>Cancel</Text>
              </TouchableOpacity>
            </LinearGradient>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#020617' },
  eGateSpriteClip: {
    width: E_GATE_FRAME_W,
    height: E_GATE_SHEET_H,
    overflow: 'hidden',
  },
  eGateSpriteSheet: {
    width: E_GATE_SHEET_W,
    height: E_GATE_SHEET_H,
  },
  safe: { flex: 1 },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingBottom: 8,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(15,23,42,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(34,211,238,0.25)',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerPartyBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(15,23,42,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(34,211,238,0.25)',
  },
  headerTrophyBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(15, 23, 42, 0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#fbbf24',
  },
  headerTrophyIcon: {
    width: 24,
    height: 24,
    resizeMode: 'contain',
  },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerEyebrow: {
    fontFamily: 'Exo2-Regular',
    color: '#94a3b8',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 3,
    textTransform: 'uppercase',
  },
  headerTitle: {
    fontFamily: 'Exo2-Regular',
    color: '#22d3ee',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 3,
    textTransform: 'uppercase',
  },
  banner: {
    marginHorizontal: 16,
    marginBottom: 8,
    padding: 10,
    borderRadius: 10,
    backgroundColor: 'rgba(239,68,68,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(248,113,113,0.35)',
  },
  bannerText: { color: '#fecaca', fontSize: 12, fontWeight: '600', textAlign: 'center' },
  mapWrap: {
    flex: 1,
    marginHorizontal: 12,
    marginBottom: 12,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(34,211,238,0.2)',
  },
  map: { flex: 1 },
  enterNewGateFloat: {
    position: 'absolute',
    left: 16,
    right: 16,
    paddingVertical: 18,
    paddingHorizontal: 20,
    borderRadius: 14,
    backgroundColor: 'rgba(15, 23, 42, 0.94)',
    borderWidth: 2,
    borderColor: 'rgba(34, 211, 238, 0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#22d3ee',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },
  enterNewGateFloatText: {
    fontFamily: 'Exo2-Regular',
    color: '#22d3ee',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 3,
  },
  meMarkerWrap: {
    width: ME_MARKER_OUTER,
    height: ME_MARKER_OUTER,
    borderRadius: ME_MARKER_OUTER / 2,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'rgba(34, 211, 238, 0.95)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  runOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 16,
    paddingTop: 28,
  },
  runDungeonName: {
    color: '#f8fafc',
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 1,
    textAlign: 'center',
    marginBottom: 6,
  },
  runObjective: {
    color: '#94a3b8',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 2,
    textAlign: 'center',
    marginBottom: 16,
  },
  runStatsBlock: {
    width: '100%',
    marginBottom: 16,
    alignItems: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    justifyContent: 'space-around',
  },
  runElapsedHint: {
    color: '#64748b',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1,
    marginTop: 8,
    textAlign: 'center',
  },
  runActionsCol: {
    width: '100%',
    gap: 10,
  },
  runPauseBtn: {
    backgroundColor: 'rgba(34, 211, 238, 0.12)',
    paddingVertical: 14,
    borderRadius: 10,
    width: '100%',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(34, 211, 238, 0.45)',
  },
  runPauseBtnActive: {
    backgroundColor: 'rgba(34, 211, 238, 0.22)',
    borderColor: 'rgba(34, 211, 238, 0.65)',
  },
  runPauseBtnText: {
    color: '#22d3ee',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 2,
  },
  statBox: {
    alignItems: 'center',
    flex: 1,
  },
  statLabel: {
    color: '#64748b',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1,
    marginBottom: 4,
  },
  statValue: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
  },
  statUnit: {
    fontSize: 12,
    color: '#64748b',
  },
  statDivider: {
    width: 1,
    height: 28,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  runLoadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 14,
  },
  runLoadingText: {
    color: '#94a3b8',
    fontSize: 13,
    fontWeight: '800',
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
  runEndBtn: {
    backgroundColor: '#ef4444',
    paddingVertical: 16,
    borderRadius: 10,
    width: '100%',
    alignItems: 'center',
  },
  runEndBtnDisabled: {
    opacity: 0.7,
  },
  runEndText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 2,
  },
  mapLoading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0f172a',
    gap: 12,
  },
  mapLoadingText: { color: '#94a3b8', fontSize: 12, fontWeight: '700', letterSpacing: 1 },
  modalBackdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingBottom: 32,
  },
  modalCard: {
    marginHorizontal: 16,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(34,211,238,0.35)',
  },
  modalGradient: { padding: 22 },
  modalHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  modalEyebrow: {
    fontFamily: 'Exo2-Regular',
    color: '#22d3ee',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 3,
    textTransform: 'uppercase',
    flex: 1,
  },
  modalLeaderboardBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.9)',
    borderWidth: 1,
    borderColor: '#fbbf24',
  },
  modalLeaderboardIcon: {
    width: 24,
    height: 24,
    resizeMode: 'contain',
  },
  modalTitle: {
    fontFamily: 'Exo2-Regular',
    color: '#f8fafc',
    fontSize: 17,
    fontWeight: '900',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  modalTopRunner: {
    minHeight: 64,
    justifyContent: 'center',
    marginBottom: 14,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    borderWidth: 1,
    borderColor: 'rgba(251, 191, 36, 0.35)',
  },
  modalTopRunnerInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  modalTopRunnerRank: {
    fontFamily: 'Exo2-Regular',
    color: '#fbbf24',
    fontSize: 18,
    fontWeight: '900',
    minWidth: 36,
  },
  modalTopRunnerText: {
    flex: 1,
    minWidth: 0,
  },
  modalTopRunnerEyebrow: {
    fontFamily: 'Exo2-Regular',
    color: '#94a3b8',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 2,
    marginBottom: 2,
  },
  modalTopRunnerName: {
    fontFamily: 'Exo2-Regular',
    color: '#f8fafc',
    fontSize: 16,
    fontWeight: '800',
  },
  modalNoRuns: {
    fontFamily: 'Exo2-Regular',
    color: '#64748b',
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  modalMeta: {
    fontFamily: 'Exo2-Regular',
    color: '#94a3b8',
    fontSize: 13,
    marginBottom: 4,
  },
  modalMetaStrong: {
    fontFamily: 'Exo2-Regular',
    color: '#e2e8f0',
    fontWeight: '800',
  },
  modalTier: {
    fontFamily: 'Exo2-Regular',
    color: '#64748b',
    fontSize: 11,
    marginBottom: 20,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  enterBtn: {
    backgroundColor: '#06b6d4',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#06b6d4',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.45,
    shadowRadius: 12,
  },
  enterBtnText: {
    color: '#020617',
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 3,
  },
  closeLink: { marginTop: 14, alignItems: 'center' },
  closeLinkText: { color: '#64748b', fontSize: 13, fontWeight: '700' },
});
