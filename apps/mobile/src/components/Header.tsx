import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'react-native';

interface HeaderProps {
  title: string;
  onPress?: () => void; // Optional onPress handler for a back button or similar
  backgroundColor?: string;
  titleColor?: string;
}

export const Header: React.FC<HeaderProps> = ({ title, onPress, backgroundColor = '#f0f0f0', titleColor = '#000' }) => {
  const insets = useSafeAreaInsets();

  return (
    <View style={[
      styles.container,
      { paddingTop: insets.top, backgroundColor: backgroundColor },
    ]}>
      {onPress && (
        <TouchableOpacity style={styles.backButton} onPress={onPress}>
          <Text style={styles.backButtonText}>Back</Text>
        </TouchableOpacity>
      )}
      <Text style={[styles.title, { color: titleColor }]}>{title}</Text>
      <StatusBar backgroundColor={backgroundColor} barStyle="dark-content" />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    backgroundColor: '#f0f0f0',
    paddingBottom: 10,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 2,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000',
  },
  backButton: {
    position: 'absolute',
    left: 10,
    bottom: 10,
  },
  backButtonText: {
    fontSize: 16,
    color: 'blue',
  },
});

export default Header;