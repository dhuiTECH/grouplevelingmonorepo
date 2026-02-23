import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Alert,
  Platform,
  Image,
} from 'react-native';
import Svg, { Line } from 'react-native-svg';
import { useAuth } from '@/contexts/AuthContext';
import { SKILL_DATA, normalizeClassKey, SkillNode } from '@/utils/skillTreeData';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '@/constants/theme';
import { useSkills } from '@/hooks/useSkills';
import { useSkillTreeData, DbSkill } from '@/hooks/useSkillTreeData';
import * as Haptics from 'expo-haptics';

const { width } = Dimensions.get('window');
const NODE_SIZE = 40;
const TREE_HEIGHT = 700;
const HORIZONTAL_MARGIN = 40;

/** Map a DB skill row to SkillNode for rendering and unlock/upgrade logic. */
function dbSkillToNode(row: DbSkill): SkillNode {
  const typeRaw = String(row.skill_type ?? 'active').toLowerCase();
  return {
    id: row.id,
    name: row.name ?? row.id,
    type: typeRaw === 'passive' ? 'passive' : 'active',
    x: Number(row.x_pos ?? 50),
    y: Number(row.y_pos ?? 0),
    maxRank: Number(row.max_rank ?? 1),
    requiredLevel: Number(row.required_level ?? 1),
    requiredTitle: String(row.required_title ?? 'Novice'),
    cooldown: Number(row.cooldown_ms ?? 0),
    iconPath: row.icon_path,
    connectedTo:
      row.required_skill_id != null && row.required_skill_id !== ''
        ? [row.required_skill_id]
        : undefined,
    getDescription: () => String(row.description_template ?? ''),
  };
}

