import { useState, useEffect, useRef } from 'react';
import * as Location from 'expo-location';
import { useKeepAwake } from 'expo-keep-awake'; 
import { getDistance } from 'geolib';

export const useRunTracker = () => {
  // 1. Keep the screen awake so the phone doesn't sleep & kill GPS
  useKeepAwake(); 

  const [isTracking, setIsTracking] = useState(false);
  const [routeCoordinates, setRouteCoordinates] = useState<any[]>([]);
  const [distance, setDistance] = useState(0); // Total meters run
  const [duration, setDuration] = useState(0); // Total seconds elapsed
  
  const locSub = useRef<Location.LocationSubscription | null>(null);
  const timer = useRef<NodeJS.Timeout | null>(null);

  // --- START FUNCTION ---
  const startRun = async () => {
    // A. Ask for permission
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      alert("Permission to access location was denied");
      return;
    }

    // B. Reset State
    setIsTracking(true);
    setDistance(0);
    setDuration(0);
    setRouteCoordinates([]);

    // C. Start Timer (Counts up every second)
    timer.current = setInterval(() => {
      setDuration(prev => prev + 1);
    }, 1000);

    // D. Start GPS Listener
    locSub.current = await Location.watchPositionAsync(
      { 
        accuracy: Location.Accuracy.BestForNavigation, 
        distanceInterval: 5 // Only update if moved 5 meters
      },
      (loc) => {
        // 1. Filter out weak GPS signals (poor accuracy)
        if (loc.coords.accuracy && loc.coords.accuracy > 20) return;

        const newPoint = { 
          latitude: loc.coords.latitude, 
          longitude: loc.coords.longitude 
        };

        setRouteCoordinates(prev => {
          if (prev.length > 0) {
            const lastPoint = prev[prev.length - 1];
            const delta = getDistance(lastPoint, newPoint);

            // 2. Glitch Filter: Ignore if moved > 30m in 1 update (Teleporting)
            // (Unless you are Usain Bolt, 30m/sec is impossible)
            if (delta > 0 && delta < 30) {
               setDistance(d => d + delta);
            }
          }
          return [...prev, newPoint];
        });
      }
    );
  };

  // --- STOP FUNCTION ---
  const stopRun = () => {
    // Kill the processes
    if (locSub.current) locSub.current.remove();
    if (timer.current) clearInterval(timer.current);
    
    setIsTracking(false);
    
    // Return final report
    return { 
      distance, 
      duration, 
      routeCoordinates 
    };
  };

  // Cleanup: If user closes the app/component, stop tracking
  useEffect(() => {
    return () => {
      if (locSub.current) locSub.current.remove();
      if (timer.current) clearInterval(timer.current);
    };
  }, []);

  return { isTracking, distance, duration, routeCoordinates, startRun, stopRun };
};
