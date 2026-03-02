import React from 'react';
import { View, Text, Pressable, StyleSheet, useWindowDimensions, Platform } from 'react-native';
import Svg, { Rect, Defs, Pattern } from 'react-native-svg';
import { MotiView } from 'moti';
import { LinearGradient } from 'expo-linear-gradient';
import { BattleAssetWarmer } from '@/components/BattleAssetWarmer';
import { OptimizedPetAvatar } from '@/components/OptimizedPetAvatar';
import { LayeredAvatar } from '@/components/LayeredAvatar';

interface DefeatScreenProps {
  party: any[];
  enemy: any;
  spriteUrls: string[];
  onReturnToMap: () => void;
}

const Scanlines = () => {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {[...Array(200)].map((_, i) => (
        <View
          key={i}
          style={{
            height: 1,
            backgroundColor: 'rgba(255, 68, 68, 0.05)',
            marginTop: 3,
          }}
        />
      ))}
    </View>
  );
};

const MechanicalBorder = ({ position }: { position: 'top' | 'bottom' }) => (
  <View style={[styles.mechBorder, position === 'top' ? { top: 0 } : { bottom: 0 }]}>
    <LinearGradient
      colors={['transparent', '#ff4444', '#ffcccc', '#ff4444', 'transparent']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0 }}
      style={StyleSheet.absoluteFill}
    />
    <View style={styles.mechInnerLine} />
  </View>
);

const CornerBracket = ({ position }: { position: 'tl' | 'tr' | 'bl' | 'br' }) => {
  const cornerStyle = {
    tl: { top: 0, left: 0, borderTopWidth: 2, borderLeftWidth: 2 },
    tr: { top: 0, right: 0, borderTopWidth: 2, borderRightWidth: 2 },
    bl: { bottom: 0, left: 0, borderBottomWidth: 2, borderLeftWidth: 2 },
    br: { bottom: 0, right: 0, borderBottomWidth: 2, borderRightWidth: 2 },
  }[position];

  return <View style={[styles.cornerBracket, cornerStyle]} />;
};

