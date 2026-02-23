import React from 'react';
import { Platform } from 'react-native';

// React Native utility functions
export const dateUtils = {
  /**
   * Formats a date object to a string in the format YYYY-MM-DD.
   * @param {Date} date - The date object to format.
   * @returns {string} The formatted date string.
   */
  formatDate: (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  },

  /**
   * Parses a date string in the format YYYY-MM-DD to a Date object.
   * @param {string} dateString - The date string to parse.
   * @returns {Date | null} The Date object, or null if the string is invalid.
   */
  parseDate: (dateString: string): Date | null => {
    try {
      const [year, month, day] = dateString.split('-').map(Number);
      if (year < 1000 || year > 9999 || month < 1 || month > 12 || day < 1 || day > 31) {
        return null; // Invalid date components
      }
      return new Date(year, month - 1, day);
    } catch (error) {
      return null; // Invalid date string format
    }
  },

  /**
   * Calculates the difference in days between two dates.
   * @param {Date} date1 - The first date.
   * @param {Date} date2 - The second date.
   * @returns {number} The difference in days.
   */
  daysBetween: (date1: Date, date2: Date): number => {
    const oneDay = 24 * 60 * 60 * 1000; // milliseconds in a day
    return Math.round(Math.abs((date1.getTime() - date2.getTime()) / oneDay));
  },

  /**
   * Adds a specified number of days to a date.
   * @param {Date} date - The original date.
   * @param {number} days - The number of days to add.
   * @returns {Date} A new Date object representing the date after adding the days.
   */
  addDays: (date: Date, days: number): Date => {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  },

  /**
   * Checks if two dates are on the same day, ignoring the time.
   * @param {Date} date1 - The first date.
   * @param {Date} date2 - The second date.
   * @returns {boolean} True if the dates are on the same day, false otherwise.
   */
  isSameDay: (date1: Date, date2: Date): boolean => {
    return (
      date1.getFullYear() === date2.getFullYear() &&
      date1.getMonth() === date2.getMonth() &&
      date1.getDate() === date2.getDate()
    );
  },

  /**
   * Returns the current date and time in ISO format.
   * @returns {string} The current date and time in ISO format.
   */
  nowISO: (): string => {
    return new Date().toISOString();
  },

  /**
   * Checks if the current platform is iOS.
   * @returns {boolean} True if the platform is iOS, false otherwise.
   */
  isIOS: (): boolean => {
    return Platform.OS === 'ios';
  },

  /**
   * Checks if the current platform is Android.
   * @returns {boolean} True if the platform is Android, false otherwise.
   */
  isAndroid: (): boolean => {
    return Platform.OS === 'android';
  },

  /**
   * Gets the current timestamp in milliseconds.
   * @returns {number} The current timestamp.
   */
  getCurrentTimestamp: (): number => {
    return Date.now();
  },

  /**
   * Converts a timestamp to a Date object.
   * @param {number} timestamp - The timestamp in milliseconds.
   * @returns {Date} The Date object.
   */
  timestampToDate: (timestamp: number): Date => {
    return new Date(timestamp);
  },

  /**
   * Gets the start of the day for a given date.
   * @param {Date} date - The date to get the start of the day for.
   * @returns {Date} A new Date object representing the start of the day.
   */
  getStartOfDay: (date: Date): Date => {
    const newDate = new Date(date);
    newDate.setHours(0, 0, 0, 0);
    return newDate;
  },

  /**
   * Gets the end of the day for a given date.
   * @param {Date} date - The date to get the end of the day for.
   * @returns {Date} A new Date object representing the end of the day.
   */
  getEndOfDay: (date: Date): Date => {
    const newDate = new Date(date);
    newDate.setHours(23, 59, 59, 999);
    return newDate;
  },

  /**
   * Gets the Monday of the week for a given date (ISO week).
   * @param date - The date to get the week for.
   * @returns Date set to Monday 00:00:00 of that week.
   */
  getStartOfWeek: (date: Date): Date => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday = 1
    d.setDate(diff);
    d.setHours(0, 0, 0, 0);
    return d;
  },

  /**
   * Returns a string key for the current week (Monday date YYYY-MM-DD) for vote scoping.
   */
  getCurrentWeekKey: (date: Date = new Date()): string => {
    const start = dateUtils.getStartOfWeek(date);
    return dateUtils.formatDate(start);
  },

  /**
   * Days until next Monday 00:00 (start of next week).
   */
  getDaysUntilNextWeek: (date: Date = new Date()): number => {
    const start = dateUtils.getStartOfWeek(date);
    const nextMonday = dateUtils.addDays(start, 7);
    const now = dateUtils.getStartOfDay(date);
    return Math.max(0, Math.ceil((nextMonday.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)));
  },
};