import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Image } from 'react-native';
import { Utensils, X, Flame, Plus, Star } from 'lucide-react-native';
import { api } from '@/api/nutrition';
import { supabase } from '@/lib/supabase';
import { useNotification } from '@/contexts/NotificationContext';

interface AddFoodFormProps {
  day: string;
  user: any;
  onCancel: () => void;
  onConfirm: (data: any | any[]) => void;
  isToday: boolean;
}

export default function AddFoodForm({ day, user, onCancel, onConfirm }: AddFoodFormProps) {
  const { showNotification } = useNotification();
  // Form State
  const [name, setName] = useState('');
  const [cals, setCals] = useState('');
  const [prot, setProt] = useState('');
  const [carbs, setCarbs] = useState('');
  const [fats, setFats] = useState('');

  // Bulk State
  const [stagedItems, setStagedItems] = useState<any[]>([]);

  // UI State
  const [quickAddTab, setQuickAddTab] = useState<'create' | 'saved' | 'common'>('create');
  const [isLoadingData, setIsLoadingData] = useState(false);
  
  // Data State
  const [myTemplates, setMyTemplates] = useState<any[]>([]);
  const [commonFoods, setCommonFoods] = useState<any[]>([]);

  // Load Data
  useEffect(() => {
    async function loadQuickAddData() {
      setIsLoadingData(true);
      // 1. Fetch user templates
      const { data: templates } = await api.getMealTemplates(user.id);
      
      // 2. Fetch common foods
      const { data: common } = await supabase.from('common_foods').select('*').order('name');
      
      if (templates) setMyTemplates(templates);
      if (common) setCommonFoods(common);
      setIsLoadingData(false);
    }
    if (user?.id) loadQuickAddData();
  }, [user?.id]);

  const fillForm = (item: any) => {
    setName(item.name || '');
    setCals((item.calories ?? 0).toString());
    setProt((item.protein ?? 0).toString());
    setCarbs((item.carbs ?? 0).toString());
    setFats((item.fats ?? 0).toString());
    setQuickAddTab('create');
  };

  const handleStageItem = () => {
    if (!name.trim()) return;
    const newItem = {
      name: name.toUpperCase(),
      cals: cals || '0',
      prot: prot || '0',
      carbs: carbs || '0',
      fats: fats || '0'
    };
    setStagedItems([...stagedItems, newItem]);
    setName(''); setCals(''); setProt(''); setCarbs(''); setFats('');
    showNotification("ITEM ADDED TO STAGING", "success");
  };

  const unstageItem = (idx: number) => {
    setStagedItems(stagedItems.filter((_, i) => i !== idx));
  };

  const handleSubmit = () => {
    if (stagedItems.length > 0) {
      const finalItems = [...stagedItems];
      if (name.trim()) {
        finalItems.push({ name: name.toUpperCase(), cals: cals || '0', prot: prot || '0', carbs: carbs || '0', fats: fats || '0' });
      }
      onConfirm(finalItems);
    } else {
      if (!name.trim()) return;
      onConfirm({ name, cals: cals || '0', prot: prot || '0', carbs: carbs || '0', fats: fats || '0' });
    }
  };

  const handleSaveTemplate = async () => {
    if (!name.trim()) return showNotification("Enter a name first", "error");
    const payload = {
      hunter_id: user.id,
      name: name.toUpperCase(),
      calories: parseInt(cals) || 0,
      protein: parseInt(prot) || 0,
      carbs: parseInt(carbs) || 0,
      fats: parseInt(fats) || 0,
      is_starred: false
    };

    const result = await api.createMealTemplate(payload);
    if (result.success) {
      showNotification("BLUEPRINT SAVED", "success");
      setMyTemplates(prev => [...prev, result.data].sort((a,b) => a.name.localeCompare(b.name)));
    } else {
      showNotification("ERROR SAVING TEMPLATE", "error");
    }
  };

  const toggleStar = async (item: any) => {
      const newStarred = !item.is_starred;
      const result = await api.updateMealTemplate(item.id, { is_starred: newStarred });
      if(result.success) {
          setMyTemplates(prev => prev.map(p => p.id === item.id ? { ...p, is_starred: newStarred } : p));
      }
  };

  const FoodList = ({ items, type }: { items: any[], type: string }) => (
    <ScrollView className="flex-1 pr-2">
      {items.length === 0 ? (
        <Text className="text-center text-gray-500 text-xs py-4">No {type} found.</Text>
      ) : (
        items.map((item, idx) => (
          <TouchableOpacity 
            key={idx} 
            onPress={() => fillForm(item)} 
            className="w-full flex-row justify-between items-center bg-[#0f172a] border border-amber-900/30 p-3 rounded-lg mb-2"
          >
            <View className="flex-1 pr-4">
              <View className="flex-row items-center gap-2">
                <Text className="text-xs font-bold text-white uppercase" numberOfLines={1}>{item.name}</Text>
                {item.is_recent && <View className="bg-blue-500/20 px-1 rounded"><Text className="text-[8px] text-blue-400 font-black">RECENT</Text></View>}
              </View>
              <Text className="text-[9px] text-amber-400/70 font-mono mt-1">
                {item.calories} CALS | P:{item.protein} C:{item.carbs} F:{item.fats}
              </Text>
            </View>
            <View className="flex-row items-center gap-3">
              {type === 'blueprints' && (
                <TouchableOpacity onPress={() => toggleStar(item)} className="p-1">
                  <Star size={14} color={item.is_starred ? "#fbbf24" : "#4b5563"} fill={item.is_starred ? "#fbbf24" : "transparent"} />
                </TouchableOpacity>
              )}
              <Plus size={14} color="#f59e0b" />
            </View>
          </TouchableOpacity>
        ))
      )}
    </ScrollView>
  );

  return (
    <View className="flex-1 bg-[#020617] border border-amber-500/30 rounded-xl overflow-hidden shadow-2xl">
      {/* Header & Tabs */}
      <View className="bg-[#0f172a] border-b border-amber-500/20">
        <View className="flex-row justify-between items-center p-4">
          <View className="flex-row items-center gap-2">
            <Utensils size={14} color="#fbbf24" />
            <Text className="font-black text-amber-400 uppercase tracking-widest text-xs">LOG DIET [{day.substring(0,3)}]</Text>
            {stagedItems.length > 0 && (
              <View className="bg-amber-500 px-2 py-0.5 rounded ml-2">
                <Text className="text-black text-[10px] font-bold">{stagedItems.length} STAGED</Text>
              </View>
            )}
          </View>
          <TouchableOpacity onPress={onCancel}>
             <X size={18} color="#64748b" />
          </TouchableOpacity>
        </View>
        <View className="flex-row">
           {['create', 'common', 'saved'].map(tab => (
               <TouchableOpacity 
                key={tab}
                onPress={() => setQuickAddTab(tab as any)} 
                className={`flex-1 py-2 border-b-2 items-center justify-center ${quickAddTab === tab ? 'border-amber-500 bg-amber-950/30' : 'border-transparent'}`}
               >
                   <Text className={`text-[10px] font-bold uppercase tracking-wider ${quickAddTab === tab ? 'text-amber-400' : 'text-gray-500'}`}>
                       {tab === 'create' ? 'Create New' : tab === 'common' ? 'Standard' : 'Saved'}
                   </Text>
               </TouchableOpacity>
           ))}
        </View>
      </View>
      
      <View className="p-6 flex-1">
        {isLoadingData ? (
          <Text className="text-center text-amber-500 text-xs py-10">LOADING RATIONS DB...</Text>
        ) : (
          <>
            {/* TAB 1: CREATE / EDIT FORM */}
            {quickAddTab === 'create' && (
                <ScrollView className="flex-1">
                    {/* STAGED ITEMS */}
                    {stagedItems.length > 0 && (
                      <View className="mb-4 border-b border-amber-500/20 pb-4">
                        <Text className="text-[9px] font-black text-amber-500/50 uppercase tracking-widest mb-2">Staged for logging:</Text>
                        <View className="flex-row flex-wrap gap-2">
                          {stagedItems.map((item, i) => (
                            <View key={i} className="flex-row items-center gap-2 bg-amber-500/10 border border-amber-500/30 px-2 py-1 rounded-md">
                              <Text className="text-[10px] font-bold text-amber-400 uppercase">{item.name}</Text>
                              <TouchableOpacity onPress={() => unstageItem(i)}>
                                <X size={10} color="#f87171" />
                              </TouchableOpacity>
                            </View>
                          ))}
                        </View>
                      </View>
                    )}

                    <View className="mb-4">
                        <Text className="text-[10px] font-bold text-gray-500 uppercase mb-1">Item Name</Text>
                        <View className="flex-row gap-2 items-center">
                            <TextInput 
                                value={name} onChangeText={setName} 
                                placeholder="E.G. CHICKEN & RICE" 
                                placeholderTextColor="#334155"
                                className="flex-1 bg-transparent border-b border-amber-500/50 text-white font-bold text-sm py-1 uppercase" 
                            />
                        </View>
                        {name && (cals || prot || carbs || fats) && (
                            <View className="flex-row gap-2 mt-2">
                                <TouchableOpacity onPress={handleStageItem} className="bg-amber-500 px-2 py-1 rounded flex-row items-center gap-1">
                                    <Plus size={10} color="black" />
                                    <Text className="text-[9px] uppercase font-bold text-black">Add Another</Text>
                                </TouchableOpacity>
                                <TouchableOpacity onPress={handleSaveTemplate} className="border border-amber-500/50 px-2 py-1 rounded">
                                    <Text className="text-[9px] uppercase font-bold text-amber-500">Save Blueprint</Text>
                                </TouchableOpacity>
                            </View>
                        )}
                    </View>

                    <View className="flex-row flex-wrap gap-4">
                        <View className="w-[45%]">
                            <Text className="text-[10px] font-bold text-gray-500 uppercase mb-1 flex-row items-center gap-1">
                                <Flame size={10} color="#f59e0b" /> Calories
                            </Text>
                            <TextInput 
                                value={cals} onChangeText={setCals} keyboardType="numeric" placeholder="0" 
                                className="bg-[#0f172a] border border-white/10 rounded p-3 text-amber-400 font-mono text-sm"
                            />
                        </View>
                        <View className="w-[45%]">
                             <Text className="text-[10px] font-bold text-blue-400 uppercase mb-1">Protein (g)</Text>
                             <TextInput 
                                value={prot} onChangeText={setProt} keyboardType="numeric" placeholder="0" 
                                className="bg-[#0f172a] border border-white/10 rounded p-3 text-blue-400 font-mono text-sm"
                            />
                        </View>
                        <View className="w-[45%]">
                             <Text className="text-[10px] font-bold text-green-400 uppercase mb-1">Carbs (g)</Text>
                             <TextInput 
                                value={carbs} onChangeText={setCarbs} keyboardType="numeric" placeholder="0" 
                                className="bg-[#0f172a] border border-white/10 rounded p-3 text-green-400 font-mono text-sm"
                            />
                        </View>
                         <View className="w-[45%]">
                             <Text className="text-[10px] font-bold text-yellow-400 uppercase mb-1">Fats (g)</Text>
                             <TextInput 
                                value={fats} onChangeText={setFats} keyboardType="numeric" placeholder="0" 
                                className="bg-[#0f172a] border border-white/10 rounded p-3 text-yellow-400 font-mono text-sm"
                            />
                        </View>
                    </View>
                </ScrollView>
            )}

            {quickAddTab === 'common' && <FoodList items={commonFoods} type="standard issue items" />}
            {quickAddTab === 'saved' && <FoodList items={myTemplates} type="blueprints" />}
          </>
        )}
      </View>

      <View className="p-4 flex-row gap-3 bg-[#0f172a] border-t border-white/5">
        {quickAddTab === 'create' ? (
             <TouchableOpacity 
                onPress={handleSubmit} 
                disabled={!name.trim() && stagedItems.length === 0} 
                className={`flex-1 py-3 bg-amber-600 rounded items-center justify-center shadow-lg shadow-amber-900/20 ${(!name.trim() && stagedItems.length === 0) ? 'opacity-50' : ''}`}
             >
                <Text className="text-black font-black uppercase text-xs">
                    {stagedItems.length > 0 
                      ? `LOG ALL ENTRIES (${stagedItems.length + (name.trim() ? 1 : 0)})` 
                      : 'CONFIRM LOG'}
                </Text>
             </TouchableOpacity>
        ) : (
             <View className="flex-1 items-center justify-center">
                 <Text className="text-xs text-gray-500 font-bold uppercase">Select an item to autofill</Text>
             </View>
        )}
        <TouchableOpacity onPress={onCancel} className="px-6 py-3 border border-white/10 rounded items-center justify-center">
            <Text className="text-gray-400 font-bold uppercase text-xs">CANCEL</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
