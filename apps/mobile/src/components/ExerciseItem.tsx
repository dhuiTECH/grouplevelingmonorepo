import React, { memo } from 'react';
import { View, Text, TextInput, TouchableOpacity, LayoutAnimation } from 'react-native';
import { Trash2, Pencil, Check, Copy, Plus } from 'lucide-react-native';

interface SetData {
  weight?: string;
  reps?: string;
  km?: string;
  mins?: string;
  completed?: boolean;
}

interface Exercise {
  id: string;
  exercise_name: string;
  category: string;
  activity_type?: string;
  is_completed: boolean;
  sets_data: SetData[];
}

interface ExerciseItemProps {
  exercise: Exercise;
  isToday: boolean;
  onTerminate: (id: string) => void;
  onEdit: (exercise: Exercise) => void;
  onToggleComplete: (id: string, currentStatus: boolean, category: string) => void;
  onUpdateSet: (id: string, index: number, field: string, value: string | boolean) => void;
  onRemoveSet: (id: string, index: number) => void;
  onDuplicateSet: (id: string, index: number) => void;
}

const ExerciseItem = memo(({ 
  exercise, 
  onTerminate, 
  onEdit, 
  onToggleComplete, 
  onUpdateSet, 
  onRemoveSet, 
  onDuplicateSet, 
  isToday 
}: ExerciseItemProps) => {
  const isCardio = exercise.category !== 'Strength';

  const toggleSetComplete = (setIdx: number) => {
    if (!isToday) return;
    const currentSet = exercise.sets_data?.[setIdx];
    if (currentSet) {
      onUpdateSet(exercise.id, setIdx, 'completed', !currentSet.completed);
    }
  };

  return (
    <View 
      className={`border rounded-lg p-3 md:p-4 mb-3 transition-all ${
        exercise.is_completed 
          ? 'border-green-500/40 bg-green-900/40' 
          : 'border-white/10 bg-slate-900/60'
      }`}
    >
      {/* Header */}
      <View className="flex-row justify-between items-start mb-3">
        <Text 
          className={`text-sm md:text-base font-bold uppercase tracking-wider flex-1 mr-2 ${
            exercise.is_completed ? 'text-green-400 line-through' : 'text-white'
          }`}
        >
          {exercise.exercise_name}
        </Text>
        
        <View className="flex-row gap-2">
          <TouchableOpacity 
            onPress={() => onTerminate(exercise.id)} 
            className="w-8 h-8 rounded border border-slate-600 bg-slate-700/50 items-center justify-center"
          >
            <Trash2 size={14} color="#9ca3af" />
          </TouchableOpacity>
          
          <TouchableOpacity 
            onPress={() => onEdit(exercise)} 
            className="w-8 h-8 rounded border border-slate-600 bg-slate-700/50 items-center justify-center"
          >
            <Pencil size={14} color="#9ca3af" />
          </TouchableOpacity>
          
          <TouchableOpacity 
            onPress={() => !exercise.is_completed && isToday && onToggleComplete(exercise.id, exercise.is_completed, exercise.category)}
            disabled={exercise.is_completed || !isToday}
            className={`w-8 h-8 rounded border items-center justify-center ${
              exercise.is_completed 
                ? 'bg-green-600 border-green-500' 
                : isToday 
                  ? 'border-slate-600 bg-slate-700/50' 
                  : 'border-slate-800 bg-slate-900/20'
            }`}
          >
            <Check size={14} color={exercise.is_completed ? 'white' : '#9ca3af'} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Content */}
      {isCardio ? (
        <View className="flex-row gap-4">
          <View className="flex-1">
            <Text className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-1">KM</Text>
            <TextInput
              className="w-full bg-slate-900/60 border-b-2 border-cyan-500/30 text-cyan-300 text-sm font-mono py-1.5 px-2"
              value={exercise.sets_data?.[0]?.km?.toString()}
              onChangeText={(val) => onUpdateSet(exercise.id, 0, 'km', val)}
              keyboardType="numeric"
              placeholder="0"
              placeholderTextColor="#475569"
            />
          </View>
          <View className="flex-1">
            <Text className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-1">MINS</Text>
            <TextInput
              className="w-full bg-slate-900/60 border-b-2 border-cyan-500/30 text-cyan-300 text-sm font-mono py-1.5 px-2"
              value={exercise.sets_data?.[0]?.mins?.toString()}
              onChangeText={(val) => onUpdateSet(exercise.id, 0, 'mins', val)}
              keyboardType="numeric"
              placeholder="0"
              placeholderTextColor="#475569"
            />
          </View>
        </View>
      ) : (
        <View className="space-y-3">
          {exercise.sets_data?.map((set, i) => (
            <View key={i} className="flex-row items-center gap-3">
              <TouchableOpacity 
                onPress={() => toggleSetComplete(i)}
                disabled={!isToday}
                className={`w-6 h-6 rounded-full border items-center justify-center ${
                  set.completed 
                    ? 'bg-green-600 border-green-500' 
                    : isToday 
                      ? 'border-slate-600 bg-slate-700/50' 
                      : 'border-slate-800 bg-slate-900/20'
                }`}
              >
                {set.completed && <Check size={10} color="white" />}
              </TouchableOpacity>
              
              <Text className="text-[10px] font-bold text-gray-400 uppercase w-4 text-center">{i + 1}</Text>
              
              <View className="flex-1 flex-row gap-3">
                <View className="flex-1">
                  <Text className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-1">LBS/KG</Text>
                  <TextInput 
                    className={`w-full bg-black/20 border-b border-white/10 text-sm font-mono py-1 px-2 ${
                        set.completed ? 'text-gray-500 border-green-900/30' : 'text-cyan-100'
                    }`}
                    value={set.weight?.toString()}
                    onChangeText={(val) => onUpdateSet(exercise.id, i, 'weight', val)}
                    keyboardType="numeric"
                    placeholder="0"
                    placeholderTextColor="#475569"
                  />
                </View>
                <View className="flex-1">
                  <Text className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-1">REPS</Text>
                  <TextInput 
                    className={`w-full bg-black/20 border-b border-white/10 text-sm font-mono py-1 px-2 ${
                        set.completed ? 'text-gray-500 border-green-900/30' : 'text-cyan-100'
                    }`}
                    value={set.reps?.toString()}
                    onChangeText={(val) => onUpdateSet(exercise.id, i, 'reps', val)}
                    keyboardType="numeric"
                    placeholder="0"
                    placeholderTextColor="#475569"
                  />
                </View>
              </View>
              
              <View className="flex-row gap-1">
                <TouchableOpacity 
                    onPress={() => onDuplicateSet(exercise.id, i)}
                    className="w-7 h-7 rounded border border-slate-600 bg-slate-700/50 items-center justify-center"
                >
                    <Copy size={12} color="#9ca3af" />
                </TouchableOpacity>
                {exercise.sets_data.length > 1 && (
                    <TouchableOpacity 
                        onPress={() => onRemoveSet(exercise.id, i)}
                        className="w-7 h-7 rounded border border-red-500/30 bg-red-900/20 items-center justify-center"
                    >
                        <Trash2 size={12} color="#f87171" />
                    </TouchableOpacity>
                )}
              </View>
            </View>
          ))}
        </View>
      )}
    </View>
  );
});

export default ExerciseItem;
