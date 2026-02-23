import React from 'react';
import { Modal, View, Text, TouchableOpacity, ScrollView, StyleSheet, Dimensions } from 'react-native';
import { ShopItemMedia } from '@/components/ShopItemMedia';
import { isCaptureItem } from '@/utils/captureItem';
import type { UserCosmetic } from '@/types/user';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface BattleInventoryModalProps {
  visible: boolean;
  onClose: () => void;
  items: UserCosmetic[];
  onUseItem?: (cosmetic: UserCosmetic) => void;
  enemyCatchable?: boolean;
}

export function BattleInventoryModal({ visible, onClose, items, onUseItem, enemyCatchable }: BattleInventoryModalProps) {
  const handleItemPress = (cosmetic: UserCosmetic) => {
    if (isCaptureItem(cosmetic.shop_items) && enemyCatchable && onUseItem) {
      onUseItem(cosmetic);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.content}>
          <View style={styles.header}>
            <Text style={styles.title}>INVENTORY</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} hitSlop={12}>
              <Text style={styles.closeText}>CLOSE</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.subtitle}>
            {enemyCatchable
              ? 'Use a capture item to catch this enemy, or close to keep fighting.'
              : 'Consumables & other items'}
          </Text>
          {items.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyText}>No consumables or other items.</Text>
            </View>
          ) : (
            <ScrollView
              contentContainerStyle={styles.grid}
              showsVerticalScrollIndicator={false}
            >
              {items.map((cosmetic: UserCosmetic) => {
                const item = cosmetic.shop_items;
                if (!item) return null;
                const qty = cosmetic.quantity ?? 1;
                return (
                  <View key={cosmetic.id} style={styles.card}>
                    <View style={styles.cardImageWrap}>
                      <ShopItemMedia
                        item={item}
                        style={styles.cardImage}
                        resizeMode="contain"
                      />
                    </View>
                    <Text style={styles.cardName} numberOfLines={2}>
                      {item.name}
                    </Text>
                    {qty > 1 && (
                      <View style={styles.qtyBadge}>
                        <Text style={styles.qtyText}>×{qty}</Text>
                      </View>
                    )}
                  </View>
                );
              })}
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'flex-end',
  },
  content: {
    backgroundColor: '#0f172a',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 2,
    borderTopColor: 'rgba(34, 211, 238, 0.4)',
    maxHeight: '80%',
    paddingBottom: 32,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 8,
  },
  title: {
    color: '#22d3ee',
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 2,
  },
  closeBtn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(51, 65, 85, 0.8)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(34, 211, 238, 0.3)',
  },
  closeText: {
    color: '#94a3b8',
    fontWeight: '800',
    fontSize: 12,
    letterSpacing: 1,
  },
  subtitle: {
    color: '#64748b',
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 1,
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  empty: { padding: 40, alignItems: 'center' },
  emptyText: { color: '#64748b', fontSize: 13, fontStyle: 'italic' },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    gap: 12,
    paddingBottom: 24,
  },
  card: {
    width: (SCREEN_WIDTH - 32 - 12) / 2,
    backgroundColor: 'rgba(15, 23, 42, 0.9)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(34, 211, 238, 0.25)',
    padding: 12,
    alignItems: 'center',
    position: 'relative',
  },
  cardUseable: {
    borderColor: 'rgba(74, 222, 128, 0.5)',
    backgroundColor: 'rgba(15, 23, 42, 0.98)',
  },
  useLabel: {
    color: '#4ade80',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1,
    marginTop: 4,
  },
  cardImageWrap: {
    width: 56,
    height: 56,
    borderRadius: 8,
    backgroundColor: 'rgba(0,0,0,0.3)',
    marginBottom: 8,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  cardImage: { width: 48, height: 48 },
  cardName: {
    color: '#e2e8f0',
    fontSize: 11,
    fontWeight: '800',
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  qtyBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(34, 211, 238, 0.3)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  qtyText: {
    color: '#22d3ee',
    fontSize: 10,
    fontWeight: '900',
  },
});
