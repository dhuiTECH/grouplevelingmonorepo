import React, { useState, useCallback } from 'react';
import { 
  View, 
  StyleSheet, 
  SafeAreaView, 
  Platform, 
  KeyboardAvoidingView, 
  RefreshControl,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';

import { useAuth } from '@/contexts/AuthContext';
import { useTutorial } from '@/context/TutorialContext';
import { useSocialData } from '@/hooks/useSocialData';
import SocialHub from '@/components/SocialHub';
import { User } from '@/types/user';
import { OptimizedAvatarModal } from '@/components/modals/OptimizedAvatarModal';
import { useAudio } from '@/contexts/AudioContext';
import { useNotification } from '@/contexts/NotificationContext';

export const SocialScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { step, targetRef } = useTutorial();
  const { showNotification } = useNotification();
  const { playTrack } = useAudio();
  const socialData = useSocialData();
  const [selectedAvatar, setSelectedAvatar] = useState<User | null>(null);
  const [associationName, setAssociationName] = useState('');
  const [selectedEmblem, setSelectedEmblem] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);

  useFocusEffect(
    useCallback(() => {
      playTrack('Dashboard');
    }, [playTrack])
  );

  const { refreshAllData, fetchSuggestions } = socialData;

  const onRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await refreshAllData();
    } catch (error) {
      console.error('Refresh failed:', error);
      showNotification('Failed to sync social hub', 'error');
    } finally {
      setIsRefreshing(false);
    }
  }, [refreshAllData, showNotification]);

  if (!user) return null;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={{ flex: 1 }}
    >
      <View style={styles.container}>
        <LinearGradient
          colors={['#020617', '#0f172a', '#020617']}
          style={StyleSheet.absoluteFill}
        />
        
        <SafeAreaView style={{ flex: 1, paddingTop: Platform.OS === 'android' ? insets.top : 0 }}>
          <View 
            style={{ flex: 1 }}
            ref={step === 'NAV_SOCIAL' ? targetRef : undefined}
            collapsable={false}
          >
            <SocialHub
              user={user}
              {...socialData}
              onRefresh={onRefresh}
              isRefreshing={isRefreshing}
              onFriendsTabFocus={fetchSuggestions}
              associationName={associationName}
              setAssociationName={setAssociationName}
              selectedEmblem={selectedEmblem}
              setSelectedEmblem={setSelectedEmblem}
              showNotification={showNotification}
              setSelectedAvatar={setSelectedAvatar}
              emblemOptions={[
                'https://wyatvubfobfshqyfobqy.supabase.co/storage/v1/object/public/emblems/dagger.png',
                'https://wyatvubfobfshqyfobqy.supabase.co/storage/v1/object/public/emblems/shield.png',
                'https://wyatvubfobfshqyfobqy.supabase.co/storage/v1/object/public/emblems/crown.png',
                'https://wyatvubfobfshqyfobqy.supabase.co/storage/v1/object/public/emblems/sword.png',
                'https://wyatvubfobfshqyfobqy.supabase.co/storage/v1/object/public/emblems/skull.png',
              ]}
            />
          </View>
        </SafeAreaView>

        {/* Player Detail Modal */}
        <OptimizedAvatarModal
          visible={!!selectedAvatar}
          onClose={() => setSelectedAvatar(null)}
          user={selectedAvatar}
          currentUser={user}
        />
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#020617',
  },
});

export default SocialScreen;
