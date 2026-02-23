import React, { useState } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  StyleSheet, 
  ViewStyle, 
  TextStyle, 
  Platform 
} from 'react-native';

interface InputProps {
  label?: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  secureTextEntry?: boolean;
  error?: string;
  style?: ViewStyle;
  keyboardType?: 'default' | 'email-address' | 'numeric' | 'phone-pad';
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  multiline?: boolean;
  numberOfLines?: number;
}

const CYBER_CYAN = '#00ffff';
const CYBER_RED = '#ff0000';

export default function Input({
  label,
  value,
  onChangeText,
  placeholder,
  secureTextEntry,
  error,
  style,
  keyboardType = 'default',
  autoCapitalize = 'none',
  multiline = false,
  numberOfLines = 1,
}: InputProps) {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <View style={[styles.container, style]}>
      {label && <Text style={styles.label}>{label.toUpperCase()}</Text>}
      <View style={[
        styles.inputWrapper,
        isFocused && styles.inputFocused,
        error && styles.inputError
      ]}>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="rgba(255, 255, 255, 0.3)"
          secureTextEntry={secureTextEntry}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          multiline={multiline}
          numberOfLines={numberOfLines}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          style={[
            styles.input,
            multiline && { height: 100, textAlignVertical: 'top' }
          ]}
        />
        {/* Cyberpunk accent corner */}
        {isFocused && <View style={styles.focusAccent} />}
      </View>
      {error && <Text style={styles.errorText}>{error}</Text>}
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
  inputError: {
    borderColor: CYBER_RED,
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
  errorText: {
    color: CYBER_RED,
    fontSize: 12,
    marginTop: 4,
    marginLeft: 4,
    fontWeight: 'bold',
  },
});
