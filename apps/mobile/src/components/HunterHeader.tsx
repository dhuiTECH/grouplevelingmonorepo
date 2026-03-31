import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import SettingsModal from '@/components/modals/SettingsModal';
import { useNotification } from '@/contexts/NotificationContext';
import { 
  View, 
  Text, 
  StyleSheet, 
  Image, 
  TouchableOpacity, 
  Platform, 
  Dimensions,
  ScrollView
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { User } from '@/types/user';
import LayeredAvatar from './LayeredAvatar';
import { SettingsIcon } from './icons/SettingsIcon';
import { XIcon } from './icons/XIcon';
import { SkullIcon } from './icons/SkullIcon';
import { GlobalTerminal } from './GlobalTerminal';
import { BlurView } from 'expo-blur';
import { OptimizedAvatarModal } from './modals/OptimizedAvatarModal';

const { width, height } = Dimensions.get('window');

interface HunterHeaderProps {
  user: User;
  setShowStatusWindow: (show: boolean) => void;
  fastBoot: boolean;
  setFastBoot: (fast: boolean) => void;
  toggleIncognito: () => void;
}

export const HunterHeader: React.FC<HunterHeaderProps> = ({ 
  user,
  setShowStatusWindow,
  fastBoot,
  setFastBoot,
  toggleIncognito
}) => {
  const { showNotification } = useNotification();
  const { logout } = useAuth();
  const insets = useSafeAreaInsets();
  const [showSettings, setShowSettings] = useState(false);
  const [showAvatarViewer, setShowAvatarViewer] = useState(false);

  return (
    <View style={styles.header}>
      
      {/* LEFT SIDE - Identity */}
      <TouchableOpacity 
        style={styles.headerLeft} 
        onPress={() => setShowAvatarViewer(true)}
        activeOpacity={0.8}
      >
        <View style={styles.avatarContainer}>
          <LayeredAvatar user={user} size={36} />
        </View>
        <View style={styles.userInfo}>
          <Text style={styles.userName}>{user.name || 'Hunter'}</Text>
          <Text style={styles.userLevel}>Lv.{user.level}</Text>
        </View>
      </TouchableOpacity>

      {/* RIGHT SIDE - Utility */}
      <View style={styles.headerRight}>
        
        {/* Status Window Button */}
        <TouchableOpacity 
          onPress={() => setShowStatusWindow(true)} 
          style={styles.statsBtn}
        >
           <Image source={require('../../assets/stats.png')} style={styles.statsIcon} />
        </TouchableOpacity>

        {/* Gold */}
        <View style={styles.currencyPillYellow}>
          <Image source={require('../../assets/coinicon.png')} style={styles.currencyIcon} />
          <Text style={styles.currencyTextYellow}>{(user.coins || 0).toLocaleString()}</Text>
        </View>

        {/* Gems */}
        <View style={styles.currencyPillPurple}>
          <Image source={require('../../assets/gemicon.png')} style={styles.currencyIcon} />
          <Text style={styles.currencyTextPurple}>{(user.gems || 0).toLocaleString()}</Text>
        </View>

        {/* Settings Toggle Button */}
        <TouchableOpacity 
          onPress={() => setShowSettings(true)} 
          style={styles.settingsBtn}
        >
           <SettingsIcon size={20} color="#22d3ee" />
        </TouchableOpacity>
      </View>

      <SettingsModal
        visible={showSettings}
        onClose={() => setShowSettings(false)}
        user={user}
        fastBoot={fastBoot}
        setFastBoot={setFastBoot}
        toggleIncognito={toggleIncognito}
        onLogout={logout}
      />

      <OptimizedAvatarModal
        visible={showAvatarViewer}
        onClose={() => setShowAvatarViewer(false)}
        user={user}
        currentUser={user}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    zIndex: 50,
    // Transparent/Opaque background as requested (opaque usually means visible bg)
    backgroundColor: 'transparent', 
    borderBottomWidth: 0,
    borderBottomColor: 'transparent',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  avatarContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(6, 182, 212, 0.45)',
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    // Ring around 36px avatar — use slate, not black, so corners never read as a void
    backgroundColor: 'rgba(15, 23, 42, 0.98)',
  },
  userInfo: {
    justifyContent: 'center',
  },
  userName: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
    lineHeight: 16,
    fontFamily: 'Exo2-Regular',
  },
  userLevel: {
    color: '#22d3ee', // cyan-400
    fontSize: 10,
    fontWeight: 'bold',
    lineHeight: 12,
    marginTop: 2,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statsBtn: {
    borderWidth: 1,
    borderColor: 'rgba(6, 182, 212, 0.5)',
    height: 28,
    paddingHorizontal: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(6, 182, 212, 0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statsIcon: {
    width: 14,
    height: 14,
    resizeMode: 'contain',
  },
  currencyPillPurple: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(88, 28, 135, 0.2)', // purple-900/20
    borderWidth: 1,
    borderColor: 'rgba(168, 85, 247, 0.3)', // purple-500/30
    borderRadius: 9999,
    paddingHorizontal: 10,
    height: 28,
    gap: 4,
  },
  currencyTextPurple: {
    color: '#c084fc', // purple-400
    fontSize: 10,
    fontWeight: 'bold',
  },
  currencyPillYellow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(113, 63, 18, 0.2)', // yellow-900/20
    borderWidth: 1,
    borderColor: 'rgba(234, 179, 8, 0.3)', // yellow-500/30
    borderRadius: 9999,
    paddingHorizontal: 10,
    height: 28,
    gap: 4,
  },
  currencyTextYellow: {
    color: '#facc15', // yellow-400
    fontSize: 10,
    fontWeight: 'bold',
  },
  currencyIcon: {
    width: 12,
    height: 12,
    resizeMode: 'contain',
  },
  settingsBtn: {
    padding: 4,
  },

});
