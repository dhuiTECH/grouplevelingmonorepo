import React, { useState } from 'react';
import { CATEGORIES, GenerationConfig, ReferenceImage, Resolution, StyleStrength, AssetType } from '../types';
import { X, Wand2, Loader2 } from './Icons';

interface GeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGenerate: (config: GenerationConfig) => Promise<void>;
  referencesCount: number;
}

const GeneratorModal: React.FC<GeneratorModalProps> = ({ isOpen, onClose, onGenerate, referencesCount }) => {
  const [category, setCategory] = useState(CATEGORIES[1]); // Default to 'Characters'
  const [prompt, setPrompt] = useState('');
  const [resolution, setResolution] = useState<Resolution>('1K');
  const [styleStrength, setStyleStrength] = useState<StyleStrength>('Exact match');
  const [assetType, setAssetType] = useState<AssetType>('static');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;

    setLoading(true);
    try {
      await onGenerate({
        category,
        prompt,
        resolution,
        styleStrength,
        assetType
      });
      onClose(); // Close on success, keeping the loading state in the main grid
      setPrompt(''); // Reset prompt for next time
    } catch (error) {
      console.error(error);
      // Keep modal open on error so user can retry? 
      // For this UI, we might want to close and show error in toast, but let's simple close.
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-surface border border-border w-full max-w-lg rounded-xl shadow-2xl flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-border">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Wand2 className="text-primary" size={20} />
              Generate Asset
            </h2>
            <p className="text-sm text-gray-400 mt-1">
              Using {referencesCount} style references
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            <X size={24} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto flex-1">
          <form id="gen-form" onSubmit={handleSubmit} className="space-y-6">
            
            {/* Category */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Category</label>
              <select 
                value={category} 
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-black/40 border border-gray-700 rounded-lg px-4 py-2.5 text-gray-200 focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
              >
                {CATEGORIES.filter(c => c !== 'All').map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            {/* Prompt */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Prompt</label>
              <textarea 
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="e.g. glowing purple cyberpunk eyes, 4 animation frames, 128px"
                className="w-full h-32 bg-black/40 border border-gray-700 rounded-lg px-4 py-3 text-gray-200 placeholder-gray-500 focus:ring-2 focus:ring-primary focus:border-transparent outline-none resize-none"
                required
              />
            </div>

            {/* Config Grid */}
            <div className="grid grid-cols-2 gap-4">
              {/* Style Strength */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Style Adherence</label>
                <select 
                  value={styleStrength}
                  onChange={(e) => setStyleStrength(e.target.value as StyleStrength)}
                  className="w-full bg-black/40 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 focus:ring-2 focus:ring-primary outline-none"
                >
                  <option value="Exact match">Exact match</option>
                  <option value="Slight variation">Slight variation</option>
                  <option value="Wild new style">Wild new style</option>
                </select>
              </div>

              {/* Resolution */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Resolution</label>
                <div className="flex bg-black/40 border border-gray-700 rounded-lg p-1">
                  {(['1K', '2K', '4K'] as Resolution[]).map((res) => (
                    <button
                      key={res}
                      type="button"
                      onClick={() => setResolution(res)}
                      className={`flex-1 text-xs py-1.5 rounded-md transition-all ${
                        resolution === res 
                        ? 'bg-gray-700 text-white font-medium shadow' 
                        : 'text-gray-400 hover:text-gray-200'
                      }`}
                    >
                      {res}
                    </button>
                  ))}
                </div>
              </div>
            </div>

          </form>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-border bg-surface/50 rounded-b-xl">
          <button 
            type="submit" 
            form="gen-form"
            disabled={loading}
            className={`
              w-full flex items-center justify-center gap-2 py-3 rounded-lg font-bold text-white shadow-lg transition-all
              ${loading 
                ? 'bg-gray-700 cursor-not-allowed' 
                : 'bg-gradient-to-r from-primary to-teal-400 hover:from-primaryHover hover:to-teal-500 shadow-primary/25 hover:shadow-primary/40'
              }
            `}
          >
            {loading ? (
              <>
                <Loader2 className="animate-spin" size={20} /> Generating...
              </>
            ) : (
              <>
                <Wand2 size={20} /> Generate Spritesheet
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default GeneratorModal;