'use client';
import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { Upload, Play, Save, X, Film, Music, Move, CheckCircle } from 'lucide-react';

interface Props {
  skillId: string;
  skillName: string;
  onClose: () => void;
}

export default function SkillVisualsEditor({ skillId, skillName, onClose }: Props) {
  const [loading, setLoading] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentFrame, setCurrentFrame] = useState(0);

  // VISUAL CONFIG
  const [config, setConfig] = useState({
    sprite_url: '',
    sfx_url: '',
    frame_count: 25,
    frame_width: 200,
    frame_height: 200,
    offset_x: 0,
    offset_y: 0,
    preview_scale: 1,
    duration_ms: 1300,
    vfx_type: 'impact'
  });

  const [dragOverSprite, setDragOverSprite] = useState(false);
  const [dragOverSfx, setDragOverSfx] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const getFileName = (url: string) => {
    if (!url) return '';
    try {
      return new URL(url).pathname.split('/').pop();
    } catch {
      return url.split('/').pop()?.split('?')[0];
    }
  };

  // 1. FETCH EXISTING CONFIG
  useEffect(() => {
    const fetchAnim = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('skill_animations')
        .select('*')
        .eq('skill_id', skillId)
        .maybeSingle();
      
      if (!error && data) {
        setConfig({
          sprite_url: data.sprite_url || '',
          sfx_url: data.sfx_url || '',
          frame_count: data.frame_count ?? 25,
          frame_width: data.frame_width ?? data.frame_size ?? 200,
          frame_height: data.frame_height ?? data.frame_size ?? 200,
          offset_x: data.offset_x ?? 0,
          offset_y: data.offset_y ?? 0,
          preview_scale: data.preview_scale ?? 1,
          duration_ms: data.duration_ms ?? 1300,
          vfx_type: data.vfx_type || 'impact'
        });
      }
      setLoading(false);
    };
    fetchAnim();
  }, [skillId]);

  // 2. EFFECT-DRIVEN ANIMATION LOOP (Vercel Fix)
  useEffect(() => {
    if (!isPlaying) {
      setCurrentFrame(0);
      return;
    }

    const frames = Math.max(1, Number(config.frame_count) || 1);
    const duration = Math.max(10, Number(config.duration_ms) || 1000);
    const frameDur = duration / frames;

    const interval = setInterval(() => {
      setCurrentFrame(prev => {
        if (prev + 1 >= frames) {
          clearInterval(interval);
          setIsPlaying(false);
          return 0;
        }
        return prev + 1;
      });
    }, frameDur);

    return () => clearInterval(interval);
  }, [isPlaying, config.frame_count, config.duration_ms]);

  // 3. UPLOAD HANDLERS
  const handleUpload = async (file: File, type: 'sprite' | 'sfx') => {
    if (!file) return;
    setLoading(true);

    const ext = file.name.split('.').pop();
    const filePath = `${type}s/${skillId}_${type}.${ext}`;

    const { error } = await supabase.storage.from('game-assets').upload(filePath, file, {
      upsert: true,
      contentType: file.type
    });

    if (error) {
      alert('Upload Error: ' + error.message);
    } else {
      const { data } = supabase.storage.from('game-assets').getPublicUrl(filePath);
      setConfig(prev => ({
        ...prev,
        [type === 'sprite' ? 'sprite_url' : 'sfx_url']: `${data.publicUrl}?t=${Date.now()}`
      }));
    }
    setLoading(false);
  };

  const handleDragOver = (e: React.DragEvent, type: 'sprite' | 'sfx') => {
    e.preventDefault();
    e.stopPropagation();
    type === 'sprite' ? setDragOverSprite(true) : setDragOverSfx(true);
  };

  const handleDragLeave = (e: React.DragEvent, type: 'sprite' | 'sfx') => {
    e.preventDefault();
    e.stopPropagation();
    type === 'sprite' ? setDragOverSprite(false) : setDragOverSfx(false);
  };

  const handleDrop = (e: React.DragEvent, type: 'sprite' | 'sfx') => {
    e.preventDefault();
    e.stopPropagation();
    type === 'sprite' ? setDragOverSprite(false) : setDragOverSfx(false);

    if (e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      if (type === 'sprite' && !file.type.startsWith('image/')) return alert('Need an image file');
      if (type === 'sfx' && !file.type.startsWith('audio/')) return alert('Need an audio file');
      handleUpload(file, type);
    }
  };

  // 4. SAVE TO DB
  const handleSave = async () => {
    const { error } = await supabase.from('skill_animations').upsert({
      skill_id: skillId, ...config
    }, { onConflict: 'skill_id' });

    if (!error) alert('Visuals Synced!');
    else alert(error.message);
  };

  // 5. THE SYNCHRONIZED PLAY BUTTON
  const playPreview = () => {
    setIsPlaying(false);
    setCurrentFrame(0);
    
    // Audio is fixed: It now correctly references the src set on the audio tag
    if (audioRef.current && config.sfx_url) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(e => console.warn("Audio error:", e));
    }

    // Trigger the animation effect to beat Vercel batching
    setTimeout(() => {
      setIsPlaying(true);
    }, 50); 
  };

  return (
    <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-8">
      <div className="bg-[#0a0a0a] border border-cyan-900/50 w-full max-w-4xl h-[600px] rounded-xl flex overflow-hidden shadow-2xl">
        
        {/* LEFT: CONTROLS */}
        <div className="w-1/2 p-6 border-r border-gray-800 overflow-y-auto space-y-6 relative">
          {loading && (
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm z-10 flex items-center justify-center">
              <div className="flex flex-col items-center gap-2">
                <div className="w-6 h-6 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
                <span className="text-[10px] text-cyan-500 font-bold uppercase tracking-widest">Accessing Database...</span>
              </div>
            </div>
          )}
          <div className="flex justify-between items-center">
            <h2 className="text-cyan-500 font-bold uppercase tracking-widest">Visual Editor: {skillName}</h2>
          </div>

          {/* 1. SPRITE UPLOAD */}
          <div className="bg-gray-900/50 p-4 rounded border border-gray-800">
            <label className="text-xs uppercase text-gray-500 mb-2 flex items-center gap-2"><Film size={14}/> Sprite Sheet</label>
            <div
              className={`relative border-2 border-dashed rounded-lg p-6 mb-3 transition-all ${dragOverSprite ? 'border-cyan-500 bg-cyan-500/10' : 'border-gray-600'}`}
              onDragOver={e => handleDragOver(e, 'sprite')}
              onDragLeave={e => handleDragLeave(e, 'sprite')}
              onDrop={e => handleDrop(e, 'sprite')}
            >
              <div className="text-center">
                <Upload className="mx-auto mb-2 text-gray-500" size={24} />
                <p className="text-sm font-medium text-gray-400">Drag & drop spritesheet</p>
                <p className="text-xs text-gray-600">PNG, JPG, GIF, WebP (max 5MB)</p>
              </div>
              <input type="file" accept="image/*" onChange={e => e.target.files && handleUpload(e.target.files[0], 'sprite')} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
            </div>
            {config.sprite_url && (
              <div className="mt-2 p-2 bg-black/40 rounded border border-green-900/30 flex items-center justify-between">
                <div className="text-[10px] text-green-500 font-bold flex items-center gap-1 overflow-hidden">
                  <CheckCircle size={10} className="flex-shrink-0" /> 
                  <span className="truncate">{getFileName(config.sprite_url)}</span>
                </div>
                <a href={config.sprite_url} target="_blank" rel="noreferrer" className="text-[9px] text-cyan-500 hover:underline uppercase flex-shrink-0 ml-2">View</a>
              </div>
            )}
            
            <div className="grid grid-cols-2 gap-4 mt-3">
               <div>
                 <span className="text-[10px] text-gray-600">Frames</span>
                 <input type="number" value={config.frame_count} onChange={e => setConfig({...config, frame_count: Number(e.target.value)})} className="w-full bg-black p-1 text-sm border border-gray-700 rounded outline-none focus:border-cyan-500"/>
               </div>
               <div>
                 <span className="text-[10px] text-gray-600">Speed (ms)</span>
                 <input type="number" value={config.duration_ms} onChange={e => setConfig({...config, duration_ms: Number(e.target.value)})} className="w-full bg-black p-1 text-sm border border-gray-700 rounded outline-none focus:border-cyan-500"/>
               </div>
            </div>

            <div className="grid grid-cols-3 gap-2 mt-3">
               <div>
                 <span className="text-[10px] text-gray-600">Width (px)</span>
                 <input type="number" value={config.frame_width} onChange={e => setConfig({...config, frame_width: Number(e.target.value)})} className="w-full bg-black p-1 text-sm border border-gray-700 rounded outline-none focus:border-cyan-500"/>
               </div>
               <div>
                 <span className="text-[10px] text-gray-600">Height (px)</span>
                 <input type="number" value={config.frame_height} onChange={e => setConfig({...config, frame_height: Number(e.target.value)})} className="w-full bg-black p-1 text-sm border border-gray-700 rounded outline-none focus:border-cyan-500"/>
               </div>
               <div>
                 <span className="text-[10px] text-gray-600">Preview Scale</span>
                 <select value={config.preview_scale} onChange={e => setConfig({...config, preview_scale: Number(e.target.value)})} className="w-full bg-black p-1 text-sm border border-gray-700 rounded outline-none focus:border-cyan-500">
                   <option value={0.5}>0.5x</option><option value={1}>1x</option><option value={1.5}>1.5x</option><option value={2}>2x</option>
                 </select>
               </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mt-3 bg-gray-900/30 p-2 rounded border border-gray-800 border-dashed">
               <div>
                 <span className="text-[10px] text-gray-500">Offset X</span>
                 <input type="number" value={config.offset_x} onChange={e => setConfig({...config, offset_x: Number(e.target.value)})} className="w-full bg-black p-1 text-sm border border-gray-700 rounded outline-none focus:border-cyan-500"/>
               </div>
               <div>
                 <span className="text-[10px] text-gray-500">Offset Y</span>
                 <input type="number" value={config.offset_y} onChange={e => setConfig({...config, offset_y: Number(e.target.value)})} className="w-full bg-black p-1 text-sm border border-gray-700 rounded outline-none focus:border-cyan-500"/>
               </div>
            </div>
          </div>

          {/* 2. AUDIO UPLOAD */}
          <div className="bg-gray-900/50 p-4 rounded border border-gray-800">
            <label className="text-xs uppercase text-gray-500 mb-2 flex items-center gap-2"><Music size={14}/> Sound Effect</label>
            <div
              className={`relative border-2 border-dashed rounded-lg p-6 mb-3 transition-all ${dragOverSfx ? 'border-green-500 bg-green-500/10' : 'border-gray-600'}`}
              onDragOver={e => handleDragOver(e, 'sfx')}
              onDragLeave={e => handleDragLeave(e, 'sfx')}
              onDrop={e => handleDrop(e, 'sfx')}
            >
              <div className="text-center">
                <Upload className="mx-auto mb-2 text-gray-500" size={24} />
                <p className="text-sm font-medium text-gray-400">Drag & drop audio</p>
                <p className="text-xs text-gray-600">MP3, WAV, OGG, WebM (max 5MB)</p>
              </div>
              <input type="file" accept="audio/*" onChange={e => e.target.files && handleUpload(e.target.files[0], 'sfx')} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
            </div>
            {config.sfx_url && (
              <div className="mt-2 p-2 bg-black/40 rounded border border-green-900/30 flex items-center justify-between">
                <div className="text-[10px] text-green-500 font-bold flex items-center gap-1 overflow-hidden">
                  <CheckCircle size={10} className="flex-shrink-0" /> 
                  <span className="truncate">{getFileName(config.sfx_url)}</span>
                </div>
                {/* Restored the Test button for the individual SFX section */}
                <button 
                  onClick={() => {
                    if (audioRef.current && config.sfx_url) {
                      audioRef.current.currentTime = 0;
                      audioRef.current.play().catch(e => console.warn('Audio play error:', e));
                    }
                  }} 
                  className="text-[9px] text-cyan-500 hover:underline uppercase flex-shrink-0 ml-2"
                >
                  Test
                </button>
              </div>
            )}
          </div>

          {/* 3. MOVEMENT TYPE */}
          <div className="bg-gray-900/50 p-4 rounded border border-gray-800">
            <label className="text-xs uppercase text-gray-500 mb-2 flex items-center gap-2"><Move size={14}/> Movement Logic</label>
            <div className="flex flex-wrap gap-2">
               {['impact', 'projectile', 'melee', 'beam', 'aoe'].map(type => (
                 <button 
                   key={type}
                   onClick={() => setConfig({...config, vfx_type: type})}
                   className={`px-3 py-1 text-xs uppercase border ${config.vfx_type === type ? 'bg-cyan-900 text-cyan-400 border-cyan-500' : 'border-gray-700 text-gray-500'}`}
                 >
                   {type}
                 </button>
               ))}
            </div>
          </div>

          <div className="flex gap-2 pt-4">
             <button onClick={handleSave} className="flex-1 bg-green-700 py-3 font-bold uppercase text-xs hover:bg-green-600 rounded flex items-center justify-center gap-2">
               <Save size={16}/> Sync Assets
             </button>
             <button onClick={onClose} className="bg-gray-800 px-4 py-3 rounded text-gray-400 hover:text-white"><X/></button>
          </div>
        </div>

        {/* RIGHT: LIVE PREVIEW (PIXEL-PERFECT MASK FIX) */}
        <div className="w-1/2 bg-black relative flex flex-col items-center justify-center border-l border-gray-800">
           <div className="absolute top-4 right-4 text-[10px] text-gray-600 font-mono">LIVE RENDER ENGINE</div>
           
           <div className="relative group flex items-center justify-center">
             
             {/* THE MASK (The exact size of one frame) */}
             <div 
               style={{
                 width: `${config.frame_width}px`,
                 height: `${config.frame_height}px`,
                 transform: `scale(${config.preview_scale})`,
                 overflow: 'hidden', // Hides the rest of the spritesheet
                 position: 'relative',
                 imageRendering: 'pixelated',
               }} 
               className="border border-cyan-500/30 bg-gray-900/20 shadow-[0_0_20px_rgba(6,182,212,0.1)] transition-transform"
             >
               {config.sprite_url ? (
                 /* THE SLIDING IMAGE (Calculated in exact rigid pixels) */
                 <img 
                   src={config.sprite_url} 
                   alt="Sprite preview"
                   style={{
                     position: 'absolute',
                     top: 0,
                     left: 0,
                     // Force the image to be its exact true pixel width
                     width: `${Number(config.frame_count) * Number(config.frame_width)}px`,
                     height: `${config.frame_height}px`,
                     maxWidth: 'none', // Kills Next.js global image squishing
                     
                     // Hardware-accelerated, exact pixel snapping. NO PERCENTAGES.
                     transform: `translate3d(${-(currentFrame * Number(config.frame_width)) + Number(config.offset_x)}px, ${Number(config.offset_y)}px, 0)`,
                     transition: 'none',
                   }}
                 />
               ) : (
                 <span className="flex h-full w-full items-center justify-center text-[10px] text-gray-700 text-center px-2">
                   No Sprite Uploaded
                 </span>
               )}
             </div>

             {config.sprite_url && (
               <div className="absolute -bottom-14 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap text-[8px] text-cyan-500 uppercase tracking-tighter bg-black/80 px-3 py-2 rounded border border-cyan-900/50 flex flex-col items-center gap-1 z-10">
                 <span>Frame: {currentFrame + 1}/{config.frame_count}</span>
               </div>
             )}
           </div>

           <div className="mt-12 flex gap-4">
             <button onClick={playPreview} className="bg-cyan-600 hover:bg-cyan-500 text-white px-6 py-2 rounded-full font-bold flex items-center gap-2 shadow-lg shadow-cyan-900/20 transition-all hover:scale-105 active:scale-95">
               <Play size={16} fill="white" /> Test Animation + Audio
             </button>
           </div>

           {/* FIXED: The audio tag actually has the source URL attached now */}
           <audio ref={audioRef} src={config.sfx_url} />
        </div>
      </div>
    </div>
  );
}