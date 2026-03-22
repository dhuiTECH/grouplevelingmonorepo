import React, { useEffect, useId } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { Image } from 'expo-image';
import { MotiView } from 'moti';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
} from 'react-native-reanimated';
import { Award, Gem, Percent, TrendingUp } from 'lucide-react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Svg, Rect, Defs, Pattern } from 'react-native-svg';

const coinIcon = require('../../../assets/coinicon.png');
const expIcon = require('../../../assets/expcrystal.png');

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const Scanlines = ({ patternId }: { patternId: string }) => (
  <View style={StyleSheet.absoluteFill} pointerEvents="none">
    <Svg width="100%" height="100%">
      <Defs>
        <Pattern id={patternId} x="0" y="0" width="4" height="4" patternUnits="userSpaceOnUse">
          <Rect x="0" y="0" width="4" height="1" fill="#00d2ff" fillOpacity="0.05" />
        </Pattern>
      </Defs>
      <Rect x="0" y="0" width="100%" height="100%" fill={`url(#${patternId})`} />
    </Svg>
  </View>
);

const MechanicalBorder = ({ position }: { position: 'top' | 'bottom' }) => (
  <View style={[styles.mechBorder, position === 'top' ? { top: 0 } : { bottom: 0 }]}>
    <LinearGradient
      colors={['transparent', '#00d2ff', '#e6ffff', '#00d2ff', 'transparent']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0 }}
      style={StyleSheet.absoluteFill}
    />
    <View style={styles.mechInnerLine} />
  </View>
);

interface Reward {
  type: 'coins' | 'exp' | 'gems' | 'stat';
  amount: number;
  stat?: string;
}

interface RewardModalProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  rank?: string;
  rewards?: Reward[];
  goldBuff?: number;
  expBuff?: number;
}

