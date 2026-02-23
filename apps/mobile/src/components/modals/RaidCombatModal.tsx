import React, { useState, useEffect } from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity, Image, Alert } from 'react-native';
import { supabase } from '@/lib/supabase';
import { ProgressBar } from 'react-native-paper';

export const RaidCombatModal = ({ visible, raidId, userId, bossImage, bossName, maxHp, onClose }) => {
  const [currentHp, setCurrentHp] = useState(0);
  const [leaderboard, setLeaderboard] = useState([]);

  const fetchLeaderboard = async () => {
    const { data, error } = await supabase
      .from('raid_combat_log')
      .select('user_id, damage_dealt, profiles (hunter_name)')
      .eq('raid_id', raidId)
      .order('damage_dealt', { ascending: false });

    if (!error) {
      setLeaderboard(data);
    }
  };

  useEffect(() => {
    const channel = supabase
      .channel(`raid-${raidId}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'dungeon_raids', filter: `id=eq.${raidId}` },
        payload => setCurrentHp(payload.new.current_hp)
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'raid_combat_log', filter: `raid_id=eq.${raidId}` },
        () => fetchLeaderboard()
      )
      .subscribe();

    const fetchRaidData = async () => {
      const { data, error } = await supabase
        .from('dungeon_raids')
        .select('current_hp')
        .eq('id', raidId)
        .single();

      if (!error) {
        setCurrentHp(data.current_hp);
      }
    };

    fetchRaidData();
    fetchLeaderboard();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [raidId]);

  useEffect(() => {
    if (currentHp <= 0 && currentHp !== null) {
      // 1. Show a big 'BOSS DEFEATED' animation
      // 2. The SQL function 'distribute_raid_rewards' should be triggered here
      Alert.alert("VICTORY", "The Boss has fallen! Rewards are being distributed...");
      supabase.rpc('distribute_raid_rewards', { raid_id_param: raidId });
    }
  }, [currentHp]);

  const handleAttack = async () => {
    const damage = Math.floor(Math.random() * 100) + 50; // Replace with your player's actual attack stat

    // Call the SQL function
    await supabase.rpc('land_raid_hit', {
      t_raid_id: raidId,
      t_user_id: userId,
      t_damage: damage
    });
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.container}>
        <Text style={styles.bossName}>{bossName}</Text>
        <Image source={{ uri: bossImage }} style={styles.bossSprite} />
        <ProgressBar progress={currentHp / maxHp} color={'#ff0000'} />
        <View style={styles.leaderboard}>
          {leaderboard.slice(0, 3).map((player, index) => (
            <Text key={player.user_id}>{index + 1}. {player.profiles.hunter_name}: {player.damage_dealt}</Text>
          ))}
        </View>
        <TouchableOpacity onPress={handleAttack} style={styles.attackBtn}>
          <Text>ATTACK!</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
          <Text>CLOSE</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.8)',
  },
  bossName: {
    fontSize: 32,
    fontWeight: 'bold',
    color: 'white',
  },
  bossSprite: {
    width: 200,
    height: 200,
    marginVertical: 20,
  },
  leaderboard: {
    marginVertical: 20,
  },
  attackBtn: {
    padding: 20,
    backgroundColor: 'gold',
    borderRadius: 10,
  },
  closeBtn: {
    position: 'absolute',
    top: 40,
    right: 20,
    padding: 10,
    backgroundColor: 'white',
    borderRadius: 5,
  },
});
