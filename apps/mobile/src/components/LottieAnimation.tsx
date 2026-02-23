import React from 'react';
import { View, StyleSheet } from 'react-native';
import LottieView from 'lottie-react-native';

interface LottieAnimationProps {
  style?: any;
  loop?: boolean;
  autoplay?: boolean;
  speed?: number;
  source: any; // Replace 'any' with the actual type of your Lottie JSON
}

const LottieAnimation: React.FC<LottieAnimationProps> = ({
  style,
  loop = true,
  autoplay = true,
  speed = 1.0,
  source,
}) => {
  const containerStyle = style ? StyleSheet.flatten([styles.container, style]) : styles.container;

  return (
    <View style={containerStyle}>
      <LottieView
        source={source}
        autoPlay={autoplay}
        loop={loop}
        speed={speed}
        style={styles.lottie}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: 256, // Adjusted from w-64 (256px)
    height: 256, // Adjusted from h-64 (256px)
    overflow: 'hidden', // Prevents Lottie from overflowing
  },
  lottie: {
    width: '100%',
    height: '100%',
  },
});

export default LottieAnimation;