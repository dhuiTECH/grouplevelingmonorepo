import React from 'react';
import { View, ActivityIndicator } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import type { RootStackParamList, RootTabParamList } from '@/types/navigation';
import { useAuth } from '@/contexts/AuthContext';

import HomeScreen from '@/screens/HomeScreen';
import LoginScreen from '@/screens/LoginScreen';
import SignupScreen from '@/screens/SignupScreen';
import DashboardScreen from '@/screens/DashboardScreen';
import TrainingScreen from '@/screens/TrainingScreen';
import DungeonScreen from '@/screens/DungeonScreen';
import ShopScreen from '@/screens/ShopScreen';
import SocialScreen from '@/screens/SocialScreen';
import InventoryScreen from '@/screens/InventoryScreen';
import AdminScreen from '@/screens/AdminScreen';
import ClassSelectionScreen from '@/screens/ClassSelectionScreen';
import { OnboardingFlowNavigator } from '@/navigation/OnboardingFlowNavigator';
import { TempleScreen } from '@/screens/TempleScreen';
import WorldMapScreen from '@/screens/WorldMapScreen';
import BattleScreen from '@/screens/BattleScreen';
import DungeonTrackerScreen from '@/screens/DungeonTrackerScreen';
import RunCompleteScreen from '@/screens/RunCompleteScreen';
import DungeonLeaderboardScreen from '@/screens/DungeonLeaderboardScreen';

import { PetDetailScreen } from '@/screens/PetDetailScreen';

import GameBottomNav from '@/components/GameBottomNav';

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<RootTabParamList>();

function BottomTabNavigator() {
  return (
    <Tab.Navigator
      tabBar={props => <GameBottomNav {...props} />}
      screenOptions={{
        headerShown: false,
        tabBarStyle: { display: 'none' }, // We are using a custom tab bar
      }}
      initialRouteName="System"
    >
      <Tab.Screen 
        name="WorldMap" 
        component={WorldMapScreen} 
        options={{ tabBarLabel: 'World' }}
      />
      <Tab.Screen name="Hunter" component={InventoryScreen} />
      <Tab.Screen name="System" component={HomeScreen} />
      <Tab.Screen name="Shop" component={ShopScreen} />
      <Tab.Screen name="Social" component={SocialScreen} />
    </Tab.Navigator>
  );
}

export function AppNavigator(): JSX.Element {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0f172a' }}>
        <ActivityIndicator size="large" color="#00ffff" />
      </View>
    );
  }

  return (
    <Stack.Navigator 
      screenOptions={{
        headerShown: false, // Hide header for all stack screens by default
      }}
    >
      {user ? (
        // Authenticated Stack
        !user.onboarding_completed ? (
          <Stack.Screen name="OnboardingFlow" component={OnboardingFlowNavigator} />
        ) : (
          <>
            <Stack.Screen 
              name="Home" 
              component={BottomTabNavigator} 
            />
            {/* ClassSelectionScreen can still be accessed if needed, e.g. for re-spec */}
            <Stack.Screen 
              name="ClassSelection" 
              component={ClassSelectionScreen}
            />
            <Stack.Screen 
              name="Dungeon" 
              component={DungeonScreen}
              options={{ title: 'Dungeon' }}
            />
            <Stack.Screen 
              name="Dashboard" 
              component={DashboardScreen}
              options={{ title: 'Dashboard' }}
            />
            <Stack.Screen 
              name="Admin" 
              component={AdminScreen}
            />
            <Stack.Screen 
              name="WorldMap" 
              component={WorldMapScreen}
            />
            <Stack.Screen 
              name="Battle" 
              component={BattleScreen}
              options={{ gestureEnabled: false }}
            />
            <Stack.Screen 
              name="DungeonTracker" 
              component={DungeonTrackerScreen}
              options={{ gestureEnabled: false, headerShown: false }}
            />
            <Stack.Screen 
              name="RunComplete" 
              component={RunCompleteScreen}
              options={{ gestureEnabled: false, headerShown: false }}
            />
            <Stack.Screen 
              name="DungeonLeaderboard" 
              component={DungeonLeaderboardScreen}
              options={{ gestureEnabled: true, headerShown: false }}
            />
            <Stack.Screen 
              name="Temple" 
              component={TempleScreen}
            />
            <Stack.Screen 
              name="PetDetail" 
              component={PetDetailScreen}
              options={{ presentation: 'modal' }}
            />
          </>
        )
      ) : (
        // Auth Stack
        <>
          <Stack.Screen 
            name="Signup" 
            component={SignupScreen}
          />
          <Stack.Screen 
            name="Login" 
            component={LoginScreen}
          />
        </>
      )}
    </Stack.Navigator>
  );
}