"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import SocialHub from '@/components/SocialHub';

interface SocialViewProps {
  user: any;
  setUser: (u: any) => void;
  leaderboard: any[];
  loadLeaderboard: () => void;
  showNotification: (msg: string, type: 'success' | 'error') => void;
  setSelectedAvatar: (u: any) => void;
}

export default function SocialView({ 
  user, setUser, leaderboard, loadLeaderboard, 
  showNotification, setSelectedAvatar 
}: SocialViewProps) {
  
  // --- LOCAL STATE (Moved from page.tsx) ---
  const [friends, setFriends] = useState<any[]>([]);
  const [friendRequests, setFriendRequests] = useState<any[]>([]);
  const [outgoingRequests, setOutgoingRequests] = useState<any[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  
  // Association State
  const [availableAssociations, setAvailableAssociations] = useState<any[]>([]);
  const [appliedAssociationIds, setAppliedAssociationIds] = useState<Set<string>>(new Set());
  const [pendingApplicants, setPendingApplicants] = useState<any[]>([]);
  const [applicantCount, setApplicantCount] = useState(0);
  
  // Showcase State
  const [showcaseHunters, setShowcaseHunters] = useState<any[]>([]);
  const [daysUntilReset, setDaysUntilReset] = useState(0);
  const [userHasVoted, setUserHasVoted] = useState(false);
  const [isSocialLoading, setIsSocialLoading] = useState(false);

  // Association Form State
  const [associationName, setAssociationName] = useState('');
  const [selectedEmblem, setSelectedEmblem] = useState('');
  const [isCreatingAssociation, setIsCreatingAssociation] = useState(false);

  // Basic profanity filter list
  const PROFANITY_LIST = ['admin', 'system', 'fuck', 'shit', 'ass', 'bitch', 'cunt', 'nigger', 'faggot', 'whore', 'slut', 'cock', 'dick', 'pussy', 'bastard', 'damn'];

  const containsProfanity = (text: string) => {
    return PROFANITY_LIST.some(word => text.toLowerCase().includes(word));
  };

  // Emblem gallery options
  const emblemOptions = [
    '/emblems/dagger.png',
    '/emblems/shield.png',
    '/emblems/crown.png',
    '/emblems/sword.png',
    '/emblems/skull.png',
    '/emblems/dragon.png',
    '/emblems/phoenix.png',
    '/emblems/wolf.png',
    '/emblems/eagle.png',
    '/emblems/lion.png',
    '/emblems/bear.png',
    '/emblems/falcon.png'
  ];

  // --- DATA FETCHERS (useCallback to prevent re-renders) ---

  const fetchFriendsData = useCallback(async () => {
    if (!user?.id) return;
    try {
      const response = await fetch(`/api/friends?userId=${user.id}`);
      if (response.ok) {
        const data = await response.json();
        setFriends(data.friends || []);
        setFriendRequests(data.friendRequests || []);
        setOutgoingRequests(data.outgoingRequests || []);
        setPendingCount((data.friendRequests || []).length);
      }
    } catch (error) {
      console.error('Error fetching friends:', error);
    }
  }, [user?.id]);

  const fetchSuggestions = useCallback(async () => {
    if (!user?.id) return;
    try {
      // Exclude current user and limit to 2 random suggestions
      const response = await fetch(`/api/social/hunters?limit=2&random=true&excludeUserId=${user.id}`);
      if (response.ok) {
        const data = await response.json();
        setSuggestions(data.hunters || []);
      }
    } catch (error) {
      console.error('Error fetching suggestions:', error);
    }
  }, [user?.id]);

  const loadShowcaseHunters = useCallback(async () => {
    if (!user?.id) return;
    setIsSocialLoading(true);
    try {
      const response = await fetch(`/api/social/showcase?userId=${user.id}`);
      if (response.ok) {
        const data = await response.json();
        setShowcaseHunters(data.hunters || []);
        setDaysUntilReset(data.daysUntilReset || 0);
        setUserHasVoted(data.userHasVoted || false);
      }
    } catch (error) {
      console.error('Error loading showcase:', error);
    } finally {
      setIsSocialLoading(false);
    }
  }, [user?.id]);

  const loadPendingApplicants = useCallback(async () => {
    if (!user?.id) return;
    try {
      const response = await fetch(`/api/social/association/recruitment?userId=${user.id}`);
      if (response.ok) {
        const data = await response.json();
        setPendingApplicants(data.applicants || []);
        setApplicantCount(data.count || 0);
      }
    } catch (error) {
      console.error('Error loading pending applicants:', error);
    }
  }, [user?.id]);

  // --- EFFECTS ---

  // 1. Initial Data Fetch
  useEffect(() => {
    if (!user?.id) return;
    fetchFriendsData();
    fetchSuggestions();
    loadShowcaseHunters();
    loadLeaderboard();
  }, [user?.id, fetchFriendsData, fetchSuggestions, loadShowcaseHunters, loadLeaderboard]); // Only run when user ID changes (mount/login)

  // 2. Real-time Subscription
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel('friendship_requests')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'friendships',
        filter: `user_id_2=eq.${user.id}`
      }, (payload) => {
        if (payload.eventType === 'INSERT' && payload.new.status === 'pending') {
           // Play system alert sound for new requests
           try {
             const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
             const oscillator = audioContext.createOscillator();
             const gainNode = audioContext.createGain();
             oscillator.connect(gainNode);
             gainNode.connect(audioContext.destination);
             oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
             oscillator.frequency.exponentialRampToValueAtTime(400, audioContext.currentTime + 0.1);
             gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
             gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
             oscillator.start();
             oscillator.stop(audioContext.currentTime + 0.3);
           } catch (e) {
             console.log('Audio feedback not available');
           }
           showNotification('New sync signal detected! Hunter network request incoming.', 'success');
        }
        fetchFriendsData();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user?.id, fetchFriendsData, showNotification]);

  // 3. Load Associations (for browsing)
  useEffect(() => {
    if (!user?.id) return;
    
    if (!user?.association_id) {
      const loadAssociations = async () => {
        try {
          const response = await fetch('/api/social/association/browse');
          if (response.ok) {
            const data = await response.json();
            setAvailableAssociations(data.associations || []);
          }
        } catch (error) { console.error(error); }
      };
      loadAssociations();
    } else {
      loadPendingApplicants();
    }
  }, [user?.id, user?.association_id, loadPendingApplicants]);


  // --- HANDLERS (Moved from page.tsx) ---

  const handleFriendSearch = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }
    try {
      const response = await fetch(`/api/social/hunters?search=${encodeURIComponent(query)}&excludeUserId=${user?.id || ''}`);
      if (response.ok) {
        const data = await response.json();
        setSearchResults(data.hunters || []);
      }
    } catch (error) {
      console.error('Search error:', error);
    }
  };

  const handleAddFriend = async (friendId: string) => {
    if (!user?.id) return;
    try {
      const response = await fetch('/api/friends', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId1: user.id, userId2: friendId })
      });
      if (response.ok) {
        showNotification('Friend request sent! Signal transmitted to target.', 'success');
        fetchFriendsData();
      } else {
        const err = await response.json();
        showNotification(err.error || 'Failed to transmit signal', 'error');
      }
    } catch (error) { 
      showNotification('Error adding friend', 'error'); 
    }
  };

  const handleAcceptFriendRequest = async (friendshipId: string) => {
    try {
      const response = await fetch('/api/friends', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ friendshipId, action: 'accept' })
      });

      if (response.ok) {
        showNotification('Sync signal accepted! Hunter added to network.', 'success');
        fetchFriendsData();
      } else {
        const error = await response.json();
        showNotification(error.error || 'Failed to accept friend request', 'error');
      }
    } catch (error) {
      console.error('Error accepting friend request:', error);
      showNotification('Error accepting friend request', 'error');
    }
  };

  const handleRejectFriendRequest = async (friendshipId: string) => {
    try {
      const response = await fetch('/api/friends', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ friendshipId, action: 'reject' })
      });

      if (response.ok) {
        showNotification('Friend request declined', 'success');
        fetchFriendsData();
      } else {
        const error = await response.json();
        showNotification(error.error || 'Failed to reject friend request', 'error');
      }
    } catch (error) {
      console.error('Error rejecting friend request:', error);
      showNotification('Error rejecting friend request', 'error');
    }
  };

  const handleCancelOutgoingRequest = async (friendshipId: string) => {
    try {
      const response = await fetch('/api/friends', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ friendshipId })
      });

      if (response.ok) {
        showNotification('Friend request canceled', 'success');
        fetchFriendsData();
      } else {
        const error = await response.json();
        showNotification(error.error || 'Failed to cancel friend request', 'error');
      }
    } catch (error) {
      console.error('Error canceling friend request:', error);
      showNotification('Error canceling friend request', 'error');
    }
  };

  const handleShowcaseVote = async (targetId: string, voteType: 'resonate' | 'interfere') => {
    if (userHasVoted) {
        showNotification("You have already cast your showcase vote for this week.", "error");
        return;
    }
    
    // Optimistic UI Update
    setShowcaseHunters(prev => prev.map(h => {
      if (h.id === targetId) {
        return { 
          ...h, 
          showcase_score: (h.showcase_score || 0) + (voteType === 'resonate' ? 1 : -1),
          userVote: voteType 
        };
      }
      return h;
    }));
    setUserHasVoted(true);

    try {
      const response = await fetch(`/api/social/showcase?userId=${user.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetId, voteType })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      
      if (data.newCoins) {
          setUser({ ...user, coins: data.newCoins });
          showNotification('Received 250 Gold for Voting!', 'success');
      }
    } catch (error: any) {
      showNotification(error.message, 'error');
      loadShowcaseHunters(); // Revert on error
    }
  };

  const handleApplyToAssociation = async (associationId: string) => {
    if (!user?.id) return;

    try {
      const response = await fetch(`/api/social/association/apply?userId=${user.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ associationId })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        showNotification(data.message, 'success');
        setAppliedAssociationIds(prev => new Set([...prev, associationId]));
      } else {
        showNotification(data.error || 'Failed to apply to association', 'error');
      }
    } catch (error) {
      console.error('Error applying to association:', error);
      showNotification('Error applying to association', 'error');
    }
  };

  const handleApplicantDecision = async (applicantId: string, action: 'accept' | 'reject') => {
    if (!user?.id) return;

    try {
      const response = await fetch('/api/social/association/recruitment', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ applicantId, action })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        showNotification(data.message, 'success');
        loadPendingApplicants();
      } else {
        showNotification(data.error || `Failed to ${action} applicant`, 'error');
      }
    } catch (error) {
      console.error(`Error ${action}ing applicant:`, error);
      showNotification(`Error ${action}ing applicant`, 'error');
    }
  };

  const handleCreateAssociation = async () => {
    if (!user?.id || !associationName.trim() || !selectedEmblem || (user.coins || 0) < 100000) {
      return;
    }

    if (containsProfanity(associationName)) {
      showNotification('Association name contains inappropriate content.', 'error');
      return;
    }

    setIsCreatingAssociation(true);

    try {
      const response = await fetch(`/api/social/association/create?userId=${user.id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: associationName.trim(),
          emblemUrl: selectedEmblem
        })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        showNotification(data.message, 'success');

        // Trigger gold extraction animation
        const triggerGoldExtraction = () => {
          const coinElements = [];
          for (let i = 0; i < 20; i++) {
            const coin = document.createElement('div');
            coin.className = 'fixed w-6 h-6 bg-yellow-400 rounded-full z-50 pointer-events-none';
            coin.style.left = `${Math.random() * 100}%`;
            coin.style.top = `${Math.random() * 100}%`;
            coin.style.animation = `float-up 2s ease-out ${i * 0.1}s forwards`;
            document.body.appendChild(coin);
            coinElements.push(coin);

            setTimeout(() => {
              if (coin.parentNode) {
                coin.parentNode.removeChild(coin);
              }
            }, 2500);
          }

          if (!document.getElementById('gold-extraction-styles')) {
            const style = document.createElement('style');
            style.id = 'gold-extraction-styles';
            style.textContent = `
              @keyframes float-up {
                0% { transform: translateY(0) scale(1); opacity: 1; }
                100% { transform: translateY(-200px) scale(0.5); opacity: 0; }
              }
            `;
            document.head.appendChild(style);
          }
        };

        triggerGoldExtraction();

        setTimeout(() => {
          setUser({
            ...user,
            coins: (user.coins || 0) - 100000,
            association_id: data.association.id
          });

          setAssociationName('');
          setSelectedEmblem('');
        }, 500);
      } else {
        showNotification(data.error || 'Failed to create association', 'error');
      }
    } catch (error) {
      console.error('Error creating association:', error);
      showNotification('Error creating association', 'error');
    } finally {
      setIsCreatingAssociation(false);
    }
  };

  return (
    <SocialHub
      user={user}
      leaderboard={leaderboard}
      friends={friends}
      friendRequests={friendRequests}
      outgoingRequests={outgoingRequests}
      pendingCount={pendingCount}
      applicantCount={applicantCount}
      showcaseHunters={showcaseHunters}
      availableAssociations={availableAssociations}
      pendingApplicants={pendingApplicants}
      appliedAssociationIds={appliedAssociationIds}
      daysUntilReset={daysUntilReset}
      userHasVoted={userHasVoted}
      searchResults={searchResults}
      suggestions={suggestions}
      isSocialLoading={isSocialLoading}
      loadLeaderboard={loadLeaderboard}
      handleFriendSearch={handleFriendSearch}
      handleAddFriend={handleAddFriend}
      handleAcceptFriendRequest={handleAcceptFriendRequest}
      handleRejectFriendRequest={handleRejectFriendRequest}
      handleCancelOutgoingRequest={handleCancelOutgoingRequest}
      loadShowcaseHunters={loadShowcaseHunters}
      handleShowcaseVote={handleShowcaseVote}
      handleApplyToAssociation={handleApplyToAssociation}
      loadPendingApplicants={loadPendingApplicants}
      handleApplicantDecision={handleApplicantDecision}
      handleCreateAssociation={handleCreateAssociation}
      associationName={associationName}
      setAssociationName={setAssociationName}
      selectedEmblem={selectedEmblem}
      setSelectedEmblem={setSelectedEmblem}
      isCreatingAssociation={isCreatingAssociation}
      emblemOptions={emblemOptions}
      showNotification={showNotification}
      setSelectedAvatar={setSelectedAvatar}
    />
  );
}
