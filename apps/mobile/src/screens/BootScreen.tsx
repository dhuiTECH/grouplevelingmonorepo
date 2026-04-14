import React from 'react';
import { View, Text, StyleSheet, Pressable, Dimensions } from 'react-native';
import { useBootStore } from '@/store/useBootStore';
import { checkForUpdates } from '@/utils/syncEngine';

const { width } = Dimensions.get('window');
const BAR_WIDTH = width * 0.7;

export default function BootScreen() {
  const bootStep = useBootStore((s) => s.bootStep);
  const progress = useBootStore((s) => s.progress);
  const errorMessage = useBootStore((s) => s.errorMessage);

  const handleRetry = () => {
    useBootStore.getState().reset();
    void checkForUpdates();
  };

  if (bootStep === 'ERROR') {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>UPDATE FAILED</Text>
        <Text style={styles.errorText}>
          {errorMessage || 'An unknown error occurred.'}
        </Text>
        <Pressable style={styles.retryButton} onPress={handleRetry}>
          <Text style={styles.retryText}>RETRY</Text>
        </Pressable>
      </View>
    );
  }

  const statusText =
    bootStep === 'DOWNLOADING'
      ? 'Updating game files...'
      : 'Checking for updates...';

  return (
    <View style={styles.container}>
      <Text style={styles.title}>SYSTEM BOOT</Text>
      <Text style={styles.status}>{statusText}</Text>

      {bootStep === 'DOWNLOADING' && (
        <View style={styles.barContainer}>
          <View style={styles.barTrack}>
            <View
              style={[styles.barFill, { width: `${progress}%` }]}
            />
          </View>
          <Text style={styles.progressText}>{progress}%</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#020617',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  title: {
    fontWeight: '700' as const,
    fontSize: 28,
    color: '#00e5ff',
    letterSpacing: 4,
    marginBottom: 24,
  },
  status: {
    fontWeight: '400' as const,
    fontSize: 14,
    color: '#94a3b8',
    marginBottom: 32,
  },
  barContainer: {
    alignItems: 'center',
    width: BAR_WIDTH,
  },
  barTrack: {
    width: '100%',
    height: 6,
    backgroundColor: '#1e293b',
    borderRadius: 3,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    backgroundColor: '#00e5ff',
    borderRadius: 3,
  },
  progressText: {
    fontWeight: '400' as const,
    fontSize: 12,
    color: '#64748b',
    marginTop: 8,
  },
  errorText: {
    fontWeight: '400' as const,
    fontSize: 14,
    color: '#f87171',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  retryButton: {
    paddingHorizontal: 32,
    paddingVertical: 14,
    backgroundColor: '#0e7490',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#00e5ff',
  },
  retryText: {
    fontWeight: '700' as const,
    fontSize: 16,
    color: '#ffffff',
    letterSpacing: 2,
  },
});
