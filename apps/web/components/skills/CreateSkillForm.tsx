'use client';
import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { X, Upload, Save, AlertCircle } from 'lucide-react';

interface Props {
  onClose: () => void;
  onSuccess: () => void;
  skill?: any; // Add skill prop for edit mode
}

export default function CreateSkillForm({ onClose, onSuccess, skill }: Props) {
  const [loading, setLoading] = useState(false);
  
  // FORM STATE
  const [formData, setFormData] = useState({
    id: skill?.id || '',
    name: skill?.name || '',
    description: skill?.description_template || 'Deals {val} damage.',
    max_rank: skill?.max_rank || 5,
    required_level: skill?.required_level || 1,
    allowed_classes: skill?.allowed_classes || [] as string[],
    base_value: skill?.base_value || 10,
    energy_cost: skill?.energy_cost || 5,
    cooldown_ms: skill?.cooldown_ms || 1,
    skill_type: skill?.skill_type || 'PHYSICAL',
    bonus_type: skill?.bonus_type || 'none',
    target_type: skill?.target_type || 'enemy',
  });
  
  const [iconFile, setIconFile] = useState<File | null>(null);

  // CLASS TOGGLE LOGIC
  const toggleClass = (cls: string) => {
    setFormData(prev => {
      const classes = prev.allowed_classes.includes(cls)
        ? prev.allowed_classes.filter((c: string) => c !== cls)
        : [...prev.allowed_classes, cls];
      return { ...prev, allowed_classes: classes };
    });
  };

  // SUBMIT LOGIC
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // 1. UPLOAD ICON (If exists)
      let icon_url = '';
      if (iconFile) {
        const filePath = `icons/${formData.id}_${Date.now()}.png`;
        const { error: uploadError } = await supabase.storage
          .from('game-assets') // Make sure this bucket exists!
          .upload(filePath, iconFile, {
            upsert: true,
            cacheControl: '31536000'
          });
        
        if (uploadError) throw uploadError;
        
        const { data } = supabase.storage.from('game-assets').getPublicUrl(filePath);
        icon_url = data.publicUrl;
      }

      // 2. UPSERT SKILL DATA
      const skillData: any = {
        id: formData.id,
        name: formData.name,
        description_template: formData.description,
        max_rank: formData.max_rank,
        required_level: formData.required_level,
        allowed_classes: formData.allowed_classes,
        base_value: formData.base_value,
        energy_cost: formData.energy_cost,
        cooldown_ms: formData.cooldown_ms,
        skill_type: formData.skill_type,
        bonus_type: formData.bonus_type,
        target_type: formData.target_type,
        icon_path: icon_url || skill?.icon_path || skill?.icon_url || null,
        scaling_factor: skill?.scaling_factor || 1.0,
      };

      // Add positioning if new skill
      if (!skill) {
        skillData.x_pos = 50;
        skillData.y_pos = 50;
      }

      const { error: dbError } = skill 
        ? await supabase.from('skills').update(skillData).eq('id', skill.id)
        : await supabase.from('skills').insert(skillData);

      if (dbError) throw dbError;

      onSuccess(); // Refresh the list
      onClose();   // Close the modal

    } catch (error: any) {
      alert(`SYSTEM ERROR: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[#0f0f0f] border border-red-900/50 w-full max-w-2xl rounded-lg shadow-2xl shadow-red-900/20 overflow-hidden">
        
        {/* HEADER */}
        <div className="bg-red-950/30 p-4 border-b border-red-900/30 flex justify-between items-center">
          <h2 className="text-red-500 font-bold uppercase tracking-widest flex items-center gap-2">
            <Save size={18} /> New Combat Protocol
          </h2>
          <button onClick={onClose} className="text-gray-500 hover:text-white">
            <X size={20} />
          </button>
        </div>

        {/* FORM */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          
          {/* TOP ROW: ID & NAME */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] uppercase text-gray-500 mb-1">Skill ID (Unique)</label>
              <input 
                required
                type="text" 
                placeholder="e.g. mage_fireball"
                value={formData.id}
                onChange={e => setFormData({...formData, id: e.target.value.toLowerCase().replace(/\s/g, '_')})}
                className="w-full bg-black border border-gray-800 text-cyan-400 p-2 text-sm rounded focus:border-cyan-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-[10px] uppercase text-gray-500 mb-1">Display Name</label>
              <input 
                required
                type="text" 
                placeholder="e.g. Fireball"
                value={formData.name}
                onChange={e => setFormData({...formData, name: e.target.value})}
                className="w-full bg-black border border-gray-800 text-white p-2 text-sm rounded focus:border-red-500 outline-none"
              />
            </div>
          </div>

          {/* CLASS RESTRICTIONS */}
          <div className="bg-[#050505] p-4 rounded border border-gray-800">
            <label className="block text-[10px] uppercase text-yellow-500 mb-3 font-bold">Authorized Classes</label>
            <div className="flex gap-4">
              {['Assassin', 'Fighter', 'Mage', 'Ranger', 'Tanker', 'Healer'].map(cls => (
                <label key={cls} className={`
                  flex items-center gap-2 px-3 py-1.5 rounded cursor-pointer text-xs border transition-all
                  ${formData.allowed_classes.includes(cls) 
                    ? 'bg-red-900/20 border-red-500 text-red-400' 
                    : 'bg-gray-900 border-transparent text-gray-600 hover:border-gray-600'}
                `}>
                  <input 
                    type="checkbox" 
                    className="hidden"
                    checked={formData.allowed_classes.includes(cls)}
                    onChange={() => toggleClass(cls)}
                  />
                  {cls}
                </label>
              ))}
            </div>
            {formData.allowed_classes.length === 0 && (
              <p className="mt-2 text-[10px] text-gray-500 flex items-center gap-1">
                <AlertCircle size={10} /> No classes selected. This will be a <strong>MOB-ONLY</strong> skill.
              </p>
            )}
          </div>

          {/* STATS ROW */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-[10px] uppercase text-gray-500 mb-1">Max Rank</label>
              <input 
                type="number" min="1" max="10"
                value={formData.max_rank}
                onChange={e => setFormData({...formData, max_rank: parseInt(e.target.value)})}
                className="w-full bg-black border border-gray-800 text-white p-2 text-sm rounded"
              />
            </div>
            <div>
              <label className="block text-[10px] uppercase text-gray-500 mb-1">Req. Level</label>
              <input 
                type="number" min="1"
                value={formData.required_level}
                onChange={e => setFormData({...formData, required_level: parseInt(e.target.value)})}
                className="w-full bg-black border border-gray-800 text-white p-2 text-sm rounded"
              />
            </div>
            <div>
              <label className="block text-[10px] uppercase text-gray-500 mb-1">Icon Upload</label>
              <div className="relative">
                <input 
                  type="file" accept="image/*"
                  onChange={e => setIconFile(e.target.files?.[0] || null)}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <div className="w-full bg-black border border-gray-800 text-gray-400 p-2 text-sm rounded flex items-center gap-2 truncate">
                  <Upload size={14} /> {iconFile ? iconFile.name : 'Select PNG...'}
                </div>
              </div>
            </div>
          </div>

          {/* COMBAT STATS ROW */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 bg-black/40 p-4 rounded border border-gray-800">
            <div>
              <label className="block text-[10px] uppercase text-red-500 mb-1 font-bold">Base Value</label>
              <input
                type="number"
                value={formData.base_value}
                onChange={e => setFormData({...formData, base_value: parseInt(e.target.value)})}
                className="w-full bg-black border border-gray-800 text-white p-2 text-sm rounded focus:border-red-500 outline-none"
              />
              <p className="text-[9px] text-gray-600 mt-1 italic">Initial dmg/heal before scaling.</p>
            </div>
            <div>
              <label className="block text-[10px] uppercase text-blue-500 mb-1 font-bold">Action Points</label>
              <input
                type="number"
                value={formData.energy_cost}
                onChange={e => setFormData({...formData, energy_cost: parseInt(e.target.value)})}
                className="w-full bg-black border border-gray-800 text-white p-2 text-sm rounded focus:border-blue-500 outline-none"
              />
              <p className="text-[9px] text-gray-600 mt-1 italic">AP consumed per execution (1-5).</p>
            </div>
            <div>
              <label className="block text-[10px] uppercase text-yellow-500 mb-1 font-bold">Cooldown (Turns)</label>
              <input
                type="number"
                value={formData.cooldown_ms}
                onChange={e => setFormData({...formData, cooldown_ms: parseInt(e.target.value)})}
                className="w-full bg-black border border-gray-800 text-white p-2 text-sm rounded focus:border-yellow-500 outline-none"
              />
              <p className="text-[9px] text-gray-600 mt-1 italic">Wait duration in turn-cycles.</p>
            </div>
            <div>
              <label className="block text-[10px] uppercase text-gray-500 mb-1">Type</label>
              <select
                value={formData.skill_type}
                onChange={e => setFormData({...formData, skill_type: e.target.value})}
                className="w-full bg-black border border-gray-800 text-white p-2 text-sm rounded outline-none"
              >
                <option value="PHYSICAL">PHYSICAL</option>
                <option value="MAGIC">MAGIC</option>
                <option value="PASSIVE">PASSIVE</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] uppercase text-purple-500 mb-1 font-bold">Target Type</label>
              <select
                value={formData.target_type}
                onChange={e => setFormData({...formData, target_type: e.target.value})}
                className="w-full bg-black border border-gray-800 text-white p-2 text-sm rounded outline-none focus:border-purple-500"
              >
                <option value="enemy">Enemy</option>
                <option value="self">Self</option>
                <option value="teammate">Teammate</option>
                <option value="area_enemy">Area (Enemies)</option>
                <option value="area_friendly">Area (Friendly)</option>
              </select>
              <p className="text-[9px] text-gray-600 mt-1 italic">Who can be targeted?</p>
            </div>
            {formData.skill_type === 'PASSIVE' && (
              <div>
                <label className="block text-[10px] uppercase text-green-500 mb-1 font-bold">Passive Bonus</label>
                <select 
                  value={formData.bonus_type}
                  onChange={e => setFormData({...formData, bonus_type: e.target.value})}
                  className="w-full bg-black border border-gray-800 text-white p-2 text-sm rounded outline-none focus:border-green-500"
                >
                  <option value="none">-- None --</option>
                  <option value="coin_boost">Coin Multiplier (+%)</option>
                  <option value="exp_boost">EXP Multiplier (+%)</option>
                  <option value="speed_boost">Movement Speed (+%)</option>
                  <option value="stat_str">Strength Boost (+Flat)</option>
                  <option value="stat_int">Intelligence Boost (+Flat)</option>
                  <option value="stat_hp">Max HP Boost (+Flat)</option>
                </select>
                <p className="text-[9px] text-gray-600 mt-1 italic">
                  Apply effect based on Rank * Base Value.
                </p>
              </div>
            )}
          </div>

          {/* BASELINE GUIDE */}
          <div className="bg-blue-900/10 border border-blue-500/20 p-3 rounded space-y-2">
            <h4 className="text-[10px] uppercase text-blue-400 font-bold flex items-center gap-2">
              <AlertCircle size={12} /> Balance Reference (Early vs Late Game)
            </h4>
            <div className="grid grid-cols-2 gap-4 text-[9px] font-mono">
              <div className="text-gray-500">
                <p className="text-white mb-1 tracking-wider">LEVEL 1-10 (Novice)</p>
                <p>Base Value: 10 - 25</p>
                <p>Action Points: 1 - 2</p>
                <p>Cooldown: 1 - 3 Turns</p>
              </div>
              <div className="text-gray-500 border-l border-gray-800 pl-4">
                <p className="text-cyan-400 mb-1 tracking-wider">LEVEL 100 (Master)</p>
                <p>Base Value: 800 - 1500</p>
                <p>Action Points: 3 - 5</p>
                <p>Cooldown: 5 - 12 Turns</p>
              </div>
            </div>
          </div>

          {/* FOOTER */}
          <div className="pt-4 flex justify-end gap-3">
            <button 
              type="button" onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-gray-500 hover:text-white transition-colors"
            >
              CANCEL
            </button>
            <button 
              type="submit" disabled={loading}
              className="px-6 py-2 bg-red-700 hover:bg-red-600 text-white text-xs font-bold uppercase tracking-wider rounded flex items-center gap-2"
            >
              {loading ? 'UPLOADING...' : skill ? 'UPDATE PROTOCOL' : 'INITIALIZE PROTOCOL'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
