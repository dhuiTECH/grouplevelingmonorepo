import React from 'react';
import { Modal, TouchableOpacity, View, Text, Switch, StyleSheet } from 'react-native';

interface BattleSettingsModalProps {
  visible: boolean;
  onClose: () => void;
  isMuted: boolean;
  setMuted: (v: boolean) => void;
  tapToConfirm: boolean;
  onTapToConfirmToggle: (v: boolean) => void;
}

export function BattleSettingsModal({
  visible,
  onClose,
  isMuted,
  setMuted,
  tapToConfirm,
  onTapToConfirmToggle,
}: BattleSettingsModalProps) {
  return (
    <Modal visible={visible} transparent animationType="fade">
      <TouchableOpacity activeOpacity={1} style={styles.overlay} onPress={onClose}>
        <View style={styles.content} onStartShouldSetResponder={() => true}>
          <Text style={styles.title}>BATTLE SETTINGS</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Music ON/OFF</Text>
            <Switch
              value={!isMuted}
              onValueChange={(val) => setMuted(!val)}
              trackColor={{ false: '#334155', true: 'rgba(34, 211, 238, 0.5)' }}
              thumbColor={!isMuted ? '#22d3ee' : '#64748b'}
            />
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Tap to confirm skills</Text>
            <Switch
              value={tapToConfirm}
              onValueChange={onTapToConfirmToggle}
              trackColor={{ false: '#334155', true: 'rgba(34, 211, 238, 0.5)' }}
              thumbColor={tapToConfirm ? '#22d3ee' : '#64748b'}
            />
          </View>
          <Text style={styles.hint}>
            {tapToConfirm
              ? 'Tap a skill to select, tap again to add to queue.'
              : 'Tap a skill once to add it to the queue.'}
          </Text>
          <TouchableOpacity style={styles.doneBtn} onPress={onClose}>
            <Text style={styles.doneText}>DONE</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  content: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: '#0f172a',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
    padding: 20,
  },
  title: {
    color: '#22d3ee',
    fontWeight: '900',
    fontSize: 14,
    letterSpacing: 2,
    marginBottom: 16,
    textAlign: 'center',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  label: { color: '#e2e8f0', fontSize: 14, fontWeight: '600' },
  hint: { color: '#64748b', fontSize: 11, marginBottom: 16 },
  doneBtn: {
    backgroundColor: 'rgba(34, 211, 238, 0.2)',
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#22d3ee',
    alignItems: 'center',
  },
  doneText: { color: '#22d3ee', fontWeight: '900', fontSize: 12, letterSpacing: 2 },
});
