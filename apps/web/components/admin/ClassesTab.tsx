'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Save, Users } from 'lucide-react';

interface ClassModel {
  id: string;
  name: string;
  description: string | null;
  base_hp: number;
  base_mp: number;
  icon_url?: string | null;
}

export default function ClassesTab() {
  const [classes, setClasses] = useState<ClassModel[]>([]);

  useEffect(() => {
    fetchClasses();
  }, []);

  const fetchClasses = async () => {
    const { data } = await supabase.from('classes').select('*').order('name');
    if (data) setClasses(data);
  };

  const updateClass = async (cls: ClassModel) => {
    const { error } = await supabase
      .from('classes')
      .update({
        description: cls.description,
        base_hp: cls.base_hp,
        base_mp: cls.base_mp,
      })
      .eq('id', cls.id);

    if (!error) {
      alert(`Saved ${cls.name}!`);
    } else {
      alert(`Error: ${error.message}`);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-slate-900 p-4 rounded-lg border border-slate-800 flex items-center gap-2">
        <Users className="text-cyan-400" />
        <h2 className="text-xl font-bold text-white">Class Definitions</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {classes.map((cls) => (
          <div
            key={cls.id}
            className="bg-black/50 border border-white/10 rounded-xl p-6 space-y-4 hover:border-cyan-500/50 transition-colors"
          >
            <h3 className="text-lg font-black text-white uppercase tracking-wider border-b border-white/10 pb-2">
              {cls.name}
            </h3>

            <div>
              <label className="text-[10px] text-gray-500 uppercase font-bold">
                Description (For Temple)
              </label>
              <textarea
                className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-xs text-gray-300 h-16"
                value={cls.description || ''}
                onChange={(e) =>
                  setClasses((prev) =>
                    prev.map((c) =>
                      c.id === cls.id ? { ...c, description: e.target.value } : c
                    )
                  )
                }
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] text-gray-500 uppercase font-bold">Base HP</label>
                <input
                  type="number"
                  className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-xs text-white"
                  value={cls.base_hp}
                  onChange={(e) =>
                    setClasses((prev) =>
                      prev.map((c) =>
                        c.id === cls.id ? { ...c, base_hp: Number(e.target.value) } : c
                      )
                    )
                  }
                />
              </div>
              <div>
                <label className="text-[10px] text-gray-500 uppercase font-bold">Base MP</label>
                <input
                  type="number"
                  className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-xs text-white"
                  value={cls.base_mp}
                  onChange={(e) =>
                    setClasses((prev) =>
                      prev.map((c) =>
                        c.id === cls.id ? { ...c, base_mp: Number(e.target.value) } : c
                      )
                    )
                  }
                />
              </div>
            </div>

            <button
              onClick={() => updateClass(cls)}
              className="w-full py-2 bg-slate-800 hover:bg-green-600 hover:text-white text-gray-400 text-xs font-bold rounded flex justify-center gap-2 transition-all"
            >
              <Save size={14} /> SAVE
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
