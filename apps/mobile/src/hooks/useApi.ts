// Converted React Native hooks file
import React from 'react';
import { useState, useEffect, useCallback } from 'react';
import { Alert, Text, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface ApiResponse<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  fetchData: (url: string, options?: RequestInit) => Promise<void>;
}

export const useApi = <T>(): ApiResponse<T> => {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async (url: string, options?: RequestInit) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(url, options);

      if (!response.ok) {
        const errorData = await response.json(); // Attempt to parse JSON error
        const errorMessage = errorData?.message || `Request failed with status ${response.status}`;
        throw new Error(errorMessage);
      }

      const jsonData: T = await response.json();
      setData(jsonData);
    } catch (e: any) {
      console.error("API Fetch Error:", e);
      setError(e.message || 'An unexpected error occurred');
      Alert.alert("Error", e.message || 'An unexpected error occurred'); // Display error to user
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    data,
    loading,
    error,
    fetchData,
  };
};

// Example usage (in a component):
// import { useApi } from './hooks/useApi';

// interface MyDataType {
//   id: number;
//   name: string;
// }

// const MyComponent = () => {
//   const { data, loading, error, fetchData } = useApi<MyDataType[]>();

//   useEffect(() => {
//     fetchData('https://myapi.com/data'); // Replace with your API endpoint
//   }, [fetchData]);

//   if (loading) {
//     return <Text>Loading...</Text>;
//   }

//   if (error) {
//     return <Text>Error: {error}</Text>;
//   }

//   return (
//     <View>
//       {data && data.map(item => (
//         <Text key={item.id}>{item.name}</Text>
//       ))}
//     </View>
//   );
// };