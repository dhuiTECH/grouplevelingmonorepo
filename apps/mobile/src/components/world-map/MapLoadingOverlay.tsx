import React from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { worldMapStyles } from '@/screens/WorldMapScreen.styles';

interface MapLoadingOverlayProps {
  loading: boolean;
  error: string | null;
  onRetry: () => void;
}

export function MapLoadingOverlay({ loading, error, onRetry }: MapLoadingOverlayProps) {
  if (!loading && !error) return null;

  if (error) {
    return (
      <View style={worldMapStyles.mapLoadingOverlay}>
        <Ionicons name="cloud-offline" size={48} color="#ef4444" />
        <Text style={[worldMapStyles.mapLoadingText, { color: '#ef4444' }]}>{error}</Text>
        <TouchableOpacity onPress={onRetry} style={worldMapStyles.retryBtn}>
          <Text style={worldMapStyles.retryBtnText}>RETRY</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={worldMapStyles.mapLoadingOverlay}>
      <ActivityIndicator size="large" color="#22d3ee" />
      <Text style={worldMapStyles.mapLoadingText}>LOADING WORLD DATA...</Text>
    </View>
  );
}
