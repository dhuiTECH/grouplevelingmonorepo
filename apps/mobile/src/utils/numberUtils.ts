// Converted React Native utils file
import { Platform, NativeModules } from 'react-native';
import React from 'react';

// React Native utility functions
export const numberUtils = {
  /**
   * Formats a number as currency.
   * @param amount The number to format.
   * @param currency The currency code (e.g., 'USD', 'EUR'). Defaults to 'USD'.
   * @param locale The locale to use for formatting. Defaults to the device's locale.
   * @returns The formatted currency string.
   */
  formatCurrency: (amount: number, currency: string = 'USD', locale?: string): string => {
    try {
      const currentLocale = locale || (Platform.OS === 'ios'
        ? NativeModules.SettingsManager.settings.AppleLocale || NativeModules.SettingsManager.settings.AppleLanguages[0]
        : NativeModules.I18nManager.localeIdentifier);

      return new Intl.NumberFormat(currentLocale, {
        style: 'currency',
        currency: currency,
      }).format(amount);
    } catch (error) {
      console.error("Error formatting currency:", error);
      return `${currency} ${amount.toFixed(2)}`; // Fallback
    }
  },

  /**
   * Checks if a value is a valid number.
   * @param value The value to check.
   * @returns True if the value is a valid number, false otherwise.
   */
  isValidNumber: (value: any): boolean => {
    return typeof value === 'number' && !isNaN(value);
  },

  /**
   * Parses a string to a number. Returns null if the string is not a valid number.
   * @param str The string to parse.
   * @returns The parsed number, or null if the string is not a valid number.
   */
  parseNumber: (str: string): number | null => {
    const num = Number(str);
    return isNaN(num) ? null : num;
  },

  /**
   * Generates a random integer within a specified range.
   * @param min The minimum value (inclusive).
   * @param max The maximum value (inclusive).
   * @returns A random integer within the specified range.
   */
  getRandomInt: (min: number, max: number): number => {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min;
  },

  /**
   * Rounds a number to a specified number of decimal places.
   * @param num The number to round.
   * @param decimalPlaces The number of decimal places to round to.
   * @returns The rounded number.
   */
  roundNumber: (num: number, decimalPlaces: number): number => {
    const factor = Math.pow(10, decimalPlaces);
    return Math.round(num * factor) / factor;
  },

  /**
   * Converts a number to a percentage string.
   * @param num The number to convert.
   * @param decimalPlaces The number of decimal places to include in the percentage string.
   * @returns The percentage string.
   */
  toPercentage: (num: number, decimalPlaces: number = 0): string => {
    return `${numberUtils.roundNumber(num * 100, decimalPlaces)}%`;
  },

  /**
   * Formats a large number with commas for better readability.
   * @param num The number to format.
   * @returns The formatted number string.
   */
  formatNumberWithCommas: (num: number): string => {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  },

  /**
   * Abbreviates a number (e.g., 1000 -> 1K, 1000000 -> 1M).
   * @param num The number to abbreviate.
   * @param decimalPlaces The number of decimal places to include in the abbreviation.
   * @returns The abbreviated number string.
   */
  abbreviateNumber: (num: number, decimalPlaces: number = 1): string => {
    const SI_SYMBOL = ["", "K", "M", "G", "T", "P", "E"];

    // what tier? (determines SI symbol)
    const tier = Math.log10(Math.abs(num)) / 3 | 0;

    // if zero, can't log so we suppress
    if (tier == 0) return num.toString();

    // get suffix and determine scale
    const suffix = SI_SYMBOL[tier];
    const scale = Math.pow(10, tier * 3);

    // scale the number
    const scaled = num / scale;

    // format number and add suffix
    return scaled.toFixed(decimalPlaces) + suffix;
  },

  /**
   * Converts a number to a Roman numeral.
   * @param num The number to convert.
   * @returns The Roman numeral string.
   */
  toRoman: (num: number): string => {
    if (isNaN(num))
      return NaN;
    const digits = String(+num).split(""),
      key = ["", "C", "CC", "CCC", "CD", "D", "DC", "DCC", "DCCC", "CM",
        "", "X", "XX", "XXX", "XL", "L", "LX", "LXX", "LXXX", "XC",
        "", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX"],
      roman = [];
    let i = 3;
    while (i--)
      roman.unshift((key[+digits.pop() + (i * 10)] || ""));
    return Array(+digits.join("") + 1).join("M") + roman.join("");
  },

  /**
   * Converts a number to its ordinal form (e.g., 1 -> 1st, 2 -> 2nd, 3 -> 3rd).
   * @param num The number to convert.
   * @returns The ordinal string.
   */
  toOrdinal: (num: number): string => {
    const j = num % 10;
    const k = num % 100;
    if (j == 1 && k != 11) {
      return num + "st";
    }
    if (j == 2 && k != 12) {
      return num + "nd";
    }
    if (j == 3 && k != 13) {
      return num + "rd";
    }
    return num + "th";
  },
};