export const SkillTreeTab = () => {
  const { user } = useAuth();
  const {
    loadout,
    unlockedSkills,
    unlockSkill,
    upgradeSkill,
    updateLoadout,
    loading: loadingSkills,
  } = useSkills();
  const [selectedSkill, setSelectedSkill] = useState<SkillNode | null>(null);

  const userClass = useMemo(
    () => normalizeClassKey(user?.current_class || 'Fighter'),
    [user?.current_class]
  );

  const { skills: dbSkills, loading: loadingTree } = useSkillTreeData(userClass);

  // Use layout from Supabase (useSkillTreeData); fallback to static SKILL_DATA only when DB returns empty
  const skills = useMemo(() => {
    if (dbSkills.length > 0) {
      return dbSkills.map(dbSkillToNode).sort((a, b) => a.y - b.y || a.x - b.x);
    }
    return SKILL_DATA[userClass] || [];
  }, [dbSkills, userClass]);
  const loading = loadingSkills || loadingTree;

  const getUserSkill = (skillId: string) =>
    unlockedSkills.find((s) => s.skill_id === skillId);
  const isSkillUnlocked = (skillId: string) => !!getUserSkill(skillId);
  const isSkillEquipped = (skillId: string) => loadout.includes(skillId);

  const canUnlockSkill = (skill: SkillNode) => {
    if (isSkillUnlocked(skill.id)) return false;
    if ((user?.level || 0) < skill.requiredLevel) return false;
    if (skill.connectedTo?.length) {
      return skill.connectedTo.every((parentId) => isSkillUnlocked(parentId));
    }
    return true;
  };

  const pointsSpent = unlockedSkills.length;
  const availableSP = (user?.level ?? 1) - pointsSpent;

  const getPos = (skill: SkillNode) => ({
    left: HORIZONTAL_MARGIN + (skill.x / 100) * (width - HORIZONTAL_MARGIN * 2),
    top: (skill.y / 100) * TREE_HEIGHT,
  });

  const renderConnections = () => {
    return skills.map((skill) => {
      if (!skill.connectedTo) return null;
      return skill.connectedTo.map((parentId) => {
        const parent = skills.find((s) => s.id === parentId);
        if (!parent) return null;
        const start = getPos(parent);
        const end = getPos(skill);
        
        // Connections are always faint lines now as per "System" aesthetic
        // But maybe slightly brighter if unlocked?
        const bothUnlocked =
          isSkillUnlocked(parentId) && isSkillUnlocked(skill.id);
          
        return (
          <Line
            key={`${parent.id}-${skill.id}`}
            x1={start.left}
            y1={start.top}
            x2={end.left}
            y2={end.top}
            stroke={bothUnlocked ? '#00F0FF' : 'rgba(0, 240, 255, 0.3)'}
            strokeWidth="1.5"
            strokeOpacity={bothUnlocked ? '0.6' : '0.2'} 
          />
        );
      });
    });
  };

  const handleLearn = async () => {
    if (!selectedSkill) return;
    if (availableSP < 1) {
      Alert.alert('Not enough SP', 'You need 1 Skill Point to learn this.');
      return;
    }
    if (!canUnlockSkill(selectedSkill)) {
      Alert.alert(
        'Requirements Not Met',
        'Check level or prerequisite skills.'
      );
      return;
    }
    const res = await unlockSkill(selectedSkill.id);
    if (res?.success) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else {
      Alert.alert('Error', 'Failed to unlock skill.');
    }
  };

  const handleUpgrade = async () => {
    if (!selectedSkill) return;
    const userSkill = getUserSkill(selectedSkill.id);
    if (userSkill && userSkill.current_rank < selectedSkill.maxRank) {
      const res = await upgradeSkill(selectedSkill.id);
      if (res?.success) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        Alert.alert('Error', 'Failed to upgrade skill.');
      }
    }
  };

  const handleToggleEquip = () => {
    if (!selectedSkill) return;
    let newLoadout = loadout.filter((id): id is string => Boolean(id));
    if (isSkillEquipped(selectedSkill.id)) {
      newLoadout = newLoadout.filter((id) => id !== selectedSkill.id);
    } else {
      if (newLoadout.length >= 4) {
        Alert.alert('Loadout Full', 'You can only equip up to 4 skills.');
        return;
      }
      newLoadout.push(selectedSkill.id);
    }
    updateLoadout(newLoadout);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>SYNCING SYSTEM...</Text>
      </View>
    );
  }

  if (!skills.length) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.classTitle}>{userClass} CLASS</Text>
          <Text style={styles.points}>SP: {availableSP}</Text>
        </View>
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>NO DATA FOUND</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.classTitle}>{userClass} CLASS</Text>
        <Text style={styles.points}>SP: {availableSP}</Text>
      </View>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={true}
        bounces={true}
        overScrollMode="always"
      >
        <View style={styles.treeWrapper}>
          <Svg style={StyleSheet.absoluteFill} width={width} height={TREE_HEIGHT}>
            {renderConnections()}
          </Svg>
          {skills.map((skill) => {
            const pos = getPos(skill);
            const isUnlocked = isSkillUnlocked(skill.id);
            const canUnlock = canUnlockSkill(skill);
            const userSkill = getUserSkill(skill.id);
            const rank = userSkill?.current_rank ?? 0;
            
            // Determine styles based on state
            let borderColor = 'rgba(255, 255, 255, 0.3)';
            let backgroundColor = 'rgba(0, 0, 0, 0.8)';
            let opacity = 0.5;
            let iconColor = '#555';

            if (isUnlocked) {
              borderColor = '#00F0FF';
              backgroundColor = 'rgba(0, 240, 255, 0.2)'; // Faint Cyan fill
              opacity = 1;
              iconColor = '#00F0FF';
            } else if (canUnlock) {
              borderColor = '#FFFFFF';
              backgroundColor = 'rgba(255, 255, 255, 0.1)';
              opacity = 1;
              iconColor = '#FFFFFF';
            }

            return (
              <TouchableOpacity
                key={skill.id}
                style={[
                  styles.node,
                  {
                    left: pos.left - NODE_SIZE / 2,
                    top: pos.top - NODE_SIZE / 2,
                    borderColor,
                    backgroundColor,
                    opacity,
                  },
                ]}
                onPress={() => setSelectedSkill(skill)}
              >
                <View style={styles.nodeContent}>
                  {skill.iconPath ? (
                    <Image
                      source={{ uri: skill.iconPath }}
                      style={{
                        width: 24,
                        height: 24,
                        opacity: isUnlocked ? 1 : 0.5,
                        tintColor: isUnlocked ? undefined : iconColor 
                      }}
                      resizeMode="contain"
                    />
                  ) : (
                    <Ionicons
                      name={skill.type === 'active' ? 'flash' : 'shield'}
                      size={18}
                      color={iconColor}
                    />
                  )}
                  {rank > 0 && (
                    <View style={styles.rankBadge}>
                      <Text style={styles.rankText}>
                        {rank}
                      </Text>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>

      {selectedSkill && (
        <View style={styles.footer}>
          <View style={styles.footerHeader}>
            <Text style={styles.skillName}>{selectedSkill.name.toUpperCase()}</Text>
            <TouchableOpacity onPress={() => setSelectedSkill(null)}>
              <Ionicons name="close" size={24} color="#00F0FF" />
            </TouchableOpacity>
          </View>
          <Text style={styles.skillType}>
            {selectedSkill.type.toUpperCase()} • REQ LVL {selectedSkill.requiredLevel}
          </Text>
          <Text style={styles.description}>
            {selectedSkill.getDescription(
              getUserSkill(selectedSkill.id)?.current_rank ?? 1
            )}
          </Text>

          {!isSkillUnlocked(selectedSkill.id) ? (
            <TouchableOpacity
              style={[
                styles.learnBtn,
                (availableSP < 1 || !canUnlockSkill(selectedSkill)) &&
                  styles.learnBtnDisabled,
              ]}
              onPress={handleLearn}
              disabled={availableSP < 1 || !canUnlockSkill(selectedSkill)}
            >
              <Text style={styles.learnBtnText}>LEARN (1 SP)</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.footerActions}>
              {getUserSkill(selectedSkill.id)!.current_rank <
                selectedSkill.maxRank && (
                <TouchableOpacity
                  style={styles.upgradeBtn}
                  onPress={handleUpgrade}
                >
                  <Text style={styles.upgradeBtnText}>UPGRADE</Text>
                </TouchableOpacity>
              )}
              {selectedSkill.type === 'active' && (
                <TouchableOpacity
                  style={[
                    styles.equipBtn,
                    isSkillEquipped(selectedSkill.id) && styles.equipBtnActive,
                  ]}
                  onPress={handleToggleEquip}
                >
                  <Text
                    style={[
                      styles.equipBtnText,
                      isSkillEquipped(selectedSkill.id) && styles.equipBtnTextActive,
                    ]}
                  >
                    {isSkillEquipped(selectedSkill.id) ? 'UNEQUIP' : 'EQUIP'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {!canUnlockSkill(selectedSkill) &&
            !isSkillUnlocked(selectedSkill.id) && (
              <Text style={styles.reqHint}>
                REQUIRES: LVL {selectedSkill.requiredLevel}
                {selectedSkill.connectedTo?.length
                  ? ' • PREREQUISITE SKILLS'
                  : ''}
              </Text>
            )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    minHeight: 400,
    backgroundColor: 'transparent',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  loadingText: {
    color: '#00F0FF',
    fontSize: 14,
    fontWeight: 'bold',
    fontFamily: 'Exo2-Regular',
    letterSpacing: 2,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    color: '#64748B',
    fontSize: 14,
    fontFamily: 'Exo2-Regular',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 240, 255, 0.2)',
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
  },
  classTitle: {
    color: '#00F0FF',
    fontSize: 18,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    fontFamily: 'Exo2-Regular',
    letterSpacing: 1,
  },
  points: {
    color: '#fbbf24',
    fontSize: 16,
    fontWeight: 'bold',
    fontFamily: 'Exo2-Regular',
  },
  scrollView: {
    flex: 1,
    minHeight: 0,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 220,
  },
  treeWrapper: {
    width,
    height: TREE_HEIGHT,
    position: 'relative',
  },
  node: {
    position: 'absolute',
    width: NODE_SIZE,
    height: NODE_SIZE,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
    transform: [{ rotate: '45deg' }], // Diamond shape
    shadowColor: '#00F0FF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  nodeContent: {
    transform: [{ rotate: '-45deg' }], // Counter-rotate content
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankBadge: {
    position: 'absolute',
    bottom: -8,
    right: -8,
    backgroundColor: '#000',
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#00F0FF',
  },
  rankText: {
    color: '#00F0FF',
    fontSize: 9,
    fontWeight: 'bold',
    fontFamily: 'Exo2-Regular',
  },
  footer: {
    padding: 20,
    backgroundColor: 'rgba(15, 23, 42, 0.95)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 240, 255, 0.3)',
  },
  footerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  skillName: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
    fontFamily: 'Exo2-Regular',
    letterSpacing: 1,
    textShadowColor: 'rgba(0, 240, 255, 0.5)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },
  skillType: {
    color: '#64748B',
    fontSize: 12,
    marginBottom: 12,
    fontWeight: 'bold',
    fontFamily: 'Exo2-Regular',
  },
  description: {
    color: '#CBD5E1',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 20,
    fontFamily: 'Exo2-Regular',
  },
  learnBtn: {
    backgroundColor: 'rgba(0, 240, 255, 0.1)',
    padding: 12,
    borderRadius: 2,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#00F0FF',
  },
  learnBtnDisabled: {
    backgroundColor: 'rgba(100, 116, 139, 0.2)',
    borderColor: '#64748B',
    opacity: 0.6,
  },
  learnBtnText: {
    color: '#00F0FF',
    fontWeight: 'bold',
    fontSize: 16,
    fontFamily: 'Exo2-Regular',
    letterSpacing: 1,
  },
  footerActions: {
    flexDirection: 'row',
    gap: 12,
  },
  upgradeBtn: {
    flex: 1,
    backgroundColor: 'rgba(74, 222, 128, 0.1)',
    padding: 12,
    borderRadius: 2,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#4ade80',
  },
  upgradeBtnText: {
    color: '#4ade80',
    fontWeight: 'bold',
    fontSize: 14,
    fontFamily: 'Exo2-Regular',
    letterSpacing: 1,
  },
  equipBtn: {
    flex: 1,
    backgroundColor: 'rgba(251, 191, 36, 0.1)',
    padding: 12,
    borderRadius: 2,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#fbbf24',
  },
  equipBtnActive: {
    backgroundColor: 'transparent',
    borderColor: '#fbbf24',
    borderStyle: 'dashed',
  },
  equipBtnText: {
    color: '#fbbf24',
    fontWeight: 'bold',
    fontSize: 14,
    fontFamily: 'Exo2-Regular',
    letterSpacing: 1,
  },
  equipBtnTextActive: {
    color: '#fbbf24',
  },
  reqHint: {
    marginTop: 12,
    fontSize: 11,
    color: '#ef4444',
    textAlign: 'center',
    fontFamily: 'Exo2-Regular',
  },
});
