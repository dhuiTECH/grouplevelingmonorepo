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
    vfx_type: 'impact' // 'projectile', 'melee', 'impact', 'beam', 'aoe'
  });

  // DRAG AND DROP STATES
  const [dragOverSprite, setDragOverSprite] = useState(false);
  const [dragOverSfx, setDragOverSfx] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  const getFileName = (url: string) => {
    if (!url) return '';
    try {
      const urlObj = new URL(url);
      const pathname = urlObj.pathname;
      const parts = pathname.split('/');
      return parts[parts.length - 1];
    } catch (e) {
      // Fallback if not a valid URL
      const parts = url.split('/');
      return parts[parts.length - 1].split('?')[0];
    }
  };

  // 1. FETCH EXISTING CONFIG
  useEffect(() => {
    const fetchAnim = async () => {
      setLoading(true);
      console.log('Fetching animation config for skill:', skillId);
      const { data, error } = await supabase
        .from('skill_animations')
        .select('*')
        .eq('skill_id', skillId)
        .maybeSingle();
      
      if (error) {
        console.error('Error fetching animation:', error);
      } else if (data) {
        console.log('Found existing animation:', data);
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

  // JS-DRIVEN ANIMATION LOOP
  useEffect(() => {
    if (!isPlaying) {
      setCurrentFrame(0);
      return;
    }

    const frameDuration = Math.max(10, config.duration_ms / (Math.max(1, config.frame_count)));
    let frame = 0;
    
    const interval = setInterval(() => {
      frame++;
      if (frame >= config.frame_count) {
        clearInterval(interval);
        setIsPlaying(false);
        setCurrentFrame(0);
      } else {
        setCurrentFrame(frame);
      }
    }, frameDuration);

    return () => clearInterval(interval);
  }, [isPlaying, config.duration_ms, config.frame_count]);

  // 2. UPLOAD HANDLER (Handles both Images and Audio)
  const handleUpload = async (file: File, type: 'sprite' | 'sfx') => {
    if (!file) return;
    setLoading(true);

    const ext = file.name.split('.').pop();
    const filePath = `${type}s/${skillId}_${type}.${ext}`; // e.g. sprites/fireball_sprite.png

    const { error } = await supabase.storage.from('game-assets').upload(filePath, file, {
      upsert: true,
      contentType: file.type
    });

    if (error) {
      alert('Upload Error: ' + error.message);
    } else {
      const { data } = supabase.storage.from('game-assets').getPublicUrl(filePath);
      const publicUrl = `${data.publicUrl}?t=${Date.now()}`; // Add timestamp to force refresh

      setConfig(prev => ({
        ...prev,
        [type === 'sprite' ? 'sprite_url' : 'sfx_url']: publicUrl
      }));
    }
    setLoading(false);
  };

  // DRAG AND DROP HANDLERS
  const handleDragOver = (e: React.DragEvent, type: 'sprite' | 'sfx') => {
    e.preventDefault();
    e.stopPropagation();
    if (type === 'sprite') {
      setDragOverSprite(true);
    } else {
      setDragOverSfx(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent, type: 'sprite' | 'sfx') => {
    e.preventDefault();
    e.stopPropagation();
    if (type === 'sprite') {
      setDragOverSprite(false);
    } else {
      setDragOverSfx(false);
    }
  };

  const handleDrop = (e: React.DragEvent, type: 'sprite' | 'sfx') => {
    e.preventDefault();
    e.stopPropagation();

    if (type === 'sprite') {
      setDragOverSprite(false);
    } else {
      setDragOverSfx(false);
    }

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      // Validate file type
      if (type === 'sprite' && !file.type.startsWith('image/')) {
        alert('Please drop an image file for spritesheet');
        return;
      }
      if (type === 'sfx' && !file.type.startsWith('audio/')) {
        alert('Please drop an audio file for SFX');
        return;
      }
      handleUpload(file, type);
    }
  };

  // 3. SAVE TO DB
  const handleSave = async () => {
    const { error } = await supabase.from('skill_animations').upsert({
      skill_id: skillId,
      ...config
    }, { onConflict: 'skill_id' });

    if (!error) alert('Visuals Synced!');
    else alert(error.message);
  };

  // 4. PREVIEW PLAY
  const playPreview = () => {
    setIsPlaying(false);
    setCurrentFrame(0);
    
    // Play sound synchronously to avoid browser autoplay restrictions
    if (audioRef.current && config.sfx_url) {
      audioRef.current.currentTime = 0;
      const playPromise = audioRef.current.play();
      if (playPromise !== undefined) {
        playPromise.catch(error => {
          console.warn("Audio playback error:", error);
        });
      }
    }

    // Force reflow to restart animation
    setTimeout(() => {
      setIsPlaying(true);
    }, 10);
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
            <label className="text-xs uppercase text-gray-500 mb-2 flex items-center gap-2"><Film size={14}/> Sprite Sheet (Horizontal)</label>

            {/* DRAG AND DROP ZONE */}
            <div
              className={`relative border-2 border-dashed rounded-lg p-6 mb-3 transition-all duration-200 ${
                dragOverSprite
                  ? 'border-cyan-500 bg-cyan-500/10 scale-105'
                  : 'border-gray-600 hover:border-gray-500'
              }`}
              onDragOver={(e) => handleDragOver(e, 'sprite')}
              onDragLeave={(e) => handleDragLeave(e, 'sprite')}
              onDrop={(e) => handleDrop(e, 'sprite')}
            >
              <div className="text-center">
                <Upload className={`mx-auto mb-2 ${dragOverSprite ? 'text-cyan-400' : 'text-gray-500'}`} size={24} />
                <p className={`text-sm font-medium mb-1 ${dragOverSprite ? 'text-cyan-400' : 'text-gray-400'}`}>
                  {dragOverSprite ? 'Drop your spritesheet here!' : 'Drag & drop spritesheet or click to browse'}
                </p>
                <p className="text-xs text-gray-600">PNG, JPG, GIF, WebP (max 5MB)</p>
              </div>

              {/* Hidden file input */}
              <input
                type="file"
                accept="image/png,image/jpeg,image/gif,image/webp"
                onChange={e => e.target.files && handleUpload(e.target.files[0], 'sprite')}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
            </div>
            {config.sprite_url && (
              <div className="mt-2 p-2 bg-black/40 rounded border border-green-900/30 flex items-center justify-between">
                <div className="text-[10px] text-green-500 font-bold flex items-center gap-1 overflow-hidden">
                  <CheckCircle size={10} className="flex-shrink-0" /> 
                  <span className="truncate" title={getFileName(config.sprite_url)}>{getFileName(config.sprite_url)}</span>
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
                 <input type="number" value={config.duration_ms} onChange={e => setConfig({...config, duration_ms: Number(e.target.value)})} className="w-full bg-black p-1 text-sm border border-gray-700 rounded outline-none focus:border-cyan-500" placeholder="800"/>
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
                   <option value={0.5}>0.5x</option>
                   <option value={1}>1x</option>
                   <option value={1.5}>1.5x</option>
                   <option value={2}>2x</option>
                   <option value={4}>4x</option>
                 </select>
               </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mt-3 bg-gray-900/30 p-2 rounded border border-gray-800 border-dashed">
               <div>
                 <span className="text-[10px] text-gray-500">Offset X (Left/Right)</span>
                 <input type="number" value={config.offset_x} onChange={e => setConfig({...config, offset_x: Number(e.target.value)})} className="w-full bg-black p-1 text-sm border border-gray-700 rounded outline-none focus:border-cyan-500"/>
               </div>
               <div>
                 <span className="text-[10px] text-gray-500">Offset Y (Up/Down)</span>
                 <input type="number" value={config.offset_y} onChange={e => setConfig({...config, offset_y: Number(e.target.value)})} className="w-full bg-black p-1 text-sm border border-gray-700 rounded outline-none focus:border-cyan-500"/>
               </div>
            </div>
          </div>

          {/* 2. AUDIO UPLOAD */}
          <div className="bg-gray-900/50 p-4 rounded border border-gray-800">
            <label className="text-xs uppercase text-gray-500 mb-2 flex items-center gap-2"><Music size={14}/> Sound Effect (SFX)</label>

            {/* DRAG AND DROP ZONE */}
            <div
              className={`relative border-2 border-dashed rounded-lg p-6 mb-3 transition-all duration-200 ${
                dragOverSfx
                  ? 'border-green-500 bg-green-500/10 scale-105'
                  : 'border-gray-600 hover:border-gray-500'
              }`}
              onDragOver={(e) => handleDragOver(e, 'sfx')}
              onDragLeave={(e) => handleDragLeave(e, 'sfx')}
              onDrop={(e) => handleDrop(e, 'sfx')}
            >
              <div className="text-center">
                <Upload className={`mx-auto mb-2 ${dragOverSfx ? 'text-green-400' : 'text-gray-500'}`} size={24} />
                <p className={`text-sm font-medium mb-1 ${dragOverSfx ? 'text-green-400' : 'text-gray-400'}`}>
                  {dragOverSfx ? 'Drop your SFX file here!' : 'Drag & drop audio file or click to browse'}
                </p>
                <p className="text-xs text-gray-600">MP3, WAV, OGG, WebM (max 5MB)</p>
              </div>

              {/* Hidden file input */}
              <input
                type="file"
                accept="audio/*"
                onChange={e => e.target.files && handleUpload(e.target.files[0], 'sfx')}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
            </div>
            {config.sfx_url && (
              <div className="mt-2 p-2 bg-black/40 rounded border border-green-900/30 flex items-center justify-between">
                <div className="text-[10px] text-green-500 font-bold flex items-center gap-1 overflow-hidden">
                  <CheckCircle size={10} className="flex-shrink-0" /> 
                  <span className="truncate" title={getFileName(config.sfx_url)}>{getFileName(config.sfx_url)}</span>
                </div>
                <button 
                  onClick={() => {
                    if (audioRef.current && config.sfx_url) {
                      audioRef.current.currentTime = 0;
                      const playPromise = audioRef.current.play();
                      if (playPromise !== undefined) {
                        playPromise.catch(e => console.warn('Audio play error:', e));
                      }
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
            <p className="text-[10px] text-gray-600 mt-2">
              {config.vfx_type === 'impact' && "Stationary. Plays on top of the target."}
              {config.vfx_type === 'projectile' && "Travels. Moves from Caster -> Target."}
              {config.vfx_type === 'melee' && "Attached. Sticks to the Caster (Sword Swing)."}
              {config.vfx_type === 'beam' && "Connecting. Stretches from Caster to Target."}
              {config.vfx_type === 'aoe' && "Area. Plays across the entire field/center."}
            </p>
          </div>

          <div className="flex gap-2 pt-4">
             <button onClick={handleSave} className="flex-1 bg-green-700 py-3 font-bold uppercase text-xs hover:bg-green-600 rounded flex items-center justify-center gap-2">
               <Save size={16}/> Sync Assets
             </button>
             <button onClick={onClose} className="bg-gray-800 px-4 py-3 rounded text-gray-400 hover:text-white"><X/></button>
          </div>
        </div>

        {/* RIGHT: LIVE PREVIEW */}
        <div className="w-1/2 bg-black relative flex flex-col items-center justify-center border-l border-gray-800">
           <div className="absolute top-4 right-4 text-[10px] text-gray-600 font-mono">LIVE RENDER ENGINE</div>
           
          {/* THE ANIMATION BOX */}
          <div className="relative group">
            <div 
              id="preview-box"
              style={{
                width: config.frame_width,
                height: config.frame_height,
                transform: `scale(${config.preview_scale})`,
                backgroundImage: config.sprite_url ? `url("${config.sprite_url}")` : 'none',
                backgroundSize: `${config.frame_width * config.frame_count}px ${config.frame_height}px`,
                backgroundPosition: `${-(currentFrame * config.frame_width) + config.offset_x}px ${config.offset_y}px`,
                backgroundRepeat: 'no-repeat',
                imageRendering: 'pixelated',
                transition: 'none',
              }} 
              className="border border-cyan-500/30 bg-gray-900/20 flex items-center justify-center text-[10px] text-gray-700 text-center px-2 shadow-[0_0_20px_rgba(6,182,212,0.1)]"
            >
               {!config.sprite_url && "No Sprite Sheet Uploaded"}
             </div>
             {config.sprite_url && (
               <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap text-[8px] text-gray-500 uppercase tracking-tighter bg-black/80 px-2 py-1 rounded">
                 {config.frame_width}x{config.frame_height} • {config.frame_count} Frames
               </div>
             )}
           </div>

           <div className="mt-8 flex gap-4">
             <button onClick={playPreview} className="bg-cyan-600 hover:bg-cyan-500 text-white px-6 py-2 rounded-full font-bold flex items-center gap-2">
               <Play size={16} fill="white" /> Test Animation + Audio
             </button>
           </div>

           {/* Hidden Audio Player */}
           <audio ref={audioRef} src={config.sfx_url || undefined} />
        </div>
      </div>
    </div>
  );
}
