
import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import BaseModal from './BaseModal';
import { ChevronRight, Save, Calculator } from 'lucide-react-native';
import { Picker } from '@react-native-picker/picker';

interface MacroCalculatorModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (results: any) => void;
}

const MacroCalculatorModal: React.FC<MacroCalculatorModalProps> = ({ visible, onClose, onSave }) => {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  // Inputs
  const [weight, setWeight] = useState(''); // kg
  const [height, setHeight] = useState(''); // cm
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('male');
  const [activity, setActivity] = useState('1.2'); // Sedentary default
  const [goal, setGoal] = useState('maintain'); // cut, bulk, maintain

  // Results
  const [results, setResults] = useState<any>(null);

  const calculateMacros = () => {
    const w = parseFloat(weight);
    const h = parseFloat(height);
    const a = parseFloat(age);
    
    if (!w || !h || !a) return;

    let bmr = (10 * w) + (6.25 * h) - (5 * a);
    bmr += gender === 'male' ? 5 : -161;
    let tdee = bmr * parseFloat(activity);

    if (goal === 'cut') tdee -= 500;
    if (goal === 'bulk') tdee += 300;

    const protein = Math.round(w * 2.2);
    const fats = Math.round(w * 0.9);
    const proteinCals = protein * 4;
    const fatsCals = fats * 9;
    const remainingCals = tdee - (proteinCals + fatsCals);
    const carbs = Math.round(remainingCals / 4);

    setResults({
      calories: Math.round(tdee),
      protein,
      fats,
      carbs
    });
    setStep(2);
  };

  const handleSave = async () => {
    setLoading(true);
    // Supabase logic removed for porting
    onSave(results);
    setLoading(false);
    onClose();
  };
  
  const InputField = ({ label, value, onChangeText, placeholder, keyboardType = 'default' }: any) => (
    <View style={styles.inputContainer}>
        <Text style={styles.label}>{label}</Text>
        <TextInput 
            style={styles.input} 
            value={value} 
            onChangeText={onChangeText} 
            placeholder={placeholder} 
            placeholderTextColor="#555"
            keyboardType={keyboardType}
        />
    </View>
  );

  return (
    <BaseModal visible={visible} onClose={onClose}>
        <View style={styles.container}>
            <View style={styles.header}>
                <Calculator color="#06b6d4" size={20} />
                <Text style={styles.headerText}>System Calibration // Biometrics</Text>
            </View>
            <ScrollView style={styles.content}>
                {step === 1 ? (
                    <View style={styles.form}>
                        <View style={styles.row}>
                            <InputField label="Weight (KG)" value={weight} onChangeText={setWeight} placeholder="75" keyboardType="numeric" />
                            <InputField label="Height (CM)" value={height} onChangeText={setHeight} placeholder="180" keyboardType="numeric" />
                        </View>
                        <View style={styles.row}>
                            <InputField label="Age" value={age} onChangeText={setAge} placeholder="25" keyboardType="numeric" />
                            <View style={styles.inputContainer}>
                                <Text style={styles.label}>Gender</Text>
                                <Picker selectedValue={gender} onValueChange={(itemValue) => setGender(itemValue)} style={styles.picker}>
                                    <Picker.Item label="Male" value="male" />
                                    <Picker.Item label="Female" value="female" />
                                </Picker>
                            </View>
                        </View>
                        <Text style={styles.label}>Activity Level</Text>
                        <Picker selectedValue={activity} onValueChange={(itemValue) => setActivity(itemValue)} style={styles.picker}>
                           <Picker.Item label="Sedentary (Office Job)" value="1.2" />
                           <Picker.Item label="Light Activity (1-3 days/wk)" value="1.375" />
                           <Picker.Item label="Moderate Activity (3-5 days/wk)" value="1.55" />
                           <Picker.Item label="Very Active (6-7 days/wk)" value="1.725" />
                        </Picker>
                        <Text style={styles.label}>System Objective</Text>
                        <View style={styles.goalContainer}>
                            {['cut', 'maintain', 'bulk'].map(mode => (
                                <TouchableOpacity 
                                    key={mode} 
                                    onPress={() => setGoal(mode)} 
                                    style={[styles.goalButton, goal === mode && styles.goalButtonActive]}
                                >
                                    <Text style={styles.goalButtonText}>{mode}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>
                ) : (
                    <View style={styles.resultsContainer}>
                        <Text style={styles.resultsHeader}>Recommended Protocol</Text>
                        <Text style={styles.calories}>{results.calories} <Text style={{fontSize: 18, color: 'white'}}>kcal</Text></Text>
                        <View style={styles.macrosRow}>
                            <View style={styles.macroBox}>
                                <Text style={styles.macroValue}>{results.protein}g</Text>
                                <Text style={styles.macroLabel}>Protein</Text>
                            </View>
                            <View style={styles.macroBox}>
                                <Text style={styles.macroValue}>{results.carbs}g</Text>
                                <Text style={styles.macroLabel}>Carbs</Text>
                            </View>
                            <View style={styles.macroBox}>
                                <Text style={styles.macroValue}>{results.fats}g</Text>
                                <Text style={styles.macroLabel}>Fats</Text>
                            </View>
                        </View>
                        <Text style={styles.resultsSubtext}>
                            System has calculated optimal fuel intake based on your hunter physiology. Confirm to update parameters.
                        </Text>
                    </View>
                )}
            </ScrollView>
            <View style={styles.footer}>
                <TouchableOpacity onPress={onClose} style={styles.cancelButton}>
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                {step === 1 ? (
                    <TouchableOpacity disabled={!weight || !height} onPress={calculateMacros} style={[styles.actionButton, styles.analyzeButton]}>
                        <Text style={styles.actionButtonText}>Analyze Data</Text>
                        <ChevronRight color="white" size={14} />
                    </TouchableOpacity>
                ) : (
                    <TouchableOpacity disabled={loading} onPress={handleSave} style={[styles.actionButton, styles.confirmButton]}>
                        <Text style={styles.actionButtonText}>{loading ? 'Updating...' : 'Confirm Protocol'}</Text>
                        <Save color="white" size={14} />
                    </TouchableOpacity>
                )}
            </View>
        </View>
    </BaseModal>
  );
};

const styles = StyleSheet.create({
    container: {
        backgroundColor: '#0f172a',
        borderWidth: 1,
        borderColor: 'rgba(6, 182, 212, 0.3)',
        borderRadius: 12,
        width: '90%',
        maxHeight: '80%',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(6, 182, 212, 0.2)',
        backgroundColor: 'rgba(6, 182, 212, 0.1)',
    },
    headerText: {
        color: '#06b6d4',
        fontWeight: 'bold',
        textTransform: 'uppercase',
        letterSpacing: 1.5,
        fontSize: 12,
        marginLeft: 12,
    },
    content: {
        padding: 24,
    },
    form: {
        gap: 16,
    },
    row: {
        flexDirection: 'row',
        gap: 16,
    },
    inputContainer: {
        flex: 1,
    },
    label: {
        fontSize: 10,
        fontWeight: 'bold',
        color: '#94a3b8',
        textTransform: 'uppercase',
        marginBottom: 4,
    },
    input: {
        width: '100%',
        backgroundColor: 'rgba(0,0,0,0.3)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
        borderRadius: 4,
        padding: 8,
        color: 'white',
        fontFamily: 'monospace',
    },
    picker: {
        width: '100%',
        backgroundColor: 'rgba(0,0,0,0.3)',
        color: 'white',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
        borderRadius: 4,
    },
    goalContainer: {
        flexDirection: 'row',
        gap: 8,
    },
    goalButton: {
        flex: 1,
        paddingVertical: 8,
        borderRadius: 4,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
        backgroundColor: 'rgba(0,0,0,0.3)',
        alignItems: 'center',
    },
    goalButtonActive: {
        backgroundColor: '#0891b2',
        borderColor: '#06b6d4',
    },
    goalButtonText: {
        color: '#94a3b8',
        fontSize: 12,
        fontWeight: 'bold',
        textTransform: 'uppercase',
    },
    resultsContainer: {
        alignItems: 'center',
        paddingVertical: 20,
        gap: 24,
    },
    resultsHeader: {
        color: '#94a3b8',
        fontSize: 12,
        fontWeight: 'bold',
        textTransform: 'uppercase',
        letterSpacing: 1.5,
    },
    calories: {
        fontSize: 48,
        fontWeight: 'bold',
        color: '#06b6d4',
    },
    macrosRow: {
        flexDirection: 'row',
        width: '100%',
        gap: 8,
    },
    macroBox: {
        flex: 1,
        padding: 12,
        borderRadius: 4,
        borderWidth: 1,
        borderColor: 'rgba(6, 182, 212, 0.3)',
        backgroundColor: 'rgba(6, 182, 212, 0.1)',
        alignItems: 'center',
    },
    macroValue: {
        color: '#06b6d4',
        fontSize: 20,
        fontWeight: 'bold',
    },
    macroLabel: {
        fontSize: 10,
        color: 'rgba(6, 182, 212, 0.5)',
        textTransform: 'uppercase',
        fontWeight: 'bold',
    },
    resultsSubtext: {
        fontSize: 12,
        color: '#94a3b8',
        textAlign: 'center',
        maxWidth: '80%',
    },
    footer: {
        flexDirection: 'row',
        padding: 16,
        borderTopWidth: 1,
        borderTopColor: 'rgba(255,255,255,0.1)',
        backgroundColor: 'rgba(0,0,0,0.2)',
    },
    cancelButton: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 4,
    },
    cancelButtonText: {
        color: '#94a3b8',
        fontSize: 12,
        fontWeight: 'bold',
        textTransform: 'uppercase',
    },
    actionButton: {
        flex: 1,
        paddingVertical: 8,
        borderRadius: 4,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
    },
    actionButtonText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 12,
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    analyzeButton: {
        backgroundColor: '#0e7490',
    },
    confirmButton: {
        backgroundColor: '#16a34a',
    }
});

export default MacroCalculatorModal;
