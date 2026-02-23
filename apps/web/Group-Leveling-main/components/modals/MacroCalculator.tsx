'use client';

import React, { useState } from 'react';
import { Activity, Calculator, ChevronRight, Save } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export default function MacroCalculator({ user, onSave, onCancel }: any) {
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
    // Mifflin-St Jeor Equation
    const w = parseFloat(weight);
    const h = parseFloat(height);
    const a = parseFloat(age);
    
    if (!w || !h || !a) return;

    let bmr = (10 * w) + (6.25 * h) - (5 * a);
    bmr += gender === 'male' ? 5 : -161;

    let tdee = bmr * parseFloat(activity);

    // Goal Adjustments
    if (goal === 'cut') tdee -= 500;
    if (goal === 'bulk') tdee += 300;

    // Macro Split (High Protein "Hunter" Split)
    // Protein: 2.2g per kg of bodyweight (good for active people)
    // Fats: 0.9g per kg
    // Carbs: Remainder
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
    const { error } = await supabase.from('profiles').update({
        target_calories: results.calories,
        target_protein: results.protein,
        target_carbs: results.carbs,
        target_fats: results.fats
    }).eq('id', user.id);

    if (!error) {
        new Audio('/sounds/upgrade_unlock.mp3').play().catch(()=>{});
        onSave(results); // Pass data back to parent
    }
    setLoading(false);
  };

  return (
    <div className="bg-[#0f172a] border border-cyan-500/30 rounded-xl overflow-hidden flex flex-col h-full relative">
       {/* Header */}
       <div className="bg-cyan-950/30 p-4 border-b border-cyan-500/20 flex items-center gap-3">
          <Calculator className="text-cyan-400" size={20} />
          <h3 className="text-cyan-400 font-black uppercase tracking-widest text-xs">System Calibration // Biometrics</h3>
       </div>

       <div className="p-6 flex-1 overflow-y-auto">
          {step === 1 ? (
             <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="text-[10px] font-bold text-gray-500 uppercase">Weight (KG)</label>
                        <input type="number" value={weight} onChange={e=>setWeight(e.target.value)} className="w-full bg-black/30 border border-white/10 rounded p-2 text-white font-mono focus:border-cyan-500 outline-none" placeholder="75" />
                    </div>
                    <div>
                        <label className="text-[10px] font-bold text-gray-500 uppercase">Height (CM)</label>
                        <input type="number" value={height} onChange={e=>setHeight(e.target.value)} className="w-full bg-black/30 border border-white/10 rounded p-2 text-white font-mono focus:border-cyan-500 outline-none" placeholder="180" />
                    </div>
                    <div>
                        <label className="text-[10px] font-bold text-gray-500 uppercase">Age</label>
                        <input type="number" value={age} onChange={e=>setAge(e.target.value)} className="w-full bg-black/30 border border-white/10 rounded p-2 text-white font-mono focus:border-cyan-500 outline-none" placeholder="25" />
                    </div>
                    <div>
                        <label className="text-[10px] font-bold text-gray-500 uppercase">Gender</label>
                        <select value={gender} onChange={e=>setGender(e.target.value)} className="w-full bg-black/30 border border-white/10 rounded p-2 text-white font-mono focus:border-cyan-500 outline-none">
                            <option value="male">Male</option>
                            <option value="female">Female</option>
                        </select>
                    </div>
                </div>

                <div>
                    <label className="text-[10px] font-bold text-gray-500 uppercase mb-2 block">Activity Level</label>
                    <select value={activity} onChange={e=>setActivity(e.target.value)} className="w-full bg-black/30 border border-white/10 rounded p-2 text-white font-mono focus:border-cyan-500 outline-none text-xs">
                        <option value="1.2">Sedentary (Office Job)</option>
                        <option value="1.375">Light Activity (1-3 days/wk)</option>
                        <option value="1.55">Moderate Activity (3-5 days/wk)</option>
                        <option value="1.725">Very Active (6-7 days/wk)</option>
                    </select>
                </div>

                <div>
                    <label className="text-[10px] font-bold text-gray-500 uppercase mb-2 block">System Objective</label>
                    <div className="flex gap-2">
                        {['cut', 'maintain', 'bulk'].map(mode => (
                            <button 
                                key={mode}
                                onClick={() => setGoal(mode)}
                                className={`flex-1 py-2 text-xs font-bold uppercase rounded border transition-all ${goal === mode ? 'bg-cyan-600 border-cyan-400 text-white' : 'bg-black/30 border-white/10 text-gray-500 hover:text-white'}`}
                            >
                                {mode}
                            </button>
                        ))}
                    </div>
                </div>
             </div>
          ) : (
             <div className="flex flex-col items-center justify-center h-full space-y-6 animate-in fade-in slide-in-from-bottom-4">
                 <div className="text-center">
                     <div className="text-gray-500 text-xs font-bold uppercase tracking-widest mb-2">Recommended Protocol</div>
                     <div className="text-5xl font-black text-cyan-400 text-shadow-cyan">{results.calories} <span className="text-lg text-white">kcal</span></div>
                 </div>

                 <div className="w-full grid grid-cols-3 gap-2">
                     <div className="bg-blue-950/30 border border-blue-500/30 p-3 rounded text-center">
                         <div className="text-blue-400 font-black text-xl">{results.protein}g</div>
                         <div className="text-[10px] text-blue-300/50 uppercase font-bold">Protein</div>
                     </div>
                     <div className="bg-green-950/30 border border-green-500/30 p-3 rounded text-center">
                         <div className="text-green-400 font-black text-xl">{results.carbs}g</div>
                         <div className="text-[10px] text-green-300/50 uppercase font-bold">Carbs</div>
                     </div>
                     <div className="bg-amber-950/30 border border-amber-500/30 p-3 rounded text-center">
                         <div className="text-amber-400 font-black text-xl">{results.fats}g</div>
                         <div className="text-[10px] text-amber-300/50 uppercase font-bold">Fats</div>
                     </div>
                 </div>

                 <p className="text-xs text-gray-500 text-center max-w-[80%]">
                     System has calculated optimal fuel intake based on your hunter physiology. Confirm to update parameters.
                 </p>
             </div>
          )}
       </div>

       {/* Footer */}
       <div className="p-4 border-t border-white/10 flex gap-3 bg-black/20">
          <button onClick={onCancel} className="px-4 py-2 rounded text-xs font-bold text-gray-500 hover:text-white uppercase transition-colors">Cancel</button>
          {step === 1 ? (
              <button disabled={!weight || !height} onClick={calculateMacros} className="flex-1 bg-cyan-700 hover:bg-cyan-600 disabled:opacity-50 text-white font-bold py-2 rounded uppercase text-xs tracking-wider flex items-center justify-center gap-2">
                  Analyze Data <ChevronRight size={14} />
              </button>
          ) : (
              <button disabled={loading} onClick={handleSave} className="flex-1 bg-green-600 hover:bg-green-500 text-white font-black py-2 rounded uppercase text-xs tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-green-900/20">
                  {loading ? 'Updating...' : 'Confirm Protocol'} <Save size={14} />
              </button>
          )}
       </div>
    </div>
  );
}
