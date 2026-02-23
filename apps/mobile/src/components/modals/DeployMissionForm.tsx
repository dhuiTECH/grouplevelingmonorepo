import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView } from 'react-native';
import { X, Copy, Trash2, Plus } from 'lucide-react-native';

interface SetData {
  weight?: string;
  reps?: string;
  km?: string;
  mins?: string;
}

interface DeployMissionFormProps {
  deployPathName: string;
  initialObjectiveName?: string;
  initialSets?: SetData[];
  onCancel: () => void;
  onConfirm: (name: string, sets: SetData[]) => void;
}

export default function DeployMissionForm({ 
  deployPathName, 
  initialObjectiveName = '', 
  initialSets, 
  onCancel, 
  onConfirm 
}: DeployMissionFormProps) {
  const [name, setName] = useState(initialObjectiveName);
  const isCardio = ['RUNNING', 'CARDIO', 'CYCLING', 'SWIMMING'].includes(deployPathName) || deployPathName !== 'Strength';

  const [sets, setSets] = useState<SetData[]>(
    initialSets || (isCardio ? [{ km: '', mins: '' }] : [{ weight: '', reps: '' }])
  );

  const updateSet = (index: number, field: string, value: string) => {
    const newSets = [...sets];
    newSets[index] = { ...newSets[index], [field]: value };
    setSets(newSets);
  };

  const addSet = () => {
    setSets([...sets, isCardio ? { km: '', mins: '' } : { weight: '', reps: '' }]);
  };

  const duplicateSet = (idx: number) => {
    const setToDuplicate = sets[idx];
    const newSets = [...sets];
    newSets.splice(idx + 1, 0, { ...setToDuplicate });
    setSets(newSets);
  };

  const removeSet = (idx: number) => {
    if (sets.length > 1) {
      setSets(sets.filter((_, i) => i !== idx));
    }
  };

  return (
    <View className="flex-1">
      <View className="flex-row justify-between items-center mb-6 border-b border-cyan-500/30 pb-4">
        <Text className="font-black text-cyan-400 uppercase tracking-widest text-sm">MISSION NAME</Text>
        <TouchableOpacity onPress={onCancel}>
          <X size={20} color="#64748b" />
        </TouchableOpacity>
      </View>

      <View className="space-y-6 flex-1">
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder={deployPathName === 'Strength' ? "E.G. BENCH PRESS" : "E.G. CENTRAL PARK RUN"}
          placeholderTextColor="#4b5563"
          className="w-full bg-slate-900/50 border border-cyan-500/20 rounded-lg p-3 text-white font-bold text-lg"
          autoFocus
        />

        <View className="flex-1">
          {deployPathName === 'Strength' ? (
            <View className="flex-1">
               <View className="flex-row gap-3 mb-2 px-1">
                <View className="w-8" />
                <Text className="flex-1 text-[10px] font-bold text-gray-500 uppercase text-center">LBS / KG</Text>
                <Text className="flex-1 text-[10px] font-bold text-gray-500 uppercase text-center">REPS</Text>
                <View className="w-12" />
               </View>

              <ScrollView className="flex-1 pr-1" contentContainerStyle={{ paddingBottom: 20 }}>
                {sets.map((set, idx) => (
                  <View key={idx} className="flex-row gap-3 items-center mb-3">
                    <Text className="text-xs font-bold text-slate-500 w-8 text-center bg-slate-800/50 py-3 rounded">{idx + 1}</Text>
                    
                    <TextInput
                      className="flex-1 bg-slate-800 border border-white/10 text-white font-mono text-sm py-3 text-center rounded focus:border-cyan-500/50"
                      value={set.weight}
                      onChangeText={(val) => updateSet(idx, 'weight', val)}
                      keyboardType="numeric"
                      placeholder="-"
                      placeholderTextColor="#334155"
                    />
                    
                    <TextInput
                      className="flex-1 bg-slate-800 border border-white/10 text-white font-mono text-sm py-3 text-center rounded focus:border-cyan-500/50"
                      value={set.reps}
                      onChangeText={(val) => updateSet(idx, 'reps', val)}
                      keyboardType="numeric"
                      placeholder="-"
                      placeholderTextColor="#334155"
                    />

                    <View className="flex-row gap-1 w-12 justify-end">
                      <TouchableOpacity onPress={() => duplicateSet(idx)} className="p-2 bg-slate-800 rounded border border-white/5">
                        <Copy size={14} color="#9ca3af" />
                      </TouchableOpacity>
                      {sets.length > 1 && (
                        <TouchableOpacity onPress={() => removeSet(idx)} className="p-2 bg-red-900/20 rounded border border-red-500/20">
                          <Trash2 size={14} color="#f87171" />
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                ))}
                
                <TouchableOpacity 
                  onPress={addSet}
                  className="w-full py-3 mt-2 border border-dashed border-gray-700 rounded-lg flex-row items-center justify-center gap-2 bg-white/5 hover:bg-white/10"
                >
                  <Plus size={14} color="#94a3b8" />
                  <Text className="text-xs font-bold text-slate-400 uppercase tracking-wider">Add Set</Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
          ) : (
            <View className="flex-row gap-4 mt-2">
              <View className="flex-1">
                <Text className="text-xs font-bold text-gray-400 uppercase mb-2 ml-1">Distance (KM)</Text>
                <TextInput
                  className="w-full bg-slate-800 border border-white/10 rounded-lg p-3 text-cyan-400 font-mono text-base"
                  value={sets[0].km}
                  onChangeText={(val) => updateSet(0, 'km', val)}
                  keyboardType="numeric"
                  placeholder="0.0"
                  placeholderTextColor="#334155"
                />
              </View>
              <View className="flex-1">
                <Text className="text-xs font-bold text-gray-400 uppercase mb-2 ml-1">Duration (MINS)</Text>
                <TextInput
                  className="w-full bg-slate-800 border border-white/10 rounded-lg p-3 text-cyan-400 font-mono text-base"
                  value={sets[0].mins}
                  onChangeText={(val) => updateSet(0, 'mins', val)}
                  keyboardType="numeric"
                  placeholder="00:00"
                  placeholderTextColor="#334155"
                />
              </View>
            </View>
          )}
        </View>
      </View>

      <View className="mt-4 pt-4 border-t border-white/5 flex-row gap-3">
        <TouchableOpacity 
          onPress={onCancel}
          className="flex-1 py-4 rounded-xl border border-slate-700 bg-slate-800/50 items-center justify-center"
        >
          <Text className="text-slate-400 font-bold uppercase text-xs tracking-wider">Cancel</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          onPress={() => onConfirm(name, sets)}
          className="flex-[2] py-4 rounded-xl bg-cyan-600 items-center justify-center shadow-lg shadow-cyan-900/20 border-t border-cyan-400/20"
        >
          <Text className="text-white font-black uppercase text-xs tracking-widest">Confirm Deployment</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
