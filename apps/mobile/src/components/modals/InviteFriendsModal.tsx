import React, { useState, useEffect } from 'react';
import { 
  Modal, 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  FlatList, 
  ActivityIndicator,
  Dimensions
} from 'react-native';
import { BlurView } from 'expo-blur';
import { X, UserPlus, Users, Check } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { LayeredAvatar } from '@/components/LayeredAvatar';
import { useGameData } from '@/hooks/useGameData';
import * as Haptics from 'expo-haptics';
import { playHunterSound } from '@/utils/audio';

const { width: WINDOW_WIDTH } = Dimensions.get('window');

interface InviteFriendsModalProps {
  visible: boolean;
  onClose: () => void;
  dungeonId?: string;
  onPartyUpdated?: (partyId: string) => void;
}

export const InviteFriendsModal: React.FC<InviteFriendsModalProps> = ({ 
  visible, 
  onClose, 
  dungeonId,
  onPartyUpdated 
}) => {
  const { user, setUser } = useAuth();
  const { shopItems } = useGameData();
  const [friends, setFriends] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [invitingIds, setInvitingIds] = useState<Set<string>>(new Set());
  const [partyMembers, setPartyMembers] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (visible && user?.id) {
      fetchFriends();
      if (user.current_party_id) {
        fetchPartyMembers(user.current_party_id);
      }
    }
  }, [visible, user?.id, user?.current_party_id]);

  const fetchFriends = async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      // 1. Fetch accepted friendships
      const { data: friendships, error: friendsError } = await supabase
        .from('friendships')
        .select('user_id_1, user_id_2')
        .eq('status', 'accepted')
        .or(`user_id_1.eq.${user.id},user_id_2.eq.${user.id}`);

      if (friendsError) throw friendsError;

      const friendIds = friendships.map(f => f.user_id_1 === user.id ? f.user_id_2 : f.user_id_1);

      if (friendIds.length === 0) {
        setFriends([]);
        return;
      }

      // 2. Fetch friend profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select(`
          id, 
          hunter_name, 
          avatar, 
          level, 
          hunter_rank,
          current_party_id,
          cosmetics:user_cosmetics(
            id,
            equipped,
            shop_item_id,
            shop_items:shop_item_id(*)
          )
        `)
        .in('id', friendIds);

      if (profilesError) throw profilesError;
      setFriends(profiles || []);
    } catch (error) {
      console.error('Error fetching friends for invite:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPartyMembers = async (partyId: string) => {
    try {
      const { data, error } = await supabase
        .from('party_members')
        .select('hunter_id')
        .eq('party_id', partyId);
      
      if (error) throw error;
      setPartyMembers(new Set(data.map(m => m.hunter_id)));
    } catch (error) {
      console.error('Error fetching party members:', error);
    }
  };

  const handleInvite = async (friendId: string) => {
    if (!user) return;
    
    playHunterSound('click');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    setInvitingIds(prev => new Set(prev).add(friendId));

    try {
      let partyId = user.current_party_id;

      // 1. Create party if it doesn't exist
      if (!partyId) {
        const { data: newParty, error: partyError } = await supabase
          .from('parties')
          .insert({
            leader_id: user.id,
            dungeon_id: dungeonId,
            status: 'forming'
          })
          .select()
          .single();

        if (partyError) throw partyError;
        partyId = newParty.id;

        // Add leader to party_members
        await supabase.from('party_members').insert({
          party_id: partyId,
          hunter_id: user.id
        });

        // Update leader profile
        await supabase.from('profiles').update({ current_party_id: partyId }).eq('id', user.id);
        setUser?.({ ...user, current_party_id: partyId });
        onPartyUpdated?.(partyId);
      }

      // 2. Add friend to party_members (Assuming auto-accept for now or invite system)
      // For this implementation, we'll just add them to the party
      const { error: memberError } = await supabase.from('party_members').insert({
        party_id: partyId,
        hunter_id: friendId
      });

      if (memberError) throw memberError;

      // 3. Update friend's profile current_party_id
      await supabase.from('profiles').update({ current_party_id: partyId }).eq('id', friendId);

      setPartyMembers(prev => new Set(prev).add(friendId));
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.error('Error inviting friend:', error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setInvitingIds(prev => {
        const next = new Set(prev);
        next.delete(friendId);
        return next;
      });
    }
  };

  const renderFriendItem = ({ item }: { item: any }) => {
    const isInvited = partyMembers.has(item.id);
    const isInviting = invitingIds.has(item.id);

    return (
      <View style={styles.friendCard}>
        <View style={styles.friendInfo}>
          <LayeredAvatar user={item} size={50} allShopItems={shopItems} />
          <View style={styles.friendText}>
            <Text style={styles.friendName}>{item.hunter_name || 'Hunter'}</Text>
            <Text style={styles.friendLevel}>LV.{item.level} • {item.hunter_rank || 'E'}-RANK</Text>
          </View>
        </View>
        
        <TouchableOpacity 
          style={[
            styles.inviteBtn, 
            isInvited && styles.invitedBtn,
            isInviting && styles.invitingBtn
          ]}
          onPress={() => !isInvited && !isInviting && handleInvite(item.id)}
          disabled={isInvited || isInviting}
        >
          {isInviting ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : isInvited ? (
            <Check size={16} color="#fff" />
          ) : (
            <UserPlus size={16} color="#fff" />
          )}
          <Text style={styles.inviteBtnText}>
            {isInvited ? 'IN PARTY' : isInviting ? '...' : 'INVITE'}
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <BlurView intensity={80} tint="dark" style={StyleSheet.absoluteFill} />
        
        <View style={styles.container}>
          <View style={styles.header}>
            <View style={styles.headerTitleRow}>
              <Users size={20} color="#22d3ee" />
              <Text style={styles.headerTitle}>INVITE HUNTERS</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <X size={24} color="#64748b" />
            </TouchableOpacity>
          </View>

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#22d3ee" />
              <Text style={styles.loadingText}>LOCATING NEARBY HUNTERS...</Text>
            </View>
          ) : friends.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>NO HUNTERS IN YOUR NETWORK</Text>
              <Text style={styles.emptySubtext}>Add friends from the Social Hub to form a party.</Text>
            </View>
          ) : (
            <FlatList
              data={friends}
              keyExtractor={item => item.id}
              renderItem={renderFriendItem}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
            />
          )}

          <TouchableOpacity style={styles.doneBtn} onPress={onClose}>
            <Text style={styles.doneBtnText}>DONE</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: '#020617',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: '70%',
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(34, 211, 238, 0.2)',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 1,
  },
  closeBtn: {
    padding: 5,
  },
  listContent: {
    paddingBottom: 20,
  },
  friendCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    padding: 12,
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  friendInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  friendText: {
    justifyContent: 'center',
  },
  friendName: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  friendLevel: {
    color: '#22d3ee',
    fontSize: 10,
    fontWeight: '900',
    marginTop: 2,
  },
  inviteBtn: {
    backgroundColor: '#06b6d4',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  invitedBtn: {
    backgroundColor: '#1e293b',
    borderColor: 'rgba(34, 211, 238, 0.3)',
    borderWidth: 1,
  },
  invitingBtn: {
    opacity: 0.7,
  },
  inviteBtnText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  doneBtn: {
    backgroundColor: '#22d3ee',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 10,
  },
  doneBtnText: {
    color: '#0f172a',
    fontWeight: '900',
    fontSize: 14,
    letterSpacing: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 15,
  },
  loadingText: {
    color: '#00e5ff',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 2,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyText: {
    color: '#22d3ee',
    fontSize: 14,
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: 10,
  },
  emptySubtext: {
    color: '#64748b',
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
  },
});