export function DefeatScreen({ party, enemy, spriteUrls, onReturnToMap }: DefeatScreenProps) {
  const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = useWindowDimensions();

  return (
    <View style={styles.container}>
      <BattleAssetWarmer party={party} enemy={enemy} spriteUrls={spriteUrls} />
      <View style={styles.ambientGlow} />
      
      <View style={styles.centeredContent}>
        <MotiView
          from={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'timing', duration: 450 }}
          style={styles.slWindow}
        >
          <Scanlines />
          <MechanicalBorder position="top" />
          <MechanicalBorder position="bottom" />
          
          <CornerBracket position="tl" />
          <CornerBracket position="tr" />
          <CornerBracket position="bl" />
          <CornerBracket position="br" />

          <View style={styles.contentPadding}>
            {/* Header Block */}
            <View style={styles.headerBlock}>
              <View style={styles.headerBox}>
                <View style={styles.exclamationCircle}>
                  <Text style={styles.exclamationText}>!</Text>
                </View>
                <Text style={styles.defeatTitle}>DEFEAT</Text>
              </View>
              
              <View style={styles.credentialsBlock}>
                <Text style={styles.credentialsText}>SYSTEM FAILURE DETECTED</Text>
                
                <View style={styles.iconContainer}>
                  <View style={styles.iconDiamond} />
                  <Text style={styles.iconLabel}>☠</Text>
                </View>
                <Text style={styles.statusLabel}>RECOVERY REQUIRED</Text>

                <Text style={styles.messageText}>YOUR POWER WAS INSUFFICIENT</Text>
                <Text style={styles.subMessageText}>TRAIN HARDER, HUNTER</Text>
              </View>
            </View>

            {/* Party Status */}
            <View style={styles.partySection}>
              <View style={styles.sectionDivider}>
                <View style={styles.dividerLine} />
                <Text style={styles.sectionTitle}>PARTY STATUS</Text>
                <View style={styles.dividerLine} />
              </View>

              <View style={styles.partyGrid}>
                {party.slice(0, 4).map((member: any, index: number) => {
                  const borderColor = member.type === 'pet' ? '#ff4444' : '#ff8888';
                  const maxHp = member.maxHP ?? 100;
                  const currentHp = member.hp ?? 0;
                  const hpPercent = maxHp > 0 ? currentHp / maxHp : 0;
                  const displayName = member.name ?? '—';
                  const level = member.level ?? 1;

                  return (
                    <View key={member.id || index} style={styles.partyCard}>
                      <View style={[styles.avatarBox, { borderColor }]}>
                        {member.type === 'pet' && member.petDetails ? (
                          <OptimizedPetAvatar petDetails={member.petDetails} size={50} square hideBackground forceLegacy={true} />
                        ) : member.avatar ? (
                          <LayeredAvatar user={member.avatar} size={50} square hideBackground />
                        ) : (
                          <Text style={{ fontSize: 12 }}>{member.type === 'pet' ? '🐕' : '👤'}</Text>
                        )}
                        <View style={styles.defeatedOverlay} />
                      </View>
                      <View style={styles.partyInfo}>
                        <Text numberOfLines={1} style={styles.partyName}>{displayName.toUpperCase()}</Text>
                        <View style={styles.hpTrack}>
                          <View style={[styles.hpFill, { width: `${hpPercent * 100}%` }]} />
                        </View>
                        <View style={styles.partySubInfo}>
                          <Text style={styles.partyLevel}>LV.{level}</Text>
                          <Text style={styles.partyHpText}>{Math.round(hpPercent * 100)}%</Text>
                        </View>
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>

            {/* Hint / Tip Section */}
            <View style={styles.tipSection}>
              <View style={styles.sectionDivider}>
                <View style={styles.dividerLine} />
                <Text style={styles.sectionTitle}>SYSTEM ADVICE</Text>
                <View style={styles.dividerLine} />
              </View>
              
              <View style={styles.tipCard}>
                <Text style={styles.tipText}>
                  Allocate your ability points strategically in the Status Window to overcome stronger enemies.
                </Text>
              </View>
            </View>

            {/* Footer Button */}
            <Pressable 
              style={({ pressed }) => [
                styles.confirmButton,
                pressed && { opacity: 0.8 }
              ]} 
              onPress={onReturnToMap}
            >
              <Text style={styles.confirmButtonText}>RETURN TO MAP</Text>
            </Pressable>
          </View>
        </MotiView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#010206' },
  ambientGlow: {
    position: 'absolute',
    top: '25%',
    left: '10%',
    width: '80%',
    height: '50%',
    backgroundColor: '#ff4444',
    opacity: 0.05,
    borderRadius: 100,
    transform: [{ scale: 2 }],
  },
  centeredContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 10,
  },
  slWindow: {
    width: '100%',
    maxWidth: 360,
    height: '95%',
    maxHeight: 720,
    backgroundColor: 'rgba(28, 4, 4, 0.98)',
    borderWidth: 1,
    borderColor: 'rgba(255, 68, 68, 0.5)',
    borderRadius: 2,
    overflow: 'hidden',
    shadowColor: '#ff0000',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  contentPadding: {
    flex: 1,
    paddingHorizontal: 24,
    paddingVertical: 48,
    justifyContent: 'space-between',
  },
  mechBorder: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 4,
    zIndex: 60,
  },
  mechInnerLine: {
    position: 'absolute',
    top: 1,
    left: '5%',
    right: '5%',
    height: 1,
    backgroundColor: '#ffcccc',
    opacity: 0.5,
  },
  cornerBracket: {
    position: 'absolute',
    width: 12,
    height: 12,
    borderColor: '#ff4444',
    zIndex: 70,
  },
  headerBlock: {
    alignItems: 'center',
  },
  headerBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 68, 68, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255, 68, 68, 0.5)',
    paddingHorizontal: 20,
    paddingVertical: 6,
    gap: 12,
  },
  exclamationCircle: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ff4444',
    alignItems: 'center',
    justifyContent: 'center',
  },
  exclamationText: {
    color: '#ff4444',
    fontSize: 10,
    fontWeight: 'bold',
  },
  defeatTitle: {
    color: '#ffcccc',
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 4,
    textShadowColor: '#ff4444',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  credentialsBlock: {
    marginTop: 32,
    alignItems: 'center',
  },
  credentialsText: {
    color: 'rgba(255, 68, 68, 0.4)',
    fontSize: 8,
    fontWeight: 'bold',
    letterSpacing: 3,
    marginBottom: 24,
  },
  iconContainer: {
    width: 64,
    height: 64,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  iconDiamond: {
    position: 'absolute',
    width: 48,
    height: 48,
    borderWidth: 2,
    borderColor: '#ff4444',
    backgroundColor: 'rgba(100, 0, 0, 0.2)',
    transform: [{ rotate: '45deg' }],
  },
  iconLabel: {
    color: '#ffcccc',
    fontSize: 32,
    fontWeight: '900',
    textShadowColor: '#ff4444',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 15,
  },
  statusLabel: {
    color: '#ffaadd',
    fontSize: 8,
    fontWeight: 'bold',
    letterSpacing: 2,
    marginBottom: 24,
  },
  messageText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
    letterSpacing: 1,
    textAlign: 'center',
    textShadowColor: 'rgba(255, 68, 68, 0.4)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },
  subMessageText: {
    color: '#ff4444',
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 3,
    marginTop: 8,
  },
  tipSection: {
    width: '100%',
    marginTop: 20,
  },
  sectionDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255, 68, 68, 0.3)',
  },
  sectionTitle: {
    color: 'rgba(255, 68, 68, 0.5)',
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 3,
    marginHorizontal: 12,
  },
  partyGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  partyCard: {
    width: '48%',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(68, 0, 0, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255, 68, 68, 0.1)',
    padding: 6,
  },
  avatarBox: {
    width: 44,
    height: 44,
    borderWidth: 1.5,
    backgroundColor: '#020814',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  defeatedOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 0, 0, 0.2)',
  },
  partyInfo: {
    flex: 1,
    marginLeft: 8,
  },
  partyName: {
    color: '#ffcccc',
    fontSize: 8,
    fontWeight: 'bold',
  },
  hpTrack: {
    height: 4,
    backgroundColor: '#020612',
    borderRadius: 2,
    marginTop: 6,
    overflow: 'hidden',
  },
  hpFill: {
    height: '100%',
    backgroundColor: '#ff4444',
  },
  partySubInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 2,
  },
  partyLevel: {
    color: 'rgba(255, 68, 68, 0.5)',
    fontSize: 7,
    fontWeight: 'bold',
  },
  partyHpText: {
    color: '#ff4444',
    fontSize: 7,
    fontWeight: 'bold',
  },
  tipCard: {
    backgroundColor: 'rgba(68, 0, 0, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255, 68, 68, 0.1)',
    padding: 16,
    borderRadius: 2,
  },
  tipText: {
    color: '#ffcccc',
    fontSize: 10,
    lineHeight: 16,
    textAlign: 'center',
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  confirmButton: {
    width: '100%',
    paddingVertical: 12,
    backgroundColor: 'rgba(255, 68, 68, 0.15)',
    borderWidth: 2,
    borderColor: '#ff4444',
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#ff4444',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 10,
  },
  confirmButtonText: {
    color: '#ff4444',
    fontSize: 14,
    fontWeight: 'bold',
    fontFamily: 'Montserrat-SemiBold',
    letterSpacing: 3,
    textShadowColor: 'rgba(255, 68, 68, 0.8)',
    textShadowRadius: 4,
    textTransform: 'uppercase',
  },
});
