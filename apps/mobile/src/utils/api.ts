// Converted React Native utils file
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform, Image } from 'react-native';
import * as FileSystem from 'expo-file-system';
import * as DocumentPicker from 'expo-document-picker';
import { manipulateAsync, FlipType, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import React from 'react';

// React Native utility functions
export const api = {
  /**
   * Saves data to AsyncStorage.
   * @param key The key to store the data under.
   * @param value The data to store (must be stringified).
   */
  async saveData(key: string, value: string): Promise<void> {
    try {
      await AsyncStorage.setItem(key, value);
    } catch (error) {
      console.error('Error saving data to AsyncStorage:', error);
      throw error; // Re-throw to allow calling function to handle
    }
  },

  /**
   * Retrieves data from AsyncStorage.
   * @param key The key to retrieve the data for.
   * @returns The retrieved data, or null if the key doesn't exist.
   */
  async getData(key: string): Promise<string | null> {
    try {
      const value = await AsyncStorage.getItem(key);
      return value;
    } catch (error) {
      console.error('Error getting data from AsyncStorage:', error);
      return null; // Or throw error, depending on desired behavior
    }
  },

  /**
   * Removes data from AsyncStorage.
   * @param key The key to remove.
   */
  async removeData(key: string): Promise<void> {
    try {
      await AsyncStorage.removeItem(key);
    } catch (error) {
      console.error('Error removing data from AsyncStorage:', error);
      throw error;
    }
  },

  /**
   * Clears all data from AsyncStorage.  Use with caution!
   */
  async clearAllData(): Promise<void> {
    try {
      await AsyncStorage.clear();
    } catch (error) {
      console.error('Error clearing AsyncStorage:', error);
      throw error;
    }
  },

  /**
   * Checks if running on Android.
   */
  isAndroid(): boolean {
    return Platform.OS === 'android';
  },

  /**
   * Checks if running on iOS.
   */
  isIOS(): boolean {
    return Platform.OS === 'ios';
  },

  /**
   * Picks a document using Expo DocumentPicker.
   * @returns The picked document or null if cancelled.
   */
  async pickDocument(): Promise<DocumentPicker.DocumentResult | null> {
    try {
      const result = await DocumentPicker.getDocumentAsync();
      if (result.type === 'success') {
        return result;
      } else {
        return null; // User cancelled
      }
    } catch (error: any) {
      console.error('Error picking document:', error);
      // Handle specific error cases, e.g., permission denied
      if (error.code === 'E_DOCUMENT_PICKER_CANCELED') {
        return null; // User cancelled
      }
      throw error; // Re-throw to allow calling function to handle
    }
  },

  /**
   * Reads a file as text using Expo FileSystem.
   * @param uri The URI of the file.
   * @returns The file content as text.
   */
  async readFileAsText(uri: string): Promise<string> {
    try {
      const content = await FileSystem.readAsStringAsync(uri);
      return content;
    } catch (error) {
      console.error('Error reading file as text:', error);
      throw error;
    }
  },

  /**
   * Writes text to a file using Expo FileSystem.
   * @param uri The URI of the file.
   * @param content The text content to write.
   */
  async writeFile(uri: string, content: string): Promise<void> {
    try {
      await FileSystem.writeAsStringAsync(uri, content);
    } catch (error) {
      console.error('Error writing file:', error);
      throw error;
    }
  },

  /**
   * Downloads a file from a URL using Expo FileSystem.
   * @param url The URL of the file to download.
   * @param localUri The local URI to save the downloaded file to.
   */
  async downloadFile(url: string, localUri: string): Promise<FileSystem.DownloadResult> {
    try {
      const downloadResumable = FileSystem.createDownloadResumable(
        url,
        localUri
      );
      const { uri } = await downloadResumable.downloadAsync();
      return { uri };
    } catch (error) {
      console.error('Error downloading file:', error);
      throw error;
    }
  },

  /**
   * Selects an image from the device's library using Expo ImagePicker.
   * @returns The picked image or null if cancelled.
   */
  async pickImage(): Promise<ImagePicker.ImagePickerResult | null> {
    try {
      let permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (permissionResult.status !== 'granted') {
        console.log('Permission to access camera roll is required!');
        return null;
      }

      let pickerResult = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.All,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 1,
      });

      if (pickerResult.canceled === true) {
        return null;
      }

      return pickerResult;
    } catch (error) {
      console.error('Error picking image:', error);
      throw error;
    }
  },

  /**
   * Takes a photo using the device's camera using Expo ImagePicker.
   * @returns The taken photo or null if cancelled.
   */
  async takePhoto(): Promise<ImagePicker.ImagePickerResult | null> {
    try {
      const cameraPermission = await ImagePicker.requestCameraPermissionsAsync();
      const mediaLibraryPermission = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (cameraPermission.status !== 'granted' || mediaLibraryPermission.status !== 'granted') {
        console.log('Permissions to access camera and media library are required!');
        return null;
      }

      const pickerResult = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [4, 3],
        quality: 1,
      });

      if (pickerResult.canceled === true) {
        return null;
      }

      return pickerResult;
    } catch (error) {
      console.error('Error taking photo:', error);
      throw error;
    }
  },

  /**
   * Manipulates an image (e.g., resize, rotate) using expo-image-manipulator.
   * @param uri The URI of the image.
   * @param actions An array of manipulation actions.
   * @returns The manipulated image URI.
   */
  async manipulateImage(uri: string, actions: { resize?: { width?: number; height?: number; }; rotate?: number; flip?: FlipType; }): Promise<string | null> {
    try {
      const { resize, rotate, flip } = actions;
      const result = await manipulateAsync(
        uri,
        [
          ...(resize ? [{ resize: resize }] : []),
          ...(rotate ? [{ rotate: rotate }] : []),
          ...(flip ? [{ flip: flip }] : []),
        ],
        { compress: 0.8, format: SaveFormat.JPEG }
      );
      return result.uri;
    } catch (error) {
      console.error('Error manipulating image:', error);
      return null;
    }
  },

  /**
   * Gets the file information (size, type, etc.) for a given URI.
   * @param uri The URI of the file.
   * @returns The file information.
   */
  async getFileInfo(uri: string): Promise<FileSystem.FileInfo> {
    try {
      const fileInfo = await FileSystem.getInfoAsync(uri, { size: true });
      return fileInfo;
    } catch (error) {
      console.error('Error getting file info:', error);
      throw error;
    }
  },

  /**
   * Deletes a file at the given URI.
   * @param uri The URI of the file to delete.
   */
  async deleteFile(uri: string): Promise<void> {
    try {
      await FileSystem.deleteAsync(uri, { idempotent: true });
    } catch (error) {
      console.error('Error deleting file:', error);
      throw error;
    }
  },

  /**
   * Copies a file from one URI to another.
   * @param fromUri The source URI.
   * @param toUri The destination URI.
   */
  async copyFile(fromUri: string, toUri: string): Promise<void> {
    try {
      await FileSystem.copyAsync({ from: fromUri, to: toUri });
    } catch (error) {
      console.error('Error copying file:', error);
      throw error;
    }
  },

  /**
   * Moves a file from one URI to another.
   * @param fromUri The source URI.
   * @param toUri The destination URI.
   */
  async moveFile(fromUri: string, toUri: string): Promise<void> {
    try {
      await FileSystem.moveAsync({ from: fromUri, to: toUri });
    } catch (error) {
      console.error('Error moving file:', error);
      throw error;
    }
  },

  /**
   * Creates a directory at the given URI.
   * @param uri The URI of the directory to create.
   * @param options Options for creating the directory.
   */
  async makeDirectory(uri: string, options?: FileSystem.MakeDirectoryOptions): Promise<void> {
    try {
      await FileSystem.makeDirectoryAsync(uri, options);
    } catch (error) {
      console.error('Error making directory:', error);
      throw error;
    }
  },

  /**
   * Deletes a directory at the given URI.
   * @param uri The URI of the directory to delete.
   * @param options Options for deleting the directory.
   */
  async deleteDirectory(uri: string, options?: FileSystem.DeleteOptions): Promise<void> {
    try {
      await FileSystem.deleteAsync(uri, options);
    } catch (error) {
      console.error('Error deleting directory:', error);
      throw error;
    }
  },

  /**
   * Reads the contents of a directory at the given URI.
   * @param uri The URI of the directory to read.
   * @returns An array of file and directory names in the directory.
   */
  async readDirectory(uri: string): Promise<string[]> {
    try {
      const contents = await FileSystem.readDirectoryAsync(uri);
      return contents;
    } catch (error) {
      console.error('Error reading directory:', error);
      throw error;
    }
  },

  /**
   * Checks if a file or directory exists at the given URI.
   * @param uri The URI to check.
   * @returns True if the file or directory exists, false otherwise.
   */
  async fileExists(uri: string): Promise<boolean> {
    try {
      const fileInfo = await FileSystem.getInfoAsync(uri);
      return fileInfo.exists;
    } catch (error) {
      console.error('Error checking if file exists:', error);
      return false; // Or throw error, depending on desired behavior
    }
  },
};