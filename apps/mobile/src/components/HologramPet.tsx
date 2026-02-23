import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MotiView } from 'moti';
import SpriteSheetAnimator from './SpriteSheetAnimator'; // Import the new component

const HologramPet = ({ scale = 0.7 }: { scale?: number }) => {
  return (
    <View style={[styles.container, { transform: [{ scale }] }]}>
      {/* Floating Pet Container */}
      <MotiView
        from={{ translateY: 0 }}
        animate={{ translateY: -10 }}
        transition={{
          type: 'timing',
          duration: 2000,
          loop: true,
          repeatReverse: true,
        }}
        style={styles.floatingContainer}
      >
        {/* Replace the static Image with our new animator */}
        <SpriteSheetAnimator
          spriteSheet={require('../../assets/pet.png')}
          frameCount={9}
          frameWidth={4483 / 9} // Use precise division to prevent gaps
          frameHeight={512}
          fps={9} // Adjust for desired speed
        />
      </MotiView>

      {/* System Alert Bubble */}
      <View style={styles.alertBubble}>
        <Text style={styles.alertTitle}>SYSTEM ALERT</Text>
        <Text style={styles.alertText}>
          "A new week begins, Hunter.{'\n'}Show me your growth."
        </Text>
      </View>
    </View>
  );
};

// It's better to use StyleSheet for performance and organization
const styles = StyleSheet.create({
  container: {
    position: 'relative',
    width: 498, // Set container to the width of one frame
    height: 512, // Set container to the height of one frame
    alignSelf: 'center', // Center it if the parent is a flex container
    marginBottom: 6,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  floatingContainer: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'flex-end',
    zIndex: 10,
  },
  alertBubble: {
    position: 'absolute',
    right: -20,
    top: 20, // Adjusted top position
    backgroundColor: 'rgba(15, 23, 42, 0.9)',
    borderWidth: 1,
    borderColor: 'rgba(6, 182, 212, 0.6)',
    padding: 16, // Increased padding
    borderRadius: 16, // Increased border radius
    borderBottomLeftRadius: 0,
    zIndex: 20,
    shadowColor: '#06b6d4',
    shadowOpacity: 0.3, // Increased shadow opacity
    shadowRadius: 15,
  },
  alertTitle: {
    fontWeight: '900',
    color: '#67e8f9',
    marginBottom: 4, // Increased margin
    fontSize: 12, // Increased font size
  },
  alertText: {
    fontSize: 11, // Increased font size
    color: '#a5f3fc',
    lineHeight: 16, // Added line height for better readability
  },
});

export default HologramPet;
