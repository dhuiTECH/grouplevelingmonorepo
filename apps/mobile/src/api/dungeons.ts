// Converted React Native api file
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import React from 'react';

const BASE_URL = 'https://your-api-endpoint.com'; // Replace with your actual API endpoint

// Utility function for handling network requests
const handleRequest = async (url: string, options: RequestInit = {}) => {
  try {
    const response = await fetch(url, options);

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      return await response.json();
    } else {
      return await response.text(); // Handle non-JSON responses if needed
    }
  } catch (error: any) {
    console.error('API Request Error:', error.message, url, options);
    throw error; // Re-throw the error for the calling function to handle
  }
};

// Utility function for storing data securely (example using AsyncStorage)
const storeData = async (key: string, value: any) => {
  try {
    const jsonValue = JSON.stringify(value);
    await AsyncStorage.setItem(key, jsonValue);
  } catch (e) {
    console.error('Error storing data:', e);
  }
};

// Utility function for retrieving data securely
const getData = async (key: string) => {
  try {
    const jsonValue = await AsyncStorage.getItem(key);
    return jsonValue != null ? JSON.parse(jsonValue) : null;
  } catch (e) {
    console.error('Error getting data:', e);
    return null;
  }
};

// Utility function for removing data securely
const removeData = async (key: string) => {
  try {
    await AsyncStorage.removeItem(key);
  } catch (e) {
    console.error('Error removing data:', e);
  }
};

// Example API functions
export const api = {
  getDungeons: async () => {
    const url = `${BASE_URL}/dungeons`;
    return handleRequest(url);
  },

  getDungeonById: async (id: string) => {
    const url = `${BASE_URL}/dungeons/${id}`;
    return handleRequest(url);
  },

  createDungeon: async (dungeonData: any) => {
    const url = `${BASE_URL}/dungeons`;
    const options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(dungeonData),
    };
    return handleRequest(url, options);
  },

  updateDungeon: async (id: string, dungeonData: any) => {
    const url = `${BASE_URL}/dungeons/${id}`;
    const options = {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(dungeonData),
    };
    return handleRequest(url, options);
  },

  deleteDungeon: async (id: string) => {
    const url = `${BASE_URL}/dungeons/${id}`;
    const options = {
      method: 'DELETE',
    };
    return handleRequest(url, options);
  },

  // Example authentication-related functions (using AsyncStorage)
  storeToken: async (token: string) => {
    await storeData('authToken', token);
  },

  getToken: async (): Promise<string | null> => {
    return await getData('authToken');
  },

  removeToken: async () => {
    await removeData('authToken');
  },

  // Example function to check platform
  getPlatform: () => {
    return Platform.OS;
  },
};