import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { MotiView } from 'moti';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  Easing,
} from 'react-native-reanimated';
import BaseModal from './BaseModal';
import { ShopItemMedia } from '@/components/ShopItemMedia';
import { RANK_COLORS } from '@/constants/gameConstants';

const { width } = Dimensions.get('window');

interface SummonResult {
  success: boolean;
  message: string;
  item_id: string;
  item_name: string;
  item_rarity: string;
  image_url: string;
  thumbnail_url?: string;
  is_animated?: boolean;
  animation_config?: any;
}

interface GachaRevealModalProps {
  visible: boolean;
  onClose: () => void;
  result: SummonResult | null;
}

export const GachaRevealModal: React.FC<GachaRevealModalProps> = ({
  visible,
  onClose,
  result,
}) => {
  const sweepPos = useSharedValue(-150);
  const pulseScale = useSharedValue(1);

  useEffect(() => {
    if (visible) {
      sweepPos.value = withRepeat(
        withTiming(400, { duration: 2500, easing: Easing.linear }),
        -1,
        false
      );
      pulseScale.value = withRepeat(
        withSequence(
          withTiming(1.05, { duration: 1000 }),
          withTiming(1, { duration: 1000 })
        ),
        -1,
        true
      );
    } else {
      sweepPos.value = -150;
      pulseScale.value = 1;
    }
  }, [visible]);

  if (!result) return null;

  const rarityColor = RANK_COLORS[result.item_rarity?.toUpperCase()] || '#fff';
  const isMonarch = result.item_rarity?.toLowerCase() === 'monarch';

  const animatedSweepStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: sweepPos.value }, { skewX: '-25deg' }],
  }));

  const animatedPulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
    shadowOpacity: withRepeat(withTiming(0.6, { duration: 1000 }), -1, true),
  }));

  return (
    <BaseModal visible={visible} onClose={onClose} blurIntensity={40}>
      <Animated.View 
        style={[
          styles.container, 
          { borderColor: rarityColor },
          isMonarch && styles.monarchBorder,
          animatedPulseStyle
        ]}
      >
        {/* Mana Sweep Effect */}
        <Animated.View style={[styles.sweep, animatedSweepStyle]} />

        <Text style={styles.systemTitle}>SYSTEM ACQUIRED</Text>

        <View style={styles.imageContainer}>
          <MotiView
            from={{ opacity: 0, scale: 0.5, rotate: '0deg' }}
            animate={{ opacity: 1, scale: 1, rotate: '360deg' }}
            transition={{ type: 'spring', delay: 200 }}
            style={styles.imageWrapper}
          >
            <ShopItemMedia 
              item={{
                image_url: result.image_url,
                thumbnail_url: result.thumbnail_url,
                is_animated: result.is_animated,
                animation_config: result.animation_config,
                name: result.item_name
              }} 
              style={styles.image}
              resizeMode="contain"
            />
          </MotiView>
        </View>

        <MotiView
          from={{ opacity: 0, translateY: 10 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ delay: 500 }}
          style={styles.textInfo}
        >
          <Text style={[styles.itemName, { color: rarityColor }]}>
            {result.item_name}
          </Text>
          <Text style={styles.rarityLabel}>[{result.item_rarity} CLASS]</Text>
        </MotiView>

        <TouchableOpacity
          style={[styles.acceptButton, { backgroundColor: rarityColor === '#fff' ? '#22d3ee' : rarityColor }]}
          onPress={onClose}
        >
          <Text style={styles.acceptButtonText}>ACCEPT</Text>
        </TouchableOpacity>
      </Animated.View>
    </BaseModal>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#0f172a',
    borderRadius: 20,
    borderWidth: 2,
    padding: 32,
    width: '100%',
    alignItems: 'center',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 20,
    elevation: 20,
  },
  monarchBorder: {
    borderColor: '#eab308',
    shadowColor: '#eab308',
    shadowOpacity: 0.5,
  },
  sweep: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 60,
    height: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    zIndex: 1,
  },
  systemTitle: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: 4,
    marginBottom: 24,
    textAlign: 'center',
    textShadowColor: 'rgba(34, 211, 238, 0.5)',
    textShadowRadius: 10,
  },
  imageContainer: {
    width: 200,
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  imageWrapper: {
    width: '100%',
    height: '100%',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  textInfo: {
    alignItems: 'center',
    marginBottom: 32,
  },
  itemName: {
    fontSize: 28,
    fontWeight: '900',
    textTransform: 'uppercase',
    textAlign: 'center',
    letterSpacing: 2,
    marginBottom: 8,
  },
  rarityLabel: {
    color: '#94a3b8',
    fontSize: 14,
    fontWeight: 'bold',
    letterSpacing: 2,
  },
  acceptButton: {
    paddingVertical: 14,
    paddingHorizontal: 60,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 5,
  },
  acceptButtonText: {
    color: '#000',
    fontWeight: '900',
    fontSize: 16,
    letterSpacing: 2,
  },
});
