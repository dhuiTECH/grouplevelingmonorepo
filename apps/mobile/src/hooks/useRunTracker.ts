import { useState, useEffect, useRef, useCallback } from 'react';
import * as Location from 'expo-location';
import { useKeepAwake } from 'expo-keep-awake';
import { getDistance } from 'geolib';

const MIN_ALTITUDE_DELTA_M = 0.5;

export interface RunTrackerReport {
  distance: number;
  duration: number;
  routeCoordinates: Array<{ latitude: number; longitude: number }>;
  elevationGain: number;
  /** Seconds to reach target distance (e.g. 5km), using same 99% threshold as completion; null if never reached */
  timeToTargetSeconds: number | null;
}

export const useRunTracker = () => {
  useKeepAwake();

  const [isTracking, setIsTracking] = useState(false);
  const [routeCoordinates, setRouteCoordinates] = useState<
    Array<{ latitude: number; longitude: number }>
  >([]);
  const [distance, setDistance] = useState(0);
  const [duration, setDuration] = useState(0);

  const routeCoordinatesRef = useRef<Array<{ latitude: number; longitude: number }>>([]);
  const locSub = useRef<Location.LocationSubscription | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const startedAtRef = useRef<number | null>(null);
  const targetMetersRef = useRef(5000);
  const distanceRef = useRef(0);
  const lastAltitudeRef = useRef<number | null>(null);
  const elevationGainRef = useRef(0);
  const timeToTargetSecondsRef = useRef<number | null>(null);
  const crossedTargetRef = useRef(false);

  const startRun = async (targetDistanceMeters: number = 5000) => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      alert('Permission to access location was denied');
      return;
    }

    targetMetersRef.current = targetDistanceMeters;
    startedAtRef.current = Date.now();
    lastAltitudeRef.current = null;
    elevationGainRef.current = 0;
    timeToTargetSecondsRef.current = null;
    crossedTargetRef.current = false;
    distanceRef.current = 0;

    setIsTracking(true);
    setDistance(0);
    setDuration(0);
    routeCoordinatesRef.current = [];
    setRouteCoordinates([]);

    timer.current = setInterval(() => {
      setDuration((prev) => prev + 1);
    }, 1000);

    locSub.current = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.BestForNavigation,
        distanceInterval: 5,
      },
      (loc) => {
        if (loc.coords.accuracy && loc.coords.accuracy > 20) return;

        const altitude = loc.coords.altitude;
        if (typeof altitude === 'number' && !Number.isNaN(altitude)) {
          const prevAlt = lastAltitudeRef.current;
          if (prevAlt != null) {
            const diff = altitude - prevAlt;
            if (diff > MIN_ALTITUDE_DELTA_M) elevationGainRef.current += diff;
          }
          lastAltitudeRef.current = altitude;
        }

        const newPoint = {
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
        };

        setRouteCoordinates((prev) => {
          const nextRoute = [...prev, newPoint];
          routeCoordinatesRef.current = nextRoute;

          if (prev.length > 0) {
            const lastPoint = prev[prev.length - 1];
            const delta = getDistance(lastPoint, newPoint);

            if (delta > 0 && delta < 30) {
              const nextDist = distanceRef.current + delta;
              distanceRef.current = nextDist;
              setDistance(nextDist);

              const threshold = targetMetersRef.current * 0.99;
              if (!crossedTargetRef.current && nextDist >= threshold && startedAtRef.current) {
                crossedTargetRef.current = true;
                timeToTargetSecondsRef.current = Math.round(
                  (Date.now() - startedAtRef.current) / 1000
                );
              }
            }
          }
          return nextRoute;
        });
      }
    );
  };

  const stopRun = useCallback((): RunTrackerReport => {
    if (locSub.current) locSub.current.remove();
    if (timer.current) clearInterval(timer.current);
    locSub.current = null;
    timer.current = null;

    setIsTracking(false);

    const wallDuration =
      startedAtRef.current != null
        ? Math.max(0, Math.floor((Date.now() - startedAtRef.current) / 1000))
        : duration;

    return {
      distance: distanceRef.current,
      duration: wallDuration,
      routeCoordinates: routeCoordinatesRef.current,
      elevationGain: Math.round(elevationGainRef.current),
      timeToTargetSeconds: timeToTargetSecondsRef.current,
    };
  }, [duration]);

  useEffect(() => {
    return () => {
      if (locSub.current) locSub.current.remove();
      if (timer.current) clearInterval(timer.current);
    };
  }, []);

  return { isTracking, distance, duration, routeCoordinates, startRun, stopRun };
};
