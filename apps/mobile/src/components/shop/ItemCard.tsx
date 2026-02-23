import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Pressable, ViewStyle } from 'react-native';
import { Image } from 'expo-image';
import { SystemPanelBackground } from './SystemPanelBackground';
import Svg, { Path } from 'react-native-svg';
import { ShopItem } from '@/types/user';
import { ShopItemMedia } from '../ShopItemMedia';
import { RANK_COLORS, RARITY_COLORS } from '@/constants/gameConstants';

const ASSETS = {
  coinIcon: require('../../../assets/coinicon.png'),
  gemIcon: require('../../../assets/gemicon.png'),
};

// Stat Icons converted to RN Svg
const StatHeart = () => (
  <Svg width={14} height={14} viewBox="0 0 24 24" fill="currentColor" color="#F87171">
    <Path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
  </Svg>
);

const StatShield = () => (
  <Svg width={14} height={14} viewBox="0 0 24 24" fill="currentColor" color="#60A5FA">
    <Path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z"/>
  </Svg>
);

const StatSpeed = () => (
  <Svg width={14} height={14} viewBox="0 0 24 24" fill="currentColor" color="#FACC15">
    <Path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
  </Svg>
);

interface ItemCardProps {
  item: ShopItem;
  onPress: () => void;
  style?: ViewStyle;
}

