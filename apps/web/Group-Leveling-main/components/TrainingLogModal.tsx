'use client';

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trash2, Check, Plus, X, Pencil, Activity, Copy, Utensils, Flame, Star, ScanLine } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { User } from '@/lib/types';
import MacroCalculator from './modals/MacroCalculator';

// --- CONFIGURATION ---
const REWARD_CONSTANTS = {
  STRENGTH: { xp: 15, coins: 5, gems: 0 },
  STANDARD: { xp: 7, coins: 3, gems: 0 }
};

// --- COMPONENT: DEPLOY MISSION FORM (Preserved Original Look) ---
function DeployMissionForm({ deployPathName, initialObjectiveName = '', initialSets, onCancel, onConfirm }: any) {
  const [name, setName] = useState(initialObjectiveName);
  const isCardio = ['RUNNING', 'CARDIO', 'CYCLING', 'SWIMMING'].includes(deployPathName) || deployPathName !== 'Strength';

  // Default sets
  const [sets, setSets] = useState<any[]>(initialSets || (isCardio ? [{ km: '', mins: '' }] : [{ weight: '', reps: '' }]));

  const updateSet = (index: number, field: string, value: string) => {
    const newSets = [...sets];
    newSets[index] = { ...newSets[index], [field]: value };
    setSets(newSets);
  };

  const addSet = () => setSets([...sets, isCardio ? { km: '', mins: '' } : { weight: '', reps: '' }]);
  const duplicateSet = (idx: number) => {
    const setToDuplicate = sets[idx];
    const newSets = [...sets];
    newSets.splice(idx + 1, 0, { ...setToDuplicate });
    setSets(newSets);
  };
  const removeSet = (idx: number) => { if (sets.length > 1) setSets(sets.filter((_, i) => i !== idx)); };

  return (
    <div className="flex flex-col h-full relative">
      <div className="flex justify-between items-center mb-6 border-b border-cyan-500/30 pb-4">
        <h3 className="font-black text-cyan-400 uppercase tracking-widest text-sm">MISSION NAME</h3>
        <button onClick={onCancel} className="text-gray-500 hover:text-white"><X size={20} /></button>
      </div>

      <div className="space-y-6">
        <input 
            value={name} onChange={(e) => setName(e.target.value)} 
            placeholder={deployPathName === 'Strength' ? "E.G. BENCH PRESS" : "E.G. CENTRAL PARK RUN"}
            className="w-full bg-transparent border-b-2 border-cyan-500/50 text-white font-bold text-lg py-2 focus:outline-none focus:border-cyan-400 placeholder:text-gray-600 uppercase" 
            autoFocus 
        />

        <div className="bg-black/40 p-4 rounded-lg border border-white/5">
          {deployPathName === 'Strength' ? (
            <div className="space-y-3 max-h-[40vh] overflow-y-auto pr-1 custom-scrollbar">
              <div className="grid grid-cols-[20px_1fr_1fr_40px] gap-3 mb-2 px-2">
                 <span className="w-4"></span>
                 <label className="text-[10px] font-bold text-gray-500 uppercase">LBS/KG</label>
                 <label className="text-[10px] font-bold text-gray-500 uppercase">REPS</label>
                 <span className="w-10"></span>
              </div>

              {sets.map((set, idx) => (
                <div key={idx} className="grid grid-cols-[20px_1fr_1fr_40px] gap-3 items-center bg-slate-800/30 p-2 rounded border border-white/5">
                  <span className="text-[10px] font-bold text-gray-500 w-4 text-center">{idx + 1}</span>
                  <input type="number" className="w-full bg-transparent border-b border-white/10 text-white font-mono text-sm py-1 outline-none focus:border-cyan-400" value={set.weight} onChange={(e) => updateSet(idx, 'weight', e.target.value)} />
                  <input type="number" className="w-full bg-transparent border-b border-white/10 text-white font-mono text-sm py-1 outline-none focus:border-cyan-400" value={set.reps} onChange={(e) => updateSet(idx, 'reps', e.target.value)} />
                  <div className="flex gap-1">
                    <button onClick={() => duplicateSet(idx)} className="text-gray-600 hover:text-cyan-400" title="Duplicate Set"><Copy size={12} /></button>
                    {sets.length > 1 && <button onClick={() => removeSet(idx)} className="text-gray-600 hover:text-red-400"><Trash2 size={12} /></button>}
                  </div>
                </div>
              ))}
              <button onClick={addSet} className="w-full py-2 mt-2 border border-dashed border-gray-700 rounded-lg text-[10px] font-bold text-gray-500 uppercase hover:bg-white/5 hover:text-white flex items-center justify-center gap-1"><Plus size={10} /> Add Set</button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              <div><label className="text-[10px] font-bold text-gray-500 uppercase mb-1 block">KM</label><input type="number" className="w-full bg-slate-800/50 border border-white/10 rounded p-2 text-cyan-400 font-mono focus:outline-none" value={sets[0].km} onChange={(e) => updateSet(0, 'km', e.target.value)} /></div>
              <div><label className="text-[10px] font-bold text-gray-500 uppercase mb-1 block">MINS</label><input type="number" className="w-full bg-slate-800/50 border border-white/10 rounded p-2 text-cyan-400 font-mono focus:outline-none" value={sets[0].mins} onChange={(e) => updateSet(0, 'mins', e.target.value)} /></div>
            </div>
          )}
        </div>
      </div>

      <div className="mt-8 flex gap-3">
        <button onClick={onCancel} className="flex-[1] py-3 rounded-lg border border-slate-700 text-gray-400 font-bold uppercase hover:bg-white/5 text-xs">Cancel</button>
        <button onClick={() => onConfirm(name, sets)} className="flex-[2] py-3 rounded-lg bg-cyan-600 text-white font-bold uppercase hover:bg-cyan-500 shadow-lg shadow-cyan-900/20 text-xs">Confirm Deployment</button>
      </div>
    </div>
  );
}

