import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  FlatList,
  Dimensions,
} from 'react-native';
import BaseModal from './BaseModal';
import { ShopItemMedia } from '@/components/ShopItemMedia';
import { User, UserCosmetic, ShopItem } from '@/types/user';
import { XIcon } from '@/components/icons/XIcon';
import { RANK_COLORS } from '@/constants/gameConstants';

const { width } = Dimensions.get('window');

interface BackgroundCustomizationModalProps {
  visible: boolean;
  onClose: () => void;
  user: User;
  onEquip: (id: string, equipped: boolean) => void;
  onSelectItem: (data: { item: ShopItem; cosmeticItem: UserCosmetic }) => void;
}

export const BackgroundCustomizationModal: React.FC<BackgroundCustomizationModalProps> = ({
  visible,
  onClose,
  user,
  onEquip,
  onSelectItem,
}) => {
  const backgrounds = user.cosmetics?.filter(
    (c: UserCosmetic) => c.shop_items?.slot === 'background'
  ) || [];

  const renderBackgroundItem = ({ item: cosmetic }: { item: UserCosmetic }) => {
    const item = cosmetic.shop_items;
    const isEquipped = cosmetic.equipped;
    const rarityColor = RANK_COLORS[item.rarity?.charAt(0).toUpperCase()] || '#9ca3af';

    return (
      <TouchableOpacity
        style={[
          styles.itemCard,
          isEquipped && styles.itemCardEquipped,
          { borderColor: rarityColor },
        ]}
        onPress={() => onSelectItem({ item, cosmeticItem: cosmetic })}
      >
        <View style={styles.imageContainer}>
          <View style={[styles.rarityPulse, { backgroundColor: isEquipped ? rarityColor : 'transparent' }]} />
          <ShopItemMedia
            item={item}
            style={[styles.bgImage, { borderColor: rarityColor }]}
          />
        </View>
        <Text style={styles.itemName} numberOfLines={1}>{item.name}</Text>
        <Text style={styles.itemRarity}>{item.rarity} class</Text>
        
        <TouchableOpacity
          style={[
            styles.equipButton,
            isEquipped ? styles.unequipButton : styles.equipButtonActive
          ]}
          onPress={() => onEquip(cosmetic.id, !isEquipped)}
        >
          <Text style={styles.equipButtonText}>
            {isEquipped ? 'UNEQUIP' : 'CHANGE BG'}
          </Text>
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  return (
    <BaseModal visible={visible} onClose={onClose} contentStyle={styles.modalContent}>
      <View style={styles.container}>
        <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
          <XIcon size={24} color="#9ca3af" />
        </TouchableOpacity>

        <View style={styles.header}>
          <Image source={require('../../../assets/backgroundicon.png')} style={styles.headerIcon} />
          <Text style={styles.headerTitle}>Background Config</Text>
        </View>
        <Text style={styles.subHeader}>Select your hunter's environmental signal</Text>

        {backgrounds.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyEmoji}>🏞️</Text>
            <Text style={styles.emptyText}>No environments mapped</Text>
            <Text style={styles.emptySubText}>Acquire new realms from the Shop</Text>
          </View>
        ) : (
          <FlatList
            data={backgrounds}
            renderItem={renderBackgroundItem}
            keyExtractor={(item) => item.id}
            numColumns={2}
            columnWrapperStyle={styles.columnWrapper}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>
    </BaseModal>
  );
};

const styles = StyleSheet.create({
  modalContent: {
    width: '95%',
    maxHeight: '85%',
  },
  container: {
    backgroundColor: 'rgba(15, 23, 42, 0.98)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    padding: 20,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 20,
  },
  closeBtn: {
    position: 'absolute',
    top: 12,
    right: 12,
    zIndex: 10,
    padding: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    marginTop: 10,
    marginBottom: 4,
  },
  headerIcon: {
    width: 28,
    height: 28,
    resizeMode: 'contain',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#3b82f6',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    textShadowColor: 'rgba(59, 130, 246, 0.4)',
    textShadowRadius: 8,
  },
  subHeader: {
    fontSize: 10,
    color: '#6b7280',
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 2,
    textAlign: 'center',
    marginBottom: 20,
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    borderStyle: 'dashed',
  },
  emptyEmoji: {
    fontSize: 40,
    marginBottom: 12,
    opacity: 0.5,
  },
  emptyText: {
    color: '#9ca3af',
    fontSize: 14,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  emptySubText: {
    color: '#6b7280',
    fontSize: 10,
    marginTop: 4,
    textTransform: 'uppercase',
  },
  listContent: {
    paddingBottom: 20,
  },
  columnWrapper: {
    gap: 12,
    marginBottom: 12,
  },
  itemCard: {
    flex: 1,
    backgroundColor: 'rgba(30, 41, 59, 0.5)',
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    alignItems: 'center',
    borderBottomWidth: 4,
    borderBottomColor: '#0f172a',
  },
  itemCardEquipped: {
    backgroundColor: 'rgba(22, 101, 52, 0.2)',
  },
  imageContainer: {
    position: 'relative',
    width: '100%',
    height: 80,
    marginBottom: 10,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    borderRadius: 8,
  },
  rarityPulse: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    opacity: 0.2,
  },
  bgImage: {
    width: '100%',
    height: '100%',
    borderWidth: 1,
  },
  itemName: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
    textAlign: 'center',
    marginBottom: 2,
  },
  itemRarity: {
    color: '#64748b',
    fontSize: 8,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  equipButton: {
    width: '100%',
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: 'center',
  },
  equipButtonActive: {
    backgroundColor: '#3b82f6',
  },
  unequipButton: {
    backgroundColor: '#4b5563',
  },
  equipButtonText: {
    color: '#fff',
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
});
