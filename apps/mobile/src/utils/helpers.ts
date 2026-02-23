// Converted React Native utils file
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform, Linking } from 'react-native';
import * as FileSystem from 'expo-file-system';
import * as DocumentPicker from 'expo-document-picker';
import { manipulateAsync, FlipType, SaveFormat } from 'expo-image-manipulator';
import React from 'react';

// React Native utility functions
export const helpers = {
  /**
   * Stores data in AsyncStorage.
   * @param key The key to store the data under.
   * @param value The data to store (must be stringifiable).
   */
  storeData: async (key: string, value: any): Promise<void> => {
    try {
      const jsonValue = JSON.stringify(value);
      await AsyncStorage.setItem(key, jsonValue);
    } catch (e) {
      console.error('Error storing data:', e);
      // Consider throwing the error or returning a boolean indicating success/failure
      throw new Error(`Failed to store data for key ${key}: ${e}`);
    }
  },

  /**
   * Retrieves data from AsyncStorage.
   * @param key The key to retrieve the data for.
   * @returns The retrieved data, or null if not found.
   */
  getData: async (key: string): Promise<any | null> => {
    try {
      const jsonValue = await AsyncStorage.getItem(key);
      return jsonValue != null ? JSON.parse(jsonValue) : null;
    } catch (e) {
      console.error('Error getting data:', e);
      // Consider throwing the error or returning null
      return null;
    }
  },

  /**
   * Removes data from AsyncStorage.
   * @param key The key to remove.
   */
  removeData: async (key: string): Promise<void> => {
    try {
      await AsyncStorage.removeItem(key);
    } catch (e) {
      console.error('Error removing data:', e);
      // Consider throwing the error or returning a boolean indicating success/failure
      throw new Error(`Failed to remove data for key ${key}: ${e}`);
    }
  },

  /**
   * Opens a URL in the device's default browser.
   * @param url The URL to open.
   */
  openURL: async (url: string): Promise<void> => {
    try {
      const supported = await Linking.canOpenURL(url);

      if (supported) {
        await Linking.openURL(url);
      } else {
        console.error("Don't know how to open URI: " + url);
        // Consider showing an alert to the user
        throw new Error(`Don't know how to open URI: ${url}`);
      }
    } catch (e) {
      console.error('Error opening URL:', e);
      // Consider showing an alert to the user
      throw new Error(`Failed to open URL ${url}: ${e}`);
    }
  },

  /**
   * Checks if the app is running on Android.
   * @returns True if the app is running on Android, false otherwise.
   */
  isAndroid: (): boolean => {
    return Platform.OS === 'android';
  },

  /**
   * Checks if the app is running on iOS.
   * @returns True if the app is running on iOS, false otherwise.
   */
  isIOS: (): boolean => {
    return Platform.OS === 'ios';
  },

  /**
   * Downloads a file from a URL to the device's file system.
   * @param url The URL of the file to download.
   * @param destinationUri The local URI to save the file to.
   * @returns The result of the download operation.
   */
  downloadFile: async (url: string, destinationUri: string): Promise<FileSystem.DownloadResult> => {
    try {
      const result = await FileSystem.downloadAsync(url, destinationUri);
      return result;
    } catch (e) {
      console.error('Error downloading file:', e);
      throw new Error(`Failed to download file from ${url} to ${destinationUri}: ${e}`);
    }
  },

  /**
   * Reads the contents of a file as a string.
   * @param uri The URI of the file to read.
   * @param options Options for reading the file.
   * @returns The contents of the file as a string.
   */
  readFile: async (uri: string, options?: FileSystem.ReadAsStringOptions): Promise<string> => {
    try {
      const content = await FileSystem.readAsStringAsync(uri, options);
      return content;
    } catch (e) {
      console.error('Error reading file:', e);
      throw new Error(`Failed to read file ${uri}: ${e}`);
    }
  },

  /**
   * Writes a string to a file.
   * @param uri The URI of the file to write to.
   * @param contents The string to write to the file.
   * @param options Options for writing the file.
   */
  writeFile: async (uri: string, contents: string, options?: FileSystem.WriteOptions): Promise<void> => {
    try {
      await FileSystem.writeAsStringAsync(uri, contents, options);
    } catch (e) {
      console.error('Error writing file:', e);
      throw new Error(`Failed to write file ${uri}: ${e}`);
    }
  },

  /**
   * Deletes a file.
   * @param uri The URI of the file to delete.
   */
  deleteFile: async (uri: string): Promise<void> => {
    try {
      await FileSystem.deleteAsync(uri);
    } catch (e) {
      console.error('Error deleting file:', e);
      throw new Error(`Failed to delete file ${uri}: ${e}`);
    }
  },

  /**
   * Picks a document from the device's file system.
   * @param options Options for picking the document.
   * @returns The picked document, or null if the user cancelled the picker.
   */
  pickDocument: async (options?: DocumentPicker.DocumentPickerOptions): Promise<DocumentPicker.DocumentResult | null> => {
    try {
      const result = await DocumentPicker.getDocumentAsync(options);

      if (result.type === 'success') {
        return result;
      } else {
        return null; // User cancelled the picker
      }
    } catch (e) {
      console.error('Error picking document:', e);
      throw new Error(`Failed to pick document: ${e}`);
    }
  },

  /**
   * Manipulates an image (e.g., resize, rotate, flip).  Requires expo-image-manipulator.
   * @param uri The URI of the image to manipulate.
   * @param actions An array of manipulation actions.
   * @param saveOptions Options for saving the manipulated image.
   * @returns The result of the manipulation.
   */
  manipulateImage: async (
    uri: string,
    actions: { resize?: { width?: number; height?: number }; rotate?: number; flip?: FlipType }[],
    saveOptions?: { compress?: number; format?: SaveFormat; base64?: boolean }
  ): Promise<FileSystem.FileInfo> => {
    try {
      const result = await manipulateAsync(uri, actions, saveOptions);
      if (!result) {
        throw new Error("Image manipulation failed: result is null");
      }
      return result;
    } catch (e) {
      console.error('Error manipulating image:', e);
      throw new Error(`Failed to manipulate image ${uri}: ${e}`);
    }
  },

  /**
   * Gets information about a file.
   * @param uri The URI of the file.
   * @param options Options for getting the file info.
   * @returns The file info.
   */
  getFileInfo: async (uri: string, options?: FileSystem.InfoOptions): Promise<FileSystem.FileInfo> => {
    try {
      const info = await FileSystem.getInfoAsync(uri, options);
      return info;
    } catch (e) {
      console.error('Error getting file info:', e);
      throw new Error(`Failed to get file info for ${uri}: ${e}`);
    }
  },

  /**
   * Creates a directory.
   * @param uri The URI of the directory to create.
   * @param options Options for creating the directory.
   */
  makeDirectory: async (uri: string, options?: FileSystem.MakeDirectoryOptions): Promise<void> => {
    try {
      await FileSystem.makeDirectoryAsync(uri, options);
    } catch (e) {
      console.error('Error creating directory:', e);
      throw new Error(`Failed to create directory ${uri}: ${e}`);
    }
  },

  /**
   * Deletes a directory.
   * @param uri The URI of the directory to delete.
   * @param options Options for deleting the directory.
   */
  deleteDirectory: async (uri: string, options?: FileSystem.DeleteOptions): Promise<void> => {
    try {
      await FileSystem.deleteAsync(uri, options);
    } catch (e) {
      console.error('Error deleting directory:', e);
      throw new Error(`Failed to delete directory ${uri}: ${e}`);
    }
  },

  /**
   * Checks if a file or directory exists.
   * @param uri The URI of the file or directory.
   * @returns True if the file or directory exists, false otherwise.
   */
  fileExists: async (uri: string): Promise<boolean> => {
    try {
      const info = await FileSystem.getInfoAsync(uri);
      return info.exists;
    } catch (e) {
      console.error('Error checking file existence:', e);
      return false; // Assume file doesn't exist on error
    }
  },

  /**
   * Moves a file.
   * @param from The URI of the file to move.
   * @param to The URI to move the file to.
   * @param options Options for moving the file.
   */
  moveFile: async (from: string, to: string, options?: FileSystem.MoveOptions): Promise<void> => {
    try {
      await FileSystem.moveAsync({ from, to, options });
    } catch (e) {
      console.error('Error moving file:', e);
      throw new Error(`Failed to move file from ${from} to ${to}: ${e}`);
    }
  },

  /**
   * Copies a file.
   * @param from The URI of the file to copy.
   * @param to The URI to copy the file to.
   * @param options Options for copying the file.
   */
  copyFile: async (from: string, to: string, options?: FileSystem.CopyOptions): Promise<void> => {
    try {
      await FileSystem.copyAsync({ from, to, options });
    } catch (e) {
      console.error('Error copying file:', e);
      throw new Error(`Failed to copy file from ${from} to ${to}: ${e}`);
    }
  },

  /**
   * Lists the contents of a directory.
   * @param uri The URI of the directory.
   * @returns An array of the names of the files and directories in the directory.
   */
  readDirectory: async (uri: string): Promise<string[]> => {
    try {
      const contents = await FileSystem.readDirectoryAsync(uri);
      return contents;
    } catch (e) {
      console.error('Error reading directory:', e);
      throw new Error(`Failed to read directory ${uri}: ${e}`);
    }
  },

  /**
   * Gets the free disk storage.
   * @returns The free disk storage in bytes.
   */
  getFreeDiskStorage: async (): Promise<number> => {
    try {
      const freeDiskStorage = await FileSystem.getFreeDiskStorageAsync();
      return freeDiskStorage;
    } catch (e) {
      console.error('Error getting free disk storage:', e);
      throw new Error(`Failed to get free disk storage: ${e}`);
    }
  },

  /**
   * Gets the total disk capacity.
   * @returns The total disk capacity in bytes.
   */
  getTotalDiskCapacity: async (): Promise<number> => {
    try {
      const totalDiskCapacity = await FileSystem.getTotalDiskCapacityAsync();
      return totalDiskCapacity;
    } catch (e) {
      console.error('Error getting total disk capacity:', e);
      throw new Error(`Failed to get total disk capacity: ${e}`);
    }
  },
};