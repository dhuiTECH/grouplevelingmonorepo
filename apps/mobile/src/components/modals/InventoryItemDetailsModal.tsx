import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import BaseModal from './BaseModal';
import { ShopItemMedia } from '@/components/ShopItemMedia';
import { ShopItem, User, UserCosmetic } from '@/types/user';
import { XIcon } from '@/components/icons/XIcon';
import { RANK_COLORS } from '@/constants/gameConstants';

interface InventoryItemDetailsModalProps {
  visible: boolean;
  onClose: () => void;
  data: { item: ShopItem; cosmeticItem: UserCosmetic } | null;
  user: User;
  onEquipToggle: (id: string, equipped: boolean) => void;
  getFullDescription: (item: ShopItem) => string;
}

export const InventoryItemDetailsModal: React.FC<InventoryItemDetailsModalProps> = ({
  visible,
  onClose,
  data,
  user,
  onEquipToggle,
  getFullDescription,
}) => {
  if (!data) return null;
  const { item, cosmeticItem } = data;

  const rarity = item.rarity?.toLowerCase() || 'common';
  const rarityColor = RANK_COLORS[rarity.charAt(0).toUpperCase()] || '#9ca3af';

  return (
    <BaseModal visible={visible} onClose={onClose}>
      <View style={styles.container}>
        <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
          <XIcon size={24} color="#9ca3af" />
        </TouchableOpacity>

        <View style={[styles.imageWrapper, { borderColor: rarityColor }]}>
          <ShopItemMedia item={item} style={styles.image} />
        </View>

        <Text style={styles.name}>{item.name}</Text>
        <Text style={styles.slot}>{item.slot?.replace(/_/g, ' ')}</Text>

        {/* Requirements */}
        {(item.min_level && item.min_level > 1) || (item.class_req && item.class_req !== 'All') ? (
          <View style={styles.requirementsContainer}>
            {item.min_level && item.min_level > 1 && (
              <View style={styles.reqBadgeYellow}>
                <Text style={styles.reqBadgeText}>⚡ Lv. {item.min_level}</Text>
              </View>
            )}
            {item.class_req && item.class_req !== 'All' && (
              <View style={styles.reqBadgeBlue}>
                <Text style={styles.reqBadgeText}>🛡️ {item.class_req}</Text>
              </View>
            )}
          </View>
        ) : null}

        <ScrollView style={styles.descriptionScroll} showsVerticalScrollIndicator={false}>
          <Text style={styles.description}>{item.description || 'System artifact with unique properties.'}</Text>
          
          {getFullDescription(item) !== '' && (
            <Text style={styles.bonuses}>{getFullDescription(item)}</Text>
          )}

          {item.is_animated && (
            <Text style={styles.animatedText}>✨ ANIMATED_SEQUENCE_DETECTED</Text>
          )}
        </ScrollView>

        <View style={styles.footer}>
          <View style={styles.statusRow}>
            <Text style={styles.rarityText}>{rarity} class</Text>
            <View style={styles.equippedBadge}>
              <Text style={[styles.statusText, { color: cosmeticItem.equipped ? '#34d399' : '#6b7280' }]}>
                {cosmeticItem.equipped ? '● EQUIPPED' : '○ UNEQUIPPED'}
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={[
              styles.actionButton,
              cosmeticItem.equipped ? styles.unequipButton : styles.equipButton
            ]}
            onPress={() => {
              onEquipToggle(cosmeticItem.id, !cosmeticItem.equipped);
              onClose();
            }}
          >
            <Text style={styles.actionButtonText}>
              {cosmeticItem.equipped ? 'DISCONNECT' : 'INITIALIZE SYNC'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </BaseModal>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(15, 23, 42, 0.95)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    padding: 24,
    width: '100%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 20,
    borderBottomWidth: 4,
    borderBottomColor: '#0f172a',
  },
  closeBtn: {
    position: 'absolute',
    top: 16,
    right: 16,
    zIndex: 10,
    padding: 8,
  },
  imageWrapper: {
    width: 80,
    height: 80,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    overflow: 'hidden',
  },
  image: {
    width: '80%',
    height: '80%',
  },
  name: {
    fontSize: 22,
    fontWeight: '900',
    color: '#fff',
    textTransform: 'uppercase',
    textAlign: 'center',
    letterSpacing: 1,
    marginBottom: 4,
  },
  slot: {
    fontSize: 12,
    color: '#a78bfa',
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 2,
    marginBottom: 16,
  },
  requirementsContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  reqBadgeYellow: {
    backgroundColor: 'rgba(202, 138, 4, 0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(202, 138, 4, 0.4)',
  },
  reqBadgeBlue: {
    backgroundColor: 'rgba(37, 99, 235, 0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(37, 99, 235, 0.4)',
  },
  reqBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '900',
  },
  descriptionScroll: {
    maxHeight: 120,
    width: '100%',
    marginBottom: 24,
  },
  description: {
    color: '#94a3b8',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 12,
  },
  bonuses: {
    color: '#34d399',
    fontSize: 12,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  animatedText: {
    color: '#22d3ee',
    fontSize: 10,
    fontWeight: '900',
    textAlign: 'center',
    letterSpacing: 1,
  },
  footer: {
    width: '100%',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  rarityText: {
    color: '#64748b',
    fontSize: 11,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  equippedBadge: {
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '900',
  },
  actionButton: {
    width: '100%',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    borderBottomWidth: 4,
  },
  equipButton: {
    backgroundColor: '#16a34a',
    borderBottomColor: '#14532d',
  },
  unequipButton: {
    backgroundColor: '#ef4444',
    borderBottomColor: '#7f1d1d',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 1,
  },
});
