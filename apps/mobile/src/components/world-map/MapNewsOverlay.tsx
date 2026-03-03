import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MotiView } from 'moti';

interface MapNewsOverlayProps {
  systemNews: any[];
  onPressNews: (news: any) => void;
  onClear: () => void;
}

export const MapNewsOverlay: React.FC<MapNewsOverlayProps> = ({
  systemNews,
  onPressNews,
  onClear,
}) => {
  if (!systemNews || systemNews.length === 0) return null;

  return (
    <View style={styles.newsContainer}>
      {systemNews.map((news) => (
        <TouchableOpacity key={news.id} onPress={() => onPressNews(news)}>
          <MotiView
            from={{ opacity: 0, translateX: -20 }}
            animate={{ opacity: 1, translateX: 0 }}
            style={styles.newsItem}
          >
            <Text style={styles.newsText}>
              <Text style={{ color: '#22d3ee' }}>[SYSTEM]</Text> {news.message}{' '}
              {news.coordinates}
            </Text>
          </MotiView>
        </TouchableOpacity>
      ))}
      <TouchableOpacity style={styles.clearNewsBtn} onPress={onClear}>
        <Ionicons name="close-circle" size={20} color="rgba(255,255,255,0.6)" />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  newsContainer: {
    position: 'absolute',
    top: 140,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 10,
    padding: 10,
    zIndex: 50,
  },
  clearNewsBtn: {
    position: 'absolute',
    right: 5,
    top: 5,
    zIndex: 10,
  },
  newsItem: {
    marginBottom: 5,
  },
  newsText: {
    color: '#fff',
    fontSize: 12,
  },
});

