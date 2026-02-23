import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AlertTriangle } from 'lucide-react-native';
import { User } from '@/types/user';

// Import Panels
import RankingsPanel from './social/RankingsPanel';
import FriendsPanel from './social/FriendsPanel';
import AssociationPanel from './social/AssociationPanel';
import ShowcasePanel from './social/ShowcasePanel';
import ArenaPanel from './social/ArenaPanel';

interface SocialHubProps {
  user: User;
  leaderboard: any[];
  friends: any[];
  friendRequests: any[];
  outgoingRequests: any[];
  pendingCount: number;
  applicantCount: number;
  showcaseHunters: any[];
  availableAssociations: any[];
  pendingApplicants: any[];
  appliedAssociationIds: Set<string>;
  daysUntilReset: number;
  userHasVoted: boolean;
  suggestions?: any[];
  searchResults: any[];
  isSocialLoading: boolean;
  onRefresh: () => void;
  loadLeaderboard: () => void;
  handleFriendSearch: (query: string) => void;
  handleAddFriend: (userId: string) => void;
  handleAcceptFriendRequest: (requestId: string) => void;
  handleRejectFriendRequest: (requestId: string) => void;
  handleCancelOutgoingRequest: (friendshipId: string) => void;
  loadShowcaseHunters: () => void;
  handleShowcaseVote: (targetId: string, voteType: 'resonate' | 'interfere') => void;
  handleApplyToAssociation: (associationId: string) => void;
  loadPendingApplicants: () => void;
  handleApplicantDecision: (applicantId: string, action: 'accept' | 'reject') => void;
  handleCreateAssociation: (name: string, emblemUrl: string) => void;
  associationName: string;
  setAssociationName: (name: string) => void;
  selectedEmblem: string;
  setSelectedEmblem: (emblem: string) => void;
  isCreatingAssociation: boolean;
  emblemOptions: string[];
  showNotification: (message: string, type: 'success' | 'error') => void;
  setSelectedAvatar: (user: User | null) => void;
  onFriendsTabFocus?: () => void;
}

type SocialSubTab = 'rankings' | 'showcase' | 'friends' | 'association' | 'arena';

