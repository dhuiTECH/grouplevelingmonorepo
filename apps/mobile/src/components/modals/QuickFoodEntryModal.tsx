import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Modal, StyleSheet, Image, ActivityIndicator, Alert } from 'react-native';
import { BlurView } from 'expo-blur';
import { X, Check, Scan, Lock } from 'lucide-react-native';

interface QuickFoodEntryModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (data: any) => Promise<void>;
}

export default function QuickFoodEntryModal({ visible, onClose, onSave }: QuickFoodEntryModalProps) {
  const [name, setName] = useState('');
  const [cals, setCals] = useState('');
  const [prot, setProt] = useState('');
  const [carbs, setCarbs] = useState('');
  const [fats, setFats] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) return;
    setLoading(true);
    try {
      await onSave({
        name: name.toUpperCase(),
        calories: parseInt(cals) || 0,
        protein: parseInt(prot) || 0,
        carbs: parseInt(carbs) || 0,
        fats: parseInt(fats) || 0,
      });
      // Reset form
      setName('');
      setCals('');
      setProt('');
      setCarbs('');
      setFats('');
      onClose();
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleAIAnalysis = () => {
    Alert.alert(
      "AI Analysis Locked",
      "Upgrade to Hunter Pro to unlock AI food analysis and automatic macro tracking.",
      [{ text: "OK" }]
    );
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <BlurView intensity={20} tint="dark" style={styles.blurContainer}>
        <View style={styles.container}>
          <View style={styles.header}>
            <View style={styles.headerTitle}>
              <Text style={styles.title}>QUICK RATION LOG</Text>
              <View style={styles.activeDot} />
            </View>
            <TouchableOpacity onPress={onClose} hitSlop={8}>
              <X size={18} color="#64748b" />
            </TouchableOpacity>
          </View>

          <View style={styles.content}>
            {/* AI Option */}
            <TouchableOpacity style={styles.aiButton} onPress={handleAIAnalysis}>
              <View style={styles.aiContent}>
                <Scan size={16} color="#c084fc" />
                <View>
                  <Text style={styles.aiTitle}>AI FOOD ANALYSIS</Text>
                  <Text style={styles.aiSubtitle}>Auto-detect macros from photo</Text>
                </View>
              </View>
              <Lock size={14} color="#64748b" />
            </TouchableOpacity>

            <View style={styles.divider}>
              <View style={styles.line} />
              <Text style={styles.orText}>OR MANUAL ENTRY</Text>
              <View style={styles.line} />
            </View>

            {/* Inputs */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>ITEM NAME</Text>
              <TextInput
                style={styles.mainInput}
                placeholder="E.G. CHICKEN BREAST"
                placeholderTextColor="#334155"
                value={name}
                onChangeText={setName}
                autoFocus
              />
            </View>

            <View style={styles.row}>
              <View style={styles.col}>
                <Text style={styles.label}>CALS</Text>
                <TextInput
                  style={[styles.input, { color: '#fbbf24', borderColor: 'rgba(251, 191, 36, 0.2)' }]}
                  placeholder="0"
                  placeholderTextColor="#334155"
                  keyboardType="numeric"
                  value={cals}
                  onChangeText={setCals}
                />
              </View>
              <View style={styles.col}>
                <Text style={styles.label}>PROT</Text>
                <TextInput
                  style={[styles.input, { color: '#3b82f6', borderColor: 'rgba(59, 130, 246, 0.2)' }]}
                  placeholder="0"
                  placeholderTextColor="#334155"
                  keyboardType="numeric"
                  value={prot}
                  onChangeText={setProt}
                />
              </View>
              <View style={styles.col}>
                <Text style={styles.label}>CARBS</Text>
                <TextInput
                  style={[styles.input, { color: '#22c55e', borderColor: 'rgba(34, 197, 94, 0.2)' }]}
                  placeholder="0"
                  placeholderTextColor="#334155"
                  keyboardType="numeric"
                  value={carbs}
                  onChangeText={setCarbs}
                />
              </View>
              <View style={styles.col}>
                <Text style={styles.label}>FATS</Text>
                <TextInput
                  style={[styles.input, { color: '#eab308', borderColor: 'rgba(234, 179, 8, 0.2)' }]}
                  placeholder="0"
                  placeholderTextColor="#334155"
                  keyboardType="numeric"
                  value={fats}
                  onChangeText={setFats}
                />
              </View>
            </View>

            <TouchableOpacity 
              style={[styles.saveBtn, !name.trim() && { opacity: 0.5 }]} 
              onPress={handleSave}
              disabled={!name.trim() || loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#000" />
              ) : (
                <>
                  <Check size={16} color="#000" />
                  <Text style={styles.saveBtnText}>LOG ENTRY</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </BlurView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  blurContainer: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  container: {
    backgroundColor: '#0f172a',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.2)',
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
  },
  headerTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 12,
    fontWeight: '900',
    color: '#f59e0b',
    letterSpacing: 1,
    fontFamily: 'Exo2-Regular',
  },
  activeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#22c55e',
    shadowColor: '#22c55e',
    shadowOpacity: 0.8,
    shadowRadius: 4,
  },
  content: {
    padding: 16,
    gap: 16,
  },
  aiButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(192, 132, 252, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(192, 132, 252, 0.3)',
    borderRadius: 12,
    padding: 12,
  },
  aiContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  aiTitle: {
    fontSize: 11,
    fontWeight: '900',
    color: '#e879f9',
    fontFamily: 'Exo2-Regular',
  },
  aiSubtitle: {
    fontSize: 9,
    color: '#a8a29e',
    marginTop: 2,
    fontFamily: 'Exo2-Regular',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  line: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  orText: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#475569',
    fontFamily: 'Exo2-Regular',
  },
  inputGroup: {
    gap: 6,
  },
  label: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#64748b',
    fontFamily: 'Exo2-Regular',
  },
  mainInput: {
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    padding: 12,
    color: '#fff',
    fontSize: 13,
    fontWeight: 'bold',
    fontFamily: 'Exo2-Regular',
  },
  row: {
    flexDirection: 'row',
    gap: 8,
  },
  col: {
    flex: 1,
    gap: 6,
  },
  input: {
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderWidth: 1,
    borderRadius: 8,
    padding: 8,
    fontSize: 13,
    fontWeight: 'bold',
    textAlign: 'center',
    fontFamily: 'Exo2-Regular',
  },
  saveBtn: {
    backgroundColor: '#f59e0b',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    borderRadius: 10,
    gap: 8,
    marginTop: 4,
    shadowColor: '#f59e0b',
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  saveBtnText: {
    color: '#000',
    fontWeight: '900',
    fontSize: 12,
    fontFamily: 'Exo2-Regular',
  },
});
