import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const SystemDataAccents = () => {
  return (
    <View style={styles.container}>
      <View style={styles.accentGroup}>
        <Text style={[styles.dataAccent, styles.topLeft]}>SYNC STATUS: STABLE</Text>
        <Text style={[styles.dataAccent, styles.topRight]}>SYSTEM UPTIME: 99.7%</Text>
      </View>
      <View style={styles.accentGroup}>
        <Text style={[styles.dataAccent, styles.bottomLeft]}>MANA FLOW: 98%</Text>
        <Text style={[styles.dataAccent, styles.bottomRight]}>DATA INTEGRITY: 100%</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    padding: 10,
    pointerEvents: 'none',
    justifyContent: 'space-between',
  },
  accentGroup: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dataAccent: {
    fontSize: 10,
    fontWeight: '900',
    color: 'rgba(0, 255, 255, 0.4)',
    letterSpacing: 1,
  },
  topLeft: {
    // top/left padding handled by container
  },
  topRight: {
    // top/right padding handled by container
  },
  bottomLeft: {
    // bottom/left padding handled by container
  },
  bottomRight: {
    // bottom/right padding handled by container
  },
});

export default SystemDataAccents;
