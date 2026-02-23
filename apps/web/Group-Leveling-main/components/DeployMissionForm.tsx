'use client';

import React, { useState, useEffect } from 'react';
import { Plus, Trash2, X } from 'lucide-react';

interface DeploySet {
  weight?: number | string;
  reps?: number | string;
  km?: number | string;
  mins?: number | string;
}

interface DeployMissionFormProps {
  deployPathName: string;
  initialObjectiveName?: string;
  initialSets?: DeploySet[];
  onCancel: () => void;
  onConfirm: (name: string, sets: DeploySet[]) => void;
}

export default function DeployMissionForm({
  deployPathName,
  initialObjectiveName = '',
  initialSets,
  onCancel,
  onConfirm
}: DeployMissionFormProps) {
  const [objectiveName, setObjectiveName] = useState(initialObjectiveName);
  const [sets, setSets] = useState<DeploySet[]>(
    initialSets && initialSets.length > 0 
      ? initialSets 
      : deployPathName === 'Strength' 
        ? [{ weight: '', reps: '' }] 
        : [{ km: '', mins: '' }]
  );

  useEffect(() => {
    setObjectiveName(initialObjectiveName);
    setSets(
      initialSets && initialSets.length > 0 
        ? initialSets 
        : deployPathName === 'Strength' 
          ? [{ weight: '', reps: '' }] 
          : [{ km: '', mins: '' }]
    );
  }, [initialObjectiveName, initialSets, deployPathName]);

  const handleSetChange = (index: number, field: keyof DeploySet, value: string) => {
    const numVal = value === '' ? '' : parseFloat(value) || 0;
    const newSets = [...sets];
    newSets[index] = { ...newSets[index], [field]: numVal };
    setSets(newSets);
  };

  const addSet = () => {
    setSets([...sets, { weight: 0, reps: 0 }]);
  };

  const removeSet = (index: number) => {
    if (sets.length <= 1) return;
    setSets(sets.filter((_, i) => i !== index));
  };

  const handleConfirm = () => {
    onConfirm(objectiveName, sets);
  };

  return (
    <div className="flex flex-col h-full relative">
      {/* HEADER - Matches image_cf2eef.png */}
      <div className="flex justify-between items-center mb-6 border-b border-white/10 pb-4">
        <h3 className="font-black text-cyan-400 uppercase tracking-widest text-xs md:text-sm">
          MISSION NAME
        </h3>
        <button onClick={onCancel} className="text-gray-500 hover:text-white transition-colors">
          <X size={20} />
        </button>
      </div>

      <div className="space-y-6">
        {/* NAME INPUT - Matches image_cf2eef.png */}
        <div>
          <input
            type="text"
            placeholder={deployPathName === 'Strength' ? "E.G. BENCH PRESS" : "E.G. CENTRAL PARK RUN"}
            className="w-full bg-transparent border-b-2 border-cyan-500/50 text-white font-bold text-lg py-2 focus:outline-none focus:border-cyan-400 placeholder:text-gray-600 transition-colors uppercase"
            value={objectiveName}
            onChange={(e) => setObjectiveName(e.target.value)}
            autoFocus
          />
        </div>

        {/* SETS CONTAINER - Matches Dark Box in Screenshot */}
        <div className="bg-black/40 p-4 rounded-lg border border-white/5">
          {deployPathName === 'Strength' ? (
            <div className="space-y-3 max-h-[40vh] overflow-y-auto pr-1 custom-scrollbar">
              <div className="grid grid-cols-[20px_1fr_1fr_20px] gap-3 mb-2 px-2">
                 <span className="w-4"></span>
                 <label className="text-[10px] font-bold text-gray-500 uppercase">LBS/KG</label>
                 <label className="text-[10px] font-bold text-gray-500 uppercase">REPS</label>
                 <span className="w-4"></span>
              </div>

              {sets.map((set, idx) => (
                <div key={`deploy-set-${idx}`} className="grid grid-cols-[20px_1fr_1fr_20px] gap-3 items-center bg-slate-800/30 p-2 rounded border border-white/5">
                  <span className="text-[10px] font-bold text-gray-500 w-4 text-center">{idx + 1}</span>

                  <input
                    type="number"
                    className="w-full bg-transparent border-b border-white/10 text-white font-mono text-sm py-1 outline-none focus:border-cyan-400"
                    value={set.weight === 0 ? '' : set.weight}
                    onChange={(e) => handleSetChange(idx, 'weight', e.target.value)}
                  />

                  <input
                    type="number"
                    className="w-full bg-transparent border-b border-white/10 text-white font-mono text-sm py-1 outline-none focus:border-cyan-400"
                    value={set.reps === 0 ? '' : set.reps}
                    onChange={(e) => handleSetChange(idx, 'reps', e.target.value)}
                  />

                  {sets.length > 1 && (
                    <button
                      onClick={() => removeSet(idx)}
                      className="w-6 h-6 flex items-center justify-center text-gray-600 hover:text-red-400 transition-colors"
                    >
                      <Trash2 size={12} />
                    </button>
                  )}
                </div>
              ))}
              <button
                onClick={addSet}
                className="w-full py-2 mt-2 border border-dashed border-gray-700 rounded-lg text-[10px] font-bold text-gray-500 uppercase hover:bg-white/5 hover:text-white transition-all flex items-center justify-center gap-1"
              >
                <Plus size={10} /> Add Set
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1 block">KM</label>
                <input
                  type="number"
                  className="w-full bg-slate-800/50 border border-white/10 rounded p-2 text-cyan-400 font-mono focus:outline-none focus:border-cyan-500"
                  value={sets[0]?.km === 0 ? '' : sets[0]?.km || ''}
                  onChange={(e) => handleSetChange(0, 'km', e.target.value)}
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1 block">MINS</label>
                <input
                  type="number"
                  className="w-full bg-slate-800/50 border border-white/10 rounded p-2 text-cyan-400 font-mono focus:outline-none focus:border-cyan-500"
                  value={sets[0]?.mins === 0 ? '' : sets[0]?.mins || ''}
                  onChange={(e) => handleSetChange(0, 'mins', e.target.value)}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="mt-8 flex gap-3">
        <button
          onClick={onCancel}
          className="flex-[1] py-3 bg-transparent border border-slate-700 text-gray-400 text-xs font-bold uppercase rounded-lg hover:bg-white/5 transition-all"
        >
          Cancel
        </button>
        <button
          onClick={handleConfirm}
          className="flex-[2] py-3 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-black uppercase rounded-lg transition-all shadow-lg shadow-cyan-900/20"
        >
          Confirm Deployment
        </button>
      </div>
    </div>
  );
}