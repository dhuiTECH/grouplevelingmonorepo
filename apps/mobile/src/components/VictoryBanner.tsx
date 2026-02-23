import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import expCrystal from '@assets/expcrystal.png';
import coinIcon from '@assets/coinicon.png';
import gemIcon from '@assets/gemicon.png';

export const VictoryBanner = ({ rewards }) => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>VICTORY</Text>
      <View style={styles.rewardsContainer}>
        <View style={styles.rewardItem}>
          <Image source={expCrystal} style={styles.icon} /><Text style={styles.rewardText}>{rewards.exp || 0}</Text>
        </View>
        <View style={styles.rewardItem}>
          <Image source={coinIcon} style={styles.icon} /><Text style={styles.rewardText}>{rewards.coins || 0}</Text>
        </View>
        <View style={styles.rewardItem}>
          <Image source={gemIcon} style={styles.icon} /><Text style={styles.rewardText}>{rewards.gems || 0}</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: 10,
    alignItems: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 20,
  },
  rewardsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
  },
  rewardItem: {
    alignItems: 'center',
  },
  icon: {
    width: 40,
    height: 40,
    marginBottom: 10,
  },
  rewardText: {
    color: 'white',
    fontWeight: 'bold',
  },
});
