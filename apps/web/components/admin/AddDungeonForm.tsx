import React, { useState, useEffect } from 'react';
import DungeonImagePicker from '@/components/DungeonImagePicker';
import { Dungeon } from './types';

interface AddDungeonFormProps {
  dungeon?: Dungeon;
  onAdd: (dungeon: any) => void;
  onCancel: () => void;
}

export default function AddDungeonForm({ 
  dungeon, 
  onAdd, 
  onCancel 
}: AddDungeonFormProps) {
  const isEditing = !!dungeon;
  // Create default time: Jan 11, 2026 1:00 PM PST
  const defaultDateTime = '2026-01-11T13:00'; // 13:00 is 1:00 PM in 24-hour format

  const formatForDateTimeLocal = (dateString?: string | null) => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return '';
      // Extract YYYY-MM-DDTHH:mm
      return date.toISOString().slice(0, 16);
    } catch (e) {
      return '';
    }
  };

  const [formData, setFormData] = useState({
    name: dungeon?.name || '',
    type: dungeon?.type || '',
    difficulty: dungeon?.difficulty || 'E-Rank',
    requirement: dungeon?.requirement || '',
    xp_reward: dungeon?.xp_reward || 0,
    coin_reward: dungeon?.coin_reward || 0,
    loot_table: dungeon?.loot_table || '',
    status: dungeon?.status || 'open',
    boss: dungeon?.boss || '',
    image_url: dungeon?.image_url || '',
    auto_start: dungeon?.auto_start || false,
    scheduled_start: formatForDateTimeLocal(dungeon?.scheduled_start) || defaultDateTime,
    target_distance_meters: dungeon?.target_distance_meters || 0,
    tier: dungeon?.tier || '',
    description: dungeon?.description || '',
  });

  // Update form data when dungeon prop changes
  useEffect(() => {
    if (dungeon) {
      setFormData({
        name: dungeon.name || '',
        type: dungeon.type || '',
        difficulty: dungeon.difficulty || 'E-Rank',
        requirement: dungeon.requirement || '',
        xp_reward: dungeon.xp_reward || 0,
        coin_reward: dungeon.coin_reward || 0,
        loot_table: dungeon.loot_table || '',
        status: dungeon.status || 'open',
        boss: dungeon.boss || '',
        image_url: dungeon.image_url || '',
        auto_start: dungeon.auto_start || false,
        scheduled_start: formatForDateTimeLocal(dungeon.scheduled_start),
        target_distance_meters: dungeon.target_distance_meters || 0,
        tier: dungeon.tier || '',
        description: dungeon.description || '',
      });
    }
  }, [dungeon]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validate that if auto_start is enabled, scheduled_start must be set
    if (formData.auto_start && !formData.scheduled_start) {
      alert('You must set a scheduled start time if "Auto-Start" is enabled.');
      return;
    }

    const dungeonData = {
      name: formData.name,
      type: formData.type,
      difficulty: formData.difficulty,
      requirement: formData.requirement,
      xp_reward: formData.xp_reward,
      coin_reward: formData.coin_reward,
      loot_table: formData.loot_table || null,
      status: formData.status,
      boss: formData.boss,
      image_url: formData.image_url || null,
      auto_start: formData.auto_start,
      scheduled_start: formData.scheduled_start ? new Date(formData.scheduled_start).toISOString() : null,
      target_distance_meters: formData.target_distance_meters,
      tier: formData.tier,
      description: formData.description,
    };
    onAdd(dungeonData);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    // For checkbox, we need to cast to HTMLInputElement to access checked property safely
    const checked = (e.target as HTMLInputElement).checked;

    setFormData(prev => {
      // Map form field names to state property names
      const fieldMap: Record<string, string> = {
        'xpReward': 'xp_reward',
        'coinReward': 'coin_reward',
      };
      const stateKey = fieldMap[name] || name;

      // Handle different input types
      let processedValue: any = value;
      if (type === 'checkbox') {
        processedValue = checked;
      } else if (stateKey === 'xp_reward' || stateKey === 'coin_reward' || stateKey === 'target_distance_meters') {
        processedValue = parseInt(value) || 0;
      }

      return {
        ...prev,
        [stateKey]: processedValue
      };
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-black uppercase text-gray-300 mb-1">Dungeon Name *</label>
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
            required
            placeholder="Enter dungeon name..."
            className="w-full bg-black border border-gray-700 rounded px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-red-500 focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-xs font-black uppercase text-gray-300 mb-1">Type *</label>
          <select
            name="type"
            value={formData.type}
            onChange={handleChange}
            required
            className="w-full bg-black border border-gray-700 rounded px-3 py-2 text-sm text-white focus:border-red-500 focus:outline-none"
          >
            <option value="">Select type...</option>
            <option value="Weekly Meetup">Weekly Meetup</option>
            <option value="Trail Meetup">Trail Meetup</option>
            <option value="Special Event">Special Event</option>
            <option value="Challenge">Challenge</option>
            <option value="Global Challenge">Global Challenge</option>
          </select>
        </div>
      </div>

      <div>
        <label className="block text-xs font-black uppercase text-gray-300 mb-1">Description</label>
        <textarea
          name="description"
          value={formData.description}
          onChange={handleChange}
          rows={3}
          placeholder="Enter dungeon description..."
          className="w-full bg-black border border-gray-700 rounded px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-red-500 focus:outline-none resize-none"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-black uppercase text-gray-300 mb-1">Tier</label>
          <input
            type="text"
            name="tier"
            value={formData.tier}
            onChange={handleChange}
            placeholder="e.g., 20k, 5k"
            className="w-full bg-black border border-gray-700 rounded px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-red-500 focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-xs font-black uppercase text-gray-300 mb-1">Target Distance (Meters)</label>
          <input
            type="number"
            name="target_distance_meters"
            value={formData.target_distance_meters}
            onChange={handleChange}
            min="0"
            placeholder="0"
            className="w-full bg-black border border-gray-700 rounded px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-red-500 focus:outline-none"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-black uppercase text-gray-300 mb-1">Difficulty *</label>
          <select
            name="difficulty"
            value={formData.difficulty}
            onChange={handleChange}
            required
            className="w-full bg-black border border-gray-700 rounded px-3 py-2 text-sm text-white focus:border-red-500 focus:outline-none"
          >
            <option value="E-Rank">E-Rank</option>
            <option value="D-Rank">D-Rank</option>
            <option value="C-Rank">C-Rank</option>
            <option value="B-Rank">B-Rank</option>
            <option value="A-Rank">A-Rank</option>
            <option value="S-Rank">S-Rank</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-black uppercase text-gray-300 mb-1">Status *</label>
          <select
            name="status"
            value={formData.status}
            onChange={handleChange}
            required
            className="w-full bg-black border border-gray-700 rounded px-3 py-2 text-sm text-white focus:border-red-500 focus:outline-none"
          >
            <option value="open">Open</option>
            <option value="upcoming">Upcoming</option>
            <option value="closed">Closed</option>
          </select>
        </div>
      </div>

      <div>
        <label className="block text-xs font-black uppercase text-gray-300 mb-1">Requirement *</label>
        <input
          type="text"
          name="requirement"
          value={formData.requirement}
          onChange={handleChange}
          required
          placeholder="e.g., Group 5km, 300m Elevation, etc."
          className="w-full bg-black border border-gray-700 rounded px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-red-500 focus:outline-none"
        />
      </div>

      <div>
        <label className="block text-xs font-black uppercase text-gray-300 mb-1">Boss Name <span className="text-gray-500 text-[10px]">(Optional)</span></label>
        <input
          type="text"
          name="boss"
          value={formData.boss}
          onChange={handleChange}
          placeholder="Enter boss name (optional)..."
          className="w-full bg-black border border-gray-700 rounded px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-red-500 focus:outline-none"
        />
      </div>

      <div>
        <label className="block text-xs font-black uppercase text-gray-300 mb-3">Dungeon Image</label>
        <DungeonImagePicker
          selectedImageUrl={formData.image_url}
          onSelect={(imageUrl) => setFormData(prev => ({ ...prev, image_url: imageUrl }))}
        />
      </div>

      <div>
        <label className="block text-xs font-black uppercase text-gray-300 mb-1">Loot Table <span className="text-gray-500 text-[10px]">(Optional)</span></label>
        <select
          name="loot_table"
          value={formData.loot_table}
          onChange={handleChange}
          className="w-full bg-black border border-gray-700 rounded px-3 py-2 text-sm text-white focus:border-red-500 focus:outline-none"
        >
          <option value="">No Loot Table</option>
          <option value="Common Box">Common Box</option>
          <option value="Rare Box">Rare Box</option>
          <option value="Epic Box">Epic Box</option>
          <option value="Legendary Box">Legendary Box</option>
        </select>
      </div>

      <div>
        <div className="flex justify-between items-center mb-1">
          <label className="block text-xs font-black uppercase text-gray-300">📅 Scheduled Start Time</label>
          {formData.scheduled_start && (
            <button 
              type="button" 
              onClick={() => setFormData(prev => ({ ...prev, scheduled_start: '', auto_start: false }))}
              className="text-[10px] font-black uppercase text-red-500 hover:text-red-400"
            >
              Clear Time
            </button>
          )}
        </div>
        <input
          type="datetime-local"
          name="scheduled_start"
          value={formData.scheduled_start}
          onChange={handleChange}
          className="w-full bg-gray-900 border-2 border-gray-600 rounded-lg px-4 py-3 text-base text-white placeholder-gray-500 focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-500/20 transition-all hover:border-gray-500"
          style={{ cursor: 'pointer' }}
        />
        <div className="mt-2 space-y-1">
          <p className="text-[10px] text-gray-400">Click the calendar icon 📅 to select date and time</p>
          <p className="text-[10px] text-gray-500">Leave empty for no specific schedule</p>
        </div>
      </div>

      <div>
        <label className="flex items-center gap-2 mb-2">
          <input
            type="checkbox"
            name="auto_start"
            checked={formData.auto_start}
            onChange={handleChange}
            className="w-4 h-4 text-red-600 bg-gray-800 border-gray-600 rounded focus:ring-red-500 focus:ring-2"
          />
          <span className="text-xs font-black uppercase text-gray-300">Auto-Start Dungeon</span>
        </label>
        <p className="text-[10px] text-gray-500 mb-3">Automatically start this dungeon at the scheduled time (requires time to be set)</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-black uppercase text-gray-300 mb-1">XP Reward *</label>
          <input
            type="number"
            name="xpReward"
            value={formData.xp_reward}
            onChange={handleChange}
            required
            min="0"
            placeholder="0"
            className="w-full bg-black border border-gray-700 rounded px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-red-500 focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-xs font-black uppercase text-gray-300 mb-1">Coin Reward *</label>
          <input
            type="number"
            name="coinReward"
            value={formData.coin_reward}
            onChange={handleChange}
            required
            min="0"
            placeholder="0"
            className="w-full bg-black border border-gray-700 rounded px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-red-500 focus:outline-none"
          />
        </div>
      </div>

      <div className="flex gap-2">
        <button
          type="submit"
          className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-sm font-bold"
        >
          {isEditing ? 'Update Dungeon' : 'Add Dungeon'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded-lg text-sm font-bold"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
