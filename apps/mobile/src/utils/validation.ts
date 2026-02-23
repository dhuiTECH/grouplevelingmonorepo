import React from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

// React Native utility functions
export const validation = {
  /**
   * Checks if a string is a valid email address.
   * @param {string} email The email address to validate.
   * @returns {boolean} True if the email is valid, false otherwise.
   */
  isValidEmail: (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  },

  /**
   * Checks if a string is a valid phone number.
   * @param {string} phoneNumber The phone number to validate.
   * @returns {boolean} True if the phone number is valid, false otherwise.
   */
  isValidPhoneNumber: (phoneNumber: string): boolean => {
    // Basic phone number validation (numbers and optional hyphens/spaces)
    const phoneRegex = /^[+]?[(]?[0-9]{3}[)]?[-\s\.]?[0-9]{3}[-\s\.]?[0-9]{4,6}$/im;
    return phoneRegex.test(phoneNumber);
  },

  /**
   * Checks if a string is a valid password.
   * @param {string} password The password to validate.
   * @returns {boolean} True if the password is valid, false otherwise.
   * Requirements:
   * - At least 8 characters long
   * - Contains at least one uppercase letter
   * - Contains at least one lowercase letter
   * - Contains at least one number
   * - Contains at least one special character
   */
  isValidPassword: (password: string): boolean => {
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+{}\[\]:;<>,.?~\\/-]).{8,}$/;
    return passwordRegex.test(password);
  },

  /**
   * Checks if a string is empty or contains only whitespace.
   * @param {string} str The string to check.
   * @returns {boolean} True if the string is empty or contains only whitespace, false otherwise.
   */
  isEmpty: (str: string): boolean => {
    return str.trim().length === 0;
  },

  /**
   * Checks if a string is a valid URL.
   * @param {string} url The URL to validate.
   * @returns {boolean} True if the URL is valid, false otherwise.
   */
  isValidUrl: (url: string): boolean => {
    try {
      new URL(url);
      return true;
    } catch (error) {
      return false;
    }
  },

  /**
   * Checks if a value is a number.
   * @param {any} value The value to check.
   * @returns {boolean} True if the value is a number, false otherwise.
   */
  isNumber: (value: any): boolean => {
    return typeof value === 'number' && isFinite(value);
  },

  /**
   * Checks if a value is an integer.
   * @param {any} value The value to check.
   * @returns {boolean} True if the value is an integer, false otherwise.
   */
  isInteger: (value: any): boolean => {
    return Number.isInteger(value);
  },

  /**
   * Checks if a value is a positive number.
   * @param {any} value The value to check.
   * @returns {boolean} True if the value is a positive number, false otherwise.
   */
  isPositiveNumber: (value: any): boolean => {
    return typeof value === 'number' && value > 0;
  },

  /**
   * Checks if a value is a negative number.
   * @param {any} value The value to check.
   * @returns {boolean} True if the value is a negative number, false otherwise.
   */
  isNegativeNumber: (value: any): boolean => {
    return typeof value === 'number' && value < 0;
  },

  /**
   * Checks if a value is a boolean.
   * @param {any} value The value to check.
   * @returns {boolean} True if the value is a boolean, false otherwise.
   */
  isBoolean: (value: any): boolean => {
    return typeof value === 'boolean';
  },

  /**
   * Checks if a value is an array.
   * @param {any} value The value to check.
   * @returns {boolean} True if the value is an array, false otherwise.
   */
  isArray: (value: any): boolean => {
    return Array.isArray(value);
  },

  /**
   * Checks if a value is an object.
   * @param {any} value The value to check.
   * @returns {boolean} True if the value is an object, false otherwise.
   */
  isObject: (value: any): boolean => {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
  },

  /**
   * Checks if a value is a string.
   * @param {any} value The value to check.
   * @returns {boolean} True if the value is a string, false otherwise.
   */
  isString: (value: any): boolean => {
    return typeof value === 'string';
  },

  /**
   * Checks if a date is a valid date.
   * @param {any} date The date to check.
   * @returns {boolean} True if the date is a valid date, false otherwise.
   */
  isValidDate: (date: any): boolean => {
    return date instanceof Date && !isNaN(date.getTime());
  },

  /**
   * Checks if a string is a valid credit card number.
   * @param {string} cardNumber The credit card number to validate.
   * @returns {boolean} True if the credit card number is valid, false otherwise.
   */
  isValidCreditCard: (cardNumber: string): boolean => {
    const cardNumberRegex = /^(?:4[0-9]{12}(?:[0-9]{3})?|[25][1-7][0-9]{14}|6(?:011|5[0-9][0-9])[0-9]{12}|3[47][0-9]{13}|3(?:0[0-5]|[68][0-9])[0-9]{11}|(?:2131|1800|35\d{3})\d{11})$/;
    return cardNumberRegex.test(cardNumber);
  },

  /**
   * Checks if a string is a valid zip code.
   * @param {string} zipCode The zip code to validate.
   * @returns {boolean} True if the zip code is valid, false otherwise.
   */
  isValidZipCode: (zipCode: string): boolean => {
    const zipCodeRegex = /^\d{5}(?:[-\s]\d{4})?$/;
    return zipCodeRegex.test(zipCode);
  },

  /**
   * Checks if a string is a valid US state abbreviation.
   * @param {string} stateAbbreviation The state abbreviation to validate.
   * @returns {boolean} True if the state abbreviation is valid, false otherwise.
   */
  isValidStateAbbreviation: (stateAbbreviation: string): boolean => {
    const stateAbbreviations = [
      'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
      'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
      'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
      'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
      'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'
    ];
    return stateAbbreviations.includes(stateAbbreviation.toUpperCase());
  },

  /**
   * Checks if a string is a valid US currency amount.
   * @param {string} currencyAmount The currency amount to validate.
   * @returns {boolean} True if the currency amount is valid, false otherwise.
   */
  isValidCurrencyAmount: (currencyAmount: string): boolean => {
    const currencyRegex = /^\$?([0-9]{1,3},([0-9]{3},)*[0-9]{3}|[0-9]+)(.[0-9][0-9])?$/;
    return currencyRegex.test(currencyAmount);
  },

  /**
   * Checks if a string is a valid hex color code.
   * @param {string} hexColor The hex color code to validate.
   * @returns {boolean} True if the hex color code is valid, false otherwise.
   */
  isValidHexColor: (hexColor: string): boolean => {
    const hexColorRegex = /^#([0-9A-Fa-f]{3}){1,2}$/;
    return hexColorRegex.test(hexColor);
  },

  /**
   * Checks if a string is a valid IP address.
   * @param {string} ipAddress The IP address to validate.
   * @returns {boolean} True if the IP address is valid, false otherwise.
   */
  isValidIPAddress: (ipAddress: string): boolean => {
    const ipAddressRegex = /^(([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])\.){3}([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])$/;
    return ipAddressRegex.test(ipAddress);
  },

  /**
   * Checks if a string is a valid MAC address.
   * @param {string} macAddress The MAC address to validate.
   * @returns {boolean} True if the MAC address is valid, false otherwise.
   */
  isValidMACAddress: (macAddress: string): boolean => {
    const macAddressRegex = /^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/;
    return macAddressRegex.test(macAddress);
  },

  /**
   * Checks if a string is a valid date in the format YYYY-MM-DD.
   * @param {string} dateString The date string to validate.
   * @returns {boolean} True if the date string is valid, false otherwise.
   */
  isValidYYYYMMDDDate: (dateString: string): boolean => {
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(dateString)) {
      return false;
    }

    const [year, month, day] = dateString.split('-').map(Number);
    const date = new Date(year, month - 1, day);

    return (
      date.getFullYear() === year &&
      date.getMonth() === month - 1 &&
      date.getDate() === day
    );
  },

  /**
   * Checks if a string is a valid time in the format HH:MM.
   * @param {string} timeString The time string to validate.
   * @returns {boolean} True if the time string is valid, false otherwise.
   */
  isValidHHMMTime: (timeString: string): boolean => {
    const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
    return timeRegex.test(timeString);
  },

  /**
   * Checks if a string is a valid HTML color name.
   * @param {string} colorName The color name to validate.
   * @returns {boolean} True if the color name is valid, false otherwise.
   */
  isValidHTMLColorName: (colorName: string): boolean => {
    const htmlColorNames = [
      'AliceBlue', 'AntiqueWhite', 'Aqua', 'Aquamarine', 'Azure',
      'Beige', 'Bisque', 'Black', 'BlanchedAlmond', 'Blue',
      'BlueViolet', 'Brown', 'BurlyWood', 'CadetBlue', 'Chartreuse',
      'Chocolate', 'Coral', 'CornflowerBlue', 'Cornsilk', 'Crimson',
      'Cyan', 'DarkBlue', 'DarkCyan', 'DarkGoldenRod', 'DarkGray',
      'DarkGrey', 'DarkGreen', 'DarkKhaki', 'DarkMagenta', 'DarkOliveGreen',
      'DarkOrange', 'DarkOrchid', 'DarkRed', 'DarkSalmon', 'DarkSeaGreen',
      'DarkSlateBlue', 'DarkSlateGray', 'DarkSlateGrey', 'DarkTurquoise', 'DarkViolet',
      'DeepPink', 'DeepSkyBlue', 'DimGray', 'DimGrey', 'DodgerBlue',
      'FireBrick', 'FloralWhite', 'ForestGreen', 'Fuchsia', 'Gainsboro',
      'GhostWhite', 'Gold', 'GoldenRod', 'Gray', 'Grey', 'Green',
      'GreenYellow', 'HoneyDew', 'HotPink', 'IndianRed', 'Indigo',
      'Ivory', 'Khaki', 'Lavender', 'LavenderBlush', 'LawnGreen',
      'LemonChiffon', 'LightBlue', 'LightCoral', 'LightCyan', 'LightGoldenRodYellow',
      'LightGray', 'LightGrey', 'LightGreen', 'LightPink', 'LightSalmon',
      'LightSeaGreen', 'LightSkyBlue', 'LightSlateGray', 'LightSlateGrey', 'LightSteelBlue',
      'LightYellow', 'Lime', 'LimeGreen', 'Linen', 'Magenta',
      'Maroon', 'MediumAquaMarine', 'MediumBlue', 'MediumOrchid', 'MediumPurple',
      'MediumSeaGreen', 'MediumSlateBlue', 'MediumSpringGreen', 'MediumTurquoise', 'MediumViolet',
      'MidnightBlue', 'MintCream', 'MistyRose', 'Moccasin', 'NavajoWhite',
      'Navy', 'OldLace', 'Olive', 'OliveDrab', 'Orange', 'OrangeRed',
      'Orchid', 'PaleGoldenRod', 'PaleGreen', 'PaleTurquoise', 'PaleVioletRed',
      'PapayaWhip', 'PeachPuff', 'Peru', 'Pink', 'Plum', 'PowderBlue',
      'Purple', 'RebeccaPurple', 'Red', 'RosyBrown', 'RoyalBlue',
      'SaddleBrown', 'Salmon', 'SandyBrown', 'SeaGreen', 'SeaShell',
      'Sienna', 'Silver', 'SkyBlue', 'SlateBlue', 'SlateGray',
      'SlateGrey', 'Snow', 'SpringGreen', 'SteelBlue', 'Tan',
      'Teal', 'Thistle', 'Tomato', 'Turquoise', 'Violet',
      'Wheat', 'White', 'WhiteSmoke', 'Yellow', 'YellowGreen'
    ];
    return htmlColorNames.includes(colorName);
  },

  /**
   * Checks if a string is a valid JWT token.
   * @param {string} token The JWT token to validate.
   * @returns {boolean} True if the JWT token is valid, false otherwise.
   */
  isValidJWTToken: (token: string): boolean => {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) {
        return false;
      }
      const [header, payload, signature] = parts;
      // Basic checks - can be expanded for more robust validation
      if (!header || !payload || !signature) {
        return false;
      }
      // You can add more checks here, like verifying the signature
      return true;
    } catch (error) {
      return false;
    }
  },

  /**
   * Checks if a string is a valid UUID.
   * @param {string} uuid The UUID to validate.
   * @returns {boolean} True if the UUID is valid, false otherwise.
   */
  isValidUUID: (uuid: string): boolean => {
    const uuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
    return uuidRegex.test(uuid);
  },

  /**
   * Checks if a string is a valid domain name.
   * @param {string} domain The domain name to validate.
   * @returns {boolean} True if the domain name is valid, false otherwise.
   */
  isValidDomainName: (domain: string): boolean => {
    const domainRegex = /^((?!-)[A-Za-z0-9-]{1,63}(?<!-)\.)+[A-Za-z]{2,6}$/;
    return domainRegex.test(domain);
  },

  /**
   * Checks if a string is a valid HTML tag.
   * @param {string} tag The HTML tag to validate.
   * @returns {boolean} True if the HTML tag is valid, false otherwise.
   */
  isValidHTMLTag: (tag: string): boolean => {
    const htmlTags = [
      'a', 'abbr', 'address', 'area', 'article', 'aside', 'audio',
      'b', 'base', 'bdi', 'bdo', 'blockquote', 'body', 'br', 'button',
      'canvas', 'caption', 'cite', 'code', 'col', 'colgroup', 'data',
      'datalist', 'dd', 'del', 'details', 'dfn', 'dialog', 'div', 'dl',
      'dt', 'em', 'embed', 'fieldset', 'figcaption', 'figure', 'footer',
      'form', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'head', 'header',
      'hr', 'html', 'i', 'iframe', 'img', 'input', 'ins', 'kbd', 'label',
      'legend', 'li', 'link', 'main', 'map', 'mark', 'meta', 'meter',
      'nav', 'noscript', 'object', 'ol', 'optgroup', 'option', 'output',
      'p', 'param', 'picture', 'pre', 'progress', 'q', 'rp', 'rt', 'ruby',
      's', 'samp', 'script', 'section', 'select', 'small', 'source', 'span',
      'strong', 'style', 'sub', 'summary', 'sup', 'svg', 'table', 'tbody',
      'td', 'template', 'textarea', 'tfoot', 'th', 'thead', 'time', 'title',
      'tr', 'track', 'u', 'ul', 'var', 'video', 'wbr'
    ];
    return htmlTags.includes(tag);
  },

  /**
   * Checks if a string is a valid credit card CVV.
   * @param {string} cvv The CVV to validate.
   * @returns {boolean} True if the CVV is valid, false otherwise.
   */
  isValidCVV: (cvv: string): boolean => {
    const cvvRegex = /^[0-9]{3,4}$/;
    return cvvRegex.test(cvv);
  },

  /**
   * Checks if a string is a valid latitude.
   * @param {string} latitude The latitude to validate.
   * @returns {boolean} True if the latitude is valid, false otherwise.
   */
  isValidLatitude: (latitude: string): boolean => {
    const latitudeRegex = /^(\+|-)?(?:90(?:(?:\.0{1,6})?)|(?:[0-8]?[0-9])(?:(?:\.[0-9]{1,6})?))$/;
    return latitudeRegex.test(latitude);
  },

  /**
   * Checks if a string is a valid longitude.
   * @param {string} longitude The longitude to validate.
   * @returns {boolean} True if the longitude is valid, false otherwise.
   */
  isValidLongitude: (longitude: string): boolean => {
    const longitudeRegex = /^(\+|-)?(?:180(?:(?:\.0{1,6})?)|(?:[0-9]{1,2}|1[0-7][0-9])(?:(?:\.[0-9]{1,6})?))$/;
    return longitudeRegex.test(longitude);
  },

  /**
   * Checks if a string is a valid coordinate (latitude, longitude).
   * @param {string} coordinate The coordinate to validate.
   * @returns {boolean} True if the coordinate is valid, false otherwise.
   */
  isValidCoordinate: (coordinate: string): boolean => {
    const [latitude, longitude] = coordinate.split(',');
    return validation.isValidLatitude(latitude) && validation.isValidLongitude(longitude);
  },

  /**
   * Checks if a string is a valid hashtag.
   * @param {string} hashtag The hashtag to validate.
   * @returns {boolean} True if the hashtag is valid, false otherwise.
   */
  isValidHashtag: (hashtag: string): boolean => {
    const hashtagRegex = /^#([a-zA-Z0-9]+)$/;
    return hashtagRegex.test(hashtag);
  },

  /**
   * Checks if a string is a valid username.
   * @param {string} username The username to validate.
   * @returns {boolean} True if the username is valid, false otherwise.
   */
  isValidUsername: (username: string): boolean => {
    const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/; // Example: 3-20 characters, alphanumeric and underscore
    return usernameRegex.test(username);
  },

  /**
   * Checks if a string is a valid file extension.
   * @param {string} filename The filename to validate.
   * @param {string[]} allowedExtensions An array of allowed file extensions.
   * @returns {boolean} True if the file extension is valid, false otherwise.
   */
  isValidFileExtension: (filename: string, allowedExtensions: string[]): boolean => {
    const extension = filename.slice((filename.lastIndexOf(".") - 1 >>> 0) + 2);
    return allowedExtensions.map(ext => ext.toLowerCase()).includes(extension.toLowerCase());
  },

  /**
   * Checks if a value is a valid JSON string.
   * @param {string} str The string to check.
   * @returns {boolean} True if the string is a valid JSON string, false otherwise.
   */
  isValidJSONString: (str: string): boolean => {
    try {
      JSON.parse(str);
    } catch (e) {
      return false;
    }
    return true;
  },

  /**
   * Checks if a string is a valid Base64 string.
   * @param {string} str The string to check.
   * @returns {boolean} True if the string is a valid Base64 string, false otherwise.
   */
  isValidBase64String: (str: string): boolean => {
    try {
      return btoa(atob(str)) === str;
    } catch (e) {
      return false;
    }
  },

  /**
   * Checks if a string is a valid HTML string.
   * @param {string} str The string to check.
   * @returns {boolean} True if the string is a valid HTML string, false otherwise.
   */
  isValidHTMLString: (str: string): boolean => {
    // Basic check for HTML tags.  A more robust solution would involve parsing the HTML.
    return /<[^>]*>/g.test(str);
  },

  /**
   * Checks if a string is a valid CSS class name.
   * @param {string} className The CSS class name to validate.
   * @returns {boolean} True if the CSS class name is valid, false otherwise.
   */
  isValidCSSClassName: (className: string): boolean => {
    const classNameRegex = /^[a-zA-Z_][a-zA-Z0-9_-]*$/;
    return classNameRegex.test(className);
  },

  /**
   * Checks if a string is a valid CSS ID.
   * @param {string} id The CSS ID to validate.
   * @returns {boolean} True if the CSS ID is valid, false otherwise.
   */
  isValidCSSId: (id: string): boolean => {
    const idRegex = /^[a-zA-Z_][a-zA-Z0-9_-]*$/;
    return idRegex.test(id);
  },

  /**
   * Checks if a string is a valid CSS property name.
   * @param {string} propertyName The CSS property name to validate.
   * @returns {boolean} True if the CSS property name is valid, false otherwise.
   */
  isValidCSSPropertyName: (propertyName: string): boolean => {
    // This is a very basic check.  A more robust solution would involve a list of valid CSS properties.
    const propertyNameRegex = /^[a-z-]+$/;
    return propertyNameRegex.test(propertyName);
  },

  /**
   * Checks if a string is a valid CSS value.
   * @param {string} propertyValue The CSS value to validate.
   * @returns {boolean} True if the CSS value is valid, false otherwise.
   */
  isValidCSSPropertyValue: (propertyValue: string): boolean => {
    // This is a very basic check.  A more robust solution would involve checking the value against the property type.
    return propertyValue.length > 0;
  },

  /**
   * Checks if a string is a valid CSS selector.
   * @param {string} selector The CSS selector to validate.
   * @returns {boolean} True if the CSS selector is valid, false otherwise.
   */
  isValidCSSSelector: (selector: string): boolean => {
    // This is a very basic check.  A more robust solution would involve parsing the selector.
    return selector.length > 0;
  },

  /**
   * Checks if a string is a valid HTML attribute name.
   * @param {string} attributeName The HTML attribute name to validate.
   * @returns {boolean} True if the HTML attribute name is valid, false otherwise.
   */
  isValidHTMLAttributeName: (attributeName: string): boolean => {
    // This is a very basic check.  A more robust solution would involve a list of valid HTML attributes.
    return attributeName.length > 0;
  },

  /**
   * Checks if a string is a valid HTML attribute value.
   * @param {string} attributeValue The HTML attribute value to validate.
   * @returns {boolean} True if the HTML attribute value is valid, false otherwise.
   */
  isValidHTMLAttributeValue: (attributeValue: string): boolean => {
    // This is a very basic check.  A more robust solution would involve checking the value against the attribute type.
    return attributeValue.length > 0;
  },

  /**
   * Checks if a string is a valid HTML event handler.
   * @param {string} eventHandler The HTML event handler to validate.
   * @returns {boolean} True if the HTML event handler is valid, false otherwise.
   */
  isValidHTMLEventHandler: (eventHandler: string): boolean => {
    // This is a very basic check.  A more robust solution would involve checking the event handler against a list of valid event handlers.
    return eventHandler.length > 0;
  },

  /**
   * Checks if a string is a valid HTML comment.
   * @param {string} comment The HTML comment to validate.
   * @returns {boolean} True if the HTML comment is valid, false otherwise.
   */
  isValidHTMLComment: (comment: string): boolean => {
    return comment.startsWith('<!--') && comment.endsWith('-->');
  },

  /**
   * Checks if a string is a valid XML string.
   * @param {string} str The string to check.
   * @returns {boolean} True if the string is a valid XML string, false otherwise.
   */
  isValidXMLString: (str: string): boolean => {
    // Basic check for XML tags.  A more robust solution would involve parsing the XML.
    return /<[^>]*>/g.test(str);
  },

  /**
   * Checks if a string is a valid XML tag.
   * @param {string} tag The XML tag to validate.
   * @returns {boolean} True if the XML tag is valid, false otherwise.
   */
  isValidXMLTag: (tag: string): boolean => {
    // This is a very basic check.  A more robust solution would involve a list of valid XML tags.
    return tag.length > 0;
  },

  /**
   * Checks if a string is a valid XML attribute name.
   * @param {string} attributeName The XML attribute name to validate.
   * @returns {boolean} True if the XML attribute name is valid, false otherwise.
   */
  isValidXMLAttributeName: (attributeName: string): boolean => {
    // This is a very basic check.  A more robust solution would involve a list of valid XML attributes.
    return attributeName.length > 0;
  },

  /**
   * Checks if a string is a valid XML attribute value.
   * @param {string} attributeValue The XML attribute value to validate.
   * @returns {boolean} True if the XML attribute value is valid, false otherwise.
   */
  isValidXMLAttributeValue: (attributeValue: string): boolean => {
    // This is a very basic check.  A more robust solution would involve checking the value against the attribute type.
    return attributeValue.length > 0;
  },

  /**
   * Checks if a string is a valid XML comment.
   * @param {string} comment The XML comment to validate.
   * @returns {boolean} True if the XML comment is valid, false otherwise.
   */
  isValidXMLComment: (comment: string): boolean => {
    return comment.startsWith('<!--') && comment.endsWith('-->');
  },

  /**
   * Checks if a string is a valid Markdown string.
   * @param {string} str The string to check.
   * @returns {boolean} True if the string is a valid Markdown string, false otherwise.
   */
  isValidMarkdownString: (str: string): boolean => {
    // This is a very basic check.  A more robust solution would involve parsing the Markdown.
    return str.length > 0;
  },

  /**
   * Checks if a string is a valid Markdown heading.
   * @param {string} heading The Markdown heading to validate.
   * @returns {boolean} True if the Markdown heading is valid, false otherwise.
   */
  isValidMarkdownHeading: (heading: string): boolean => {
    return heading.startsWith('#');
  },

  /**
   * Checks if a string is a valid Markdown link.
   * @param {string} link The Markdown link to validate.
   * @returns {boolean} True if the Markdown link is valid, false otherwise.
   */
  isValidMarkdownLink: (link: string): boolean => {
    return link.startsWith('[') && link.includes('](') && link.endsWith(')');
  },

  /**
   * Checks if a string is a valid Markdown image.
   * @param {string} image The Markdown image to validate.
   * @returns {boolean} True if the Markdown image is valid, false otherwise.
   */
  isValidMarkdownImage: (image: string): boolean => {
    return image.startsWith('![') && image.includes('](') && image.endsWith(')');
  },

  /**
   * Checks if a string is a valid Markdown list.
   * @param {string} list The Markdown list to validate.
   * @returns {boolean} True if the Markdown list is valid, false otherwise.
   */
  isValidMarkdownList: (list: string): boolean => {
    return list.startsWith('*') || list.startsWith('-');
  },

  /**
   * Checks if a string is a valid Markdown code block.
   * @param {string} codeBlock The Markdown code block to validate.
   * @returns {boolean} True if the Markdown code block is valid, false otherwise.
   */
  isValidMarkdownCodeBlock: (codeBlock: string): boolean => {
    return codeBlock.startsWith('```');
  },
};
