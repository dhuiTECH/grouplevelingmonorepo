import React, { useState, useEffect, useRef } from 'react';
import Sidebar from './components/Sidebar';
import { 
  GeneratedAsset, 
  ReferenceImage, 
  CATEGORIES, 
  Resolution,
  StyleStrength, 
  AssetType, 
  SkillType, 
  ModelType, 
  BaseBodyType 
} from './types';
import { 
  Download, 
  Trash2, 
  Loader2, 
  Menu, 
  Sword, 
  User, 
  Box, 
  Sparkles, 
  Zap, 
  LayoutGrid, 
  Shield, 
  LogOut, 
  Database, 
  Plus, 
  Smile, 
  Shirt, 
  Crown, 
  Footprints, 
  Ghost, 
  Palette, 
  Scissors, 
  Eye, 
  ScanLine, 
  Settings, 
  Layers, 
  Upload,
  X,
  Hexagon,
  Skull,
  PawPrint,
  Users,
  Grid,
  Sun,
  Moon
} from './components/Icons';
import { generateAsset } from './services/geminiService';

// Helper to resize image (downsample)
const resizeImage = (dataUrl: string, width: number, height: number): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        // Use pixelated smoothing for pixel art styles
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/png'));
      } else {
        reject(new Error("Canvas context failed"));
      }
    };
    img.onerror = (e) => reject(e);
    img.src = dataUrl;
  });
};

const CATEGORIES_ALLOWED_512 = [
  'Avatars', 'Base Body', 'Eyes', 'Mouth', 'Hair', 'Face', 'Body', 
  'Background', 'Head', 'Back', 'Feet', 'Weapons', 'Accessories', 'Other'
];

// Simplified to just Green (default) and Checker (for inspection)
type PreviewBackground = 'green' | 'checker';

