import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, Platform } from 'react-native';

interface FormInputProps {
  label: string;
  type?: 'text' | 'email' | 'textarea';
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  rows?: number;
}

const CYBER_CYAN = '#00ffff';
const CYBER_RED = '#ff0000';

export default function FormInput({
  label,
  type = 'text',
  placeholder = '',
  value,
  onChange,
  required = false,
  rows = 4,
}: FormInputProps) {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label.toUpperCase()}</Text>
      <View style={[
        styles.inputWrapper,
        isFocused && styles.inputFocused,
      ]}>
        <TextInput
          style={[
            styles.input,
            type === 'textarea' && { height: rows * 24, textAlignVertical: 'top' }
          ]}
          value={value}
          onChangeText={onChange}
          placeholder={placeholder}
          placeholderTextColor="rgba(255, 255, 255, 0.3)"
          keyboardType={type === 'email' ? 'email-address' : 'default'}
          multiline={type === 'textarea'}
          numberOfLines={type === 'textarea' ? rows : 1}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
        />
        {isFocused && <View style={styles.focusAccent} />}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
    width: '100%',
  },
  label: {
    fontSize: 12,
    fontWeight: '900',
    color: 'rgba(255, 255, 255, 0.6)',
    marginBottom: 8,
    marginLeft: 4,
    letterSpacing: 2,
  },
  inputWrapper: {
    backgroundColor: 'rgba(15, 23, 42, 0.8)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 4,
    position: 'relative',
  },
  input: {
    paddingHorizontal: 16,
    paddingVertical: Platform.OS === 'ios' ? 14 : 10,
    color: '#ffffff',
    fontSize: 16,
  },
  inputFocused: {
    borderColor: CYBER_CYAN,
    backgroundColor: 'rgba(0, 255, 255, 0.05)',
  },
  focusAccent: {
    position: 'absolute',
    top: -1,
    right: -1,
    width: 10,
    height: 10,
    borderTopWidth: 2,
    borderRightWidth: 2,
    borderColor: CYBER_CYAN,
  },
});
