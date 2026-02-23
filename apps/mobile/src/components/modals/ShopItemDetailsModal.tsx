import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Dimensions,
} from 'react-native';
import { MotiView } from 'moti';
import BaseModal from './BaseModal';
import { ShopItemMedia } from '@/components/ShopItemMedia';
import { ShopItem, User } from '@/types/user';
import { RANK_COLORS } from '@/constants/gameConstants';
import { XIcon } from '@/components/icons/XIcon';

// Assets
const coinIcon = require('../../../assets/coinicon.png');
const gemIcon = require('../../../assets/gemicon.png');

interface ShopItemDetailsModalProps {
  visible: boolean;
  onClose: () => void;
  item: ShopItem | null;
  user: User;
  onBuy: (item: ShopItem, currency: 'coins' | 'gems' | 'both') => void;
}

export const ShopItemDetailsModal: React.FC<ShopItemDetailsModalProps> = ({
  visible,
  onClose,
  item,
  user,
  onBuy,
}) => {
  if (!item) return null;

  const rarityColor = RANK_COLORS[item.rarity?.toUpperCase()] || '#9ca3af';
  const minLevel = item.min_level || 1;
  const levelMet = (user.level || 1) >= minLevel;
  const classReq = item.class_req || 'All';
  const classMet = !item.class_req || item.class_req === 'All' || user.current_class === item.class_req;

  return (
    <BaseModal visible={visible} onClose={onClose}>
      <View style={[styles.container, { borderColor: 'rgba(34, 211, 238, 0.3)' }]}>
        
        {/* Image Section with Rarity Aura */}
        <View style={[styles.imageContainer, { borderColor: rarityColor }]}>
          <MotiView
            from={{ opacity: 0.3, scale: 0.9 }}
            animate={{ opacity: 0.6, scale: 1.1 }}
            transition={{
              type: 'timing',
              duration: 2000,
              loop: true,
            }}
            style={[styles.aura, { backgroundColor: rarityColor }]}
          />
          <ShopItemMedia item={item} style={styles.image} resizeMode="contain" />
        </View>

        <Text style={styles.title}>{item.name}</Text>
        <Text style={[styles.rarity, { color: rarityColor }]}>{item.rarity}</Text>

        {/* Requirements */}
        <View style={styles.requirementsRow}>
          <View style={styles.reqBadge}>
            <Text style={styles.reqLabel}>MIN LEVEL</Text>
            <Text style={[styles.reqValue, levelMet ? styles.reqMet : styles.reqUnmet]}>
              {minLevel}
            </Text>
          </View>
          <View style={styles.reqBadge}>
            <Text style={styles.reqLabel}>CLASS</Text>
            <Text style={[styles.reqValue, classMet ? styles.reqMet : styles.reqUnmet]}>
              {classReq}
            </Text>
          </View>
        </View>

        <Text style={styles.description}>{item.description}</Text>

        {/* Buy Button */}
        <TouchableOpacity
          style={styles.buyButton}
          onPress={() => onBuy(item, 'both')}
        >
          <Text style={styles.buyButtonText}>BUY</Text>
          <View style={styles.costContainer}>
            {item.price > 0 && (
              <View style={styles.priceTag}>
                <Image source={coinIcon} style={styles.icon} />
                <Text style={styles.priceText}>{item.price}</Text>
              </View>
            )}
            {(item as any).gem_price > 0 && (
              <View style={styles.priceTag}>
                <Image source={gemIcon} style={styles.icon} />
                <Text style={styles.priceText}>{(item as any).gem_price}</Text>
              </View>
            )}
          </View>
        </TouchableOpacity>

        {/* Close Button */}
        <TouchableOpacity style={styles.closeButton} onPress={onClose}>
          <XIcon size={20} color="#64748b" />
          <Text style={styles.closeButtonText}>CLOSE</Text>
        </TouchableOpacity>
      </View>
    </BaseModal>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#0f172a',
    borderRadius: 12,
    borderWidth: 1,
    padding: 24,
    width: '100%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 10,
  },
  imageContainer: {
    width: 120,
    height: 120,
    borderWidth: 2,
    borderRadius: 12,
    marginBottom: 16,
    padding: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  aura: {
    position: 'absolute',
    width: '150%',
    height: '150%',
    borderRadius: 100,
    opacity: 0.3,
  },
  image: {
    width: '100%',
    height: '100%',
    zIndex: 1,
  },
  title: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '900',
    textTransform: 'uppercase',
    marginBottom: 4,
    textAlign: 'center',
    letterSpacing: 1,
  },
  rarity: {
    fontSize: 12,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    marginBottom: 20,
    letterSpacing: 2,
  },
  requirementsRow: {
    flexDirection: 'row',
    gap: 24,
    marginBottom: 20,
  },
  reqBadge: {
    alignItems: 'center',
  },
  reqLabel: {
    color: '#64748b',
    fontSize: 9,
    fontWeight: '900',
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  reqValue: {
    fontSize: 14,
    fontWeight: '900',
  },
  reqMet: {
    color: '#22d3ee',
  },
  reqUnmet: {
    color: '#ef4444',
  },
  description: {
    color: '#94a3b8',
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
    paddingHorizontal: 10,
  },
  buyButton: {
    backgroundColor: '#16a34a',
    width: '100%',
    paddingVertical: 14,
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
    shadowColor: '#16a34a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  buyButtonText: {
    color: '#fff',
    fontWeight: '900',
    fontSize: 14,
    letterSpacing: 1,
  },
  costContainer: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  priceTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  icon: {
    width: 14,
    height: 14,
    resizeMode: 'contain',
  },
  priceText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  closeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    padding: 12,
  },
  closeButtonText: {
    color: '#64748b',
    fontWeight: 'bold',
    fontSize: 12,
    letterSpacing: 1,
  },
});
