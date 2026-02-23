// Converted React Native types file

import React from 'react';

// Example Item Interface
export interface Item {
  id: string;
  name: string;
  description?: string;
  price: number;
  imageUrl?: string;
  isAvailable: boolean;
  category?: string;
  quantity?: number; // Add quantity for mobile (e.g., shopping cart)
}

// Example Category Interface
export interface Category {
  id: string;
  name: string;
  imageUrl?: string;
}

// Example Cart Item Interface
export interface CartItem extends Item {
  quantity: number;
}

// Example User Interface
export interface User {
  id: string;
  username: string;
  email: string;
  profilePicture?: string;
  address?: string;
  phoneNumber?: string;
}

// Example Order Interface
export interface Order {
  id: string;
  userId: string;
  items: CartItem[];
  totalAmount: number;
  orderDate: Date;
  shippingAddress: string;
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
}

// Example Navigation Types (using React Navigation)
import type { StackNavigationProp } from '@react-navigation/stack';
import type { RouteProp } from '@react-navigation/native';

export type RootStackParamList = {
  Home: undefined;
  Details: { itemId: string };
  Cart: undefined;
  Checkout: undefined;
  Profile: undefined;
  Login: undefined;
  Register: undefined;
  Orders: undefined;
  OrderDetails: { orderId: string };
  // Add more screens here
};

export type HomeScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  'Home'
>;

export type DetailsScreenRouteProp = RouteProp<RootStackParamList, 'Details'>;
export type DetailsScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  'Details'
>;

export type OrderDetailsScreenRouteProp = RouteProp<RootStackParamList, 'OrderDetails'>;
export type OrderDetailsScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  'OrderDetails'
>;

// Example API Response Type
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Example Authentication Types
export interface AuthContextType {
  user: User | null;
  login: (userData: User) => void;
  logout: () => void;
  isLoading: boolean;
}

// Example Theme Types
import { Theme } from '@react-navigation/native';

export interface CustomTheme extends Theme {
  colors: {
    primary: string;
    background: string;
    text: string;
    card: string;
    border: string;
    notification: string;
    secondary: string;
    success: string;
    error: string;
    warning: string;
    info: string;
  };
}