import React, { useState } from 'react';
import { Modal, View, Text, StyleSheet, TextInput, TouchableOpacity } from 'react-native';

interface MacroCalculatorProps {
  visible: boolean;
  onClose: () => void;
  onSave: (macros: any) => void;
}

export const MacroCalculator: React.FC<MacroCalculatorProps> = ({ visible, onClose, onSave }) => {
  const [calories, setCalories] = useState('');
  const [protein, setProtein] = useState('');
  const [carbs, setCarbs] = useState('');
  const [fats, setFats] = useState('');

  const handleSave = () => {
    onSave({ calories, protein, carbs, fats });
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <View style={styles.modalContent}>
          <Text style={styles.title}>Macro Calculator</Text>
          <TextInput
            style={styles.input}
            placeholder="Calories"
            keyboardType="numeric"
            value={calories}
            onChangeText={setCalories}
          />
          <TextInput
            style={styles.input}
            placeholder="Protein"
            keyboardType="numeric"
            value={protein}
            onChangeText={setProtein}
          />
          <TextInput
            style={styles.input}
            placeholder="Carbs"
            keyboardType="numeric"
            value={carbs}
            onChangeText={setCarbs}
          />
          <TextInput
            style={styles.input}
            placeholder="Fats"
            keyboardType="numeric"
            value={fats}
            onChangeText={setFats}
          />
          <View style={styles.buttonContainer}>
            <TouchableOpacity onPress={onClose} style={styles.button}>
              <Text style={styles.buttonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleSave} style={styles.button}>
              <Text style={styles.buttonText}>Save</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    modalContent: {
        width: '80%',
        backgroundColor: '#1e293b',
        borderRadius: 10,
        padding: 20,
        alignItems: 'center',
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
        color: 'white',
        marginBottom: 20,
    },
    input: {
        width: '100%',
        backgroundColor: '#334155',
        color: 'white',
        borderRadius: 5,
        padding: 10,
        marginBottom: 10,
    },
    buttonContainer: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        width: '100%',
    },
    button: {
        backgroundColor: '#475569',
        padding: 10,
        borderRadius: 5,
    },
    buttonText: {
        color: 'white',
        fontWeight: 'bold',
    },
});
