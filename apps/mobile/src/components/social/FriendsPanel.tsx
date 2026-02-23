import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, ScrollView, TouchableOpacity, Image, FlatList, RefreshControl } from 'react-native';
import { Search, UserPlus, Check, X, Send } from 'lucide-react-native';
import LayeredAvatar from '@/components/LayeredAvatar';
import { User } from '@/types/user';
import { useGameData } from '@/hooks/useGameData';

interface FriendsPanelProps {
  user: User;
  friends: any[];
  friendRequests: any[];
  outgoingRequests: any[];
  searchResults: any[];
  suggestions: any[];
  handleFriendSearch: (query: string) => void;
  handleAddFriend: (userId: string) => void;
  handleAcceptFriendRequest: (requestId: string) => void;
  handleRejectFriendRequest: (requestId: string) => void;
  handleCancelOutgoingRequest: (friendshipId: string) => void;
  setSelectedAvatar: (user: any) => void;
  isSocialLoading: boolean;
  onRefresh: () => void;
}

const FriendsPanel: React.FC<FriendsPanelProps> = ({
  user,
  friends,
  friendRequests,
  outgoingRequests,
  searchResults,
  suggestions,
  handleFriendSearch,
  handleAddFriend,
  handleAcceptFriendRequest,
  handleRejectFriendRequest,
  handleCancelOutgoingRequest,
  setSelectedAvatar,
  isSocialLoading,
  onRefresh
}) => {
  const [query, setQuery] = useState('');
  const { shopItems } = useGameData();

  const onSearchChange = (text: string) => {
    setQuery(text);
    handleFriendSearch(text);
  };

  const renderSectionHeader = (title: string, color: string = '#22d3ee') => (
    <View style={styles.sectionHeader}>
      <View style={[styles.sectionIndicator, { backgroundColor: color }]} />
      <Text style={[styles.sectionTitle, { color }]}>{title}</Text>
    </View>
  );

  return (
    <ScrollView 
      style={styles.container} 
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl 
          refreshing={isSocialLoading} 
          onRefresh={onRefresh} 
          tintColor="#22d3ee"
        />
      }
    >
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Search size={16} color="#64748b" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Find Hunters by Name..."
          placeholderTextColor="#475569"
          value={query}
          onChangeText={onSearchChange}
        />
      </View>

      {/* Suggested Hunters */}
      {!query && suggestions.length > 0 && (
        <View style={styles.section}>
          {renderSectionHeader('DETECTED HIGH RESONANCE SIGNALS')}
          <View style={styles.suggestionsGrid}>
            {suggestions.map((hunter) => {
              const hasSentRequest = outgoingRequests.some((r: any) => r.recipient?.id === hunter.id);
              return (
                <View key={hunter.id} style={styles.suggestionCard}>
                  <LayeredAvatar user={hunter} size={50} onAvatarClick={() => setSelectedAvatar(hunter)} allShopItems={shopItems} />
                  <View style={styles.suggestionInfo}>
                    <Text style={styles.suggestionName} numberOfLines={1}>{hunter.hunter_name || hunter.name}</Text>
                    <Text style={styles.suggestionSubtitle}>LV.{hunter.level} • {hunter.current_class || 'Hunter'}</Text>
                  </View>
                  <TouchableOpacity 
                    onPress={() => !hasSentRequest && handleAddFriend(hunter.id)}
                    style={[styles.actionButtonSmall, hasSentRequest && styles.actionButtonSent]}
                    disabled={hasSentRequest}
                  >
                    <Text style={[styles.actionButtonTextSmall, hasSentRequest && styles.actionButtonTextSent]}>
                      {hasSentRequest ? 'REQUEST SENT' : 'INITIATE SYNC'}
                    </Text>
                  </TouchableOpacity>
                </View>
              );
            })}
          </View>
        </View>
      )}

      {/* Incoming Requests */}
      {friendRequests.length > 0 && (
        <View style={styles.section}>
          {renderSectionHeader('[SYSTEM] INCOMING SYNC SIGNALS', '#fbbf24')}
          {friendRequests.map((request) => (
            <View key={request.id} style={styles.requestCard}>
              <View style={styles.requestLeft}>
  <LayeredAvatar user={request.requester} size={40} onAvatarClick={() => setSelectedAvatar(request.requester)} allShopItems={shopItems} />
  <View>
    <Text style={styles.requestName}>{request.requester?.hunter_name || 'Unknown'}</Text>
    <Text style={styles.requestSubtitle}>LV.{request.requester?.level || 1} • {request.requester?.current_title || 'Hunter'}</Text>
  </View>
</View>
              <View style={styles.requestActions}>
                <TouchableOpacity 
                  onPress={() => handleAcceptFriendRequest(request.id)}
                  style={[styles.miniButton, styles.acceptButton]}
                >
                  <Check size={14} color="#fff" />
                </TouchableOpacity>
                <TouchableOpacity 
                  onPress={() => handleRejectFriendRequest(request.id)}
                  style={[styles.miniButton, styles.rejectButton]}
                >
                  <X size={14} color="#f87171" />
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Search Results */}
      {query && searchResults.length > 0 && (
        <View style={styles.section}>
          {renderSectionHeader('SEARCH RESULTS', '#4ade80')}
          {searchResults.map((hunter) => {
            const hasSentRequest = outgoingRequests.some((r: any) => r.recipient?.id === hunter.id);
            return (
              <View key={hunter.id} style={styles.requestCard}>
                <View style={styles.requestLeft}>
                  <LayeredAvatar user={hunter} size={40} onAvatarClick={() => setSelectedAvatar(hunter)} allShopItems={shopItems} />
                  <View style={{ marginLeft: 12 }}>
                    <Text style={styles.requestName}>{hunter.hunter_name || hunter.name}</Text>
                    <Text style={styles.requestSubtitle}>LV.{hunter.level} • {hunter.current_class || 'Hunter'}</Text>
                  </View>
                </View>
                <TouchableOpacity 
                  onPress={() => !hasSentRequest && handleAddFriend(hunter.id)}
                  style={[
                    styles.miniButton,
                    hasSentRequest ? styles.sentRequestButton : styles.acceptButton,
                    { paddingHorizontal: 12 }
                  ]}
                  disabled={hasSentRequest}
                >
                  <Text style={[styles.actionButtonTextSmall, hasSentRequest && styles.actionButtonTextSent]}>
                    {hasSentRequest ? 'REQUEST SENT' : 'ADD SYNC'}
                  </Text>
                </TouchableOpacity>
              </View>
            );
          })}
        </View>
      )}

      {/* Friends Grid */}
      <View style={styles.section}>
        {renderSectionHeader('HUNTER NETWORK')}
        {friends.length === 0 ? (
          <View style={styles.emptyFriends}>
            <Text style={styles.emptyText}>NO FRIENDS YET</Text>
            <Text style={styles.emptySubtext}>Use the search bar above to find hunters.</Text>
          </View>
        ) : (
          <View style={styles.friendsGrid}>
            {friends.map((friend) => (
              <TouchableOpacity 
                key={friend.id} 
                style={styles.friendCard}
                onPress={() => setSelectedAvatar(friend)}
              >
                <View style={styles.friendAvatarWrapper}>
                  <LayeredAvatar user={friend} size={56} allShopItems={shopItems} />
                  <View style={styles.onlineBadge} />
                </View>
                <Text style={styles.friendName} numberOfLines={1}>{friend.hunter_name || friend.name}</Text>
                <Text style={styles.friendLevel}>LV.{friend.level}</Text>
                <TouchableOpacity style={styles.sendManaButton}>
                  <Send size={10} color="#fff" />
                  <Text style={styles.sendManaText}>SEND MANA</Text>
                </TouchableOpacity>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>
      
      <View style={{ height: 40 }} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.8)',
    borderRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 12,
    marginBottom: 20,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 48,
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  sectionIndicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  sectionTitle: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  suggestionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  suggestionCard: {
    width: '48%',
    backgroundColor: 'rgba(34, 211, 238, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(34, 211, 238, 0.2)',
    borderRadius: 4,
    padding: 12,
    alignItems: 'center',
  },
  suggestionInfo: {
    alignItems: 'center',
    marginVertical: 8,
  },
  suggestionName: {
    fontSize: 10,
    fontWeight: '900',
    color: '#fff',
  },
  suggestionSubtitle: {
    fontSize: 8,
    color: '#22d3ee',
    fontWeight: 'bold',
    marginTop: 2,
  },
  actionButtonSmall: {
    width: '100%',
    paddingVertical: 6,
    backgroundColor: 'rgba(34, 211, 238, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(34, 211, 238, 0.3)',
    borderRadius: 2,
    alignItems: 'center',
  },
  actionButtonSent: {
    backgroundColor: 'rgba(34, 197, 94, 0.35)',
    borderColor: 'rgba(34, 197, 94, 0.7)',
  },
  actionButtonTextSmall: {
    fontSize: 8,
    fontWeight: '900',
    color: '#fff',
    textTransform: 'uppercase',
  },
  actionButtonTextSent: {
    color: '#86efac',
  },
  sentRequestButton: {
    backgroundColor: 'rgba(34, 197, 94, 0.6)',
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.8)',
  },
  requestCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    padding: 12,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(251, 191, 36, 0.2)',
    marginBottom: 8,
  },
  requestLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatarMiniWrapper: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(251, 191, 36, 0.5)',
    overflow: 'hidden',
    backgroundColor: '#0f172a',
  },
  avatarMini: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  requestName: {
    fontSize: 12,
    fontWeight: '900',
    color: '#fff',
  },
  requestSubtitle: {
    fontSize: 9,
    color: '#fbbf24',
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  requestActions: {
    flexDirection: 'row',
    gap: 8,
  },
  miniButton: {
    width: 32,
    height: 32,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  acceptButton: {
    backgroundColor: 'rgba(34, 197, 94, 0.8)',
  },
  rejectButton: {
    backgroundColor: 'rgba(153, 27, 27, 0.4)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  friendsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  friendCard: {
    width: '30.5%',
    aspectRatio: 0.8,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    borderRadius: 4,
    padding: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  friendAvatarWrapper: {
    position: 'relative',
    marginBottom: 6,
  },
  onlineBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#22c55e',
    borderWidth: 2,
    borderColor: '#0f172a',
  },
  friendName: {
    fontSize: 10,
    fontWeight: '900',
    color: '#fff',
    textTransform: 'uppercase',
    textAlign: 'center',
  },
  friendLevel: {
    fontSize: 8,
    color: '#22d3ee',
    fontWeight: 'bold',
    marginBottom: 6,
  },
  sendManaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(34, 211, 238, 0.2)',
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: 2,
  },
  sendManaText: {
    fontSize: 7,
    fontWeight: '900',
    color: '#fff',
  },
  emptyFriends: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#22d3ee',
  },
  emptySubtext: {
    fontSize: 10,
    color: '#64748b',
    marginTop: 4,
  },
});

export default FriendsPanel;
