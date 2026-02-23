import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Image, ActivityIndicator, RefreshControl } from 'react-native';
import { RefreshCw, X, Shield, Plus, Loader2 } from 'lucide-react-native';
import { MotiView } from 'moti';
import LayeredAvatar from '@/components/LayeredAvatar';
import { User } from '@/types/user';
import { useGameData } from '@/hooks/useGameData';

interface AssociationPanelProps {
  user: User;
  availableAssociations: any[];
  pendingApplicants: any[];
  applicantCount: number;
  appliedAssociationIds: Set<string>;
  associationName: string;
  setAssociationName: (name: string) => void;
  selectedEmblem: string;
  setSelectedEmblem: (emblem: string) => void;
  isCreatingAssociation: boolean;
  emblemOptions: string[];
  handleApplyToAssociation: (associationId: string) => void;
  loadPendingApplicants: () => void;
  handleApplicantDecision: (applicantId: string, action: 'accept' | 'reject') => void;
  handleCreateAssociation: () => void;
  setSelectedAvatar: (user: any) => void;
  isSocialLoading: boolean;
  onRefresh: () => void;
}

const AssociationPanel: React.FC<AssociationPanelProps> = ({
  user,
  availableAssociations,
  pendingApplicants,
  applicantCount,
  appliedAssociationIds,
  associationName,
  setAssociationName,
  selectedEmblem,
  setSelectedEmblem,
  isCreatingAssociation,
  emblemOptions,
  handleApplyToAssociation,
  loadPendingApplicants,
  handleApplicantDecision,
  handleCreateAssociation,
  setSelectedAvatar,
  isSocialLoading,
  onRefresh
}) => {
  const [showFoundingForm, setShowFoundingForm] = useState(false);
  const { shopItems } = useGameData();

  // Fallback emblem in case URL is local or missing
  const getEmblemSource = (url: string) => {
    if (!url) return require('../../../assets/huntericon.png');
    if (url.startsWith('/')) {
        // Handle path if it's a local web path - would need mapping in real app
        return require('../../../assets/huntericon.png');
    }
    return { uri: url };
  };

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
      <View style={styles.header}>
        <Text style={styles.headerTitle}>HUNTER ASSOCIATION</Text>
      </View>

      {user?.association_id ? (
        <>
          {/* Energy Well */}
          <View style={styles.auraCard}>
            <Text style={styles.auraCardTitle}>ENERGY WELL SYNCHRONIZATION</Text>
            <View style={styles.energyWellContainer}>
              <View style={styles.wellOuter}>
                <MotiView
                  from={{ height: '0%' }}
                  animate={{ height: '68%' }}
                  transition={{ type: 'timing', duration: 1500 }}
                  style={styles.wellFill}
                />
              </View>
              <View style={styles.wellInfo}>
                <Text style={styles.wellExp}>8,450 / 12,500 EXP</Text>
                <Text style={styles.wellSubtitle}>ASSOCIATION GOAL PROGRESS</Text>
              </View>
            </View>
          </View>

          {/* System Buff Status */}
          <View style={styles.buffCard}>
            <View style={styles.buffStatusBadge}>
              <Text style={styles.buffStatusText}>STATUS: SYNC ACTIVE</Text>
            </View>
            <View style={styles.buffInfo}>
              <Text style={styles.buffTitle}>+10% VITALITY BUFF</Text>
              <Text style={styles.buffDesc}>All Association members receive enhanced stamina regeneration</Text>
            </View>
          </View>

          {/* Recruitment Center */}
          {applicantCount > 0 && (
            <View style={styles.recruitmentCard}>
              <View style={styles.recruitmentHeader}>
                <Text style={styles.recruitmentTitle}>RECRUITMENT COMMAND</Text>
                <TouchableOpacity onPress={loadPendingApplicants} style={styles.refreshButtonSmall}>
                  <RefreshCw size={14} color="#f87171" />
                </TouchableOpacity>
              </View>
              
              <View style={styles.applicantList}>
                {pendingApplicants.map((applicant) => (
                  <View key={applicant.id} style={styles.applicantCard}>
                    <View style={styles.applicantLeft}>
                      <LayeredAvatar user={applicant} size={40} onAvatarClick={() => setSelectedAvatar(applicant)} allShopItems={shopItems} />
                      <View style={{ marginLeft: 12 }}>
                        <Text style={styles.applicantName}>{applicant.hunter_name || applicant.name}</Text>
                        <Text style={styles.applicantSubtitle}>LV.{applicant.level} • {applicant.current_title || 'Hunter'}</Text>
                      </View>
                    </View>
                    <View style={styles.applicantActions}>
                      <TouchableOpacity 
                        onPress={() => handleApplicantDecision(applicant.id, 'accept')}
                        style={[styles.actionBtn, styles.acceptBtn]}
                      >
                        <Text style={styles.actionBtnText}>ACCEPT</Text>
                      </TouchableOpacity>
                      <TouchableOpacity 
                        onPress={() => handleApplicantDecision(applicant.id, 'reject')}
                        style={[styles.actionBtn, styles.rejectBtn]}
                      >
                        <Text style={styles.actionBtnText}>REJECT</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Member Roster Placeholder */}
          <View style={styles.rosterCard}>
            <Text style={styles.rosterTitle}>ASSOCIATION MEMBER ROSTER</Text>
            <View style={styles.rosterList}>
              {[
                { name: 'VoidMaster', weekly_exp: 2450, rank: 'A', level: 67 },
                { name: 'ShadowHunter', weekly_exp: 2230, rank: 'A', level: 64 },
                { name: 'CyberNinja', weekly_exp: 1980, rank: 'B', level: 59 },
              ].map((member, idx) => (
                <View key={idx} style={styles.rosterItem}>
                  <View style={styles.rosterMemberLeft}>
                    <Text style={styles.rosterRank}>#{idx + 1}</Text>
                    <View>
                      <Text style={styles.rosterName}>{member.name}</Text>
                      <Text style={styles.rosterSubtitle}>Rank {member.rank} • LV. {member.level}</Text>
                    </View>
                  </View>
                  <View style={styles.rosterYield}>
                    <Text style={styles.yieldExp}>{member.weekly_exp} EXP</Text>
                    <Text style={styles.yieldLabel}>WEEKLY YIELD</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        </>
      ) : (
        <>
          {/* Browse Available Associations */}
          <View style={styles.browseSection}>
            <Text style={styles.sectionHeader}>AVAILABLE HUNTER ASSOCIATIONS</Text>
            {availableAssociations.length === 0 ? (
              <View style={styles.emptyBrowse}>
                <Text style={styles.emptyText}>NO ASSOCIATIONS FOUND</Text>
                <Text style={styles.emptySubtext}>Be the first to establish an association!</Text>
              </View>
            ) : (
              <View style={styles.assocGrid}>
                {availableAssociations.map((assoc) => {
                  const hasApplied = appliedAssociationIds.has(assoc.id);
                  return (
                    <View key={assoc.id} style={styles.assocCard}>
                      <View style={styles.assocCardTop}>
                        <View style={styles.emblemContainer}>
                          <Image source={getEmblemSource(assoc.emblem_url)} style={styles.emblemImage} />
                        </View>
                        <View style={styles.assocInfo}>
                          <Text style={styles.assocName}>{assoc.name}</Text>
                          <Text style={styles.assocLeader}>LED BY: {assoc.leader?.name || 'Unknown'}</Text>
                          <Text style={styles.assocStats}>{assoc.member_count || 1} MEMBERS • LV.{assoc.level || 1}</Text>
                        </View>
                      </View>
                      <TouchableOpacity 
                        onPress={() => handleApplyToAssociation(assoc.id)}
                        disabled={hasApplied}
                        style={[styles.applyBtn, hasApplied && styles.appliedBtn]}
                      >
                        <Text style={styles.applyBtnText}>
                          {hasApplied ? 'SIGNAL TRANSMITTED' : 'REQUEST SYNC'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  );
                })}
              </View>
            )}
          </View>

          {/* Founding Section */}
          {showFoundingForm ? (
            <MotiView 
              from={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              style={styles.foundingForm}
            >
              <View style={styles.formHeader}>
                <Text style={styles.formTitle}>ESTABLISH HUNTER ASSOCIATION</Text>
                <TouchableOpacity onPress={() => setShowFoundingForm(false)}>
                  <X size={20} color="#94a3b8" />
                </TouchableOpacity>
              </View>

              <View style={styles.formField}>
                <Text style={styles.fieldLabel}>ASSOCIATION NAME</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="Enter prestigious name..."
                  placeholderTextColor="#475569"
                  value={associationName}
                  onChangeText={setAssociationName}
                />
              </View>

              <View style={styles.formField}>
                <Text style={styles.fieldLabel}>SELECT EMBLEM</Text>
                <View style={styles.emblemGrid}>
                  {emblemOptions.map((emblem) => (
                    <TouchableOpacity
                      key={emblem}
                      onPress={() => setSelectedEmblem(emblem)}
                      style={[
                        styles.emblemOption,
                        selectedEmblem === emblem && styles.selectedEmblem
                      ]}
                    >
                      <Image source={getEmblemSource(emblem)} style={styles.emblemGridImg} />
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.costWarning}>
                <Text style={styles.warningText}>
                  <Text style={{ fontWeight: '900', color: '#fbbf24' }}>PRE-REQUISITE:</Text> Establish a new Hunter Association requires a deposit of <Text style={{ fontWeight: '900', fontStyle: 'italic', color: '#fbbf24' }}>100,000 GOLD</Text>.
                </Text>
              </View>

              <TouchableOpacity
                onPress={handleCreateAssociation}
                disabled={isCreatingAssociation || !associationName.trim() || !selectedEmblem || (user.coins || 0) < 100000}
                style={[
                  styles.foundBtn,
                  (isCreatingAssociation || !associationName.trim() || !selectedEmblem || (user.coins || 0) < 100000) && styles.disabledFoundBtn
                ]}
              >
                {isCreatingAssociation ? (
                  <ActivityIndicator color="#000" />
                ) : (
                  <Text style={styles.foundBtnText}>
                    {(user.coins || 0) < 100000 
                      ? `INSUFFICIENT FUNDS (${(user.coins || 0).toLocaleString()} / 100,000)` 
                      : 'FOUND ASSOCIATION (100,000 GOLD)'}
                  </Text>
                )}
              </TouchableOpacity>
            </MotiView>
          ) : (
            <View style={styles.foundingPrompt}>
              <Text style={styles.promptTitle}>ESTABLISH YOUR OWN HUNTER ASSOCIATION</Text>
              <Text style={styles.promptSubtitle}>Become a President and lead your own guild</Text>
              <TouchableOpacity 
                onPress={() => setShowFoundingForm(true)}
                style={styles.promptBtn}
              >
                <Text style={styles.promptBtnText}>FOUND ASSOCIATION</Text>
              </TouchableOpacity>
            </View>
          )}
        </>
      )}
      
      <View style={{ height: 40 }} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 10,
    fontWeight: '900',
    color: '#22d3ee',
    letterSpacing: 2,
  },
  auraCard: {
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(34, 211, 238, 0.2)',
    padding: 16,
    marginBottom: 12,
  },
  auraCardTitle: {
    fontSize: 8,
    fontWeight: '900',
    color: '#22d3ee',
    letterSpacing: 2,
    textAlign: 'center',
    marginBottom: 16,
  },
  energyWellContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
    justifyContent: 'center',
  },
  wellOuter: {
    width: 40,
    height: 120,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    borderRadius: 20,
    borderWidth: 2,
    borderColor: 'rgba(34, 211, 238, 0.2)',
    overflow: 'hidden',
    justifyContent: 'flex-end',
  },
  wellFill: {
    width: '100%',
    backgroundColor: '#22d3ee',
    shadowColor: '#22d3ee',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 10,
  },
  wellInfo: {
    flex: 1,
  },
  wellExp: {
    fontSize: 14,
    fontWeight: '900',
    color: '#22d3ee',
  },
  wellSubtitle: {
    fontSize: 8,
    color: 'rgba(34, 211, 238, 0.6)',
    fontWeight: 'bold',
    marginTop: 4,
  },
  buffCard: {
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    borderRadius: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    alignItems: 'center',
    marginBottom: 12,
  },
  buffStatusBadge: {
    backgroundColor: '#16a34a',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 4,
    marginBottom: 12,
  },
  buffStatusText: {
    fontSize: 8,
    fontWeight: '900',
    color: '#000',
  },
  buffInfo: {
    alignItems: 'center',
  },
  buffTitle: {
    fontSize: 12,
    fontWeight: '900',
    color: '#4ade80',
    letterSpacing: 1,
  },
  buffDesc: {
    fontSize: 9,
    color: 'rgba(74, 222, 128, 0.6)',
    textAlign: 'center',
    marginTop: 4,
  },
  recruitmentCard: {
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(248, 113, 113, 0.2)',
    padding: 16,
    marginBottom: 12,
  },
  recruitmentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  recruitmentTitle: {
    fontSize: 8,
    fontWeight: '900',
    color: '#f87171',
    letterSpacing: 2,
  },
  refreshButtonSmall: {
    padding: 6,
    backgroundColor: 'rgba(248, 113, 113, 0.1)',
    borderRadius: 4,
  },
  applicantList: {
    gap: 8,
  },
  applicantCard: {
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    borderRadius: 4,
    padding: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(248, 113, 113, 0.1)',
  },
  applicantLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  applicantName: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#fff',
  },
  applicantSubtitle: {
    fontSize: 8,
    color: '#f87171',
    fontWeight: 'bold',
    marginTop: 2,
  },
  applicantActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 2,
  },
  acceptBtn: {
    backgroundColor: '#16a34a',
  },
  rejectBtn: {
    backgroundColor: '#991b1b',
  },
  actionBtnText: {
    fontSize: 7,
    fontWeight: '900',
    color: '#fff',
  },
  rosterCard: {
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    borderRadius: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  rosterTitle: {
    fontSize: 8,
    fontWeight: '900',
    color: 'rgba(34, 211, 238, 0.6)',
    letterSpacing: 2,
    marginBottom: 16,
  },
  rosterList: {
    gap: 8,
  },
  rosterItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    padding: 12,
    borderRadius: 4,
  },
  rosterMemberLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  rosterRank: {
    fontSize: 12,
    fontWeight: '900',
    fontStyle: 'italic',
    color: 'rgba(34, 211, 238, 0.4)',
  },
  rosterName: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#fff',
  },
  rosterSubtitle: {
    fontSize: 8,
    color: '#22d3ee',
    fontWeight: 'bold',
  },
  rosterYield: {
    alignItems: 'flex-end',
  },
  yieldExp: {
    fontSize: 10,
    fontWeight: '900',
    color: '#4ade80',
  },
  yieldLabel: {
    fontSize: 6,
    fontWeight: '900',
    color: 'rgba(74, 222, 128, 0.5)',
  },
  browseSection: {
    marginBottom: 20,
  },
  sectionHeader: {
    fontSize: 9,
    fontWeight: '900',
    color: '#22d3ee',
    letterSpacing: 2,
    marginBottom: 12,
  },
  emptyBrowse: {
    alignItems: 'center',
    paddingVertical: 40,
    backgroundColor: 'rgba(15, 23, 42, 0.4)',
    borderRadius: 8,
  },
  emptyText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#64748b',
  },
  emptySubtext: {
    fontSize: 9,
    color: '#475569',
    marginTop: 4,
  },
  assocGrid: {
    gap: 12,
  },
  assocCard: {
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    borderRadius: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  assocCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 16,
  },
  emblemContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#0f172a',
    borderWidth: 2,
    borderColor: 'rgba(34, 211, 238, 0.3)',
    padding: 8,
  },
  emblemImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'contain',
  },
  assocInfo: {
    flex: 1,
  },
  assocName: {
    fontSize: 16,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: -0.5,
  },
  assocLeader: {
    fontSize: 8,
    fontWeight: 'bold',
    color: '#22d3ee',
    textTransform: 'uppercase',
    marginTop: 2,
  },
  assocStats: {
    fontSize: 8,
    fontWeight: '900',
    color: '#4ade80',
    textTransform: 'uppercase',
    marginTop: 2,
  },
  applyBtn: {
    backgroundColor: 'rgba(37, 99, 235, 0.8)',
    paddingVertical: 10,
    borderRadius: 4,
    alignItems: 'center',
  },
  appliedBtn: {
    backgroundColor: 'rgba(71, 85, 105, 0.4)',
  },
  applyBtnText: {
    fontSize: 9,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: 1,
  },
  foundingPrompt: {
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    padding: 24,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(251, 191, 36, 0.2)',
    alignItems: 'center',
  },
  promptTitle: {
    fontSize: 10,
    fontWeight: '900',
    color: '#fbbf24',
    textAlign: 'center',
    letterSpacing: 1,
  },
  promptSubtitle: {
    fontSize: 8,
    color: 'rgba(251, 191, 36, 0.6)',
    marginTop: 4,
    marginBottom: 16,
  },
  promptBtn: {
    backgroundColor: '#fbbf24',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 4,
  },
  promptBtnText: {
    fontSize: 9,
    fontWeight: '900',
    color: '#000',
  },
  foundingForm: {
    backgroundColor: 'rgba(15, 23, 42, 0.9)',
    borderRadius: 8,
    padding: 20,
    borderWidth: 1,
    borderColor: '#fbbf24',
  },
  formHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  formTitle: {
    fontSize: 12,
    fontWeight: '900',
    color: '#fbbf24',
    letterSpacing: 1,
  },
  formField: {
    marginBottom: 20,
  },
  fieldLabel: {
    fontSize: 8,
    fontWeight: '900',
    color: '#22d3ee',
    letterSpacing: 2,
    marginBottom: 8,
  },
  formInput: {
    backgroundColor: '#000',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 4,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  emblemGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  emblemOption: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: '#000',
    padding: 8,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  selectedEmblem: {
    borderColor: '#fbbf24',
    backgroundColor: 'rgba(251, 191, 36, 0.1)',
  },
  emblemGridImg: {
    width: '100%',
    height: '100%',
    resizeMode: 'contain',
  },
  costWarning: {
    backgroundColor: 'rgba(251, 191, 36, 0.1)',
    padding: 12,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(251, 191, 36, 0.2)',
    marginBottom: 20,
  },
  warningText: {
    fontSize: 9,
    color: 'rgba(251, 191, 36, 0.8)',
    lineHeight: 14,
  },
  foundBtn: {
    backgroundColor: '#fbbf24',
    paddingVertical: 14,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabledFoundBtn: {
    backgroundColor: '#475569',
    opacity: 0.5,
  },
  foundBtnText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#000',
  },
});

export default AssociationPanel;
