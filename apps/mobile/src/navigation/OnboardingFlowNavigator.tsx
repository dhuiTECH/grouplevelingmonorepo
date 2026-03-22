import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '@/contexts/AuthContext';
import GuestProfileBasicsScreen from '@/screens/GuestProfileBasicsScreen';
import AvatarScreen from '@/screens/AvatarScreen';
import ClassSelectionScreen from '@/screens/ClassSelectionScreen';

export type OnboardingFlowParamList = {
  GuestBasics: undefined;
  Avatar: undefined;
  ClassSelection: { avatarConfig?: any } | undefined;
};

const OnboardingStack = createNativeStackNavigator<OnboardingFlowParamList>();

export function OnboardingFlowNavigator(): React.ReactElement {
  const { user } = useAuth();
  const step = user?.onboarding_step ?? 'basics';
  const initialRouteName =
    step === 'avatar' ? 'Avatar' : step === 'class' ? 'ClassSelection' : 'GuestBasics';

  return (
    <OnboardingStack.Navigator
      key={step}
      initialRouteName={initialRouteName}
      screenOptions={{ headerShown: false }}
    >
      <OnboardingStack.Screen name="GuestBasics" component={GuestProfileBasicsScreen} />
      <OnboardingStack.Screen name="Avatar" component={AvatarScreen} />
      <OnboardingStack.Screen name="ClassSelection" component={ClassSelectionScreen} />
    </OnboardingStack.Navigator>
  );
}
