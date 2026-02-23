import React, { useEffect } from 'react';
import { 
  View, 
  StyleSheet, 
  TouchableOpacity, 
  ImageSourcePropType
} from 'react-native';
import { Image } from 'expo-image';
import Animated, { 
  useAnimatedStyle, 
  useSharedValue, 
  withSpring, 
  withTiming
} from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useTutorial } from '@/context/TutorialContext';

// Props Interface
interface NavItemProps {
  id: string;
  icon: ImageSourcePropType;
  label: string;
  isActive: boolean;
  onPress: () => void;
  targetRef?: any;
}

// Reusable Nav Item Component
const NavItem = ({ id, icon, label, isActive, onPress, targetRef }: NavItemProps) => {
  // Shared values for animations
  const scale = useSharedValue(isActive ? 1.3 : 0.9);
  const translateY = useSharedValue(isActive ? -20 : 0); 
  const opacity = useSharedValue(isActive ? 1 : 1);
  const labelOpacity = useSharedValue(isActive ? 1 : 0);
  
  // Update animations when active state changes
  useEffect(() => {
    scale.value = withSpring(isActive ? 1.4 : 0.9, { damping: 15, stiffness: 200 });
    translateY.value = withSpring(isActive ? -20 : 0, { damping: 15, stiffness: 200 });
    opacity.value = withTiming(isActive ? 1 : 1, { duration: 200 });
    labelOpacity.value = withTiming(isActive ? 1 : 0, { duration: 200 });
  }, [isActive]);

  // Animated styles
  const iconStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { scale: scale.value },
        { translateY: translateY.value }
      ],
      opacity: opacity.value,
      // Standard shadow glow
      shadowColor: '#00E8FF',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: withTiming(isActive ? 1 : 0),
      shadowRadius: withTiming(isActive ? 20 : 0),
    };
  });

  const labelStyle = useAnimatedStyle(() => {
    return {
      opacity: labelOpacity.value,
      transform: [{ translateY: isActive ? -5 : 0 }], 
    };
  });

  return (
    <View ref={targetRef} collapsable={false} style={{ flex: 1 }}>
    <TouchableOpacity
      onPress={onPress}
      style={styles.navItem}
      activeOpacity={1}
    >
      <Animated.View style={[styles.iconContainer, iconStyle]}>
        {/* Blue gradient frame around active icon */}
        {isActive && (
          <View style={styles.glowFrame}>
            <LinearGradient
              colors={['#0ea5e9', '#06b6d4', '#22d3ee', '#06b6d4', '#0ea5e9']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.glowFrameGradient}
            />
            <View style={styles.glowFrameInner} />
          </View>
        )}
        <Image 
          source={icon} 
          style={[
            styles.icon,
            isActive ? {} : { opacity: 0.6 }
          ]} 
          contentFit="contain"
        />
      </Animated.View>
      
      <Animated.Text style={[styles.label, labelStyle]}>
        {label}
      </Animated.Text>
    </TouchableOpacity>
    </View>
  );
};

export default function GameBottomNav({ state, descriptors, navigation }: BottomTabBarProps) {
  const { step, targetRef } = useTutorial();
  // Map route names to icons and labels
  const getIcon = (routeName: string) => {
    // console.log('Getting icon for route:', routeName);
    switch (routeName) {
      case 'WorldMap':
      case 'Temple': return require('../../assets/world.png');
      case 'Hunter': return require('../../assets/huntericon.png');
      case 'System': return require('../../assets/system.png');
      case 'Shop': return require('../../assets/shopicon.png');
      case 'Social': return require('../../assets/leaderboard.png');
      default: 
        // console.warn('No icon found for route:', routeName);
        return require('../../assets/system.png');
    }
  };

  return (
    <View style={styles.rootContainer} pointerEvents="box-none">
      {/* Background Container (Clipped) */}
      <View style={styles.backgroundContainer}>
        <BlurView intensity={90} tint="dark" style={StyleSheet.absoluteFill} />
        <LinearGradient
            colors={['rgba(15, 23, 42, 0.8)', 'rgba(2, 6, 23, 0.95)']}
            style={StyleSheet.absoluteFill}
        />
        {/* Border Top Line */}
        <View style={styles.borderTop} />
      </View>

      {/* Nav Content (Unclipped for pop-out) */}
      <View style={styles.navContent} pointerEvents="box-none">
          {state.routes.map((route, index) => {
            const { options } = descriptors[route.key];
            const label =
              options.tabBarLabel !== undefined
                ? options.tabBarLabel
                : options.title !== undefined
                ? options.title
                : route.name;

            const isFocused = state.index === index;

            const onPress = () => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              const event = navigation.emit({
                type: 'tabPress',
                target: route.key,
                canPreventDefault: true,
              });

              if (!isFocused && !event.defaultPrevented) {
                navigation.navigate({ name: route.name, merge: true } as any);
              }
            };

            return (
              <NavItem
                  key={route.key}
                  id={route.name}
                  icon={getIcon(route.name)}
                  labelStyle={route.name === 'Social' ? { letterSpacing: 0 } : undefined}
                  label={label as string}
                  isActive={isFocused}
                  onPress={onPress}
                  targetRef={
                    ((route.name === 'Shop' && (step === 'NAV_SHOP' || step === 'NAV_SHOP_MAGIC' || step === 'NAV_SHOP_GACHA')) ||
                    (route.name === 'Hunter' && step === 'NAV_INVENTORY') ||
                    (route.name === 'System' && step === 'NAV_STATS') ||
                    (route.name === 'WorldMap' && step === 'NAV_MAP'))
                      ? targetRef
                      : undefined
                  }
              />
            );
          })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  rootContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 100, // Increased height to prevent clipping when popped up
    elevation: 0, 
    zIndex: 100,
  },
  backgroundContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 80, // Solid background part
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
    elevation: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -5 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  borderTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  navContent: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-end', 
    height: '100%',
    paddingBottom: 25, 
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    height: 120, // Tall enough for animation
    position: 'relative',
  },
  iconContainer: {
    width: 64,
    height: 64,
    justifyContent: 'center',
    alignItems: 'center',
  },
  glowFrame: {
    position: 'absolute',
    width: 38,
    height: 38,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#0ea5e9',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 12,
    elevation: 10,
  },
  glowFrameGradient: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    borderRadius: 8,
  },
  glowFrameInner: {
    width: 34,
    height: 34,
    borderRadius: 6,
    backgroundColor: 'rgba(15, 23, 42, 0.9)',
  },
  icon: {
    width: 32,
    height: 32,
    zIndex: 1,
  },
  label: {
    fontSize: 9,
    fontWeight: '900',
    color: '#00E8FF', // neon cyan
    textTransform: 'uppercase',
    letterSpacing: 1,
    position: 'absolute',
    bottom: 2,
  },
});
