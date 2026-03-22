import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  ActivityIndicator,
  Alert,
  Image,
} from 'react-native';
import { useAuth } from '@/contexts/AuthContext';

export function SecureAccountCard() {
  const { user, supabaseUser, linkAccount } = useAuth();
  const [busy, setBusy] = useState<'google' | 'apple' | null>(null);

  const placeholderEmail = user?.email?.endsWith('@placeholder.local');
  const isAnon = (supabaseUser as { is_anonymous?: boolean } | null)?.is_anonymous === true;
  if (!isAnon && !placeholderEmail) return null;

  const run = async (provider: 'google' | 'apple') => {
    setBusy(provider);
    try {
      await linkAccount(provider);
    } catch (e: any) {
      Alert.alert('Link failed', e?.message || 'Could not link account.');
    } finally {
      setBusy(null);
    }
  };

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Link Account to Save Data</Text>
      <Text style={styles.sub}>
        Connect Google or Apple so you can recover this hunter on a new device.
      </Text>
      <TouchableOpacity
        style={styles.googleBtn}
        onPress={() => run('google')}
        disabled={busy !== null}
      >
        {busy === 'google' ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <>
            <Image
              source={{ uri: 'https://www.gstatic.com/images/branding/product/2x/googleg_48dp.png' }}
              style={styles.googleIcon}
            />
            <Text style={styles.btnText}>Continue with Google</Text>
          </>
        )}
      </TouchableOpacity>
      {Platform.OS === 'ios' && (
        <TouchableOpacity
          style={styles.appleBtn}
          onPress={() => run('apple')}
          disabled={busy !== null}
        >
          {busy === 'apple' ? (
            <ActivityIndicator color="#000" />
          ) : (
            <Text style={styles.appleText}>Continue with Apple</Text>
          )}
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderColor: 'rgba(34, 211, 238, 0.35)',
    backgroundColor: 'rgba(6, 182, 212, 0.08)',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    width: '100%',
  },
  title: {
    color: '#e0f7fa',
    fontWeight: '900',
    fontSize: 11,
    letterSpacing: 1.5,
    marginBottom: 6,
    textAlign: 'center',
  },
  sub: {
    color: '#94a3b8',
    fontSize: 10,
    textAlign: 'center',
    marginBottom: 12,
    lineHeight: 14,
  },
  googleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    paddingVertical: 10,
    borderRadius: 8,
    marginBottom: 8,
  },
  googleIcon: { width: 20, height: 20 },
  btnText: { color: '#fff', fontWeight: '800', fontSize: 11, letterSpacing: 1 },
  appleBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    paddingVertical: 10,
    borderRadius: 8,
  },
  appleText: { color: '#000', fontWeight: '800', fontSize: 11, letterSpacing: 1 },
});