const SocialHub: React.FC<SocialHubProps> = (props) => {
  const [activeTab, setActiveTab] = useState<SocialSubTab>('rankings');
  const insets = useSafeAreaInsets();

  const renderActivePanel = () => {
    switch (activeTab) {
      case 'rankings':
        return (
          <RankingsPanel 
            leaderboard={props.leaderboard}
            loadLeaderboard={props.loadLeaderboard}
            setSelectedAvatar={props.setSelectedAvatar}
            isSocialLoading={props.isSocialLoading}
            onRefresh={props.onRefresh}
          />
        );
      case 'friends':
        return (
          <FriendsPanel 
            user={props.user}
            friends={props.friends}
            friendRequests={props.friendRequests}
            outgoingRequests={props.outgoingRequests}
            searchResults={props.searchResults}
            suggestions={props.suggestions || []}
            handleFriendSearch={props.handleFriendSearch}
            handleAddFriend={props.handleAddFriend}
            handleAcceptFriendRequest={props.handleAcceptFriendRequest}
            handleRejectFriendRequest={props.handleRejectFriendRequest}
            handleCancelOutgoingRequest={props.handleCancelOutgoingRequest}
            setSelectedAvatar={props.setSelectedAvatar}
            isSocialLoading={props.isSocialLoading}
            onRefresh={props.onRefresh}
          />
        );
      case 'association':
        return (
          <AssociationPanel 
            user={props.user}
            availableAssociations={props.availableAssociations}
            pendingApplicants={props.pendingApplicants}
            applicantCount={props.applicantCount}
            appliedAssociationIds={props.appliedAssociationIds}
            associationName={props.associationName}
            setAssociationName={props.setAssociationName}
            selectedEmblem={props.selectedEmblem}
            setSelectedEmblem={props.setSelectedEmblem}
            isCreatingAssociation={props.isCreatingAssociation}
            emblemOptions={props.emblemOptions}
            handleApplyToAssociation={props.handleApplyToAssociation}
            loadPendingApplicants={props.loadPendingApplicants}
            handleApplicantDecision={props.handleApplicantDecision}
            handleCreateAssociation={() => props.handleCreateAssociation(props.associationName, props.selectedEmblem)}
            setSelectedAvatar={props.setSelectedAvatar}
            isSocialLoading={props.isSocialLoading}
            onRefresh={props.onRefresh}
          />
        );
      case 'showcase':
        return (
          <ShowcasePanel 
            user={props.user}
            showcaseHunters={props.showcaseHunters}
            daysUntilReset={props.daysUntilReset}
            userHasVoted={props.userHasVoted}
            isLoading={props.isSocialLoading}
            loadShowcaseHunters={props.loadShowcaseHunters}
            handleShowcaseVote={props.handleShowcaseVote}
            setSelectedAvatar={props.setSelectedAvatar}
            onRefresh={props.onRefresh}
          />
        );
      case 'arena':
        return <ArenaPanel />;
      default:
        return null;
    }
  };

  const tabs: { id: SocialSubTab; label: string; badge?: number }[] = [
    { id: 'rankings', label: 'RANKINGS' },
    { id: 'showcase', label: 'SHOWCASE' },
    { id: 'friends', label: 'FRIENDS', badge: props.pendingCount },
    { id: 'association', label: 'ASSOCIA.', badge: props.applicantCount },
    { id: 'arena', label: 'ARENA' },
  ];

  return (
    <View style={styles.container}>
      {/* Incognito Alert */}
      {props.user?.is_private && (
        <View style={styles.alertBanner}>
          <AlertTriangle size={18} color="#f87171" />
          <View style={styles.alertContent}>
            <Text style={styles.alertTitle}>SYSTEM ALERT: INCOGNITO MODE ACTIVE</Text>
            <Text style={styles.alertSubtitle}>You are hidden from rankings and cannot be found by other hunters.</Text>
          </View>
        </View>
      )}

      {/* Sub-Navigation */}
      <View style={styles.navContainer}>
        {tabs.map((tab) => (
          <TouchableOpacity
            key={tab.id}
            onPress={() => {
              setActiveTab(tab.id);
              if (tab.id === 'friends') props.onFriendsTabFocus?.();
            }}
            style={[
              styles.navTab,
              activeTab === tab.id ? styles.activeTab : styles.inactiveTab
            ]}
          >
            <Text style={[
              styles.navLabel,
              activeTab === tab.id ? styles.activeLabel : styles.inactiveLabel
            ]}>
              {tab.label}
            </Text>
            {tab.badge !== undefined && tab.badge > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{tab.badge}</Text>
              </View>
            )}
          </TouchableOpacity>
        ))}
      </View>

      {/* Main Content Area */}
      <View style={styles.contentArea}>
        {renderActivePanel()}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  alertBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.8)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.5)',
    padding: 12,
    borderRadius: 4,
    marginBottom: 16,
    gap: 12,
  },
  alertContent: {
    flex: 1,
  },
  alertTitle: {
    fontSize: 9,
    fontWeight: '900',
    color: '#f87171',
  },
  alertSubtitle: {
    fontSize: 8,
    color: 'rgba(248, 113, 113, 0.7)',
    marginTop: 2,
  },
  navContainer: {
    flexDirection: 'row',
    gap: 4,
    marginBottom: 20,
  },
  navTab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 2,
    borderBottomWidth: 2,
    position: 'relative',
  },
  activeTab: {
    backgroundColor: 'rgba(6, 182, 212, 0.2)',
    borderColor: '#06b6d4',
    shadowColor: '#06b6d4',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 5,
  },
  inactiveTab: {
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  navLabel: {
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  activeLabel: {
    color: '#22d3ee',
  },
  inactiveLabel: {
    color: '#64748b',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#ef4444',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#0f172a',
  },
  badgeText: {
    fontSize: 7,
    fontWeight: '900',
    color: '#fff',
  },
  contentArea: {
    flex: 1,
  },
});

export default SocialHub;