export default function App() {
  // --- STATE ---
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  // Persisted Data
  const [references, setReferences] = useState<ReferenceImage[]>([]);
  const [assets, setAssets] = useState<GeneratedAsset[]>([]);
  const [baseBodies, setBaseBodies] = useState<{ male: string | null; female: string | null }>({ male: null, female: null });
  
  // Selection & UI State
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);
  const [loadingAsset, setLoadingAsset] = useState<Partial<GeneratedAsset> | null>(null);
  const [hasApiKey, setHasApiKey] = useState(false);
  
  // Defaulting to Green Screen as requested
  const [previewBg, setPreviewBg] = useState<PreviewBackground>('green');

  // Form State
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [prompt, setPrompt] = useState('');
  const [resolution, setResolution] = useState<Resolution>('1K');
  const [styleStrength, setStyleStrength] = useState<StyleStrength>('Exact match');
  const [model, setModel] = useState<ModelType>('gemini-3-pro-image-preview');
  const [batchSize, setBatchSize] = useState<number>(1);
  const [baseBodyType, setBaseBodyType] = useState<BaseBodyType>('none');
  
  // Animation State
  const [assetType, setAssetType] = useState<AssetType>('static');
  const [frames, setFrames] = useState<number>(6);
  const [skillType, setSkillType] = useState<SkillType>('Melee Slash');

  // Refs for file uploads
  const maleUploadRef = useRef<HTMLInputElement>(null);
  const femaleUploadRef = useRef<HTMLInputElement>(null);

  // Map categories to icons
  const getCategoryIcon = (cat: string) => {
    switch(cat) {
      case 'Avatars': return <User size={16} />;
      case 'Base Body': return <User size={16} className="opacity-50" />;
      case 'Eyes': return <Eye size={16} />;
      case 'Mouth': return <Smile size={16} />;
      case 'Hair': return <Scissors size={16} />;
      case 'Face': return <Smile size={16} className="opacity-70" />;
      case 'Body': return <Shirt size={16} />;
      case 'Background': return <LayoutGrid size={16} />;
      case 'Head': return <Smile size={16} />;
      case 'Back': return <Shield size={16} />;
      case 'Feet': return <Footprints size={16} />;
      case 'Weapons': return <Sword size={16} />;
      case 'Magic Effects': return <Zap size={16} />;
      case 'Accessories': return <Crown size={16} />;
      case 'Other': return <Box size={16} />;
      case 'Skills FX': return <Sparkles size={16} />;
      case 'Skill Icons': return <Hexagon size={16} />;
      case 'Mobs': return <Skull size={16} />;
      case 'Pets': return <PawPrint size={16} />;
      case 'NPCs': return <Users size={16} />;
      default: return <LayoutGrid size={16} />;
    }
  };

  // --- EFFECTS ---
  useEffect(() => {
    const savedRefs = localStorage.getItem('pixelForge_references');
    const savedAssets = localStorage.getItem('pixelForge_assets');
    const savedBaseBodies = localStorage.getItem('pixelForge_baseBodies');
    
    if (savedRefs) {
      try { 
        const parsedRefs = JSON.parse(savedRefs);
        // Migration support for old references without category
        const migratedRefs = parsedRefs.map((ref: any) => ({
            ...ref,
            category: ref.category || 'Other' 
        }));
        setReferences(migratedRefs); 
      } catch (e) { console.error(e); }
    }
    
    if (savedAssets) {
      try {
        const parsed = JSON.parse(savedAssets);
        setAssets(parsed);
        if (parsed.length > 0) setSelectedAssetId(parsed[0].id);
      } catch (e) { console.error(e); }
    }

    if (savedBaseBodies) {
      try { setBaseBodies(JSON.parse(savedBaseBodies)); } catch (e) { console.error(e); }
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('pixelForge_references', JSON.stringify(references));
    } catch (e) {
      console.warn("Storage Quota Exceeded for References. Data may not persist.", e);
    }
  }, [references]);

  useEffect(() => {
    try {
      localStorage.setItem('pixelForge_assets', JSON.stringify(assets));
    } catch (e) {
      console.warn("Storage Quota Exceeded for Assets. Data may not persist.", e);
    }
  }, [assets]);

  useEffect(() => {
    try {
      localStorage.setItem('pixelForge_baseBodies', JSON.stringify(baseBodies));
    } catch (e) {
      console.warn("Storage Quota Exceeded for BaseBodies. Data may not persist.", e);
    }
  }, [baseBodies]);

  useEffect(() => {
    const checkApiKey = async () => {
      try {
        const win = window as any;
        if (win.aistudio && win.aistudio.hasSelectedApiKey) {
          const has = await win.aistudio.hasSelectedApiKey();
          setHasApiKey(has);
        } else {
          setHasApiKey(true);
        }
      } catch (error) {
        console.error("Auth check failed:", error);
        setHasApiKey(true); // Fallback
      }
    };
    checkApiKey();
  }, []);

  // Update resolution if category changes to one that doesn't support current selection (e.g. from Avatar/512 to Mobs)
  useEffect(() => {
    if (resolution === '512' && !CATEGORIES_ALLOWED_512.includes(category)) {
      setResolution('1K');
    }
  }, [category, resolution]);

  // --- HANDLERS ---
  const handleSelectApiKey = async () => {
    try {
      const win = window as any;
      if (win.aistudio && win.aistudio.openSelectKey) {
        await win.aistudio.openSelectKey();
        setHasApiKey(true);
      }
    } catch (error) {
      console.error("API Key selection failed:", error);
      alert("Failed to open API key selector.");
    }
  };

  const handleBaseBodyUpload = (type: 'male' | 'female', e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setBaseBodies(prev => ({
            ...prev,
            [type]: event.target!.result as string
          }));
          setBaseBodyType(type); // Auto select uploaded
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const clearBaseBody = (type: 'male' | 'female', e: React.MouseEvent) => {
      e.stopPropagation();
      setBaseBodies(prev => ({ ...prev, [type]: null }));
      if (baseBodyType === type) setBaseBodyType('none');
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;

    const tempId = 'temp-' + Date.now();
    
    // Show loading state (generic for batch)
    setLoadingAsset({
      id: tempId,
      category,
      prompt,
      createdAt: Date.now(),
      resolution,
      type: assetType
    });
    setSelectedAssetId(null); 

    try {
      // Get correct base body image if selected
      const baseBodyImage = baseBodyType !== 'none' ? baseBodies[baseBodyType] : null;

      // Filter references for current category only
      const activeReferences = references.filter(r => r.category === category);

      // Safe batch handling - map promises to catch individual errors so we don't fail the whole batch if one flakes
      const promises = Array.from({ length: batchSize }).map(async () => {
         try {
           const imageUrl = await generateAsset({
            category,
            prompt,
            resolution,
            styleStrength,
            references: activeReferences,
            assetType,
            frames,
            skillType,
            model,
            baseBodyImage
           });
           
           // Handle 512 resize
           if (resolution === '512') {
             return await resizeImage(imageUrl, 512, 512);
           }
           
           return imageUrl;
         } catch (err: any) {
            console.warn("Single generation failed in batch:", err);
            if (err?.message?.includes("Requested entity was not found")) {
                throw err;
            }
            return null;
         }
      });

      const results = await Promise.all(promises);
      const successfulResults = results.filter((res): res is string => typeof res === 'string');

      if (successfulResults.length === 0 && results.length > 0) {
         throw new Error("Batch generation failed completely. Please try again.");
      }

      const newAssets: GeneratedAsset[] = successfulResults.map(imageUrl => ({
        id: Date.now().toString() + Math.random().toString().slice(2, 8),
        category,
        prompt,
        createdAt: Date.now(),
        resolution,
        imageUrl,
        type: assetType
      }));

      setAssets(prev => [...newAssets, ...prev]);
      
      // Select the first of the new batch
      if (newAssets.length > 0) {
        setSelectedAssetId(newAssets[0].id);
      }

    } catch (error: any) {
      if (error?.message?.includes("Requested entity was not found")) {
        setHasApiKey(false);
        try {
          await handleSelectApiKey();
        } catch (authError) {
          console.error("Re-auth failed", authError);
        }
      } else {
        console.error("Generation Error:", error);
        alert(`GENERATION FAILED: ${error?.message || "Unknown error"}`);
      }
    } finally {
      setLoadingAsset(null);
    }
  };

  const handleDeleteAsset = (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (window.confirm('CONFIRM DELETION: Cannot be undone.')) {
      const updatedAssets = assets.filter(a => a.id !== id);
      setAssets(updatedAssets);
      
      if (selectedAssetId === id) {
        setSelectedAssetId(updatedAssets.length > 0 ? updatedAssets[0].id : null);
      }
    }
  };

  const handleDownloadAsset = (asset: GeneratedAsset, e: React.MouseEvent) => {
    e.stopPropagation();
    const link = document.createElement('a');
    link.href = asset.imageUrl;
    link.download = `hunter-system-${asset.category.toLowerCase()}-${asset.id}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const activeAsset = assets.find(a => a.id === selectedAssetId);
  const isSkillCategory = category === 'Skills FX';

  // --- RENDER ---
  if (!hasApiKey) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-system font-mono relative overflow-hidden">
        <div className="absolute inset-0 bg-grid opacity-20 pointer-events-none"></div>
        <div className="bg-surface p-10 border border-system/30 text-center max-w-md shadow-[0_0_50px_rgba(59,130,246,0.2)] relative z-10">
          <h1 className="text-4xl font-bold mb-2 tracking-widest text-white font-sans uppercase">Admin Access</h1>
          <div className="h-0.5 w-24 bg-primary mx-auto mb-6"></div>
          <p className="mb-8 text-gray-400 text-sm">SYSTEM AUTHENTICATION REQUIRED</p>
          
          <div className="text-left mb-4">
            <label className="text-[10px] text-primary font-bold uppercase tracking-wider mb-1 block">Authentication Protocol</label>
            <button 
              onClick={handleSelectApiKey}
              className="w-full bg-primaryDark/20 border border-primary text-primary hover:bg-primary hover:text-white py-3 font-bold tracking-wider transition-all uppercase text-sm"
            >
              Connect API Key
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-background text-gray-200 font-sans overflow-hidden">
      
      <Sidebar 
        references={references} 
        setReferences={setReferences} 
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        category={category}
      />

      <div className="flex-1 flex flex-col min-w-0">
        
        {/* TOP NAV BAR */}
        <header className="h-20 bg-black border-b border-border flex flex-col relative shrink-0 z-20">
          
          {/* Top Info Bar */}
          <div className="flex justify-between items-center px-4 py-1 text-[10px] font-mono text-gray-500 uppercase border-b border-white/5">
            <div className="flex items-center gap-4">
              <span className="text-primary font-bold tracking-widest">HUNTER MANAGEMENT SYSTEM</span>
              <span>Logged in as: ADMIN</span>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-primary">PENDING APPROVALS: 1</span>
              <button className="bg-primary hover:bg-red-600 text-white px-3 py-0.5 rounded-sm flex items-center gap-1 font-bold">
                <LogOut size={10} /> LOGOUT
              </button>
            </div>
          </div>

          {/* Navigation Items (Categories) */}
          <div className="flex-1 flex items-center px-4 overflow-x-auto no-scrollbar gap-2">
             <button 
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden p-2 text-system hover:text-white"
             >
               <Menu size={24} />
             </button>

             {CATEGORIES.map(cat => (
               <button
                 key={cat}
                 onClick={() => setCategory(cat)}
                 className={`
                   flex flex-col items-center justify-center px-3 py-1 gap-1 min-w-[70px] group transition-all border-b-2 
                   ${category === cat 
                     ? 'border-primary text-white' 
                     : 'border-transparent text-gray-500 hover:text-gray-300 hover:border-gray-700'
                   }
                 `}
               >
                 <div className={`
                    p-1.5 rounded-md transition-all
                    ${category === cat ? 'bg-primary/20 text-primary' : 'bg-transparent group-hover:bg-white/5'}
                 `}>
                   {getCategoryIcon(cat)}
                 </div>
                 <span className="text-[9px] uppercase font-bold tracking-wider whitespace-nowrap">{cat}</span>
               </button>
             ))}
          </div>
        </header>

        {/* WORKSPACE */}
        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden relative">
          
          {/* LEFT PANEL: Construction Form */}
          <div className="w-full lg:w-[450px] bg-[#050912] border-r border-border flex flex-col shrink-0 overflow-y-auto custom-scrollbar relative z-10">
            <div className="p-6">
              
              <div className="flex items-center justify-between mb-6">
                 <h2 className="text-xl font-bold text-primary flex items-center gap-2 uppercase tracking-widest">
                   <Plus size={20} /> Asset Construction
                 </h2>
                 {/* Database Toggle (Compact) */}
                 <button 
                    onClick={() => setSidebarOpen(true)}
                    className="text-[10px] text-system hover:text-white border border-system/30 hover:border-system px-2 py-1 rounded-sm flex items-center gap-1 transition-all"
                 >
                   <Database size={10} /> STYLE REF DB
                 </button>
              </div>

              {/* SEARCH MOCK (Visual only) */}
              <div className="flex gap-2 mb-8">
                <div className="flex-1 bg-surface border border-border px-3 py-2 text-xs text-gray-500 font-mono rounded-sm flex items-center gap-2">
                   <span>ID:</span>
                   <span className="text-gray-300">AUTO-GENERATED</span>
                </div>
                <div className="bg-primary px-4 py-2 text-xs font-bold text-white uppercase rounded-sm flex items-center gap-1 shadow-[0_0_15px_rgba(239,68,68,0.4)]">
                   ACTIVE
                </div>
              </div>

              <form onSubmit={handleGenerate} className="space-y-6">
                
                {/* Construction Class Switch (Static / Animated) */}
                <div>
                   <label className="text-[10px] uppercase font-bold text-gray-400 tracking-wider mb-2 block">Construction Type</label>
                   <div className="flex bg-surface border border-border rounded-sm p-1 gap-1">
                     <button
                        type="button"
                        onClick={() => setAssetType('static')}
                        className={`flex-1 py-2 text-[10px] font-bold uppercase transition-all flex items-center justify-center gap-2 rounded-sm ${assetType === 'static' ? 'bg-system text-white' : 'text-gray-500 hover:text-gray-300'}`}
                     >
                        <Box size={14} /> STATIC
                     </button>
                     <button
                        type="button"
                        onClick={() => setAssetType('spritesheet')}
                        className={`flex-1 py-2 text-[10px] font-bold uppercase transition-all flex items-center justify-center gap-2 rounded-sm ${assetType === 'spritesheet' ? 'bg-system text-white' : 'text-gray-500 hover:text-gray-300'}`}
                     >
                        <Ghost size={14} /> ANIMATED
                     </button>
                   </div>
                </div>

                {/* ANATOMY CONTEXT (Base Body) */}
                <div>
                   <label className="text-[10px] uppercase font-bold text-gray-400 tracking-wider mb-2 block">Anatomy Context (Ghost Mannequin Mode)</label>
                   <div className="grid grid-cols-3 gap-2">
                     <button
                       type="button"
                       onClick={() => setBaseBodyType('none')}
                       className={`flex flex-col items-center justify-center p-2 rounded-sm border transition-all ${baseBodyType === 'none' ? 'bg-white/10 border-white text-white' : 'bg-surface border-border text-gray-500 hover:border-gray-600'}`}
                     >
                       <span className="text-[9px] font-bold uppercase">NONE</span>
                     </button>
                     
                     {/* MALE BASE */}
                     <div className={`relative group border rounded-sm overflow-hidden ${baseBodyType === 'male' ? 'border-primary' : 'border-border'}`}>
                        <button
                          type="button"
                          onClick={() => setBaseBodyType('male')}
                          className={`w-full h-full p-2 flex flex-col items-center justify-center gap-1 ${baseBodyType === 'male' ? 'bg-primary/20 text-white' : 'bg-surface text-gray-500'}`}
                        >
                          {baseBodies.male ? (
                             <img src={baseBodies.male} className="w-8 h-8 object-contain opacity-80" />
                          ) : (
                             <User size={16} />
                          )}
                          <span className="text-[9px] font-bold uppercase">MALE</span>
                        </button>
                        <button 
                           type="button"
                           onClick={(e) => { e.stopPropagation(); maleUploadRef.current?.click(); }}
                           className="absolute top-0 right-0 p-1 bg-black/50 hover:bg-primary text-white opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                           <Upload size={8} />
                        </button>
                        {baseBodies.male && (
                          <button 
                             type="button"
                             onClick={(e) => clearBaseBody('male', e)}
                             className="absolute top-0 left-0 p-1 bg-black/50 hover:bg-red-500 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                             <X size={8} />
                          </button>
                        )}
                        <input type="file" ref={maleUploadRef} className="hidden" accept="image/png" onChange={(e) => handleBaseBodyUpload('male', e)} />
                     </div>

                     {/* FEMALE BASE */}
                     <div className={`relative group border rounded-sm overflow-hidden ${baseBodyType === 'female' ? 'border-primary' : 'border-border'}`}>
                        <button
                          type="button"
                          onClick={() => setBaseBodyType('female')}
                          className={`w-full h-full p-2 flex flex-col items-center justify-center gap-1 ${baseBodyType === 'female' ? 'bg-primary/20 text-white' : 'bg-surface text-gray-500'}`}
                        >
                          {baseBodies.female ? (
                             <img src={baseBodies.female} className="w-8 h-8 object-contain opacity-80" />
                          ) : (
                             <User size={16} />
                          )}
                          <span className="text-[9px] font-bold uppercase">FEMALE</span>
                        </button>
                        <button 
                           type="button"
                           onClick={(e) => { e.stopPropagation(); femaleUploadRef.current?.click(); }}
                           className="absolute top-0 right-0 p-1 bg-black/50 hover:bg-primary text-white opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                           <Upload size={8} />
                        </button>
                        {baseBodies.female && (
                          <button 
                             type="button"
                             onClick={(e) => clearBaseBody('female', e)}
                             className="absolute top-0 left-0 p-1 bg-black/50 hover:bg-red-500 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                             <X size={8} />
                          </button>
                        )}
                         <input type="file" ref={femaleUploadRef} className="hidden" accept="image/png" onChange={(e) => handleBaseBodyUpload('female', e)} />
                     </div>
                   </div>
                   {!baseBodies.male && !baseBodies.female && (
                     <p className="text-[9px] text-system mt-1.5 font-mono flex items-center gap-1">
                        <ScanLine size={8} /> UPLOAD BASE MESHES TO ENABLE OVERLAY
                     </p>
                   )}
                </div>

                {/* ANIMATION OPTIONS (Context Aware) */}
                {assetType === 'spritesheet' && (
                  <div className={`space-y-4 animate-in fade-in slide-in-from-top-2 border-l-2 pl-3 ${isSkillCategory ? 'border-primary' : 'border-system'}`}>
                     
                     {/* Frames Slider */}
                     <div className={`border p-3 rounded-sm ${isSkillCategory ? 'bg-primary/10 border-primary/30' : 'bg-system/10 border-system/30'}`}>
                        <div className="flex justify-between mb-2">
                           <label className={`text-[10px] uppercase font-bold tracking-wider ${isSkillCategory ? 'text-primary' : 'text-system'}`}>
                              {isSkillCategory ? 'VFX Sequence Length' : 'Character Frames'}
                           </label>
                           <span className="text-[10px] font-mono text-white">{frames} FRAMES</span>
                        </div>
                        <input 
                          type="range" min="3" max="36" step="1"
                          value={frames} onChange={(e) => setFrames(parseInt(e.target.value))}
                          className={`w-full h-1 bg-surface rounded-lg appearance-none cursor-pointer ${isSkillCategory ? 'accent-primary' : 'accent-system'}`}
                        />
                        <p className="text-[9px] text-gray-500 mt-2 font-mono">
                           {frames > 25 ? "* 6x6 Grid (Ultra Detail)" : frames > 16 ? "* 5x5 Grid (Very High Detail)" : frames > 8 ? "* Grid Layout (High Detail)" : "* Horizontal Strip (Standard)"}
                        </p>
                     </div>

                     {/* Skill VFX Type Selector (Only for Skills FX) */}
                     {isSkillCategory && (
                        <div>
                           <label className="text-[10px] uppercase font-bold text-gray-400 tracking-wider mb-2 block">Skill VFX Type</label>
                           <div className="grid grid-cols-2 gap-1.5">
                              {(['Projectile', 'Melee Slash', 'Impact/Hit', 'Area of Effect', 'Buff/Aura', 'Beam', 'Explosion'] as SkillType[]).map((st) => (
                                 <button
                                    key={st} type="button" onClick={() => setSkillType(st)}
                                    className={`py-2 text-[10px] font-bold uppercase transition-all border ${skillType === st ? 'bg-primary/20 border-primary text-primary' : 'bg-surface border-border text-gray-500'}`}
                                 >
                                    {st}
                                 </button>
                              ))}
                           </div>
                        </div>
                     )}
                  </div>
                )}
                
                {/* Prompt */}
                <div>
                  <div className="flex justify-between mb-1">
                    <label className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Parameter Input</label>
                    <span className="text-[10px] text-system font-mono">REQUIRED</span>
                  </div>
                  <div className="bg-surface p-1 border border-border focus-within:border-system/50 transition-colors">
                    <textarea
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      placeholder={
                        assetType === 'spritesheet'
                          ? isSkillCategory
                             ? `Describe the ${skillType.toUpperCase()} effect (e.g. 'Blue lightning orb exploding')...`
                             : "Describe the animation (e.g. 'Knight swinging heavy hammer', 'Idle breathing cycle')..." 
                          : "Describe item details (e.g. 'Ancient rune sword with glowing hilt')..."
                      }
                      className="w-full h-24 bg-transparent text-sm text-gray-300 placeholder-gray-600 focus:outline-none font-mono resize-none p-2"
                      required
                    />
                  </div>
                </div>

                {/* Model Selector */}
                <div>
                   <label className="text-[10px] uppercase font-bold text-gray-400 tracking-wider mb-1 block">Processing Core</label>
                   <div className="relative">
                      <select
                        value={model}
                        onChange={(e) => setModel(e.target.value as ModelType)}
                        className="w-full bg-surface border border-border p-2 pr-8 text-xs text-gray-300 focus:border-system/50 outline-none appearance-none font-mono rounded-sm transition-colors"
                      >
                        <option value="gemini-3-pro-image-preview">GEMINI 3.0 PRO (HIGH FIDELITY)</option>
                        <option value="gemini-3.1-flash-image-preview">NANO BANANA 2 (LATEST)</option>
                        <option value="gemini-2.5-flash-image">GEMINI 2.5 FLASH (FAST)</option>
                      </select>
                      <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500">
                         <Settings size={12} />
                      </div>
                   </div>
                </div>

                {/* Config Row */}
                <div className="grid grid-cols-2 gap-4">
                  {/* Resolution & Batch */}
                  <div className="space-y-4">
                     <div>
                        <label className="text-[10px] uppercase font-bold text-gray-400 tracking-wider mb-1 block">Resolution</label>
                        <div className={`flex bg-surface border border-border rounded-sm ${model === 'gemini-2.5-flash-image' ? 'opacity-50 pointer-events-none' : ''}`}>
                           {(['512', '1K', '2K', '4K'] as Resolution[]).map((res) => {
                             // Only show 512 for allowed categories
                             if (res === '512' && !CATEGORIES_ALLOWED_512.includes(category)) return null;

                             return (
                              <button
                                  key={res}
                                  type="button"
                                  onClick={() => setResolution(res)}
                                  className={`
                                    flex-1 py-2 text-[10px] font-bold transition-all
                                    ${resolution === res ? 'bg-system/20 text-system' : 'text-gray-600 hover:text-gray-400'}
                                  `}
                              >
                                  {res}
                              </button>
                             );
                           })}
                        </div>
                     </div>
                     <div>
                        <label className="text-[10px] uppercase font-bold text-gray-400 tracking-wider mb-1 block">Batch Quantity</label>
                        <div className="flex bg-surface border border-border rounded-sm">
                           {[1, 2, 3, 4, 5, 6, 7, 8].map((num) => (
                           <button
                              key={num}
                              type="button"
                              onClick={() => setBatchSize(num)}
                              className={`
                                 flex-1 py-2 text-[10px] font-bold transition-all flex items-center justify-center gap-1
                                 ${batchSize === num ? 'bg-system/20 text-system' : 'text-gray-600 hover:text-gray-400'}
                              `}
                           >
                              {num} <Layers size={8} className="opacity-50" />
                           </button>
                           ))}
                        </div>
                     </div>
                  </div>

                  <div>
                    <label className="text-[10px] uppercase font-bold text-gray-400 tracking-wider mb-1 block">Style Matrix</label>
                    <select 
                      value={styleStrength}
                      onChange={(e) => setStyleStrength(e.target.value as StyleStrength)}
                      className="w-full bg-surface border border-border p-2 text-xs text-gray-300 focus:border-system/50 outline-none appearance-none font-mono rounded-sm h-[106px]"
                      size={3}
                    >
                      <option value="Exact match">EXACT MATCH</option>
                      <option value="Slight variation">VARIATION</option>
                      <option value="Wild new style">DIVERGENT</option>
                    </select>
                  </div>
                </div>

                {/* Submit */}
                <button 
                  type="submit"
                  disabled={!!loadingAsset}
                  className={`
                    w-full py-4 uppercase font-bold tracking-widest text-sm text-white transition-all
                    ${loadingAsset 
                      ? 'bg-gray-800 cursor-not-allowed text-gray-500' 
                      : 'bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 shadow-[0_0_20px_rgba(220,38,38,0.4)]'
                    }
                  `}
                >
                  {loadingAsset ? (
                    <span className="flex items-center justify-center gap-2 animate-pulse">
                      <Loader2 className="animate-spin" size={16} /> MATERIALIZING (x{batchSize})...
                    </span>
                  ) : (
                    <span className="flex items-center justify-center gap-2">
                       INITIATE CONSTRUCTION
                    </span>
                  )}
                </button>

              </form>

              {/* Status Log */}
              <div className="mt-8 border-t border-border pt-4">
                <h3 className="text-[10px] uppercase font-bold text-gray-500 mb-2">System Log</h3>
                <div className="font-mono text-[10px] text-gray-600 space-y-1">
                   <p>&gt; SYSTEM READY</p>
                   <p>&gt; DB: {references.length} UNITS LOADED</p>
                   <p>&gt; CATEGORY: {category.toUpperCase()}</p>
                   <p>&gt; CORE: {model === 'gemini-3.1-flash-image-preview' ? 'NANO BANANA 2' : model === 'gemini-3-pro-image-preview' ? '3.0 PRO' : '2.5 FLASH'}</p>
                   <p>&gt; BATCH SIZE: {batchSize}</p>
                   {baseBodyType !== 'none' && <p>&gt; ANATOMY OVERLAY: {baseBodyType.toUpperCase()} MESH</p>}
                   <p>&gt; OUTPUT MODE: {assetType === 'spritesheet' ? (isSkillCategory ? 'SKILL VFX' : 'CHAR ANIM') : 'STATIC'}</p>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT PANEL: Viewport & Inventory */}
          <div className="flex-1 bg-background flex flex-col relative overflow-hidden">
             
             {/* Background Grid */}
             <div className="absolute inset-0 bg-grid opacity-20 pointer-events-none"></div>

             {/* MAIN PREVIEW */}
             <div className="flex-1 flex items-center justify-center p-8 relative">
                
                {/* Empty State */}
                {!activeAsset && !loadingAsset && (
                   <div className="text-center opacity-30">
                      <Shield size={80} className="mx-auto mb-4 text-system animate-pulse-slow" />
                      <h2 className="text-2xl font-bold tracking-widest text-system">SYSTEM STANDBY</h2>
                      <p className="font-mono text-sm mt-2">Awaiting construction parameters...</p>
                   </div>
                )}

                {/* Loading State */}
                {loadingAsset && (
                  <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm">
                    <div className="w-64 h-2 bg-gray-800 rounded-full overflow-hidden relative mb-4">
                       <div className="absolute top-0 left-0 h-full w-full bg-primary origin-left animate-[scan_2s_ease-in-out_infinite]"></div>
                    </div>
                    <div className="text-primary font-bold tracking-widest animate-pulse">CONSTRUCTING ASSETS (x{batchSize})</div>
                    <div className="text-xs font-mono text-gray-500 mt-2">PROCESSING...</div>
                  </div>
                )}

                {/* Active Asset Display */}
                {activeAsset && (
                   <div className={`
                      relative z-10 max-w-lg w-full aspect-square border border-system/30 shadow-[0_0_40px_rgba(59,130,246,0.1)] group transition-colors duration-300
                      ${previewBg === 'green' ? 'bg-[#00FF00]' : ''}
                   `}>
                      {/* Simplified Preview Control - Just Toggle Transparency */}
                      <div className="absolute top-4 right-4 z-30 flex gap-1 bg-black/50 p-1 rounded-sm backdrop-blur-sm">
                        <button 
                            onClick={() => setPreviewBg(prev => prev === 'green' ? 'checker' : 'green')} 
                            title={previewBg === 'green' ? "Switch to Transparent Grid" : "Switch to Green Screen"}
                            className="p-1.5 rounded-sm bg-system text-white hover:bg-systemGlow"
                        >
                            <Grid size={12}/>
                        </button>
                      </div>

                      {/* Corner Accents */}
                      <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-system pointer-events-none"></div>
                      <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-system pointer-events-none"></div>
                      <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-system pointer-events-none"></div>
                      <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-system pointer-events-none"></div>

                      {/* Checkerboard for Transparency Check - Only shown if previewBg is 'checker' */}
                      {previewBg === 'checker' && (
                        <div className="absolute inset-0 pointer-events-none bg-[#050912]" 
                            style={{
                                backgroundImage: `linear-gradient(45deg, #333 25%, transparent 25%), linear-gradient(-45deg, #333 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #333 75%), linear-gradient(-45deg, transparent 75%, #333 75%)`,
                                backgroundSize: '20px 20px',
                                backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px'
                            }} 
                        />
                      )}

                      <img 
                        src={activeAsset.imageUrl} 
                        alt={activeAsset.prompt}
                        className="w-full h-full object-contain p-8 image-pixelated relative z-10"
                      />

                      {/* Info Overlay */}
                      <div className="absolute bottom-0 left-0 right-0 bg-black/80 backdrop-blur-md p-4 border-t border-system/20 flex justify-between items-center z-20">
                         <div>
                            <div className="text-xs font-bold text-system uppercase tracking-wider">{activeAsset.category}</div>
                            <div className="text-[10px] text-gray-400 font-mono">{activeAsset.resolution} // {activeAsset.type.toUpperCase()}</div>
                         </div>
                         <div className="flex gap-2">
                            <button 
                              onClick={(e) => handleDownloadAsset(activeAsset, e)}
                              className="bg-system/20 hover:bg-system text-system hover:text-white px-3 py-1.5 text-xs font-bold uppercase rounded-sm transition-colors border border-system/50"
                            >
                              SAVE
                            </button>
                            <button 
                              onClick={(e) => handleDeleteAsset(activeAsset.id, e)}
                              className="bg-primary/20 hover:bg-primary text-primary hover:text-white px-3 py-1.5 text-xs font-bold uppercase rounded-sm transition-colors border border-primary/50"
                            >
                              DELETE
                            </button>
                         </div>
                      </div>
                   </div>
                )}
             </div>

             {/* INVENTORY / HISTORY LIST */}
             <div className="h-1/3 min-h-[250px] bg-[#020617] border-t border-border flex flex-col">
                <div className="px-6 py-3 border-b border-white/5 bg-surface/50 flex justify-between items-center">
                   <div className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                      <LayoutGrid size={14} /> Inventory ( {assets.length} )
                   </div>
                   <div className="flex gap-2">
                      <span className="bg-primary px-2 py-0.5 text-[9px] font-bold text-white rounded-sm">ALL STATUS</span>
                      <span className="bg-surface border border-border px-2 py-0.5 text-[9px] font-bold text-gray-500 rounded-sm">ACTIVE</span>
                   </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                   {assets.map(asset => (
                      <div 
                        key={asset.id}
                        onClick={() => setSelectedAssetId(asset.id)}
                        className={`
                          flex items-center gap-4 p-3 rounded-md border transition-all cursor-pointer group
                          ${selectedAssetId === asset.id 
                            ? 'bg-[#0f172a] border-system/50 shadow-[0_0_10px_rgba(59,130,246,0.1)]' 
                            : 'bg-[#050912] border-border hover:border-gray-600'
                          }
                        `}
                      >
                         {/* Thumbnail */}
                         <div className="w-16 h-16 bg-black border border-border shrink-0 relative">
                             <div className="absolute inset-0 opacity-20 pointer-events-none" 
                                style={{
                                    backgroundImage: `linear-gradient(45deg, #333 25%, transparent 25%), linear-gradient(-45deg, #333 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #333 75%), linear-gradient(-45deg, transparent 75%, #333 75%)`,
                                    backgroundSize: '10px 10px',
                                }} 
                             />
                            <img src={asset.imageUrl} className="w-full h-full object-contain image-pixelated relative z-10" />
                         </div>

                         {/* Details */}
                         <div className="flex-1 min-w-0">
                            <div className="text-sm font-bold text-gray-200 truncate group-hover:text-system transition-colors mb-1 font-sans">
                              {asset.prompt.slice(0, 50)}{asset.prompt.length > 50 ? '...' : ''}
                            </div>
                            <div className="text-[10px] text-gray-500 font-mono mb-2">
                               UID: {asset.id}
                            </div>
                            
                            {/* Data Grid */}
                            <div className="grid grid-cols-4 gap-4 text-[10px] font-mono">
                               <div>
                                  <span className="text-primary block mb-0.5">SLOT</span>
                                  <span className="text-gray-400 truncate">{asset.category}</span>
                               </div>
                               <div>
                                  <span className="text-system block mb-0.5">RES</span>
                                  <span className="text-gray-400">{asset.resolution}</span>
                               </div>
                               <div>
                                  <span className="text-purple-400 block mb-0.5">TYPE</span>
                                  <span className="text-gray-400">
                                     {asset.type === 'spritesheet' ? 'ANIM' : 'IMG'}
                                  </span>
                               </div>
                               <div className="text-right">
                                  <span className="bg-success/20 text-success px-1.5 py-0.5 rounded-sm inline-block">ACTIVE</span>
                               </div>
                            </div>
                         </div>

                         {/* Actions */}
                         <div className="flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button 
                               onClick={(e) => handleDownloadAsset(asset, e)}
                               className="bg-purple-600 hover:bg-purple-500 text-white text-[10px] font-bold px-3 py-1 rounded-sm"
                            >
                               COPY
                            </button>
                            <button 
                               onClick={(e) => handleDeleteAsset(asset.id, e)}
                               className="bg-red-600 hover:bg-red-500 text-white text-[10px] font-bold px-3 py-1 rounded-sm"
                            >
                               DELETE
                            </button>
                         </div>
                      </div>
                   ))}

                   {assets.length === 0 && (
                      <div className="text-center py-10 text-gray-600 font-mono text-xs">
                         NO ITEMS IN INVENTORY
                      </div>
                   )}
                </div>
             </div>
          </div>

        </div>
      </div>
    </div>
  );
}