// --- COMPONENT: ADD FOOD FORM WITH QUICK-ADD TABS ---
function AddFoodForm({ day, user, onCancel, onConfirm, showNotification, isToday }: any) {
  // Form State
  const [name, setName] = useState('');
  const [cals, setCals] = useState('');
  const [prot, setProt] = useState('');
  const [carbs, setCarbs] = useState('');
  const [fats, setFats] = useState('');

  // Bulk State
  const [stagedItems, setStagedItems] = useState<any[]>([]);

  // UI State
  const [quickAddTab, setQuickAddTab] = useState<'create' | 'saved' | 'common' | 'ai'>('create');
  const [isLoadingData, setIsLoadingData] = useState(false);

  // AI Scan state
  const [scanUsage, setScanUsage] = useState<{ used: number; limit: number } | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  
  // Data State
  const [myTemplates, setMyTemplates] = useState<any[]>([]);
  const [commonFoods, setCommonFoods] = useState<any[]>([]);

  // Fetch Quick-Add Data on Load
  useEffect(() => {
      async function loadQuickAddData() {
          setIsLoadingData(true);
          // 1. Fetch user templates (Saved Meals / Starred) via API
          const templateRes = await fetch(`/api/nutrition/templates?hunter_id=${user.id}`);
          const templateData = await templateRes.json();
          const templates = templateData.success ? templateData.data : [];
          
          // 2. Fetch recent unique meals from logs via API
          const logsRes = await fetch(`/api/nutrition?hunter_id=${user.id}&day=${day}`); // Fetch current day as a starting point for recents
          const logsData = await logsRes.json();
          const recentLogs = logsData.success ? logsData.data : [];

          // deduplicate recent logs by name and filter out if already in templates
          const uniqueRecents = [];
          const seenNames = new Set((templates || []).map((t: any) => t.name.toUpperCase()));
          
          if (recentLogs) {
            for (const log of recentLogs) {
              const upperName = log.name.toUpperCase();
              if (!seenNames.has(upperName)) {
                uniqueRecents.push({ ...log, is_recent: true });
                seenNames.add(upperName);
              }
              if (uniqueRecents.length >= 10) break;
            }
          }

          const combined = [...templates, ...uniqueRecents];
          setMyTemplates(combined.sort((a,b) => {
            if (a.is_starred !== b.is_starred) return a.is_starred ? -1 : 1;
            return a.name.localeCompare(b.name);
          }));
          
          // Fetch common foods (Still direct as it's public read)
          const { data: common } = await supabase.from('common_foods').select('*').order('name');
          if (common) setCommonFoods(common);
          setIsLoadingData(false);
      }
      if (user?.id) loadQuickAddData();
  }, [user?.id, day]);

  // Fetch AI scan usage when AI tab is selected
  useEffect(() => {
    if (quickAddTab !== 'ai' || !user?.id) return;
    setScanError(null);
    fetch('/api/nutrition/scan/usage')
      .then((res) => res.json())
      .then((data) => {
        if (data.used !== undefined && data.limit !== undefined) {
          setScanUsage({ used: data.used, limit: data.limit });
        }
      })
      .catch(() => setScanUsage({ used: 0, limit: 3 }));
  }, [quickAddTab, user?.id]);

  // AI Scan: handle file select and call API
  const scanInputRef = useRef<HTMLInputElement>(null);
  const handleScanFood = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith('image/')) return;
    if (scanUsage && scanUsage.used >= scanUsage.limit) {
      showNotification('Daily scan limit reached (3/day)', 'error');
      return;
    }
    setIsScanning(true);
    setScanError(null);
    const formData = new FormData();
    formData.append('image', file);
    try {
      const res = await fetch('/api/nutrition/scan', { method: 'POST', body: formData });
      const data = await res.json();
      if (!res.ok) {
        setScanError(data.details || data.error || 'Scan failed');
        showNotification(data.details || data.error || 'Scan failed', 'error');
        return;
      }
      fillForm({
        name: data.name,
        calories: data.calories,
        protein: data.protein,
        carbs: data.carbs,
        fats: data.fats,
      });
      setScanUsage((prev) => (prev ? { ...prev, used: prev.used + 1 } : { used: 1, limit: 3 }));
      showNotification('FOOD SCANNED — EDIT & LOG', 'success');
    } catch (err) {
      setScanError('Network error. Try again.');
      showNotification('Scan failed', 'error');
    } finally {
      setIsScanning(false);
      if (scanInputRef.current) scanInputRef.current.value = '';
    }
  };

  // Action: Toggle Star status
  const toggleStar = async (e: React.MouseEvent, item: any) => {
    e.stopPropagation();
    if (item.is_recent) {
      // If it's a recent meal, we first need to save it as a template to star it
      const payload = {
        hunter_id: user.id,
        name: item.name.toUpperCase(),
        calories: item.calories,
        protein: item.protein,
        carbs: item.carbs,
        fats: item.fats,
        is_starred: true
      };
      
      const response = await fetch('/api/nutrition/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const result = await response.json();

      if (result.success) {
        showNotification("MEAL SAVED & STARRED", "success");
        setMyTemplates(prev => {
          const filtered = prev.filter(p => p.name.toUpperCase() !== item.name.toUpperCase());
          return [result.data, ...filtered].sort((a,b) => {
            if (a.is_starred !== b.is_starred) return a.is_starred ? -1 : 1;
            return a.name.localeCompare(b.name);
          });
        });
      }
    } else {
      // It's already a template, just toggle the boolean via API
      const newStarred = !item.is_starred;
      const response = await fetch('/api/nutrition/templates', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: item.id, is_starred: newStarred })
      });
      const result = await response.json();

      if (result.success) {
        setMyTemplates(prev => prev.map(p => p.id === item.id ? { ...p, is_starred: newStarred } : p).sort((a,b) => {
          if (a.is_starred !== b.is_starred) return a.is_starred ? -1 : 1;
          return a.name.localeCompare(b.name);
        }));
      }
    }
  };

  // Helper to autofill form
  const fillForm = (item: any) => {
      setName(item.name || '');
      setCals((item.calories ?? 0).toString());
      setProt((item.protein ?? 0).toString());
      setCarbs((item.carbs ?? 0).toString());
      setFats((item.fats ?? 0).toString());
      setQuickAddTab('create'); // Switch back to form tab
  };

  // Action: Stage current item to bulk list
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
    // Clear form
    setName('');
    setCals('');
    setProt('');
    setCarbs('');
    setFats('');
    showNotification("ITEM ADDED TO STAGING", "success");
  };

  // Action: Remove from staged
  const unstageItem = (idx: number) => {
    setStagedItems(stagedItems.filter((_, i) => i !== idx));
  };

  // Action: Submit the log
  const handleSubmit = () => {
      // If we have staged items, confirm all of them
      if (stagedItems.length > 0) {
        // If there's also something in the current form, add it too if it has a name
        const finalItems = [...stagedItems];
        if (name.trim()) {
          finalItems.push({ name: name.toUpperCase(), cals: cals || '0', prot: prot || '0', carbs: carbs || '0', fats: fats || '0' });
        }
        onConfirm(finalItems);
      } else {
        // Just the single item in the form
        if (!name.trim()) return;
        onConfirm({ name, cals: cals || '0', prot: prot || '0', carbs: carbs || '0', fats: fats || '0' });
      }
  };

  // Action: Save current form as a new template
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

     const response = await fetch('/api/nutrition/templates', {
       method: 'POST',
       headers: { 'Content-Type': 'application/json' },
       body: JSON.stringify(payload)
     });
     const result = await response.json();

     if (result.success) {
         showNotification("BLUEPRINT SAVED", "success");
         // Refresh templates list locally with the returned data (includes ID)
         setMyTemplates(prev => [...prev, result.data].sort((a,b) => {
           if (a.is_starred !== b.is_starred) return a.is_starred ? -1 : 1;
           return a.name.localeCompare(b.name);
         }));
     } else {
         showNotification("ERROR SAVING TEMPLATE", "error");
     }
  };

  // Sub-component for rendering lists
  const FoodList = ({ items, type }: { items: any[], type: string }) => (
    <div className="space-y-2 max-h-[300px] overflow-y-auto custom-scrollbar pr-2">
        {items.length === 0 ? (
            <div className="text-center text-gray-500 text-xs py-4">No {type} found.</div>
        ) : (
            items.map((item, idx) => (
                <button key={idx} onClick={() => fillForm(item)} className="w-full flex justify-between items-center bg-[#0f172a] border border-amber-900/30 p-3 rounded-lg group hover:border-amber-500/50 hover:bg-amber-950/30 transition-all text-left">
                    <div className="flex-1 min-w-0 pr-4">
                        <div className="flex items-center gap-2">
                            <div className="text-xs font-bold text-white uppercase truncate">{item.name}</div>
                            {item.is_recent && <span className="text-[8px] bg-blue-500/20 text-blue-400 px-1 rounded font-black tracking-tighter">RECENT</span>}
                        </div>
                        <div className="text-[9px] text-amber-400/70 font-mono mt-1">
                            {item.calories} CALS | P:{item.protein} C:{item.carbs} F:{item.fats}
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {type === 'blueprints' && (
                            <div 
                                onClick={(e) => toggleStar(e, item)}
                                className={`p-1.5 rounded-md transition-all ${item.is_starred ? 'text-amber-400 bg-amber-500/10' : 'text-gray-600 hover:text-amber-500/40 hover:bg-white/5'}`}
                            >
                                <Star size={12} className={item.is_starred ? 'fill-amber-400' : ''} />
                            </div>
                        )}
                        <Plus size={14} className="text-amber-500 opacity-0 group-hover:opacity-100 transition-all" />
                    </div>
                </button>
            ))
        )}
    </div>
  );

  return (
    <div className="flex flex-col h-full bg-[#020617] relative border border-amber-500/30 rounded-xl overflow-hidden shadow-2xl max-h-[90vh]">
      {/* Header & Tabs */}
      <div className="bg-[#0f172a] border-b border-amber-500/20">
          <div className="flex justify-between items-center p-4">
            <h3 className="font-black text-amber-400 uppercase tracking-widest text-xs flex items-center gap-2">
              <Utensils size={14} /> 
              LOG DIET [{day.substring(0,3)}]
              {stagedItems.length > 0 && <span className="ml-2 bg-amber-500 text-black px-2 py-0.5 rounded text-[10px] animate-pulse">{stagedItems.length} STAGED</span>}
            </h3>
            <button onClick={onCancel} className="text-gray-500 hover:text-white"><X size={18} /></button>
          </div>
          <div className="flex text-[10px] font-bold uppercase tracking-wider">
              <button onClick={() => setQuickAddTab('create')} className={`flex-1 py-2 border-b-2 transition-all ${quickAddTab === 'create' ? 'border-amber-500 text-amber-400 bg-amber-950/30' : 'border-transparent text-gray-500 hover:text-gray-300'}`}>Create New</button>
              <button onClick={() => setQuickAddTab('common')} className={`flex-1 py-2 border-b-2 transition-all ${quickAddTab === 'common' ? 'border-amber-500 text-amber-400 bg-amber-950/30' : 'border-transparent text-gray-500 hover:text-gray-300'}`}>Standard Issue</button>
              <button onClick={() => setQuickAddTab('saved')} className={`flex-1 py-2 border-b-2 transition-all ${quickAddTab === 'saved' ? 'border-amber-500 text-amber-400 bg-amber-950/30' : 'border-transparent text-gray-500 hover:text-gray-300'}`}>Saved Meals</button>
              <button onClick={() => setQuickAddTab('ai')} className={`flex-1 py-2 border-b-2 transition-all flex items-center justify-center gap-1 ${quickAddTab === 'ai' ? 'border-amber-500 text-amber-400 bg-amber-950/30' : 'border-transparent text-gray-500 hover:text-gray-300'}`}><ScanLine size={10} /> AI</button>
          </div>
      </div>
      
      <div className="p-6 space-y-5 flex-1 overflow-y-auto custom-scrollbar">
        {isLoadingData ? (
            <div className="text-center text-amber-500 animate-pulse text-xs py-10">LOADING RATIONS DB...</div>
        ) : (
            <>
                {/* --- TAB 1: CREATE / EDIT FORM --- */}
                <div className={quickAddTab === 'create' ? 'block' : 'hidden'}>
                    <div className="space-y-5">
                        {/* STAGED ITEMS SUMMARY */}
                        {stagedItems.length > 0 && (
                          <div className="space-y-2 border-b border-amber-500/20 pb-4">
                            <label className="text-[9px] font-black text-amber-500/50 uppercase tracking-widest block mb-2">Staged for logging:</label>
                            <div className="flex flex-wrap gap-2">
                              {stagedItems.map((item, i) => (
                                <div key={i} className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/30 px-2 py-1 rounded-md">
                                  <span className="text-[10px] font-bold text-amber-400 uppercase truncate max-w-[80px]">{item.name}</span>
                                  <button onClick={() => unstageItem(i)} className="text-amber-500/50 hover:text-red-400 transition-colors"><X size={10} /></button>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        <div>
                            <label className="text-[10px] font-bold text-gray-500 uppercase mb-1 block">Item Name</label>
                            <div className="flex gap-2">
                                <input value={name} onChange={(e) => setName(e.target.value)} placeholder="E.G. CHICKEN & RICE" className="flex-1 bg-transparent border-b border-amber-500/50 text-white font-bold text-sm py-1 focus:outline-none focus:border-amber-400 uppercase placeholder:text-gray-700" autoFocus />
                                {name && (cals || prot || carbs || fats) && (
                                  <div className="flex gap-1">
                                    <button onClick={handleStageItem} className="text-[9px] uppercase font-bold text-black bg-amber-500 px-2 rounded hover:bg-amber-400 transition-all whitespace-nowrap flex items-center gap-1"><Plus size={10} /> Add Another</button>
                                    <button onClick={handleSaveTemplate} className="text-[9px] uppercase font-bold text-amber-500 border border-amber-500/50 px-2 rounded hover:bg-amber-500 hover:text-black transition-all whitespace-nowrap">Save Blueprint</button>
                                  </div>
                                )}
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div><label className="text-[10px] font-bold text-gray-500 uppercase mb-1 block flex items-center gap-1"><Flame size={10} className="text-amber-500" /> Calories</label><input type="number" value={cals} onChange={e => setCals(e.target.value)} className="w-full bg-[#0f172a] border border-white/10 rounded p-3 text-amber-400 font-mono text-sm focus:border-amber-500 outline-none" placeholder="0" /></div>
                            <div><label className="text-[10px] font-bold text-gray-500 uppercase mb-1 block text-blue-400">Protein (g)</label><input type="number" value={prot} onChange={e => setProt(e.target.value)} className="w-full bg-[#0f172a] border border-white/10 rounded p-3 text-blue-400 font-mono text-sm focus:border-blue-500 outline-none" placeholder="0" /></div>
                            <div><label className="text-[10px] font-bold text-gray-500 uppercase mb-1 block text-green-400">Carbs (g)</label><input type="number" value={carbs} onChange={e => setCarbs(e.target.value)} className="w-full bg-[#0f172a] border border-white/10 rounded p-3 text-green-400 font-mono text-sm focus:border-green-500 outline-none" placeholder="0" /></div>
                            <div><label className="text-[10px] font-bold text-gray-500 uppercase mb-1 block text-yellow-400">Fats (g)</label><input type="number" value={fats} onChange={e => setFats(e.target.value)} className="w-full bg-[#0f172a] border border-white/10 rounded p-3 text-yellow-400 font-mono text-sm focus:border-yellow-500 outline-none" placeholder="0" /></div>
                        </div>
                    </div>
                </div>

                {/* --- TAB 2: COMMON FOODS --- */}
                <div className={quickAddTab === 'common' ? 'block' : 'hidden'}>
                    <FoodList items={commonFoods} type="standard issue items" />
                </div>

                {/* --- TAB 3: SAVED TEMPLATES --- */}
                <div className={quickAddTab === 'saved' ? 'block' : 'hidden'}>
                    <FoodList items={myTemplates} type="blueprints" />
                </div>

                {/* --- TAB 4: AI SCAN --- */}
                <div className={quickAddTab === 'ai' ? 'block' : 'hidden'}>
                    <div className="space-y-5">
                        <p className="text-[10px] text-gray-500 uppercase tracking-wider">
                            Upload a photo of your food. AI will fill name and macros (max 3 scans per day).
                        </p>
                        <div className="flex items-center gap-2 text-[10px] font-mono text-amber-400/80">
                            {scanUsage !== null ? (
                                <span>{scanUsage.used} / {scanUsage.limit} scans left today</span>
                            ) : (
                                <span className="animate-pulse">…</span>
                            )}
                        </div>
                        <input
                            ref={scanInputRef}
                            type="file"
                            accept="image/*"
                            capture="environment"
                            className="hidden"
                            onChange={handleScanFood}
                        />
                        <button
                            type="button"
                            onClick={() => scanInputRef.current?.click()}
                            disabled={isScanning || (scanUsage !== null && scanUsage.used >= scanUsage.limit)}
                            className={`w-full py-6 border-2 border-dashed rounded-xl flex flex-col items-center justify-center gap-2 transition-all text-[10px] font-black uppercase tracking-wider ${isScanning || (scanUsage !== null && scanUsage.used >= scanUsage.limit) ? 'border-amber-900/50 text-gray-600 cursor-not-allowed' : 'border-amber-500/50 text-amber-400 hover:border-amber-500 hover:bg-amber-950/20'}`}
                        >
                            <ScanLine size={24} />
                            {isScanning ? 'SCANNING…' : (scanUsage !== null && scanUsage.used >= scanUsage.limit) ? 'NO SCANS LEFT TODAY' : 'SCAN FOOD WITH AI'}
                        </button>
                        {scanError && (
                            <p className="text-[10px] text-red-400 uppercase">{scanError}</p>
                        )}
                    </div>
                </div>
            </>
        )}
      </div>

      <div className="p-4 flex gap-3 bg-[#0f172a] border-t border-white/5">
        {/* Only show confirm button on the create tab */}
        {quickAddTab === 'create' ? (
             <button 
                onClick={handleSubmit} 
                disabled={!name.trim() && stagedItems.length === 0} 
                className={`flex-1 py-3 bg-amber-600 hover:bg-amber-500 text-black font-black uppercase rounded text-xs transition-all shadow-lg shadow-amber-900/20 ${(!name.trim() && stagedItems.length === 0) ? 'opacity-50 cursor-not-allowed' : ''}`}
             >
                {stagedItems.length > 0 
                  ? `LOG ALL ENTRIES (${stagedItems.length + (name.trim() ? 1 : 0)})` 
                  : 'CONFIRM LOG'}
             </button>
        ) : quickAddTab === 'ai' ? (
             <div className="flex-1 flex items-center justify-center text-xs text-gray-500 font-bold uppercase">Scan above, then confirm in Create New</div>
        ) : (
             <div className="flex-1 flex items-center justify-center text-xs text-gray-500 font-bold uppercase">Select an item to autofill</div>
        )}
        <button onClick={onCancel} className="px-6 py-3 border border-white/10 text-gray-400 font-bold uppercase rounded text-xs hover:bg-white/5">CANCEL</button>
      </div>
    </div>
  );
}

// --- VISUAL: HOLOGRAM PET (Preserved) ---
const HologramPet = () => (
  <div className="relative w-32 h-32 mx-auto mb-6 group cursor-pointer">
    <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-20 h-4 bg-cyan-500/50 blur-xl rounded-[100%]" />
    <div className="relative z-10 w-full h-full flex items-end justify-center animate-float">
      <img src="/pet.png" alt="System Pet" className="w-full h-full object-contain drop-shadow-[0_0_10px_rgba(34,211,238,0.8)] opacity-90" style={{ filter: 'hue-rotate(180deg) brightness(1.2) contrast(1.2)' }} />
      <div className="absolute inset-0 bg-[linear-gradient(to_bottom,transparent_50%,rgba(6,182,212,0.15)_50%)] bg-[length:100%_4px] pointer-events-none" />
      <div className="absolute inset-0 bg-cyan-400/10 mix-blend-overlay animate-pulse" />
    </div>
    <div className="absolute -right-20 -top-4 bg-slate-900/90 border border-cyan-400/60 text-[9px] text-cyan-100 p-3 rounded-xl rounded-bl-none shadow-[0_0_15px_rgba(6,182,212,0.3)] z-20">
      <p className="font-black text-cyan-300 mb-0.5">SYSTEM ALERT</p>
      "A new week begins, Hunter.<br/>Show me your growth."
    </div>
  </div>
);

// --- COMPONENT: WEEKLY FEEDBACK MODAL ---
function WeeklyFeedbackModal({ onConfirm }: { onConfirm: (rating: number) => void }) {
  const [rating, setRating] = useState<number | null>(null);

  const emojis = ['💀', '😫', '😐', '🙂', '🤩'];
  const labels = ['Destruction', 'Struggle', 'Survival', 'Progress', 'Dominance'];

  return (
    <motion.div 
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} 
      className="fixed inset-0 z-[500] bg-black/95 flex items-center justify-center p-6 backdrop-blur-xl"
    >
      <div className="max-w-md w-full relative">
        <HologramPet />
        
        <div className="text-center space-y-6 mt-8">
          <div>
            <h2 className="text-2xl font-black text-cyan-400 uppercase tracking-widest mb-2 font-header">System Check</h2>
            <p className="text-cyan-600 font-mono text-sm">WEEKLY PERFORMANCE REVIEW REQUIRED</p>
          </div>

          <div className="bg-slate-900/50 border border-cyan-500/20 rounded-2xl p-6 backdrop-blur-sm">
            <p className="text-gray-400 text-xs uppercase tracking-wider font-bold mb-6">How was your training this week?</p>
            
            <div className="flex justify-between gap-2">
              {emojis.map((emoji, idx) => (
                <button 
                  key={idx}
                  onClick={() => setRating(idx + 1)}
                  className={`flex flex-col items-center gap-2 group transition-all duration-300 ${rating === idx + 1 ? 'scale-110' : 'opacity-60 hover:opacity-100 hover:scale-105'}`}
                >
                  <div className={`text-3xl md:text-4xl transition-transform ${rating === idx + 1 ? 'animate-bounce' : ''}`}>
                    {emoji}
                  </div>
                  <div className={`text-[8px] font-bold uppercase tracking-widest ${rating === idx + 1 ? 'text-cyan-400' : 'text-gray-600 group-hover:text-gray-400'}`}>
                    {labels[idx]}
                  </div>
                </button>
              ))}
            </div>
          </div>

          <button 
            disabled={!rating}
            onClick={() => rating && onConfirm(rating)}
            className={`w-full py-4 rounded-xl font-black uppercase tracking-[0.2em] transition-all ${
              rating 
                ? 'bg-cyan-600 text-white shadow-[0_0_30px_rgba(8,145,178,0.4)] hover:bg-cyan-500 hover:scale-[1.02]' 
                : 'bg-slate-800 text-gray-600 cursor-not-allowed'
            }`}
          >
            {rating ? 'Submit & Initialize New Week' : 'Select Rating'}
          </button>
        </div>
      </div>
    </motion.div>
  );
}

// --- COMPONENT: EXERCISE ITEM (Preserved Original Look) ---
const ExerciseItem = React.memo(({ exercise, onTerminate, onEdit, onToggleComplete, onUpdateSet, onRemoveSet, onDuplicateSet, isToday }: any) => {
  const isCardio = exercise.category !== 'Strength';

  const toggleSetComplete = (setIdx: number) => {
    if (!isToday) return;
    const updatedSets = [...(exercise.sets_data || [])];
    if (updatedSets[setIdx]) {
      updatedSets[setIdx] = { ...updatedSets[setIdx], completed: !updatedSets[setIdx].completed };
      
      // Check if all sets are now completed
      const allCompleted = updatedSets.every((s: any) => s.completed);
      
      // Update the exercise in DB via onUpdateSet (using a special field name 'sets_data' to update the whole array)
      onUpdateSet(exercise.id, -1, 'sets_data', updatedSets);
      
      // If all completed and it wasn't completed before, trigger the main completion
      if (allCompleted && !exercise.is_completed) {
        onToggleComplete(exercise.id, false, exercise.category);
      } else if (!allCompleted && exercise.is_completed) {
        // If not all completed but exercise was marked as completed, unmark it
        onToggleComplete(exercise.id, true, exercise.category);
      }
    }
  };

  return (
    <div className={`border rounded-lg p-3 md:p-4 transition-all ${exercise.is_completed ? 'border-green-500/40 bg-green-900/40' : 'border-white/10 bg-slate-900/60'}`}>
      <div className="flex justify-between items-start mb-3">
        <span className={`text-sm md:text-base font-bold uppercase tracking-wider ${exercise.is_completed ? 'text-green-400 line-through' : 'text-white'}`}>
          {exercise.exercise_name}
        </span>
        <div className="flex gap-2">
          <button onClick={() => onTerminate(exercise.id)} className="w-7 h-7 rounded border border-slate-600 bg-slate-700/50 text-gray-400 hover:text-red-400 flex items-center justify-center"><Trash2 size={14} /></button>
          <button onClick={() => onEdit(exercise)} className="w-7 h-7 rounded border border-slate-600 bg-slate-700/50 text-gray-400 hover:text-cyan-400 flex items-center justify-center"><Pencil size={14} /></button>
          <button 
            onClick={() => !exercise.is_completed && isToday && onToggleComplete(exercise.id, exercise.is_completed, exercise.category)} 
            disabled={exercise.is_completed || !isToday}
            className={`w-7 h-7 rounded border flex items-center justify-center transition-all ${exercise.is_completed ? 'bg-green-600 border-green-500 text-white cursor-not-allowed' : (isToday ? 'border-slate-600 bg-slate-700/50 text-gray-400 hover:border-cyan-500/50' : 'border-slate-800 bg-slate-900/20 text-gray-700 cursor-not-allowed')}`}
          >
            <Check size={14} />
          </button>
        </div>
      </div>

      {isCardio ? (
        <div className="grid grid-cols-2 gap-4">
          <div><label className="text-[9px] md:text-[10px] text-gray-500 font-bold uppercase tracking-wider block mb-1">KM</label><input type="number" className="w-full bg-slate-900/60 border-b-2 border-cyan-500/30 focus:border-cyan-500 text-cyan-300 text-sm md:text-base font-mono py-1.5 px-2 outline-none" defaultValue={exercise.sets_data?.[0]?.km} onBlur={(e) => onUpdateSet(exercise.id, 0, 'km', e.target.value)} /></div>
          <div><label className="text-[9px] md:text-[10px] text-gray-500 font-bold uppercase tracking-wider block mb-1">MINS</label><input type="number" className="w-full bg-slate-900/60 border-b-2 border-cyan-500/30 focus:border-cyan-500 text-cyan-300 text-sm md:text-base font-mono py-1.5 px-2 outline-none" defaultValue={exercise.sets_data?.[0]?.mins} onBlur={(e) => onUpdateSet(exercise.id, 0, 'mins', e.target.value)} /></div>
        </div>
      ) : (
        <div className="space-y-3">
          {exercise.sets_data?.map((set: any, i: number) => (
            <div key={i} className="flex items-center gap-3">
              <button 
                onClick={() => toggleSetComplete(i)}
                disabled={!isToday}
                className={`w-6 h-6 rounded-full border flex items-center justify-center transition-all flex-shrink-0 ${set.completed ? 'bg-green-600 border-green-500 text-white' : (isToday ? 'border-slate-600 bg-slate-700/50 text-gray-500' : 'border-slate-800 bg-slate-900/20 text-gray-800 cursor-not-allowed')}`}
              >
                <Check size={10} />
              </button>
              <div className="text-[10px] md:text-xs font-bold text-gray-400 uppercase tracking-wider w-4 text-center">{i + 1}</div>
              <div className="flex-1 grid grid-cols-2 gap-3">
                <div><label className="text-[9px] md:text-[10px] text-gray-500 font-bold uppercase tracking-wider block mb-1">LBS/KG</label><input type="number" className={`w-full bg-black/20 border-b border-white/10 focus:border-cyan-400 text-sm md:text-base font-mono py-1.5 px-2 outline-none transition-colors ${set.completed ? 'text-gray-500 border-green-900/30' : 'text-cyan-100'}`} defaultValue={set.weight} onBlur={(e) => onUpdateSet(exercise.id, i, 'weight', e.target.value)} /></div>
                <div><label className="text-[9px] md:text-[10px] text-gray-500 font-bold uppercase tracking-wider block mb-1">REPS</label><input type="number" className={`w-full bg-black/20 border-b border-white/10 focus:border-cyan-400 text-sm md:text-base font-mono py-1.5 px-2 outline-none transition-colors ${set.completed ? 'text-gray-500 border-green-900/30' : 'text-cyan-100'}`} defaultValue={set.reps} onBlur={(e) => onUpdateSet(exercise.id, i, 'reps', e.target.value)} /></div>
              </div>
              <div className="flex gap-1">
                <button onClick={() => onDuplicateSet(exercise.id, i)} className="w-6 h-6 rounded border border-slate-600 bg-slate-700/50 text-gray-400 hover:text-cyan-400 flex items-center justify-center" title="Duplicate Set"><Copy size={12} /></button>
                {exercise.sets_data.length > 1 && <button onClick={() => onRemoveSet(exercise.id, i)} className="w-6 h-6 rounded border border-red-500/30 bg-red-900/20 text-red-400 flex items-center justify-center"><Trash2 size={12} /></button>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
});
ExerciseItem.displayName = 'ExerciseItem';

// --- MAIN MODAL ---
export default function TrainingLogModal({ isOpen, onClose, user, trainingProtocol, nutritionLogs, onUpdate, onNutritionUpdate, showNotification, setUser, handleClaimReward, initialTab = 'training' }: any) {
  const [selectedJournalDay, setSelectedJournalDay] = useState<string>('Monday');
  const [activeTab, setActiveTab] = useState<'training' | 'nutrition'>(initialTab);
  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);
  const [localProtocol, setLocalProtocol] = useState<any[]>(trainingProtocol || []);
  const [rewardedPathsToday, setRewardedPathsToday] = useState<Set<string>>(new Set());
  const [localNutritionLogs, setLocalNutritionLogs] = useState<any[]>(nutritionLogs || []);
  const [isFoodModalOpen, setIsFoodModalOpen] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [isCalculatorOpen, setIsCalculatorOpen] = useState(false);
  const [userTargets, setUserTargets] = useState<any>(null);

  const todayName = useMemo(() => {
    return ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][new Date().getDay()];
  }, []);

  const isTodaySelected = useMemo(() => {
    return selectedJournalDay === todayName;
  }, [selectedJournalDay, todayName]);


  const handleWeeklyReset = async (rating: number) => {
    try {
        await fetch('/api/training/reset', {
            method: 'POST',
            body: JSON.stringify({ userId: user.id, rating })
        });
        setShowFeedbackModal(false);
        if (setUser) {
             setUser((prev: any) => ({ ...prev, last_reset: new Date().toISOString() }));
        }
        if (onUpdate) onUpdate();
        if (onNutritionUpdate) onNutritionUpdate();
        showNotification("SYSTEM RESET COMPLETE. NEW WEEK INITIALIZED.", "success");
    } catch (e) {
        console.error(e);
        showNotification("RESET FAILED", "error");
    }
  };

  useEffect(() => {
    if (!isOpen || !user?.id) return;
    
    const checkReset = () => {
        const lastReset = user.last_reset ? new Date(user.last_reset) : new Date(0); 
        const now = new Date();
        
        // Calculate start of current week (Monday)
        const day = now.getDay() || 7; // 1=Mon, 7=Sun
        const thisMonday = new Date(now);
        thisMonday.setHours(0, 0, 0, 0);
        thisMonday.setDate(now.getDate() - day + 1);
        
        if (lastReset < thisMonday) {
            setShowFeedbackModal(true);
        }
    };
    
    checkReset();
  }, [isOpen, user?.id, user?.last_reset]);

  // --- NEW: DAY COMPLETION LOGIC ---
  const getDayCompletionStatus = useCallback((dayName: string) => {
    if (activeTab === 'training') {
        // Use localProtocol which now contains the full week
        const dayExercises = localProtocol.filter((ex: any) => ex.day_of_week === dayName);
        
        const categoryMap = new Map<string, boolean>();
        dayExercises.forEach((ex: any) => {
          const category = ex.category || ex.activity_type;
          if (!categoryMap.has(category)) categoryMap.set(category, false);
          if (ex.is_completed) categoryMap.set(category, true);
        });
        const completedCategories = Array.from(categoryMap.values()).filter(c => c).length;
        return { isCompleted: completedCategories >= 1 };
    } else {
        // Nutrition completion: Check if at least 3 logs exist for that day in localNutritionLogs
        const dayLogs = localNutritionLogs.filter((log: any) => log.day_of_week === dayName);
        return { isCompleted: dayLogs.length >= 3 };
    }
  }, [localProtocol, localNutritionLogs, activeTab]);

  // Timer State
  const [restTimer, setRestTimer] = useState(0);
  const [isRestTimerActive, setIsRestTimerActive] = useState(false);
  const timerInterval = useRef<NodeJS.Timeout | null>(null);

  // Modal State
  const [isDeployModalOpen, setIsDeployModalOpen] = useState(false);
  const [deployPathName, setDeployPathName] = useState<string | null>(null);
  const [editingMissionId, setEditingMissionId] = useState<string | null>(null);
  const [deployFormData, setDeployFormData] = useState<{ name: string; sets: any[] }>({ name: '', sets: [] });
  const [isInitializingCategory, setIsInitializingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [firstExerciseName, setFirstExerciseName] = useState('');

  // Sync state with props
  useEffect(() => { 
    setLocalProtocol(trainingProtocol || []); 
  }, [trainingProtocol]);

  useEffect(() => {
    setLocalNutritionLogs(nutritionLogs || []);
  }, [nutritionLogs]);

  const fetchRewardedPaths = useCallback(async () => {
    if (!user?.id) return;
    const today = new Date().toISOString().split('T')[0];
    const { data, error } = await supabase
      .from('activities')
      .select('type')
      .eq('hunter_id', user.id)
      .eq('name', 'Training Reward')
      .gte('created_at', today);

    if (error) {
      console.error('Error fetching rewarded paths:', error);
      return;
    }

    const rewarded = new Set(data.map(r => r.type));
    setRewardedPathsToday(rewarded);
  }, [user?.id]);

  const fetchUserTargets = useCallback(async () => {
    if (!user?.id) return;
    const { data: profile } = await supabase.from('profiles').select('target_calories, target_protein, target_carbs, target_fats').eq('id', user.id).single();
    if (profile) setUserTargets(profile);
  }, [user?.id]);

  useEffect(() => { 
    if (isOpen) { 
      const d = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][new Date().getDay()]; 
      setSelectedJournalDay(d); 
      fetchRewardedPaths();
      fetchUserTargets();
    } 
  }, [isOpen, fetchRewardedPaths, fetchUserTargets]);

  // --- ACTIONS ---

  const handleSaveFood = async (foodData: any) => {
    if (!user?.id) {
      showNotification("Error: Not authenticated", "error");
      return;
    }

    try {
      // If foodData is an array, combine into a single entry
      let finalPayload: any;
      
      if (Array.isArray(foodData)) {
        if (foodData.length === 0) return;
        
        const combinedName = foodData.map(item => (item.name || '').toUpperCase()).join(', ');
        const totalCals = foodData.reduce((sum, item) => sum + (parseInt(item.cals || item.calories) || 0), 0);
        const totalProt = foodData.reduce((sum, item) => sum + (parseInt(item.prot || item.protein) || 0), 0);
        const totalCarbs = foodData.reduce((sum, item) => sum + (parseInt(item.carbs || item.carbs) || 0), 0);
        const totalFats = foodData.reduce((sum, item) => sum + (parseInt(item.fats || item.fats) || 0), 0);
        
        finalPayload = {
          hunter_id: user.id,
          day_of_week: selectedJournalDay,
          name: combinedName,
          calories: totalCals,
          protein: totalProt,
          carbs: totalCarbs,
          fats: totalFats
        };
      } else {
        finalPayload = {
          hunter_id: user.id,
          day_of_week: selectedJournalDay,
          name: (foodData.name || '').toUpperCase(),
          calories: parseInt(foodData.cals) || 0,
          protein: parseInt(foodData.prot) || 0,
          carbs: parseInt(foodData.carbs) || 0,
          fats: parseInt(foodData.fats) || 0
        };
      }

      console.log('Logging nutrition via API:', finalPayload);

      const response = await fetch('/api/nutrition', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(finalPayload)
      });

      const result = await response.json();

      if (!result.success) {
        console.error('Failed to save food:', result.error);
        showNotification(result.error || "Failed to log nutrition", "error");
        return;
      }

      showNotification("NUTRITION LOGGED", "success");
      setIsFoodModalOpen(false);
      
      // Check for 3/3 meals reward
      const today = new Date();
      const todayISO = today.toISOString().split('T')[0];
      
      // Calculate new total for today after insertion
      const todayLogs = localNutritionLogs.filter(log => log.day_of_week === todayName);
      const newTotal = todayLogs.length + 1;
      
      if (isTodaySelected && newTotal >= 3 && user?.last_nutrition_reward_at !== todayISO) {
        console.log('3/3 Meals detected! Triggering reward...');
        if (handleClaimReward) {
          await handleClaimReward('special', 'small');
          
          // Update the user's last_nutrition_reward_at to prevent multiple claims
          const updateRes = await fetch('/api/user', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: user.id, last_nutrition_reward_at: todayISO })
          });
          
          const updateData = await updateRes.json();
          if (updateData.success && setUser) {
            setUser({ ...user, last_nutrition_reward_at: todayISO });
          }
        }
      }

      if (onNutritionUpdate) onNutritionUpdate();
    } catch (err: any) { 
      console.error('Exception in handleSaveFood:', err);
      showNotification(err.message || "An unexpected error occurred", "error");
    }
  };

  const deleteFood = async (id: string) => {
    try {
      const response = await fetch(`/api/nutrition?id=${id}`, {
        method: 'DELETE'
      });
      const result = await response.json();
      
      if (result.success) {
        if (onNutritionUpdate) onNutritionUpdate();
        showNotification("ENTRY DELETED", "success");
      } else {
        showNotification(result.error || "Failed to delete entry", "error");
      }
    } catch (err) {
      console.error('Error deleting food:', err);
      showNotification("An unexpected error occurred", "error");
    }
  };

  const nutritionTotals = useMemo(() => {
    const dayLogs = localNutritionLogs.filter(log => log.day_of_week === selectedJournalDay);
    return dayLogs.reduce((acc, curr) => ({
      cals: acc.cals + (curr.calories || 0),
      prot: acc.prot + (curr.protein || 0),
      carbs: acc.carbs + (curr.carbs || 0),
      fats: acc.fats + (curr.fats || 0)
    }), { cals: 0, prot: 0, carbs: 0, fats: 0 });
  }, [localNutritionLogs, selectedJournalDay]);

  const handleSaveMissionFromModal = async (name: string, sets: any[]) => {
    if (!name.trim()) return showNotification("MISSION NAME REQUIRED", "error");
    if (!deployPathName) return;

    try {
      let result;
      const payload = {
          hunter_id: user?.id, day_of_week: selectedJournalDay, activity_type: deployPathName,
          category: deployPathName, exercise_name: name.toUpperCase(), sets_data: sets, is_completed: false
      };

      if (editingMissionId) {
        const response = await fetch('/api/training/protocol', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: editingMissionId, exercise_name: name.toUpperCase(), sets_data: sets })
        });
        result = await response.json();
      } else {
        const response = await fetch('/api/training/protocol', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        result = await response.json();
      }

      if (result.success) {
        showNotification(editingMissionId ? `MISSION UPDATED` : `MISSION ARCHIVED`, "success");
        setIsDeployModalOpen(false); setDeployPathName(null); setEditingMissionId(null); 
        if (onUpdate) onUpdate();
      } else {
        showNotification(result.error || "Failed to save mission", "error");
      }
    } catch (err) { console.error(err); }
  };

  const handleOpenDeployModal = (pathName: string) => {
    setDeployPathName(pathName);
    setDeployFormData({ name: '', sets: pathName === 'Strength' ? [{ weight: '', reps: '' }] : [{ km: '', mins: '' }] });
    setEditingMissionId(null); setIsDeployModalOpen(true);
  };

  const handleEditExercise = (exercise: any) => {
    setDeployPathName(exercise.category || exercise.activity_type);
    setDeployFormData({ name: exercise.exercise_name, sets: exercise.sets_data || [] });
    setEditingMissionId(exercise.id); setIsDeployModalOpen(true);
  };

  // --- TOGGLE COMPLETE (FIXED REWARDS: DIRECT DB UPDATE) ---
  const handleToggleComplete = async (missionId: string, currentStatus: boolean, category: string) => {
    const today = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][new Date().getDay()];
    if (selectedJournalDay !== today) {
      showNotification("Can only complete missions on the current day.", "error");
      return;
    }
    
    const newStatus = !currentStatus;

    // 1. Update the mission status in training_protocol via API
    try {
      const response = await fetch('/api/training/protocol', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: missionId, is_completed: newStatus })
      });
      const result = await response.json();

      if (!result.success) {
        console.error('Failed to sync mission status:', result.error);
        showNotification('Sync Failed: Check connection', 'error');
        return;
      }
    } catch (err) {
      console.error('Error syncing mission status:', err);
      showNotification('Sync Failed: Check connection', 'error');
      return;
    }

    // Update local state immediately for responsiveness
    setLocalProtocol(prev => prev.map(ex =>
      ex.id === missionId ? { ...ex, is_completed: newStatus } : ex
    ));

    // Only process rewards if the mission was just checked (newStatus === true)
    if (!newStatus) return;

    new Audio('/sounds/complete.mp3').play().catch(() => {});

    // 2. Check if this path has already been rewarded today
    if (rewardedPathsToday.has(category)) {
      showNotification("Objective complete.", "success");
      return;
    }

    // 3. Determine if a reward should be triggered
    let rewardXp = 0;
    let rewardCoins = 0;
    let shouldReward = false;
    let notificationMessage = '';

    if (category === 'Strength') {
        const strengthExercises = localProtocol.filter(ex => ex.category === 'Strength' && ex.day_of_week === today);
        // Note: we just toggled one, so we check the state we just updated locally
        const completedCount = strengthExercises.filter(ex => ex.id === missionId ? newStatus : ex.is_completed).length;

        if (completedCount === 5) {
          rewardXp = REWARD_CONSTANTS.STRENGTH.xp;
          rewardCoins = REWARD_CONSTANTS.STRENGTH.coins;
          const rewardGems = REWARD_CONSTANTS.STRENGTH.gems;
          shouldReward = true;
          notificationMessage = `STRENGTH PATH COMPLETE! +${rewardXp} XP / +${rewardCoins} COINS`;
          
          // Trigger the reward claim (async)
          claimReward(category, rewardXp, rewardCoins, rewardGems, notificationMessage);
        } else {
          showNotification(`Strength mission ${completedCount}/5 completed.`, 'success');
        }
    } else {
      // Standard path reward (first mission completed in that category)
      rewardXp = REWARD_CONSTANTS.STANDARD.xp;
      rewardCoins = REWARD_CONSTANTS.STANDARD.coins;
      const rewardGems = REWARD_CONSTANTS.STANDARD.gems;
      shouldReward = true;
      notificationMessage = `Objective Complete: +${rewardXp} XP | +${rewardCoins} Coins`;
      
      claimReward(category, rewardXp, rewardCoins, rewardGems, notificationMessage);
    }
  };

  const claimReward = async (category: string, rewardXp: number, rewardCoins: number, rewardGems: number, notificationMessage: string) => {
    try {
      const response = await fetch('/api/training/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          pathName: category,
          xp: rewardXp,
          coins: rewardCoins,
          gems: rewardGems,
          isQuestCompletion: true // Any path completion counts for the daily streak
        })
      });

      const result = await response.json();

      if (response.ok) {
        showNotification(notificationMessage, 'success');
        // Update global user state with new values from server
        setUser({
          ...user,
          exp: result.newExp,
          coins: result.newCoins,
          gems: result.newGems,
          daily_completions: 1
        });
        // Track that this path is now rewarded
        setRewardedPathsToday(prev => new Set([...prev, category]));
      } else {
        // If already rewarded or limit reached, handle gracefully
        if (result.error && result.error.includes('already claimed')) {
          showNotification("Objective complete.", "success");
        } else {
          showNotification(result.error || "Failed to sync rewards", "error");
        }
      }
    } catch (err) {
      console.error('Reward claim failed:', err);
      showNotification("Reward sync failed", "error");
    }
  };

  const handleTerminateObjective = async (id: string) => { 
    try {
      const response = await fetch(`/api/training/protocol?id=${id}`, { method: 'DELETE' });
      const result = await response.json();
      if (result.success) {
        if (onUpdate) onUpdate();
        showNotification("Terminated", "success");
      } else {
        showNotification(result.error || "Failed to terminate", "error");
      }
    } catch (err) {
      console.error('Error terminating objective:', err);
    }
  };

  const handleUpdateSet = async (id: string, idx: number, field: string, val: any) => {
     setLocalProtocol(prev => prev.map(ex => {
        if(ex.id !== id) return ex;
        const s = [...(ex.sets_data||[])];
        if (field === 'sets_data') {
          return { ...ex, sets_data: val };
        }
        if(s[idx]) s[idx] = {...s[idx], [field]: field === 'completed' ? val : (parseFloat(val) || 0)};
        return {...ex, sets_data: s};
     }));
     const ex = localProtocol.find(e => e.id === id);
     if(ex) { 
        let s = [...(ex.sets_data||[])]; 
        if (field === 'sets_data') {
          s = val;
        } else if(s[idx]) {
          s[idx] = {...s[idx], [field]: field === 'completed' ? val : (parseFloat(val) || 0)};
        }
        await fetch('/api/training/protocol', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id, sets_data: s })
        });
     }
  };

  const handleDuplicateSet = async (id: string, idx: number) => {
    const ex = localProtocol.find(e => e.id === id);
    if (!ex) return;
    const setToDuplicate = ex.sets_data[idx];
    const newSets = [...(ex.sets_data || [])];
    newSets.splice(idx + 1, 0, { ...setToDuplicate, completed: false }); // New set is not completed
    setLocalProtocol(prev => prev.map(e => e.id === id ? { ...e, sets_data: newSets } : e));
    await fetch('/api/training/protocol', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, sets_data: newSets })
    });
  };
  const handleRemoveSet = async (id: string, idx: number) => {
     const ex = localProtocol.find(e => e.id === id); if(!ex) return;
     const s = ex.sets_data.filter((_:any, i:number) => i !== idx);
     setLocalProtocol(prev => prev.map(e => e.id === id ? {...e, sets_data: s} : e));
     await fetch('/api/training/protocol', {
       method: 'PATCH',
       headers: { 'Content-Type': 'application/json' },
       body: JSON.stringify({ id, sets_data: s })
     });
  };
  const handleAddSet = async (id: string) => {
     const ex = localProtocol.find(e => e.id === id); if(!ex) return;
     const newSet = ex.category === 'Strength' ? {weight:'', reps:''} : {km:0, mins:0};
     const s = [...(ex.sets_data||[]), newSet];
     setLocalProtocol(prev => prev.map(e => e.id === id ? {...e, sets_data: s} : e));
     await fetch('/api/training/protocol', {
       method: 'PATCH',
       headers: { 'Content-Type': 'application/json' },
       body: JSON.stringify({ id, sets_data: s })
     });
  };

  const handleCreateCategory = async () => {
    if (!newCategoryName.trim() || !firstExerciseName.trim()) return showNotification("FIELDS REQUIRED", "error");
    const payload = {
        hunter_id: user?.id, day_of_week: selectedJournalDay, activity_type: newCategoryName.toUpperCase(),
        category: newCategoryName.toUpperCase(), exercise_name: firstExerciseName.toUpperCase(),
        sets_data: [{ weight: '', reps: '' }], is_completed: false
    };
    try {
      const response = await fetch('/api/training/protocol', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const result = await response.json();
      if (result.success) {
        setIsInitializingCategory(false); setNewCategoryName(''); setFirstExerciseName(''); 
        if (onUpdate) onUpdate();
        showNotification("PATH INITIALIZED", "success");
      } else {
        showNotification(result.error || "Failed to initialize path", "error");
      }
    } catch (err) {
      console.error('Error creating category:', err);
    }
  };

  const currentDayNutritionLogs = useMemo(() => {
    return localNutritionLogs.filter(log => log.day_of_week === selectedJournalDay);
  }, [localNutritionLogs, selectedJournalDay]);

  // Sectors Logic
  const sectorsInDatabase = useMemo(() => {
    const baseSectors = ['Strength'];
    if (!localProtocol) return baseSectors;
    
    const dynamicSectors = Array.from(new Set(
      localProtocol
        .filter(ex => ex.day_of_week === selectedJournalDay && !['System', 'Recovery', 'Strength'].includes(ex.activity_type))
        .map(ex => ex.category || ex.activity_type)
    )).sort();
    
    return [...baseSectors, ...dynamicSectors];
  }, [localProtocol, selectedJournalDay]);

  const dayExercisesBySector = useMemo(() => {
     const grouped: Record<string, any[]> = {};
     sectorsInDatabase.forEach(sector => {
        grouped[sector] = (localProtocol || []).filter(ex => ex.day_of_week === selectedJournalDay && (ex.category === sector || ex.activity_type === sector));
     });
     return grouped;
  }, [localProtocol, selectedJournalDay, sectorsInDatabase]);

  // Timer
  useEffect(() => {
    if (isRestTimerActive && restTimer > 0) {
      const i = setInterval(() => setRestTimer(p => p <= 1 ? (setIsRestTimerActive(false), 0) : p - 1), 1000);
      return () => clearInterval(i);
    }
  }, [isRestTimerActive, restTimer]);
  const startRestTimer = (s: number) => { setRestTimer(s); setIsRestTimerActive(true); };
  const stopRestTimer = () => { setIsRestTimerActive(false); setRestTimer(0); };
  const formatTime = (s: number) => `${Math.floor(s/60)}:${(s%60).toString().padStart(2,'0')}`;
  const timerProgress = isRestTimerActive ? (restTimer/300)*100 : 0;

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[300] bg-slate-900/98 backdrop-blur-md flex flex-col overflow-hidden">

        {/* HEADER */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-[#121214]/95">
          <div className="max-w-3xl mx-auto">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h2 className="aura-card-gradient aura-glow-border rounded-xl px-6 py-3 text-xs font-header font-black uppercase tracking-[0.3em] mb-3 text-cyan-400 flex items-center gap-2 justify-center">
                  <img src="/journal.png" alt="Journal" className="w-7 h-7" /> HUNTER'S TRAINING LOG
                </h2>
                <p className="text-[10px] md:text-xs text-gray-500 uppercase tracking-widest mt-1 px-1">Select objective to update System Archive</p>
              </div>
              <button onClick={onClose} className="w-10 h-10 md:w-12 md:h-12 rounded-xl aura-card-gradient aura-glow-border text-cyan-400 hover:text-white flex items-center justify-center transition-all hover:scale-105"><X size={20} /></button>
            </div>

            {/* DAYS GRID */}
            <div className="grid grid-cols-7 gap-1.5 mb-8 p-2 aura-card-gradient aura-glow-border rounded-xl">
              {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map((day) => {
                const status = getDayCompletionStatus(day);
                return (
                  <button key={day} onClick={() => setSelectedJournalDay(day)} className={`py-2.5 md:py-3 rounded-md text-[10px] md:text-xs font-bold uppercase transition-all relative flex flex-col items-center justify-center gap-0.5 ${selectedJournalDay === day ? (activeTab === 'training' ? 'bg-cyan-600/80 text-white shadow-lg shadow-cyan-500/20 backdrop-blur-sm border border-cyan-400/30' : 'bg-amber-600/80 text-white shadow-lg shadow-amber-500/20 backdrop-blur-sm border border-amber-400/30') : 'bg-slate-800/40 text-gray-400 hover:bg-slate-700/60'}`}>
                    <span>{day.slice(0, 3)}</span>
                    {status.isCompleted && (
                      <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className={`absolute -top-1 -right-1 rounded-full p-0.5 shadow-lg border ${activeTab === 'training' ? 'bg-green-500 shadow-green-500/40 border-green-400' : 'bg-amber-500 shadow-amber-500/40 border-amber-400'}`}>
                        <Check size={8} className="text-white" strokeWidth={4} />
                      </motion.div>
                    )}
                  </button>
                );
              })}
            </div>

            {/* NEW TAB SWITCHER */}
            <div className="flex border-t border-white/5 relative font-header mb-6">
                <button onClick={() => setActiveTab('training')} className={`flex-1 py-3 text-xs font-black uppercase tracking-[0.15em] transition-all relative ${activeTab === 'training' ? 'text-cyan-400 bg-cyan-950/30' : 'text-gray-600 hover:text-gray-400'}`}>
                    [ TRAINING ]
                    {activeTab === 'training' && <motion.div layoutId="tab-indicator" className="absolute bottom-0 left-0 right-0 h-0.5 bg-cyan-500 shadow-[0_0_10px_rgba(6,182,212,0.7)]" />}
                </button>
                <button onClick={() => setActiveTab('nutrition')} className={`flex-1 py-3 text-xs font-black uppercase tracking-[0.15em] transition-all relative ${activeTab === 'nutrition' ? 'text-amber-400 bg-amber-950/30' : 'text-gray-600 hover:text-gray-400'}`}>
                    [ DIET LOG ]
                    {activeTab === 'nutrition' && <motion.div layoutId="tab-indicator" className="absolute bottom-0 left-0 right-0 h-0.5 bg-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.7)]" />}
                </button>
            </div>

            {/* CONTENT */}
            <div className="space-y-6">
              {activeTab === 'training' && (
                <>
                {sectorsInDatabase.map(pathName => {
                  const exercises = dayExercisesBySector[pathName] || [];
                  const isStrength = pathName === 'Strength';
                  const headerColor = isStrength ? 'text-green-500' : 'text-cyan-500';
                  const dotColor = isStrength ? 'bg-green-500' : 'bg-cyan-500';

                  return (
                    <div key={pathName} className="animate-in fade-in slide-in-from-bottom-2">
                      <div className="flex justify-between items-center mb-3">
                        <h3 className="text-xs md:text-sm font-black uppercase tracking-wider flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${dotColor}`} />
                          <span className={headerColor}>{pathName} PATH OBJECTIVES</span>
                          {isStrength && (
                            <span className="text-xs font-mono text-gray-500">
                              ({(exercises || []).filter(e => e.is_completed).length}/5)
                            </span>
                          )}
                        </h3>
                      </div>

                      {exercises.length === 0 ? (
                          <div className="border border-cyan-500/20 bg-slate-900/60 backdrop-blur-md rounded-lg p-6 text-center">
                              <p className="text-xs text-gray-500 uppercase italic">No missions deployed to this sector</p>
                          </div>
                      ) : (
                          <div className="space-y-2">
                              {exercises.map((exercise) => (
                <ExerciseItem 
                    key={exercise.id} exercise={exercise} user={user} 
                    selectedJournalDay={selectedJournalDay} pathName={pathName} isCardio={!isStrength}
                    onTerminate={handleTerminateObjective} onEdit={handleEditExercise} 
                    onToggleComplete={handleToggleComplete} onUpdateSet={handleUpdateSet} 
                    onRemoveSet={handleRemoveSet} onDuplicateSet={handleDuplicateSet}
                    isToday={isTodaySelected}
                />
                              ))}
                              {/* ADD SET BUTTON */}
                              {exercises.length > 0 && (
                                  <div className="text-right">
                                      <button onClick={() => handleAddSet(exercises[exercises.length-1].id)} className="text-[10px] text-gray-500 hover:text-cyan-400 uppercase font-bold">+ Add Set to Last Exercise</button>
                                  </div>
                              )}
                          </div>
                      )}

                      <button onClick={() => handleOpenDeployModal(pathName)} className="w-full py-3 mt-3 aura-card-gradient aura-glow-border rounded-xl text-xs font-bold text-cyan-400 uppercase hover:text-white transition-all flex items-center justify-center gap-2">
                          <Plus size={14} /> DEPLOY MISSION TO {pathName}
                      </button>
                    </div>
                  );
                })}

                {/* NEW CATEGORY BUTTON */}
                {!isInitializingCategory ? (
                    <button onClick={() => setIsInitializingCategory(true)} className="w-full py-4 mt-8 aura-card-gradient aura-glow-border rounded-xl text-xs font-black uppercase text-cyan-400 hover:text-white transition-all flex items-center justify-center gap-2 group">
                        <div className="w-6 h-6 rounded-full bg-cyan-500/20 flex items-center justify-center group-hover:bg-cyan-500 group-hover:text-black transition-colors"><Plus size={14} /></div>
                        Initialize New Training Category
                    </button>
                ) : (
                    <div className="mt-4 p-4 border border-cyan-500/30 rounded-xl bg-black/40">
                        <input autoFocus placeholder="PATH NAME (E.G. BOXING)" className="w-full bg-transparent border-b border-cyan-500 text-white p-2 mb-2 outline-none" value={newCategoryName} onChange={e => setNewCategoryName(e.target.value)} />
                        <input placeholder="FIRST MISSION NAME" className="w-full bg-transparent border-b border-cyan-500 text-white p-2 mb-4 outline-none" value={firstExerciseName} onChange={e => setFirstExerciseName(e.target.value)} />
                        <div className="flex gap-2">
                            <button onClick={handleCreateCategory} className="flex-1 bg-cyan-600 text-white py-2 rounded uppercase font-bold text-xs">Confirm</button>
                            <button onClick={() => setIsInitializingCategory(false)} className="flex-1 bg-slate-700 text-gray-300 py-2 rounded uppercase font-bold text-xs">Cancel</button>
                        </div>
                    </div>
                )}
                </>
              )}

              {/* --- NUTRITION TAB CONTENT --- */}
              {activeTab === 'nutrition' && (
                  <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                      
                      {/* HEADER WITH CALIBRATE BUTTON */}
                      <div className="flex flex-col items-center gap-3 mb-6">
                        <button 
                            onClick={() => setIsCalculatorOpen(true)}
                            className="text-[10px] font-bold uppercase tracking-widest text-cyan-400 border border-cyan-500/30 px-3 py-1 rounded-lg hover:bg-cyan-950/50 flex items-center gap-2 transition-all animate-pulsate"
                        >
                            <Activity size={12} /> Calibrate Targets
                        </button>
                      </div>

                      {/* MACRO DASHBOARD */}
                      <div className="grid grid-cols-[1.2fr_1fr] gap-4 mb-8">
                          {/* Calories Circle */}
                          <div className="aspect-square bg-[#0f172a] border-2 border-amber-500/30 rounded-full p-2 flex flex-col items-center justify-center relative shadow-[0_0_30px_rgba(245,158,11,0.1)] group">
                              <div className="absolute inset-2 rounded-full border-2 border-dashed border-amber-500/20 animate-[spin_20s_linear_infinite] opacity-50"></div>
                              <Flame size={24} className="text-amber-500 mb-1" />
                              <div className="text-4xl font-black text-amber-400 font-mono leading-none">{nutritionTotals.cals}</div>
                              <div className="text-[10px] font-bold text-amber-500/70 uppercase tracking-wider mt-1">
                                / {userTargets?.target_calories || 2000} KCAL
                              </div>
                              <div className="absolute bottom-6 text-[9px] font-bold text-amber-500/40">
                                {Math.round((nutritionTotals.cals / (userTargets?.target_calories || 2000)) * 100)}%
                              </div>
                          </div>
                          
                          {/* Macros grid */}
                          <div className="grid grid-rows-3 gap-3">
                              {/* Protein */}
                              <div className="bg-[#0f172a] border border-blue-500/20 rounded-xl p-3 px-4 shadow-sm relative overflow-hidden">
                                  <div className="absolute left-0 top-0 bottom-0 bg-blue-500/10" style={{ width: `${Math.min(100, (nutritionTotals.prot / (userTargets?.target_protein || 150)) * 100)}%` }} />
                                  <div className="relative flex justify-between items-center z-10">
                                    <div className="flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_5px_rgba(59,130,246,0.8)]"></div>
                                        <div className="flex flex-col">
                                            <span className="text-[10px] font-bold text-blue-400 uppercase tracking-wider">Protein</span>
                                            <span className="text-[8px] text-blue-400/50 uppercase tracking-wider">Goal: {userTargets?.target_protein || 150}g</span>
                                        </div>
                                    </div>
                                    <span className="text-lg font-mono font-black text-white">{nutritionTotals.prot}<span className="text-xs text-gray-500 ml-1">g</span></span>
                                  </div>
                              </div>
                              {/* Carbs */}
                              <div className="bg-[#0f172a] border border-green-500/20 rounded-xl p-3 px-4 shadow-sm relative overflow-hidden">
                                  <div className="absolute left-0 top-0 bottom-0 bg-green-500/10" style={{ width: `${Math.min(100, (nutritionTotals.carbs / (userTargets?.target_carbs || 200)) * 100)}%` }} />
                                  <div className="relative flex justify-between items-center z-10">
                                    <div className="flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_5px_rgba(34,197,94,0.8)]"></div>
                                        <div className="flex flex-col">
                                            <span className="text-[10px] font-bold text-green-400 uppercase tracking-wider">Carbs</span>
                                            <span className="text-[8px] text-green-400/50 uppercase tracking-wider">Goal: {userTargets?.target_carbs || 200}g</span>
                                        </div>
                                    </div>
                                    <span className="text-lg font-mono font-black text-white">{nutritionTotals.carbs}<span className="text-xs text-gray-500 ml-1">g</span></span>
                                  </div>
                              </div>
                              {/* Fats */}
                              <div className="bg-[#0f172a] border border-yellow-500/20 rounded-xl p-3 px-4 shadow-sm relative overflow-hidden">
                                  <div className="absolute left-0 top-0 bottom-0 bg-yellow-500/10" style={{ width: `${Math.min(100, (nutritionTotals.fats / (userTargets?.target_fats || 65)) * 100)}%` }} />
                                  <div className="relative flex justify-between items-center z-10">
                                    <div className="flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full bg-yellow-500 shadow-[0_0_5px_rgba(234,179,8,0.8)]"></div>
                                        <div className="flex flex-col">
                                            <span className="text-[10px] font-bold text-yellow-400 uppercase tracking-wider">Fats</span>
                                            <span className="text-[8px] text-yellow-400/50 uppercase tracking-wider">Goal: {userTargets?.target_fats || 65}g</span>
                                        </div>
                                    </div>
                                    <span className="text-lg font-mono font-black text-white">{nutritionTotals.fats}<span className="text-xs text-gray-500 ml-1">g</span></span>
                                  </div>
                              </div>
                          </div>
                      </div>
                      {/* FOOD LOG LIST */}
                      <div className="space-y-3">
                          <div className="flex justify-between items-center mb-4 pl-2 border-l-2 border-amber-500">
                            <h3 className="text-xs font-black text-amber-500 uppercase tracking-[0.15em] flex items-center gap-2">
                              <Utensils size={12} /> Intake Log
                            </h3>
                            <div className={`px-2 py-0.5 rounded text-[9px] font-bold ${currentDayNutritionLogs.length >= 3 ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'bg-amber-500/10 text-amber-500 border border-amber-500/20'}`}>
                              {currentDayNutritionLogs.length}/3 MEALS
                            </div>
                          </div>
                      
                      {currentDayNutritionLogs.length === 0 ? (
                          <div className="text-center p-8 border-2 border-dashed border-gray-800 rounded-xl text-gray-600 text-xs uppercase font-bold tracking-widest bg-black/20">
                            No entries for {selectedJournalDay}
                          </div>
                      ) : (
                          currentDayNutritionLogs.map(item => (
                              <div key={item.id} className="flex justify-between items-center bg-black/40 border border-amber-900/30 p-4 rounded-xl group hover:border-amber-500/50 transition-all">
                                  <div>
                                      <div className="text-sm font-black text-white uppercase tracking-wide">{item.name}</div>
                                      <div className="text-[10px] text-amber-400/80 font-mono mt-1 flex gap-3 font-bold">
                                          <span className="flex items-center gap-1"><Flame size={8} /> {item.calories} CALS</span>
                                          <span className="text-blue-400/80">P: {item.protein}</span>
                                          <span className="text-green-400/80">C: {item.carbs}</span>
                                          <span className="text-yellow-400/80">F: {item.fats}</span>
                                      </div>
                                  </div>
                                  <button onClick={() => deleteFood(item.id)} className="w-8 h-8 rounded-full bg-black/50 border border-white/10 flex items-center justify-center text-gray-500 hover:text-red-400 hover:border-red-500/50 transition-all opacity-0 group-hover:opacity-100"><Trash2 size={14}/></button>
                              </div>
                          ))
                      )}
                  </div>
                  {/* ADD BUTTON */}
                  <button onClick={() => setIsFoodModalOpen(true)} className={`w-full py-4 mt-4 border-2 border-dashed border-amber-600/30 text-amber-500 font-black uppercase tracking-[0.15em] hover:bg-amber-600/10 hover:border-amber-500 hover:text-amber-400 transition-all rounded-xl flex items-center justify-center gap-3 text-xs group`}>
                      <div className="p-1 rounded-full bg-amber-600/20 group-hover:bg-amber-600 group-hover:text-black transition-colors"><Plus size={14} /></div>
                      Log New Entry
                  </button>
              </div>
          )}
            </div>

          </div>
        </div>

        {/* FOOTER: REST TIMER */}
        <div className="bg-[#0f0f11] border-t border-white/5 p-4 md:p-6">
          <div className="max-w-3xl mx-auto flex items-center gap-6">
            <div className="relative w-20 h-20 flex-shrink-0">
               <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="42" fill="none" stroke="currentColor" strokeWidth="6" className="text-white/5" />
                  <circle cx="50" cy="50" r="42" fill="none" stroke="currentColor" strokeWidth="6" strokeLinecap="round" strokeDasharray={`${timerProgress * 2.64} 264`} className="text-cyan-400 drop-shadow-[0_0_8px_rgba(34,211,238,0.5)] transition-all duration-1000" />
               </svg>
               <div className="absolute inset-0 flex items-center justify-center font-mono font-bold text-cyan-400">{formatTime(restTimer)}</div>
            </div>
            <div className="flex-1">
              <div className="flex justify-between items-baseline mb-3">
                <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">System Recovery</span>
                {isRestTimerActive && <button onClick={stopRestTimer} className="text-xs font-bold text-red-500">[ TERMINATE ]</button>}
              </div>
              <div className="flex gap-2">
                {[30, 60, 90, 180, 300].map(s => <button key={s} onClick={() => startRestTimer(s)} className="flex-1 py-2 rounded bg-white/5 text-[10px] text-gray-500 font-bold hover:bg-white/10">{s}S</button>)}
              </div>
            </div>
          </div>
        </div>

        {/* SUB-MODAL: DEPLOY FORM */}
        <AnimatePresence>
            {isDeployModalOpen && deployPathName && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[400] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="aura-card-gradient aura-glow-border rounded-2xl p-6 w-full max-w-md relative overflow-hidden">
                        <DeployMissionForm 
                            deployPathName={deployPathName} 
                            initialObjectiveName={deployFormData.name} 
                            initialSets={deployFormData.sets}
                            onCancel={() => setIsDeployModalOpen(false)} 
                            onConfirm={handleSaveMissionFromModal} 
                        />
                    </div>
                </motion.div>
            )}

            {/* NEW FOOD MODAL */}
            {isFoodModalOpen && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[400] bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm">
                     <div className="w-full max-w-md">
                          <AddFoodForm 
                            day={selectedJournalDay} 
                            user={user} 
                            isToday={isTodaySelected} 
                            onCancel={() => setIsFoodModalOpen(false)} 
                            onConfirm={handleSaveFood} 
                            showNotification={showNotification} 
                          />
                     </div>
                </motion.div>
            )}

            {/* WEEKLY FEEDBACK MODAL */}
            {showFeedbackModal && <WeeklyFeedbackModal onConfirm={handleWeeklyReset} />}

            {/* MACRO CALCULATOR MODAL */}
            {isCalculatorOpen && (
                <motion.div initial={{opacity:0}} animate={{opacity:1}} className="fixed inset-0 z-[600] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="w-full max-w-md h-[600px]">
                        <MacroCalculator 
                            user={user} 
                            onCancel={() => setIsCalculatorOpen(false)} 
                            onSave={(newTargets: any) => {
                                setUserTargets({
                                    target_calories: newTargets.calories,
                                    target_protein: newTargets.protein,
                                    target_carbs: newTargets.carbs,
                                    target_fats: newTargets.fats
                                });
                                setIsCalculatorOpen(false);
                                showNotification("PROTOCOL UPDATED", "success");
                            }} 
                        />
                    </div>
                </motion.div>
            )}
        </AnimatePresence>

      </motion.div>
    </AnimatePresence>
  );
}
