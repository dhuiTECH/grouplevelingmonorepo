"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import type { Session } from '@supabase/supabase-js';
import { ArrowLeft, Save, RotateCcw, Eye, EyeOff } from 'lucide-react';
import AnimatedEquip from '@/components/AnimatedEquip';

interface ShopItem {
  id: string;
  name: string;
  description: string;
  image_url: string;
  thumbnail_url?: string;
  slot: string;
  z_index: number;
  rarity: string;
  offset_x: number;
  offset_y: number;
  rotation: number;
  is_animated: boolean;
  is_active: boolean;
  grip_type?: string | null;
}

interface PositionerState {
  selectedItem: ShopItem | null;
  offsetX: number;
  offsetY: number;
  zIndex: number;
  rotation: number;
}

export default function ItemPositionerPage() {
  const router = useRouter();
  const [shopItems, setShopItems] = useState<ShopItem[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [previewZoom, setPreviewZoom] = useState(1.0);
  const [positionerState, setPositionerState] = useState<PositionerState>({
    selectedItem: null,
    offsetX: 0,
    offsetY: 0,
    zIndex: 1,
    rotation: 0
  });
  const [selectedAvatar, setSelectedAvatar] = useState<'male' | 'female' | 'nonbinary'>('male');

  useEffect(() => {
    checkAdminAccess();
  }, []);

  useEffect(() => {
    if (isAdmin) {
      loadShopItems();
    }
  }, [isAdmin]);

  const checkAdminAccess = async () => {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();

      if (error || !session) {
        router.push('/admin/login');
        return;
      }

      // Check if user is admin (same logic as main admin page)
      setIsAdmin(true);
      setIsLoading(false);
    } catch (error) {
      console.error('Auth check failed:', error);
      router.push('/admin/login');
    }
  };

  const loadShopItems = async () => {
    try {
      const response = await fetch('/api/admin/shop');
      if (!response.ok) {
        throw new Error('Failed to load shop items');
      }

      const data = await response.json();
      if (data.shopItems) {
        setShopItems(data.shopItems);
      }
    } catch (error) {
      console.error('Failed to load shop items:', error);
    }
  };

  const selectItem = (item: ShopItem) => {
    setPositionerState({
      selectedItem: item,
      offsetX: item.offset_x || 0,
      offsetY: item.offset_y || 0,
      zIndex: item.z_index || 1,
      rotation: item.rotation || 0
    });
  };

  const updatePosition = (field: keyof PositionerState, value: number) => {
    setPositionerState(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const resetPosition = () => {
    if (positionerState.selectedItem) {
      setPositionerState({
        selectedItem: positionerState.selectedItem,
        offsetX: positionerState.selectedItem.offset_x || 0,
        offsetY: positionerState.selectedItem.offset_y || 0,
        zIndex: positionerState.selectedItem.z_index || 1,
        rotation: positionerState.selectedItem.rotation || 0
      });
    }
  };

  const savePosition = async () => {
    if (!positionerState.selectedItem) return;

    setIsSaving(true);
    try {
      const response = await fetch('/api/admin/shop', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: positionerState.selectedItem.id,
          offset_x: positionerState.offsetX,
          offset_y: positionerState.offsetY,
          z_index: positionerState.zIndex,
          rotation: positionerState.rotation
        })
      });

      if (!response.ok) {
        throw new Error('Failed to save position');
      }

      const data = await response.json();
      if (data.shopItem) {
        // Update the item in the local state
        setShopItems(prev => prev.map(item =>
          item.id === data.shopItem.id ? data.shopItem : item
        ));

        // Update the selected item
        setPositionerState(prev => ({
          ...prev,
          selectedItem: data.shopItem
        }));

        // Show success message (you could add a toast here)
        alert('Position saved successfully!');
      }
    } catch (error) {
      console.error('Failed to save position:', error);
      alert('Failed to save position. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = React.useRef<{ x: number; y: number; offsetX: number; offsetY: number } | null>(null);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!positionerState.selectedItem) return;
    e.preventDefault();
    setIsDragging(true);
    dragStartRef.current = { 
      x: e.clientX, 
      y: e.clientY, 
      offsetX: positionerState.offsetX, 
      offsetY: positionerState.offsetY 
    };
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging || !dragStartRef.current) return;
    const deltaX = (e.clientX - dragStartRef.current.x) / previewZoom;
    const deltaY = (e.clientY - dragStartRef.current.y) / previewZoom;
    
    // Calculate new position
    let newOffsetX = dragStartRef.current.offsetX + deltaX;
    let newOffsetY = dragStartRef.current.offsetY + deltaY;
    
    // Snap to grid if shift held
    if (e.shiftKey) {
      newOffsetX = Math.round(newOffsetX / 10) * 10;
      newOffsetY = Math.round(newOffsetY / 10) * 10;
    }
    
    // Clamp values
    newOffsetX = Math.max(-512, Math.min(512, newOffsetX));
    newOffsetY = Math.max(-512, Math.min(512, newOffsetY));
    
    setPositionerState(prev => ({
      ...prev,
      offsetX: newOffsetX,
      offsetY: newOffsetY
    }));
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    dragStartRef.current = null;
  };

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging]);

  const getAvatarImage = () => {
    switch (selectedAvatar) {
      case 'female':
        return '/NoobWoman.png';
      case 'nonbinary':
        return '/Noobnonbinary.png';
      default:
        return '/NoobMan.png';
    }
  };

  const getRarityColor = (rarity: string) => {
    switch (rarity?.toLowerCase()) {
      case 'legendary':
        return 'text-orange-400 border-orange-400/50';
      case 'epic':
        return 'text-purple-400 border-purple-400/50';
      case 'rare':
        return 'text-blue-400 border-blue-400/50';
      case 'uncommon':
        return 'text-green-400 border-green-400/50';
      default:
        return 'text-gray-400 border-gray-400/50';
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black text-blue-400 flex flex-col items-center justify-center p-8 font-mono">
        <div className="text-center space-y-4">
          <div className="animate-spin w-12 h-12 border-4 border-blue-400 border-t-transparent rounded-full mx-auto"></div>
          <h1 className="text-xl font-black italic tracking-tighter text-blue-500">LOADING POSITIONER</h1>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-red-900 text-red-400 flex flex-col items-center justify-center p-8 font-mono">
        <div className="text-center space-y-4">
          <h2 className="text-xl font-black italic tracking-tighter text-white mb-2 uppercase">Access Denied</h2>
          <p className="text-sm font-bold text-red-100 uppercase leading-relaxed">
            Admin access required.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-gray-100 font-mono">
      {/* Header */}
      <header className="p-4 border-b border-red-900/30 bg-black/90 backdrop-blur-3xl">
        <div className="flex justify-between items-center max-w-7xl mx-auto">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/admin')}
              className="px-3 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg flex items-center gap-2"
            >
              <ArrowLeft size={16} />
              Back to Admin
            </button>
            <div>
              <h1 className="text-2xl font-black italic tracking-tighter text-red-500 drop-shadow-[0_0_10px_rgba(239,68,68,0.6)]">
                ITEM POSITIONER
              </h1>
              <p className="text-xs uppercase tracking-[0.4em] font-bold text-red-200 opacity-70">
                Avatar Item Positioning Tool
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex h-[calc(100vh-80px)]">
        {/* Left Column - Item List */}
        <div className="w-80 bg-gray-900/40 border-r border-gray-800/50 flex flex-col">
          <div className="p-4 border-b border-gray-800/50">
            <h2 className="text-lg font-black uppercase tracking-widest text-red-400 mb-2">
              Item Library
            </h2>
            <p className="text-xs text-gray-400 mb-4">
              Click an item to position it on the avatar
            </p>

            {/* Avatar Selector */}
            <div className="space-y-2">
              <label className="block text-xs font-black uppercase text-gray-300">Base Avatar</label>
              <div className="flex gap-2">
                {[
                  { value: 'male', label: 'Male', icon: '👨' },
                  { value: 'female', label: 'Female', icon: '👩' },
                  { value: 'nonbinary', label: 'Non-binary', icon: '🧑' }
                ].map(({ value, label, icon }) => (
                  <button
                    key={value}
                    onClick={() => setSelectedAvatar(value as any)}
                    className={`flex-1 px-3 py-2 rounded-lg text-xs font-bold transition-all ${
                      selectedAvatar === value
                        ? 'bg-cyan-600 text-white shadow-[0_0_10px_rgba(6,182,212,0.3)]'
                        : 'bg-gray-700 hover:bg-gray-600 text-gray-300 hover:text-white'
                    }`}
                  >
                    <div className="flex flex-col items-center gap-1">
                      <span className="text-sm">{icon}</span>
                      <span>{label}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Item List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {shopItems
              .filter(item => item.is_active && item.slot !== 'avatar' && item.slot !== 'background')
              .map((item) => (
                <div
                  key={item.id}
                  onClick={() => selectItem(item)}
                  className={`p-3 rounded-lg border cursor-pointer transition-all ${
                    positionerState.selectedItem?.id === item.id
                      ? 'bg-red-900/30 border-red-400 shadow-[0_0_10px_rgba(239,68,68,0.3)]'
                      : 'bg-gray-800/40 border-gray-700 hover:border-gray-600'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      {item.is_animated ? (
                        <AnimatedEquip
                          src={item.image_url}
                          frameWidth={64}
                          frameHeight={64}
                          totalFrames={4}
                          fps={8}
                        />
                      ) : (
                      <img
                        src={item.image_url}
                        alt={item.name}
                        className="w-16 h-16 rounded border border-gray-600 object-contain"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                            target.style.display = 'none';
                        }}
                      />
                      )}
                      {item.is_animated && (
                        <div className="absolute -top-1 -right-1 w-3 h-3 bg-cyan-500 rounded-full flex items-center justify-center">
                          <span className="text-xs">✨</span>
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-bold text-white truncate">{item.name}</div>
                      <div className="text-xs text-gray-400 truncate">{item.description}</div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-gray-500 uppercase">{item.slot}</span>
                        <span className={`px-2 py-0.5 rounded text-xs font-bold border ${getRarityColor(item.rarity)}`}>
                          {item.rarity}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </div>

        {/* Right Column - Stage & Controls */}
        <div className="flex-1 flex flex-col">
          {/* Stage */}
          <div className="flex-1 p-8 flex items-center justify-center relative">
            <div className="absolute top-4 right-4 z-20 flex flex-col gap-2">
              <button
                type="button"
                onClick={() => setPreviewZoom(prev => Math.min(prev + 0.1, 3.0))}
                className="w-8 h-8 bg-gray-800/80 hover:bg-gray-700 text-white rounded-full flex items-center justify-center border border-gray-600 font-bold transition-colors"
                title="Zoom In"
              >
                +
              </button>
              <button
                type="button"
                onClick={() => setPreviewZoom(prev => Math.max(prev - 0.1, 0.5))}
                className="w-8 h-8 bg-gray-800/80 hover:bg-gray-700 text-white rounded-full flex items-center justify-center border border-gray-600 font-bold transition-colors"
                title="Zoom Out"
              >
                -
              </button>
              <button
                type="button"
                onClick={() => setPreviewZoom(1.0)}
                className="w-8 h-8 bg-gray-800/80 hover:bg-gray-700 text-white rounded-full flex items-center justify-center border border-gray-600 text-[10px] font-black transition-colors"
                title="Reset Zoom"
              >
                1:1
              </button>
            </div>

            <div className="relative">
              {/* Stage Border */}
              <div className="w-[520px] h-[520px] border-4 border-red-500/50 bg-gray-900/20 relative overflow-auto custom-scrollbar p-1">
                <div 
                  className="relative"
                  style={{ 
                    width: 512 * previewZoom, 
                    height: 512 * previewZoom,
                    margin: previewZoom <= 1 ? '0 auto' : undefined
                  }}
                >
                  <div 
                    className="w-[512px] h-[512px] relative"
                    style={{ transform: `scale(${previewZoom})`, transformOrigin: 'top left' }}
                  >
                    {/* Base Avatar */}
                    <img
                      src={getAvatarImage()}
                      alt="Base Avatar"
                      className="absolute inset-0 w-full h-full object-contain"
                      style={{ zIndex: 5 }} // Base avatar layer (matches real avatar system)
                    />

                    {/* Selected Item */}
                    {positionerState.selectedItem && (
                      <div
                        className="absolute cursor-move"
                        style={{
                          left: `${128 + positionerState.offsetX}px`,
                          top: `${128 + positionerState.offsetY}px`,
                          zIndex: positionerState.zIndex,
                          transform: `translate(-50%, -50%) rotate(${positionerState.rotation}deg)`,
                          cursor: isDragging ? 'grabbing' : 'grab'
                        }}
                        onMouseDown={handleMouseDown}
                      >
                        {positionerState.selectedItem.is_animated ? (
                          <AnimatedEquip
                            src={positionerState.selectedItem.image_url}
                            frameWidth={96}
                            frameHeight={96}
                            totalFrames={4}
                            fps={8}
                          />
                        ) : (
                          <img
                            src={positionerState.selectedItem.image_url}
                            alt={positionerState.selectedItem.name}
                            style={{
                              width: 'auto',
                              height: 'auto',
                              maxWidth: 'none',
                              maxHeight: 'none',
                              pointerEvents: 'none'
                            }}
                            className="pointer-events-none"
                          />
                        )}
                      </div>
                    )}

                    {/* Center Crosshair */}
                    <div className="absolute inset-0 pointer-events-none">
                      <div className="absolute left-1/2 top-0 bottom-0 w-px bg-red-500/30"></div>
                      <div className="absolute top-1/2 left-0 right-0 h-px bg-red-500/30"></div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Stage Label */}
              <div className="text-center mt-4">
                <h3 className="text-lg font-black uppercase tracking-widest text-red-400">
                  Avatar Stage (512x512)
                </h3>
                <p className="text-xs text-gray-400 mt-1">
                  {positionerState.selectedItem
                    ? `Positioning: ${positionerState.selectedItem.name}`
                    : 'Select an item to begin positioning'
                  }
                </p>
              </div>
            </div>
          </div>

          {/* Controls */}
          <div className="p-6 bg-gray-900/40 border-t border-gray-800/50">
            <div className="max-w-md mx-auto space-y-6">
              <h3 className="text-lg font-black uppercase tracking-widest text-red-400 text-center">
                Position Controls
              </h3>

              {/* Offset X */}
              <div>
                <label className="block text-sm font-bold text-gray-300 mb-2">
                  Offset X: {positionerState.offsetX}px (-512 to 512)
                </label>
                <input
                  type="range"
                  min="-512"
                  max="512"
                  value={positionerState.offsetX}
                  onChange={(e) => updatePosition('offsetX', parseInt(e.target.value))}
                  disabled={!positionerState.selectedItem}
                  className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider-red"
                />
              </div>

              {/* Offset Y */}
              <div>
                <label className="block text-sm font-bold text-gray-300 mb-2">
                  Offset Y: {positionerState.offsetY}px (-512 to 512)
                </label>
                <input
                  type="range"
                  min="-512"
                  max="512"
                  value={positionerState.offsetY}
                  onChange={(e) => updatePosition('offsetY', parseInt(e.target.value))}
                  disabled={!positionerState.selectedItem}
                  className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider-red"
                />
              </div>

              {/* Rotation */}
              <div>
                <label className="block text-sm font-bold text-gray-300 mb-2">
                  Rotation: {positionerState.rotation}° (-180 to 180)
                </label>
                <input
                  type="range"
                  min="-180"
                  max="180"
                  value={positionerState.rotation}
                  onChange={(e) => updatePosition('rotation', parseInt(e.target.value))}
                  disabled={!positionerState.selectedItem}
                  className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider-red"
                />
              </div>

              {/* Z-Index */}
              <div>
                <label className="block text-sm font-bold text-gray-300 mb-2">
                  Z-Index: {positionerState.zIndex} (1 to 50)
                </label>
                <div className="text-[10px] text-gray-500 mb-2">
                  💡 Layering: Avatar = 5, Backgrounds = 0, Items = 1-50
                </div>
                <input
                  type="range"
                  min="1"
                  max="50"
                  value={positionerState.zIndex}
                  onChange={(e) => updatePosition('zIndex', parseInt(e.target.value))}
                  disabled={!positionerState.selectedItem}
                  className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider-red"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4">
                <button
                  onClick={resetPosition}
                  disabled={!positionerState.selectedItem || isSaving}
                  className="flex-1 px-4 py-3 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 disabled:cursor-not-allowed text-white rounded-lg font-bold flex items-center justify-center gap-2 transition-all"
                >
                  <RotateCcw size={18} />
                  Reset
                </button>
                <button
                  onClick={savePosition}
                  disabled={!positionerState.selectedItem || isSaving}
                  className="flex-1 px-4 py-3 clip-tech-button bg-red-700 hover:bg-red-600 disabled:bg-gray-800 disabled:cursor-not-allowed text-white rounded-lg font-bold flex items-center justify-center gap-2 shadow-[0_0_10px_rgba(239,68,68,0.3)] transition-all"
                >
                  {isSaving ? (
                    <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>
                  ) : (
                    <Save size={18} />
                  )}
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .slider-red::-webkit-slider-thumb {
          appearance: none;
          height: 20px;
          width: 20px;
          border-radius: 50%;
          background: #ef4444;
          cursor: pointer;
          box-shadow: 0 0 10px rgba(239, 68, 68, 0.5);
        }

        .slider-red::-moz-range-thumb {
          height: 20px;
          width: 20px;
          border-radius: 50%;
          background: #ef4444;
          cursor: pointer;
          border: none;
          box-shadow: 0 0 10px rgba(239, 68, 68, 0.5);
        }
      `}</style>
    </div>
  );
}