// Converted React Native types file
// React Native TypeScript types
import React from 'react';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { ViewStyle, TextStyle, ImageStyle } from 'react-native';

// Define common style types for React Native
export type StyleType = ViewStyle | TextStyle | ImageStyle;

// Example: Define a type for a user object
export interface User {
  id: string;
  name: string;
  email: string;
  profilePicture?: string; // Optional profile picture URL
}

// Example: Define a type for a product object
export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  imageUrl: string;
}

// Example: Define a type for a navigation stack
export type RootStackParamList = {
  Home: undefined;
  Details: { productId: string };
  Profile: { userId: string };
  Login: undefined;
  Register: undefined;
  // Add more screens here
};

// Example: Define a type for the navigation prop for the Home screen
export type HomeScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  'Home'
>;

// Example: Define a type for the route prop for the Details screen
export type DetailsScreenRouteProp = RouteProp<RootStackParamList, 'Details'>;

// Example: Define a type for a component that displays a product card
export interface ProductCardProps {
  product: Product;
  onPress: (productId: string) => void;
  style?: StyleType; // Optional style
}

// Example: Define a type for a button component
export interface ButtonProps {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  style?: StyleType; // Optional style
  textStyle?: TextStyle; // Optional text style
}

// Example: Define a type for an input field component
export interface InputProps {
  placeholder: string;
  value: string;
  onChangeText: (text: string) => void;
  secureTextEntry?: boolean;
  keyboardType?: 'default' | 'number-pad' | 'email-address' | 'phone-pad';
  style?: StyleType; // Optional style
}

// Example: Define a type for an image component with error handling
export interface ImageProps {
  source: string;
  style?: StyleType; // Optional style
  onError?: () => void;
  resizeMode?: 'cover' | 'contain' | 'stretch' | 'repeat' | 'center';
}

// Example: Define a type for a loading indicator component
export interface LoadingIndicatorProps {
  animating: boolean;
  size?: 'small' | 'large';
  color?: string;
  style?: StyleType; // Optional style
}

// Example: Define a type for a list item component
export interface ListItemProps {
  title: string;
  subtitle?: string;
  onPress?: () => void;
  style?: StyleType; // Optional style
  titleStyle?: TextStyle; // Optional title style
  subtitleStyle?: TextStyle; // Optional subtitle style
  rightIcon?: React.ReactNode; // Optional right icon
}

// Example: Define a type for a modal component
export interface ModalProps {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
  style?: StyleType; // Optional style
}

// Example: Define a type for a form component
export interface FormProps {
  onSubmit: () => void;
  children: React.ReactNode;
  style?: StyleType; // Optional style
}

// Example: Define a type for a screen component
export interface ScreenProps {
  children: React.ReactNode;
  style?: StyleType; // Optional style
  statusBarColor?: string; // Optional status bar color
  translucentStatusBar?: boolean; // Optional translucent status bar
}

// Example: Define a type for a context
export interface AuthContextProps {
  user: User | null;
  login: (user: User) => void;
  logout: () => void;
}

// Example: Define a type for API response
export interface ApiResponse<T> {
  data: T | null;
  error: string | null;
  loading: boolean;
}