export const ItemCard = ({ item, onPress, style }: ItemCardProps) => {
  const rarityColor = RARITY_COLORS[item.rarity?.toUpperCase()] || RANK_COLORS[item.rarity?.toUpperCase()] || '#9ca3af';

  // Map bonuses to stats for display
  const stats = useMemo(() => {
    const s: { label: string; value: string; icon: React.ReactNode }[] = [];
    
    // Check for explicit bonuses array first
    if (item.bonuses && Array.isArray(item.bonuses)) {
      item.bonuses.forEach(b => {
        let icon = null;
        let label = '';
        
        const type = b.type.toLowerCase();
        if (type === 'hp' || type === 'health' || type.includes('hp')) { 
            icon = <StatHeart />; 
            label = 'HP %'; 
        }
        else if (type === 'def' || type === 'defense' || type.includes('def')) { 
            icon = <StatShield />; 
            label = 'DEF'; 
        }
        else if (type === 'spd' || type === 'speed') { 
            icon = <StatSpeed />; 
            label = 'SPD'; 
        }
        else { 
            label = type.substring(0, 3).toUpperCase(); 
        }

        s.push({ label, value: `+${b.value}`, icon });
      });
    } 
    // Fallback to bonus_type/bonus_value if no bonuses array
    else if (item.bonus_type && item.bonus_value) {
        let icon = null;
        let label = '';
        const type = item.bonus_type.toLowerCase();

        if (type === 'hp' || type === 'health' || type.includes('hp')) { 
            icon = <StatHeart />; 
            label = 'HP %'; 
        }
        else if (type === 'def' || type === 'defense' || type.includes('def')) { 
            icon = <StatShield />; 
            label = 'DEF'; 
        }
        else if (type === 'spd' || type === 'speed') { 
            icon = <StatSpeed />; 
            label = 'SPD'; 
        }
        else { 
            label = type.substring(0, 3).toUpperCase(); 
        }
        s.push({ label, value: `+${item.bonus_value}`, icon });
    }

    return s.slice(0, 3);
  }, [item]);

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.container,
        style,
        pressed && { transform: [{ scale: 0.98 }] }
      ]}
    >
        <SystemPanelBackground />

        {/* Content Layer */}
        <View style={styles.content}>
            {/* Top Bar: Level and Rarity */}
            <View style={styles.topBar}>
                <View style={styles.levelBadge}>
                    <Text style={styles.levelText}>Lv.{item.min_level || 1}</Text>
                </View>
                <View style={[styles.rarityBadge, { borderColor: rarityColor }]}>
                    <Text style={[styles.rarityText, { color: rarityColor }]}>{item.rarity || 'COMMON'}</Text>
                </View>
            </View>

            {/* Holographic Item Image Container */}
            <View style={styles.imageContainerWrapper}>
                
                {/* Item Inner Circle */}
                <View style={styles.imageInnerCircle}>
                    <ShopItemMedia 
                        item={item} 
                        style={styles.itemImage}
                        resizeMode="contain"
                    />
                </View>
            </View>

            {/* Item Name */}
            <View style={styles.nameContainer}>
                <Text style={styles.nameText} numberOfLines={2}>
                    {item.name}
                </Text>
            </View>

            {/* Stats Box */}
            <View style={styles.statsBox}>
                {stats.length > 0 ? (
                    stats.map((stat, idx) => (
                        <View key={idx} style={styles.statRow}>
                            <View style={styles.statLabelContainer}>
                                {stat.icon}
                                <Text style={styles.statLabel}>{stat.label}</Text>
                            </View>
                            <Text style={styles.statValue}>{stat.value}</Text>
                        </View>
                    ))
                ) : (
                    <View style={styles.noStatsContainer}>
                        <Text style={styles.noStatsText}>---</Text>
                    </View>
                )}
            </View>

            {/* Pill Currency/Price */}
            <View style={styles.pricePill}>
                 {item.price > 0 && (
                   <View style={styles.priceGroup}>
                     <Image source={ASSETS.coinIcon} style={styles.currencyIcon} contentFit="contain" />
                     <Text style={styles.priceText}>
                        {item.price}G
                     </Text>
                   </View>
                 )}
                 {(item as any).gem_price > 0 && (
                   <View style={styles.priceGroup}>
                     <Image source={ASSETS.gemIcon} style={styles.currencyIcon} contentFit="contain" />
                     <Text style={[styles.priceText, { color: '#67e8f9' }]}>
                        {(item as any).gem_price}
                     </Text>
                   </View>
                 )}
            </View>

        </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
    container: {
        width: '100%',
        height: 220,
        position: 'relative',
    },
    content: {
        width: '100%',
        height: '100%',
        paddingHorizontal: 8,
        paddingTop: 16, // Increased from 6/8 to clear top border
        paddingBottom: 16, // Increased from 6/8 to clear bottom border
        alignItems: 'center',
        justifyContent: 'space-between', // Changed from flex-start to distribute space
        zIndex: 10,
    },
    topBar: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        width: '100%',
        marginBottom: 2,
    },
    levelBadge: {
        backgroundColor: '#050b14',
        borderWidth: 1,
        borderColor: 'rgba(77, 240, 240, 0.6)',
        paddingHorizontal: 4,
        paddingVertical: 1,
        borderRadius: 4,
        shadowColor: '#4df0f0',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.4,
        shadowRadius: 8,
        elevation: 2,
    },
    levelText: {
        color: '#4df0f0',
        fontSize: 8,
        fontFamily: 'monospace',
        fontWeight: 'bold',
    },
    rarityBadge: {
        backgroundColor: '#1a2c38',
        paddingHorizontal: 4,
        paddingVertical: 1,
        borderRadius: 2,
        borderWidth: 1,
        borderColor: '#2a4555',
    },
    rarityText: {
        fontSize: 7,
        color: '#d1d5db',
        fontWeight: 'bold',
        letterSpacing: 0.5,
        textTransform: 'uppercase',
    },
    imageContainerWrapper: {
        position: 'relative',
        width: 50, // Reduced from 60
        height: 50, // Reduced from 60
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 2,
    },
    imageInnerCircle: {
        zIndex: 10,
        width: 42, // Reduced from 48
        height: 42, // Reduced from 48
        backgroundColor: '#050b14',
        borderRadius: 21, // Reduced from 24
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: '#1a3545',
        overflow: 'hidden',
        elevation: 3,
    },
    itemImage: {
        width: 24, // Reduced from 28
        height: 24, // Reduced from 28
    },
    nameContainer: {
        minHeight: 24, // Reduced from 28
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 2, // Reduced from 4
        width: '100%',
        paddingHorizontal: 2,
    },
    nameText: {
        color: '#ecfeff',
        fontWeight: 'bold',
        textAlign: 'center',
        fontSize: 9, // Reduced from 10
        lineHeight: 11, // Reduced from 12
        textTransform: 'uppercase',
        letterSpacing: 0.3,
        textShadowColor: 'rgba(77, 240, 240, 0.5)',
        textShadowOffset: { width: 0, height: 0 },
        textShadowRadius: 3,
    },
    statsBox: {
        width: '100%',
        backgroundColor: 'rgba(26, 44, 56, 0.5)', // Changed from nearly black to a semi-transparent dark blue/slate
        borderWidth: 1,
        borderColor: '#1a3545',
        borderRadius: 4,
        paddingVertical: 3,
        paddingHorizontal: 8,
        marginBottom: 4,
        gap: 2,
    },
    statRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 1,
    },
    statLabelContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 2,
    },
    statLabel: {
        color: 'rgba(165, 243, 252, 0.8)',
        fontSize: 7,
        fontWeight: '600',
        marginLeft: 2,
    },
    statValue: {
        color: '#ecfeff',
        fontFamily: 'monospace',
        fontSize: 7,
        fontWeight: 'bold',
        letterSpacing: 0.3,
    },
    noStatsContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 2,
    },
    noStatsText: {
        color: '#4b5563',
        fontSize: 8,
        fontStyle: 'italic',
    },
    pricePill: {
        marginTop: 'auto',
        marginBottom: 4,
        backgroundColor: '#0d141d',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 9999,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        borderWidth: 1,
        borderColor: '#1e2d3d',
    },
    priceGroup: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    currencyIcon: {
        width: 12,
        height: 12,
    },
    priceText: {
        color: '#fbbf24',
        fontWeight: 'bold',
        fontSize: 10, // Reduced from 11
        letterSpacing: 0.3,
    },
});
