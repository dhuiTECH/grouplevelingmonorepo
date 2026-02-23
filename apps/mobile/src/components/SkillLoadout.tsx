import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  Dimensions,
  Image,
  Platform,
} from 'react-native';
import { theme } from '@/constants/theme';
import { useSkills } from '@/hooks/useSkills';
import { SKILL_DATA, SkillNode } from '@/utils/skillTreeData';
import { X, Zap, Plus, Lock } from 'lucide-react-native';
import { MotiView, AnimatePresence } from 'moti';
import { playHunterSound } from '@/utils/audio';
import * as Haptics from 'expo-haptics';
import { useAuth } from '@/contexts/AuthContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SLOT_SIZE = (SCREEN_WIDTH - 80) / 4;

export const SkillLoadout = () => {
  const { user } = useAuth();
  const { 
    loadout, 
    unlockedSkills, 
    updateLoadout, 
    getSkillNode,
    loading 
  } = useSkills();

  const [isModalVisible, setIsModalVisible] = useState(false);
  const [selectedSlotIndex, setSelectedSlotIndex] = useState<number | null>(null);

  const unlockedActiveSkills = unlockedSkills
    .map(us => getSkillNode(us.skill_id))
    .filter(node => node && node.type === 'active') as SkillNode[];

  const handleSlotPress = (index: number) => {
    playHunterSound('click');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedSlotIndex(index);
    setIsModalVisible(true);
  };

  const handleSelectSkill = async (skillId: string | null) => {
    if (selectedSlotIndex === null) return;

    const padded = [...loadout];
    while (padded.length < 4) padded.push('');
    padded[selectedSlotIndex] = skillId || '';

    // Ensure each skill appears at most once: clear this skill from all other slots
    if (skillId) {
      for (let i = 0; i < padded.length; i++) {
        if (i !== selectedSlotIndex && padded[i] === skillId) padded[i] = '';
      }
    }

    await updateLoadout(padded);
    setIsModalVisible(false);
    setSelectedSlotIndex(null);
    playHunterSound('equip');
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  if (loading) return null;

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Image source={require('../../assets/combat_loadout_icon.png')} style={styles.headerIcon} />
        <Text style={styles.headerText}>COMBAT LOADOUT</Text>
      </View>
      
      <View style={styles.slotsContainer}>
        {[0, 1, 2, 3].map((index) => {
          const skillId = loadout[index];
          const skillNode = skillId ? getSkillNode(skillId) : null;
          const userSkill = skillId ? unlockedSkills.find(s => s.skill_id === skillId) : null;

          return (
            <TouchableOpacity
              key={index}
              style={[styles.slot, skillNode ? styles.slotFilled : styles.slotEmpty]}
              onPress={() => handleSlotPress(index)}
            >
              {skillNode ? (
                <View style={styles.skillIconContainer}>
                  {skillNode.iconPath ? (
                    <Image
                      source={{ uri: skillNode.iconPath }}
                      style={{ width: 24, height: 24 }}
                      resizeMode="contain"
                    />
                  ) : (
                    <Zap size={24} color={theme.colors.cyan} />
                  )}
                  <Text style={styles.slotRank}>R{userSkill?.current_rank || 1}</Text>
                </View>
              ) : (
                <Plus size={20} color="rgba(255, 255, 255, 0.2)" />
              )}
              <Text style={styles.slotLabel} numberOfLines={1}>
                {skillNode ? skillNode.name : `SLOT ${index + 1}`}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <Modal
        visible={isModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <MotiView
            from={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            style={styles.modalContent}
          >
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>SELECT ACTIVE SKILL</Text>
              <TouchableOpacity onPress={() => setIsModalVisible(false)}>
                <X color="#6b7280" size={24} />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.skillList}>
              <TouchableOpacity
                style={styles.skillItem}
                onPress={() => handleSelectSkill(null)}
              >
                <View style={[styles.skillIconSmall, styles.emptyIcon]}>
                  <X size={16} color="#ef4444" />
                </View>
                <Text style={[styles.skillName, { color: '#ef4444' }]}>UNEQUIP SLOT</Text>
              </TouchableOpacity>

              {unlockedActiveSkills.length === 0 ? (
                <View style={styles.noSkillsContainer}>
                  <Lock size={32} color="#334155" />
                  <Text style={styles.noSkillsText}>NO ACTIVE SKILLS UNLOCKED</Text>
                </View>
              ) : (
                unlockedActiveSkills.map((skill) => {
                  const isEquipped = loadout.includes(skill.id);
                  const userSkill = unlockedSkills.find(s => s.skill_id === skill.id);

                  return (
                    <TouchableOpacity
                      key={skill.id}
                      style={[styles.skillItem, isEquipped && styles.skillItemEquipped]}
                      onPress={() => handleSelectSkill(skill.id)}
                    >
                      <View style={styles.skillIconSmall}>
                        {skill.iconPath ? (
                          <Image
                            source={{ uri: skill.iconPath }}
                            style={{ width: 24, height: 24 }}
                            resizeMode="contain"
                          />
                        ) : (
                          <Zap size={16} color={theme.colors.cyan} />
                        )}
                      </View>
                      <View style={styles.skillInfo}>
                        <Text style={styles.skillName}>{skill.name}</Text>
                        <Text style={styles.skillRank}>RANK {userSkill?.current_rank || 1}</Text>
                      </View>
                      {isEquipped && (
                        <View style={styles.equippedBadge}>
                          <Text style={styles.equippedText}>EQUIPPED</Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })
              )}
            </ScrollView>
          </MotiView>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 20,
    paddingHorizontal: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    backgroundColor: 'rgba(251, 146, 60, 0.1)',
    borderLeftWidth: 4,
    borderLeftColor: '#fb923c',
    paddingHorizontal: 15,
    paddingVertical: 10,
    gap: 10,
  },
  headerIcon: {
    width: 20,
    height: 20,
    resizeMode: 'contain',
  },
  headerText: {
    fontSize: 10,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 3,
    color: '#fb923c',
    fontFamily: 'Exo2-Regular',
  },
  slotsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  slot: {
    width: SLOT_SIZE,
    height: SLOT_SIZE,
    borderRadius: 4,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 4,
  },
  slotEmpty: {
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderStyle: 'dashed',
  },
  slotFilled: {
    backgroundColor: 'rgba(15, 23, 42, 0.9)',
    borderColor: theme.colors.cyan,
    shadowColor: theme.colors.cyan,
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 3,
  },
  skillIconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  slotRank: {
    color: theme.colors.cyan,
    fontSize: 8,
    fontWeight: '900',
    marginTop: 2,
    fontFamily: 'Exo2-Regular',
  },
  slotLabel: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 7,
    fontWeight: '900',
    textTransform: 'uppercase',
    marginTop: 4,
    textAlign: 'center',
    fontFamily: 'Exo2-Regular',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxHeight: '70%',
    backgroundColor: '#0f172a',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
  },
  modalTitle: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 1,
    fontFamily: 'Exo2-Regular',
  },
  skillList: {
    padding: 10,
  },
  skillItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 4,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  skillItemEquipped: {
    borderColor: theme.colors.cyan,
    backgroundColor: 'rgba(0, 255, 255, 0.05)',
  },
  skillIconSmall: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  emptyIcon: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
  },
  skillInfo: {
    flex: 1,
  },
  skillName: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
    fontFamily: 'Exo2-Regular',
  },
  skillRank: {
    color: theme.colors.cyan,
    fontSize: 10,
    fontWeight: '900',
    fontFamily: 'Exo2-Regular',
  },
  equippedBadge: {
    backgroundColor: theme.colors.cyan,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 2,
  },
  equippedText: {
    color: '#000',
    fontSize: 8,
    fontWeight: '900',
    fontFamily: 'Exo2-Regular',
  },
  noSkillsContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  noSkillsText: {
    color: '#475569',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1,
    fontFamily: 'Exo2-Regular',
  },
});
