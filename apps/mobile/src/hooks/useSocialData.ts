import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { api as socialApi } from '@/api/social';
import { useAuth } from '@/contexts/AuthContext';
import { useNotification } from '@/contexts/NotificationContext';
import { User, ShopItem } from '@/types/user';
import * as Haptics from 'expo-haptics';
import { playHunterSound } from '@/utils/audio';

export const useSocialData = () => {
  const { user, setUser } = useAuth();
  const { showNotification } = useNotification();
  
  const [friends, setFriends] = useState<any[]>([]);
  const [friendRequests, setFriendRequests] = useState<any[]>([]);
  const [outgoingRequests, setOutgoingRequests] = useState<any[]>([]);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [showcaseHunters, setShowcaseHunters] = useState<any[]>([]);
  const [availableAssociations, setAvailableAssociations] = useState<any[]>([]);
  const [pendingApplicants, setPendingApplicants] = useState<any[]>([]);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  
  const [pendingCount, setPendingCount] = useState(0);
  const [applicantCount, setApplicantCount] = useState(0);
  const [daysUntilReset, setDaysUntilReset] = useState(7);
  const [userHasVoted, setUserHasVoted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreatingAssociation, setIsCreatingAssociation] = useState(false);

  const fetchFriendsData = useCallback(async () => {
    if (!user?.id) return;
    try {
      const data = await socialApi.getFriendsData(user.id);
      setFriends(data.friends);
      setFriendRequests(data.friendRequests);
      setOutgoingRequests(data.outgoingRequests);
      setPendingCount(data.friendRequests.length);
    } catch (error) {
      console.error('Error fetching friends:', error);
    }
  }, [user?.id]);

  const loadLeaderboard = useCallback(async () => {
    try {
      const data = await socialApi.getLeaderboard();
      setLeaderboard(data);
    } catch (error) {
      console.error('Error loading leaderboard:', error);
    }
  }, []);

  const loadShowcaseHunters = useCallback(async () => {
    if (!user?.id) return;
    setIsLoading(true);
    try {
      const data = await socialApi.getShowcaseHunters(user.id);
      setShowcaseHunters(data.hunters);
      setDaysUntilReset(data.daysUntilReset);
      setUserHasVoted(data.userHasVoted);
    } catch (error) {
      console.error('Error loading showcase:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  const loadAssociations = useCallback(async () => {
    try {
      const data = await socialApi.getAssociations();
      setAvailableAssociations(data);
    } catch (error) {
      console.error('Error loading associations:', error);
    }
  }, []);

  const fetchSuggestions = useCallback(async () => {
    if (!user?.id) return;
    try {
      const data = await socialApi.getSuggestions(user.id);
      const shuffled = [...(data || [])].sort(() => Math.random() - 0.5);
      setSuggestions(shuffled.slice(0, 2));
    } catch (error) {
      console.error('Error fetching suggestions:', error);
    }
  }, [user?.id]);

  const handleFriendSearch = async (query: string) => {
    if (!user?.id || !query.trim()) {
      setSearchResults([]);
      return;
    }
    try {
      const data = await socialApi.searchHunters(query, user.id);
      setSearchResults(data);
    } catch (error) {
      console.error('Search error:', error);
    }
  };

  const handleAddFriend = async (friendId: string) => {
    if (!user?.id) return;
    try {
      await socialApi.sendFriendRequest(user.id, friendId);
      playHunterSound('click');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await fetchFriendsData();
      showNotification('Sync request sent!', 'success');
    } catch (error: any) {
      console.error('Error adding friend:', error);
      const message = error?.message?.includes('duplicate') || error?.code === '23505'
        ? 'Request already sent or already friends'
        : (error?.message || 'Failed to send sync request');
      showNotification(message, 'error');
    }
  };

  const handleAcceptFriendRequest = async (requestId: string) => {
    try {
      await socialApi.acceptFriendRequest(requestId);
      playHunterSound('purchasesuccess');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      fetchFriendsData();
    } catch (error) {
      console.error('Error accepting friend request:', error);
    }
  };

  const handleRejectFriendRequest = async (requestId: string) => {
    try {
      await socialApi.rejectFriendRequest(requestId);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      fetchFriendsData();
    } catch (error) {
      console.error('Error rejecting friend request:', error);
    }
  };

  const handleCancelOutgoingRequest = async (friendshipId: string) => {
    try {
      await socialApi.cancelFriendRequest(friendshipId);
      fetchFriendsData();
    } catch (error) {
      console.error('Error canceling outgoing request:', error);
    }
  };

  const handleShowcaseVote = async (targetId: string, voteType: 'resonate' | 'interfere') => {
    if (!user?.id || userHasVoted) return;
    try {
      const result = await socialApi.voteShowcase(user.id, targetId, voteType);
      setUserHasVoted(true);
      playHunterSound('click');
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      if (result?.newCoins !== undefined && setUser) {
        setUser({ ...user, coins: result.newCoins });
      }
      await loadShowcaseHunters();
      showNotification('Vote recorded! +250 coins', 'success');
    } catch (error: any) {
      console.error('Error voting in showcase:', error);
      showNotification(error?.message || 'Failed to vote', 'error');
    }
  };

  const handleApplyToAssociation = async (associationId: string) => {
    if (!user?.id) return;
    try {
      await socialApi.applyToAssociation(user.id, associationId);
      playHunterSound('click');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      // Update local user if needed
      setUser({ ...user, association_id: associationId });
    } catch (error) {
      console.error('Error applying to association:', error);
    }
  };

  const handleCreateAssociation = async (name: string, emblemUrl: string) => {
    if (!user?.id) return;
    setIsCreatingAssociation(true);
    try {
      const association = await socialApi.createAssociation(user.id, name, emblemUrl);
      playHunterSound('purchasesuccess');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setUser({ ...user, association_id: association.id, coins: (user.coins || 0) - 100000 });
    } catch (error) {
      console.error('Error creating association:', error);
    } finally {
      setIsCreatingAssociation(false);
    }
  };

  const refreshAllData = useCallback(async () => {
    if (!user?.id) return;
    setIsLoading(true);
    await Promise.all([
      fetchFriendsData(),
      loadLeaderboard(),
      loadShowcaseHunters(),
      loadAssociations(),
      fetchSuggestions()
    ]);
    setIsLoading(false);
  }, [user?.id, fetchFriendsData, loadLeaderboard, loadShowcaseHunters, loadAssociations, fetchSuggestions]);

  useEffect(() => {
    if (user?.id) {
      refreshAllData();

      const channel = supabase
        .channel('friendship_changes')
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'friendships',
          filter: `user_id_2=eq.${user.id}`
        }, (payload) => {
          if (payload.eventType === 'INSERT' && payload.new.status === 'pending') {
            playHunterSound('error'); // Use a notification sound if available
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          }
          fetchFriendsData();
        })
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user?.id, refreshAllData, fetchFriendsData]);

  return {
    friends,
    friendRequests,
    outgoingRequests,
    leaderboard,
    showcaseHunters,
    availableAssociations,
    pendingApplicants,
    searchResults,
    suggestions,
    pendingCount,
    applicantCount,
    daysUntilReset,
    userHasVoted,
    isLoading,
    isCreatingAssociation,
    loadLeaderboard,
    handleFriendSearch,
    handleAddFriend,
    handleAcceptFriendRequest,
    handleRejectFriendRequest,
    handleCancelOutgoingRequest,
    loadShowcaseHunters,
    handleShowcaseVote,
    handleApplyToAssociation,
    handleCreateAssociation,
    refreshAllData
  };
};