export const RewardModal: React.FC<RewardModalProps> = ({
  visible,
  onClose,
  title = "Season Rewards",
  rank,
  rewards,
  goldBuff,
  expBuff,
}) => {
  const scanlinePatternId = `reward-scan-${useId().replace(/:/g, '_')}`;
  const iconRotation = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      iconRotation.value = withRepeat(withTiming(360, { duration: 3000 }), -1, false);
    } else {
      iconRotation.value = 0;
    }
  }, [visible]);

  const animatedIconStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${iconRotation.value}deg` }],
  }));

  if (!visible) return null;

  const renderRewardItem = (item: Reward, index: number) => {
    const amount = typeof item.amount === 'number' && !Number.isNaN(item.amount) ? item.amount : 0;
    return (
      <MotiView
        key={`${item.type}-${index}`}
        from={{ opacity: 0, scale: 0.5, translateY: 20 }}
        animate={{ opacity: 1, scale: 1, translateY: 0 }}
        transition={{ type: 'spring', delay: 300 + index * 100 }}
        style={styles.rewardItem}
      >
        <View style={styles.rewardIconContainer}>
          {item.type === 'coins' || item.type === 'exp' ? (
            <Image
              source={item.type === 'coins' ? coinIcon : expIcon}
              style={styles.rewardIcon}
              contentFit="contain"
            />
          ) : item.type === 'gems' ? (
            <Gem size={32} color="#00d2ff" />
          ) : (
            <Award size={32} color="#00d2ff" />
          )}
        </View>
        <Text style={styles.rewardText}>
          {item.type === 'stat'
            ? `${item.stat?.toUpperCase()} +${amount}`
            : `+${amount.toLocaleString()}`}
        </Text>
        <Text style={styles.rewardLabel}>
          {item.type === 'stat' ? 'UPGRADE' : item.type.toUpperCase()}
        </Text>
      </MotiView>
    );
  };

  return (
    <View style={styles.overlay}>
      <BlurView intensity={20} style={StyleSheet.absoluteFill} />
      <View style={styles.outerContainer}>
        <Scanlines patternId={scanlinePatternId} />
        <MechanicalBorder position="top" />
        <MechanicalBorder position="bottom" />
        
        <View style={styles.container}>
          <Animated.View style={[styles.awardIconContainer, animatedIconStyle]}>
            <Award size={48} color="#00d2ff" />
          </Animated.View>
          
          <View style={styles.titleBox}>
            <Text style={styles.titleText}>{title.toUpperCase()}</Text>
          </View>
          
          {rank && (
            <Text style={styles.rankText}>
              RANK: <Text style={{ color: '#fff' }}>{rank}</Text>
            </Text>
          )}

          {rewards && rewards.length > 0 && (
            <View style={styles.rewardsGrid}>
              {rewards.map((item, index) => renderRewardItem(item, index))}
            </View>
          )}
          
          {(goldBuff || expBuff) && (
            <View style={styles.buffsContainer}>
              <Text style={styles.buffsTitle}>SYSTEM BUFFS UNLOCKED</Text>
              {goldBuff && (
                <MotiView
                  from={{ opacity: 0, translateX: -10 }}
                  animate={{ opacity: 1, translateX: 0 }}
                  transition={{ delay: 500 }}
                  style={styles.buffItem}
                >
                  <TrendingUp size={16} color="#00d2ff" />
                  <Text style={styles.buffText}>+{goldBuff}% Gold Acquisition</Text>
                </MotiView>
              )}
              {expBuff && (
                <MotiView
                  from={{ opacity: 0, translateX: -10 }}
                  animate={{ opacity: 1, translateX: 0 }}
                  transition={{ delay: 600 }}
                  style={styles.buffItem}
                >
                  <Percent size={16} color="#00d2ff" />
                  <Text style={styles.buffText}>+{expBuff}% EXP Gain</Text>
                </MotiView>
              )}
            </View>
          )}

          <TouchableOpacity
            style={styles.claimButton}
            onPress={() => requestAnimationFrame(() => onClose())}
            activeOpacity={0.8}
          >
            <Text style={styles.claimButtonText}>CLAIM REWARDS</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(2, 4, 10, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10000,
  },
  outerContainer: {
    width: '90%',
    maxWidth: 420,
    backgroundColor: 'rgba(4, 12, 28, 0.95)',
    borderWidth: 1,
    borderColor: 'rgba(0, 210, 255, 0.3)',
    borderRadius: 2,
    overflow: 'hidden',
    shadowColor: '#0066ff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 30,
    elevation: 10,
    position: 'relative',
  },
  container: {
    padding: 32,
    alignItems: 'center',
  },
  mechBorder: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 8,
    zIndex: 20,
  },
  mechInnerLine: {
    position: 'absolute',
    top: 3,
    left: '5%',
    right: '5%',
    height: 1,
    backgroundColor: '#00d2ff',
    shadowColor: '#00d2ff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 8,
  },
  awardIconContainer: {
    marginBottom: 24,
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 1,
    borderColor: 'rgba(0, 210, 255, 0.3)',
    backgroundColor: 'rgba(0, 34, 68, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#00d2ff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 15,
  },
  titleBox: {
    borderWidth: 1,
    borderColor: 'rgba(0, 210, 255, 0.5)',
    backgroundColor: 'rgba(0, 102, 255, 0.2)',
    paddingHorizontal: 24,
    paddingVertical: 8,
    marginBottom: 12,
    shadowColor: '#00d2ff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
  },
  titleText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#e6ffff',
    fontFamily: 'Lato-Black',
    letterSpacing: 4,
    textShadowColor: '#00d2ff',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
    textAlign: 'center',
  },
  rankText: {
    fontSize: 12,
    color: '#00d2ff',
    marginBottom: 24,
    fontFamily: 'Exo2-Bold',
    letterSpacing: 2,
    textShadowColor: 'rgba(0, 210, 255, 0.5)',
    textShadowRadius: 8,
  },
  rewardsGrid: {
    width: '100%',
    marginBottom: 24,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  rewardItem: {
    backgroundColor: 'rgba(0, 34, 68, 0.3)',
    borderWidth: 1,
    borderColor: 'rgba(0, 210, 255, 0.2)',
    borderRadius: 2,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    margin: 8,
    width: (SCREEN_WIDTH * 0.9 - 100) / 2,
    maxWidth: 150,
  },
  rewardIconContainer: {
    marginBottom: 8,
    height: 40,
    justifyContent: 'center',
  },
  rewardIcon: {
    width: 32,
    height: 32,
  },
  rewardText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    fontFamily: 'Exo2-Bold',
    textShadowColor: 'rgba(255, 255, 255, 0.4)',
    textShadowRadius: 8,
  },
  rewardLabel: {
    color: '#00d2ff',
    fontSize: 9,
    fontWeight: 'bold',
    fontFamily: 'Exo2-Bold',
    letterSpacing: 1,
    marginTop: 2,
  },
  buffsContainer: {
    width: '100%',
    marginBottom: 32,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 210, 255, 0.2)',
    paddingTop: 20,
  },
  buffsTitle: {
    color: '#00d2ff',
    textAlign: 'center',
    marginBottom: 16,
    fontSize: 10,
    fontWeight: 'bold',
    fontFamily: 'Exo2-Bold',
    letterSpacing: 2,
    opacity: 0.8,
  },
  buffItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 10,
    backgroundColor: 'rgba(0, 34, 68, 0.3)',
    padding: 10,
    borderWidth: 1,
    borderColor: 'rgba(0, 210, 255, 0.1)',
  },
  buffText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
    fontFamily: 'Exo2-Regular',
  },
  claimButton: {
    backgroundColor: 'rgba(0, 102, 255, 0.2)',
    borderWidth: 2,
    borderColor: '#00d2ff',
    paddingVertical: 14,
    width: '100%',
    borderRadius: 2,
    alignItems: 'center',
    shadowColor: '#00d2ff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 10,
  },
  claimButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
    fontFamily: 'Exo2-Bold',
    letterSpacing: 3,
    textShadowColor: 'rgba(0, 210, 255, 0.8)',
    textShadowRadius: 8,
  },
});
