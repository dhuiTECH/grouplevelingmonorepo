import React, { useEffect, useMemo, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import MapView, { Polyline } from '@/utils/maps';
import polyline from '@mapbox/polyline';

interface RunPolylineMapProps {
  encodedPolyline: string;
  style?: object;
}

function decodeToCoordinates(encoded: string) {
  const raw = polyline.decode(encoded, 5);
  return raw.map(([latitude, longitude]: [number, number]) => ({ latitude, longitude }));
}

export function RunPolylineMap({ encodedPolyline, style }: RunPolylineMapProps) {
  const mapRef = useRef<MapView>(null);

  const coordinates = useMemo(
    () => decodeToCoordinates(encodedPolyline),
    [encodedPolyline]
  );

  useEffect(() => {
    if (coordinates.length < 1) return;
    const t = setTimeout(() => {
      mapRef.current?.fitToCoordinates(coordinates, {
        edgePadding: { top: 48, right: 48, bottom: 48, left: 48 },
        animated: true,
      });
    }, 300);
    return () => clearTimeout(t);
  }, [coordinates]);

  const initialRegion = useMemo(() => {
    const c = coordinates[0];
    if (!c) {
      return { latitude: 0, longitude: 0, latitudeDelta: 0.05, longitudeDelta: 0.05 };
    }
    return {
      latitude: c.latitude,
      longitude: c.longitude,
      latitudeDelta: 0.02,
      longitudeDelta: 0.02,
    };
  }, [coordinates]);

  if (coordinates.length === 0) {
    return <View style={[styles.map, style]} />;
  }

  return (
    <MapView
      ref={mapRef}
      style={[styles.map, style]}
      initialRegion={initialRegion}
      userInterfaceStyle="dark"
    >
      <Polyline coordinates={coordinates} strokeColor="#FF00A2" strokeWidth={5} />
    </MapView>
  );
}

const styles = StyleSheet.create({
  map: {
    width: '100%',
    minHeight: 200,
    borderRadius: 12,
    overflow: 'hidden',
  },
});
