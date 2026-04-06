"use client";

import React from "react";
import AnimatedEquip from "@/components/AnimatedEquip";
import { SKIN_TINT_SLOTS, SKIN_COLOR_SWATCHES, PREVIEW_GRIP_TYPES } from "./constants";

const skinSlots = SKIN_TINT_SLOTS as readonly string[];

export interface ShopItemPreviewStageProps {
  formData: any;
  positioning: any;
  setPositioning: React.Dispatch<React.SetStateAction<any>>;
  editingGender: "male" | "female";
  setEditingGender: (g: "male" | "female") => void;
  previewZoom: number;
  setPreviewZoom: React.Dispatch<React.SetStateAction<number>>;
  baseAvatarOptions: { value: string; label: string; icon: string }[];
  maleBaseBodyItem: any;
  femaleBaseBodyItem: any;
  currentMaskUrl: string | null | undefined;
  editingItem?: any;
  baseLayerPreviewUrl: string | null;
  baseLayerFetchedUrl: string | null;
  previewUrl: string | null;
  skinColor: string;
  setSkinColor: (s: string) => void;
  shopItems: any[];
  handleMouseDown: (e: React.MouseEvent) => void;
  isDragging: boolean;
  previewGripType: string | null;
  setPreviewGripType: (v: string | null) => void;
  handOpacity: number;
  setHandOpacity: (n: number) => void;
  showHandPreview: boolean;
  setShowHandPreview: (b: boolean) => void;
  isAnimated: boolean;
  animConfig: { frameWidth: number; frameHeight: number; totalFrames: number; fps: number };
  getAvatarImage: () => string;
  showDualPositioning: boolean;
}

export function ShopItemPreviewStage(props: ShopItemPreviewStageProps) {
  const {
    formData,
    positioning,
    setPositioning,
    editingGender,
    setEditingGender,
    previewZoom,
    setPreviewZoom,
    baseAvatarOptions,
    maleBaseBodyItem,
    femaleBaseBodyItem,
    currentMaskUrl,
    editingItem,
    baseLayerPreviewUrl,
    baseLayerFetchedUrl,
    previewUrl,
    skinColor,
    setSkinColor,
    shopItems,
    handleMouseDown,
    isDragging,
    previewGripType,
    setPreviewGripType,
    handOpacity,
    setHandOpacity,
    showHandPreview,
    setShowHandPreview,
    isAnimated,
    animConfig,
    getAvatarImage,
    showDualPositioning,
  } = props;
  return (
        <div className="lg:col-span-3 space-y-3 md:space-y-4">
          <div>
            <label className="block text-xs font-black uppercase text-gray-300 mb-2">Base Avatar</label>
            <div className="flex flex-wrap gap-2 justify-center">
              {baseAvatarOptions.map(({ value, label, icon }) => (
                <button 
                  key={value} 
                  onClick={() => {
                    setPositioning((prev: any) => ({ ...prev, selectedAvatar: value as 'male' | 'female' | 'nonbinary' | 'male_base_body' | 'female_base_body' }));
                    if (value === 'female' || value === 'female_base_body') {
                      setEditingGender('female');
                    } else if (value === 'male' || value === 'male_base_body') {
                      setEditingGender('male');
                    }
                  }} 
                  className={`flex-1 min-w-[4.5rem] px-3 py-2 rounded-lg text-xs font-bold transition-all ${positioning.selectedAvatar === value ? 'bg-cyan-600 text-white shadow-[0_0_10px_rgba(6,182,212,0.3)]' : 'bg-gray-700 hover:bg-gray-600 text-gray-300 hover:text-white'}`}
                >
                  <div className="flex flex-col items-center gap-1"><span className="text-sm">{icon}</span><span>{label}</span></div>
                </button>
              ))}
            </div>
          </div>

          <div className="relative">
            <div className="absolute top-4 right-4 z-20 flex flex-col gap-2">
              <button
                type="button"
                onClick={() => setPreviewZoom((prev: number) => Math.min(prev + 0.1, 3.0))}
                className="w-8 h-8 bg-gray-800/80 hover:bg-gray-700 text-white rounded-full flex items-center justify-center border border-gray-600 font-bold transition-colors"
                title="Zoom In"
              >
                +
              </button>
              <button
                type="button"
                onClick={() => setPreviewZoom((prev: number) => Math.max(prev - 0.1, 0.5))}
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
            
            <div className="md:overflow-visible">
              <div 
                className={`w-[520px] h-[520px] flex-shrink-0 mx-auto p-1 bg-green-400 relative custom-scrollbar ${previewZoom > 1 ? 'overflow-auto' : 'overflow-hidden'}`}
              >
                <div 
                  className="relative"
                  style={{ 
                    width: 512 * previewZoom, 
                    height: 512 * previewZoom,
                    margin: previewZoom <= 1 ? '0 auto' : undefined
                  }}
                >
                  <div 
                    className="w-[512px] h-[512px] bg-red-950 relative"
                    style={{ transform: `scale(${previewZoom})`, transformOrigin: 'top left' }}
                  >
                    {/* Base Avatar Reference Layer */}
                    {!['avatar', 'base_body'].includes(formData.slot) && (
                      <div className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 5 }}>
                        <div 
                          className="absolute inset-0 w-full h-full"
                          style={currentMaskUrl && (formData.eraser_mask_targets?.includes('base_body') || formData.eraser_mask_targets?.includes('avatar')) ? {
                            WebkitMaskImage: `url(${currentMaskUrl})`,
                            maskImage: `url(${currentMaskUrl})`,
                            WebkitMaskSize: 'contain',
                            WebkitMaskPosition: 'center',
                            WebkitMaskRepeat: 'no-repeat'
                          } : {}}
                        >
                          {(() => {
                            const isBaseBodyAvatar = positioning.selectedAvatar === 'male_base_body' || positioning.selectedAvatar === 'female_base_body';
                            const baseItem = positioning.selectedAvatar === 'male_base_body' ? maleBaseBodyItem : femaleBaseBodyItem;
                            
                            if (isBaseBodyAvatar && baseItem) {
                              return (
                                <div className="absolute inset-0 w-full h-full">
                                  {/* Silhouette */}
                                  {(baseItem.image_base_url || baseItem.image_url) && (
                                    <div
                                      className="absolute inset-0 w-full h-full"
                                      style={{
                                        backgroundColor: baseItem.skin_tint_hex || '#FFDBAC',
                                        WebkitMaskImage: `url(${baseItem.image_base_url || baseItem.image_url})`,
                                        maskImage: `url(${baseItem.image_base_url || baseItem.image_url})`,
                                        WebkitMaskSize: 'contain',
                                        maskSize: 'contain',
                                        WebkitMaskPosition: 'center',
                                        maskPosition: 'center',
                                        WebkitMaskRepeat: 'no-repeat',
                                        maskRepeat: 'no-repeat'
                                      }}
                                    />
                                  )}
                                  {/* Outlines */}
                                  {baseItem.image_url && baseItem.image_url !== baseItem.image_base_url && (
                                    <img 
                                      src={baseItem.image_url} 
                                      alt="Base Avatar Outlines" 
                                      className="absolute inset-0 w-full h-full object-contain z-10" 
                                    />
                                  )}
                                </div>
                              );
                            }
                            
                            return <img src={getAvatarImage()} alt="Base Avatar" className="absolute inset-0 w-full h-full object-contain" />;
                          })()}
                        </div>
                      </div>
                    )}

                    {skinSlots.includes(formData.slot) && (baseLayerPreviewUrl || baseLayerFetchedUrl || editingItem?.image_base_url || (['base_body', 'hand_grip'].includes(formData.slot) && (previewUrl || editingItem?.image_url))) ? (
                      <div
                        className="absolute"
                        style={{
                          left: `${128 + (editingGender === 'female' ? positioning.offsetXFemale : positioning.offsetX)}px`,
                          top: `${128 + (editingGender === 'female' ? positioning.offsetYFemale : positioning.offsetY)}px`,
                          width: 512,
                          height: 512,
                          zIndex: positioning.zIndex,
                          transform: `translate(-50%, -50%) scale(${editingGender === 'female' ? positioning.scaleFemale : positioning.scale}) rotate(${editingGender === 'female' ? positioning.rotationFemale : positioning.rotation}deg)`,
                          transformOrigin: 'center',
                          cursor: isDragging ? 'grabbing' : 'grab'
                        }}
                        onMouseDown={handleMouseDown}
                      >
                        {(() => {
                          const baseUrl = baseLayerFetchedUrl || baseLayerPreviewUrl || editingItem?.image_base_url || (['base_body', 'hand_grip'].includes(formData.slot) ? (previewUrl || editingItem?.image_url) : '') || '';
                          return (
                            <div
                              className="absolute inset-0 w-full h-full"
                              style={{
                                backgroundColor: skinColor,
                                WebkitMaskImage: `url(${baseUrl})`,
                                maskImage: `url(${baseUrl})`,
                                WebkitMaskSize: 'contain',
                                maskSize: 'contain',
                                WebkitMaskPosition: 'center',
                                maskPosition: 'center',
                                WebkitMaskRepeat: 'no-repeat',
                                maskRepeat: 'no-repeat'
                              }}
                              aria-hidden
                            />
                          );
                        })()}
                        {(previewUrl || editingItem?.image_url) && (
                          <img
                            src={previewUrl || editingItem?.image_url || ''}
                            alt="Detail layer"
                            className="absolute inset-0 w-full h-full object-contain pointer-events-none select-none"
                            style={{ 
                              zIndex: 1,
                              mixBlendMode: (formData.slot === 'hand_grip' || formData.slot === 'base_body') ? 'multiply' : 'normal'
                            }}
                          />
                        )}
                      </div>
                    ) : (
                      <>
                        {/* Ghost Hand Preview for Weapons & Avatars */}
                        {(() => {
                          const activePreviewGrip = formData.slot === 'weapon' ? formData.grip_type : (['avatar', 'base_body'].includes(formData.slot) ? previewGripType : null);
                          
                          if (!activePreviewGrip || !showHandPreview) return null;

                          const targetGender = editingGender === 'female' ? 'female' : 'male';
                          const handItem = shopItems.find((i: any) => {
                            if (i.slot !== 'hand_grip' || i.grip_type !== activePreviewGrip) return false;
                            const itemGender = Array.isArray(i.gender) ? i.gender : [i.gender];
                            return itemGender.includes(targetGender) || itemGender.includes('unisex');
                          });
                          
                          if (!handItem?.image_url) return null;

                          const isFemaleHand = targetGender === 'female';
                          const hScale = (isFemaleHand && handItem.scale_female !== null && handItem.scale_female !== undefined) ? handItem.scale_female : (handItem.scale || 1);
                          const hX = (isFemaleHand && handItem.offset_x_female !== null && handItem.offset_x_female !== undefined) ? handItem.offset_x_female : (handItem.offset_x || 0);
                          const hY = (isFemaleHand && handItem.offset_y_female !== null && handItem.offset_y_female !== undefined) ? handItem.offset_y_female : (handItem.offset_y || 0);
                          const hRot = (isFemaleHand && handItem.rotation_female !== null && handItem.rotation_female !== undefined) ? handItem.rotation_female : (handItem.rotation || 0);
                          
                          // Use overridden Z-index if available for this weapon (formData)
                          let hZIndex = handItem.z_index ?? 90;
                          if (formData.slot === 'weapon' && formData.hand_grip_z_index_override !== null) {
                            hZIndex = formData.hand_grip_z_index_override;
                          }

                          return (
                            <div className="absolute inset-0 w-full h-full" style={{ zIndex: hZIndex }}>
                              <div
                                className="absolute inset-0 w-full h-full pointer-events-none"
                                style={currentMaskUrl && formData.eraser_mask_targets?.includes('hand_grip') ? {
                                  WebkitMaskImage: `url(${currentMaskUrl})`,
                                  maskImage: `url(${currentMaskUrl})`,
                                  WebkitMaskSize: 'contain',
                                  maskSize: 'contain',
                                  WebkitMaskPosition: 'center',
                                  maskPosition: 'center',
                                  WebkitMaskRepeat: 'no-repeat',
                                  maskRepeat: 'no-repeat'
                                } : {}}
                              >
                                <div 
                                  className="absolute"
                                  style={{
                                    left: `${128 + hX}px`,
                                    top: `${128 + hY}px`,
                                    width: 512,
                                    height: 512,
                                    transform: `translate(-50%, -50%) scale(${hScale}) rotate(${hRot}deg)`,
                                    transformOrigin: 'center',
                                    opacity: handOpacity,
                                  }}
                                >
                                  {/* Tinted Background */}
                                  <div
                                    className="absolute inset-0 w-full h-full"
                                    style={{
                                      backgroundColor: skinColor,
                                      WebkitMaskImage: `url(${handItem.image_base_url || handItem.image_url})`,
                                      maskImage: `url(${handItem.image_base_url || handItem.image_url})`,
                                      WebkitMaskSize: 'contain',
                                      maskSize: 'contain',
                                      WebkitMaskPosition: 'center',
                                      maskPosition: 'center',
                                      WebkitMaskRepeat: 'no-repeat',
                                      maskRepeat: 'no-repeat'
                                    }}
                                  />
                                  {/* Black Lines (Multiply) */}
                                  <img 
                                    src={handItem.image_url} 
                                    alt="Ghost Hand Lines" 
                                    className="absolute inset-0 w-full h-full object-contain"
                                    style={{ mixBlendMode: 'multiply' }}
                                  />
                                </div>
                              </div>
                            </div>
                          );
                        })()}

                        {previewUrl && (
                          <div className="absolute inset-0 w-full h-full" style={{ zIndex: positioning.zIndex }}>
                            {/* 1. Stationary Mask Container: This spans the full 512x512 area so coordinates align */}
                            <div
                              className="absolute inset-0 w-full h-full pointer-events-none"
                              style={
                                currentMaskUrl && formData.eraser_mask_targets?.includes(formData.slot)
                                  ? {
                                      WebkitMaskImage: `url(${currentMaskUrl})`,
                                      maskImage: `url(${currentMaskUrl})`,
                                      WebkitMaskSize: 'contain',
                                      maskSize: 'contain',
                                      WebkitMaskPosition: 'center',
                                      maskPosition: 'center',
                                      WebkitMaskRepeat: 'no-repeat',
                                      maskRepeat: 'no-repeat',
                                    }
                                  : {}
                              }
                            >
                              {/* 2. Draggable Item: This moves around INSIDE the masked area */}
                              <div
                                className="absolute pointer-events-auto"
                                style={{
                                  left: `${128 + (editingGender === 'female' ? positioning.offsetXFemale : positioning.offsetX)}px`,
                                  top: `${128 + (editingGender === 'female' ? positioning.offsetYFemale : positioning.offsetY)}px`,
                                  transform: `translate(-50%, -50%) scale(${editingGender === 'female' ? positioning.scaleFemale : positioning.scale}) rotate(${editingGender === 'female' ? positioning.rotationFemale : positioning.rotation}deg)`,
                                  transformOrigin: 'center',
                                  cursor: isDragging ? 'grabbing' : 'grab',
                                }}
                                onMouseDown={handleMouseDown}
                              >
                                {isAnimated && animConfig.frameWidth > 0 ? (
                                  <AnimatedEquip 
                                    src={previewUrl} 
                                    frameWidth={animConfig.frameWidth} 
                                    frameHeight={animConfig.frameHeight} 
                                    totalFrames={animConfig.totalFrames} 
                                    fps={animConfig.fps} 
                                  />
                                ) : (
                                  <img 
                                    src={previewUrl} 
                                    alt="Item Preview" 
                                    style={{ width: 'auto', height: 'auto', maxWidth: 'none', maxHeight: 'none' }} 
                                    className="pointer-events-none select-none" 
                                  />
                                )}
                              </div>
                            </div>
                          </div>
                        )}
                      </>
                    )}
                    <div className="absolute inset-0 pointer-events-none">
                      <div className="absolute left-1/2 top-0 bottom-0 w-px bg-red-600" />
                      <div className="absolute top-1/2 left-0 right-0 h-px bg-red-600" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
            {/* Removed Avatar Stage text */}
            {skinSlots.includes(formData.slot) && (
              <div className="mt-3 space-y-2">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">Skin color (base layer tint)</p>
                <div className="flex flex-wrap items-center gap-2">
                  {SKIN_COLOR_SWATCHES.map(({ hex, label }) => (
                    <button
                      key={hex}
                      type="button"
                      onClick={() => setSkinColor(hex)}
                      className={`w-8 h-8 rounded-full border-2 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-gray-900 transition-all ${skinColor === hex ? 'border-red-500 ring-2 ring-red-500 ring-offset-2 ring-offset-gray-900 scale-110' : 'border-gray-600 hover:border-red-500'}`}
                      style={{ backgroundColor: hex }}
                      title={label}
                    />
                  ))}
                  <div className="relative group">
                    <input
                      type="color"
                      value={skinColor}
                      onChange={(e) => setSkinColor(e.target.value)}
                      className="w-8 h-8 rounded-full border-2 border-gray-600 cursor-pointer overflow-hidden p-0"
                      title="Custom Color"
                    />
                    <div className="absolute -inset-1 rounded-full border-2 border-transparent group-hover:border-red-500 pointer-events-none transition-colors" />
                  </div>
                </div>
              </div>
            )}
          </div>

            <div className="bg-gray-900/40 p-3 md:p-4 rounded-lg space-y-2 md:space-y-3">
            <h4 className="text-sm font-black uppercase tracking-widest text-red-400 text-center">Position Controls</h4>
            
            {showDualPositioning && (
              <div className="flex justify-center mb-4">
                <div className="bg-gray-800 p-1 rounded-lg flex gap-1">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingGender('male');
                      // Ensure the canvas matches what they clicked
                      if (positioning.selectedAvatar === 'female' || positioning.selectedAvatar === 'female_base_body') {
                        setPositioning((prev: any) => ({ ...prev, selectedAvatar: 'male' }));
                      }
                    }}
                    className={`px-4 py-1.5 rounded text-xs font-bold transition-colors ${editingGender === 'male' ? 'bg-cyan-600 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-700'}`}
                  >
                    Male Offsets
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingGender('female');
                      // Ensure the canvas matches what they clicked
                      if (positioning.selectedAvatar === 'male' || positioning.selectedAvatar === 'male_base_body') {
                        setPositioning((prev: any) => ({ ...prev, selectedAvatar: 'female' }));
                      }
                    }}
                    className={`px-4 py-1.5 rounded text-xs font-bold transition-colors ${editingGender === 'female' ? 'bg-pink-600 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-700'}`}
                  >
                    Female Offsets
                  </button>
                </div>
              </div>
            )}
            
            {/* Hand Preview Controls */}
            {((formData.slot === 'weapon' && formData.grip_type) || ['avatar', 'base_body'].includes(formData.slot)) && (
              <div className="border border-purple-500/30 bg-purple-900/10 p-3 rounded-lg mb-4">
                <div className="flex items-center justify-between mb-2">
                  <h5 className="text-xs font-bold text-purple-400 uppercase">Ghost Hand Preview</h5>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="showHandPreview"
                      checked={showHandPreview}
                      onChange={(e) => setShowHandPreview(e.target.checked)}
                      className="w-3 h-3 text-purple-600 rounded focus:ring-purple-500"
                    />
                    <label htmlFor="showHandPreview" className="text-[10px] text-gray-400 font-bold cursor-pointer">Show</label>
                  </div>
                </div>

                {/* Avatar/Body: Grip Selector for Color Check */}
                {['avatar', 'base_body'].includes(formData.slot) && (
                   <div className="mb-3">
                      <label className="block text-[10px] font-bold text-gray-400 mb-1">Test Grip Style</label>
                      <select 
                        value={previewGripType || ''} 
                        onChange={(e) => setPreviewGripType(e.target.value || null)}
                        className="w-full bg-gray-900 border border-purple-500/30 rounded px-2 py-1.5 text-xs text-gray-200 focus:ring-1 focus:ring-purple-500 outline-none"
                      >
                        <option value="">None</option>
                        {PREVIEW_GRIP_TYPES.map((type) => (
                          <option key={type} value={type}>{type}</option>
                        ))}
                      </select>
                   </div>
                )}

                {showHandPreview && ((formData.slot === 'weapon' && formData.grip_type) || previewGripType) && (
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 mb-1">
                      Opacity: {Math.round(handOpacity * 100)}%
                    </label>
                    <input
                      type="range"
                      min={0}
                      max={1}
                      step={0.05}
                      value={handOpacity}
                      onChange={(e) => setHandOpacity(parseFloat(e.target.value))}
                      className="w-full h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer slider-purple"
                    />
                    {formData.slot === 'weapon' && formData.hand_grip_z_index_override !== null && (
                      <p className="text-[9px] text-purple-300 mt-2 font-bold bg-purple-900/30 p-1.5 rounded inline-block">
                        Previewing with Z-Index Override: {formData.hand_grip_z_index_override}
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}

            <div className="grid grid-cols-2 gap-3 md:gap-4">
              <div>
                <div className="flex justify-between mb-2">
                  <label className="text-sm font-bold text-gray-300">Offset X</label>
                  <span className="text-sm text-gray-400">
                    {editingGender === 'female' ? positioning.offsetXFemale : positioning.offsetX}px
                  </span>
                </div>
                <input 
                  type="range" 
                  min={-512} max={512} 
                  value={editingGender === 'female' ? positioning.offsetXFemale : positioning.offsetX} 
                  onChange={(e) => setPositioning((prev: any) => {
                    const val = parseInt(e.target.value);
                    if (editingGender === 'female') {
                      return { ...prev, offsetXFemale: val };
                    }
                    // Sync mode: update both if they are currently same
                    if (prev.offsetXFemale === prev.offsetX) {
                      return { ...prev, offsetX: val, offsetXFemale: val };
                    }
                    return { ...prev, offsetX: val };
                  })} 
                  className={`w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer ${editingGender === 'female' ? 'slider-pink' : 'slider-red'}`} 
                />
              </div>
              <div>
                <div className="flex justify-between mb-2">
                  <label className="text-sm font-bold text-gray-300">Offset Y</label>
                  <span className="text-sm text-gray-400">
                    {editingGender === 'female' ? positioning.offsetYFemale : positioning.offsetY}px
                  </span>
                </div>
                <input 
                  type="range" 
                  min={-512} max={512} 
                  value={editingGender === 'female' ? positioning.offsetYFemale : positioning.offsetY} 
                  onChange={(e) => setPositioning((prev: any) => {
                    const val = parseInt(e.target.value);
                    if (editingGender === 'female') {
                      return { ...prev, offsetYFemale: val };
                    }
                    // Sync mode: update both if they are currently same
                    if (prev.offsetYFemale === prev.offsetY) {
                      return { ...prev, offsetY: val, offsetYFemale: val };
                    }
                    return { ...prev, offsetY: val };
                  })} 
                  className={`w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer ${editingGender === 'female' ? 'slider-pink' : 'slider-red'}`} 
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-300 mb-2">
                Z-Index: {positioning.zIndex} (Layer: {(positioning.zIndex / 10).toFixed(1)})
              </label>
              <input
                type="range"
                  min={-20}
                  max={100}
                value={positioning.zIndex}
                onChange={(e) => setPositioning((prev: any) => ({ ...prev, zIndex: parseInt(e.target.value) }))}
                className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider-red"
              />
              <div className="text-[10px] text-gray-500 mt-1 space-y-0.5">
                  <p>Higher Z-Index = closer to the camera (drawn on top). Negative values render behind the base silhouette.</p>
                  <p>Background: <span className="text-gray-300">-20</span> · Base body: <span className="text-gray-300">0–9</span>.</p>
                <p>
                  Suggested creator layers — Back items (capes / weapons): <span className="text-gray-300">-20 – -1</span>,
                  Body/Clothes: <span className="text-gray-300">10–19</span>, Mouth: <span className="text-gray-300">20–29</span>, Eyes: <span className="text-gray-300">30–39</span>,
                  Hair: <span className="text-gray-300">40–49</span>, Face accessories: <span className="text-gray-300">50–59</span>.
                </p>
              </div>
            </div>
            <div>
              <div className="flex justify-between mb-2">
                <label className="text-sm font-bold text-gray-300">Rotation</label>
                <span className="text-sm text-gray-400">
                  {editingGender === 'female' ? positioning.rotationFemale : positioning.rotation}°
                </span>
              </div>
              <input
                type="range"
                min={-180}
                max={180}
                value={editingGender === 'female' ? positioning.rotationFemale : positioning.rotation}
                onChange={(e) => setPositioning((prev: any) => {
                  const val = parseInt(e.target.value);
                  if (editingGender === 'female') {
                    return { ...prev, rotationFemale: val };
                  }
                  // Sync mode: update both if they are currently same
                  if (prev.rotationFemale === prev.rotation) {
                    return { ...prev, rotation: val, rotationFemale: val };
                  }
                  return { ...prev, rotation: val };
                })}
                className={`w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer ${editingGender === 'female' ? 'slider-pink' : 'slider-red'}`}
              />
              <div className="text-[10px] text-gray-500 mt-1">Rotate item from -180° to 180°</div>
            </div>
            <div>
              <div className="flex justify-between mb-2">
                <label className="text-sm font-bold text-gray-300">Scale</label>
                <span className="text-sm text-gray-400">
                  {(editingGender === 'female' ? positioning.scaleFemale : positioning.scale).toFixed(2)}x
                </span>
              </div>
              <input 
                type="range" min={0.1} max={3} step={0.01} 
                value={editingGender === 'female' ? positioning.scaleFemale : positioning.scale} 
                onChange={(e) => setPositioning((prev: any) => {
                  const val = parseFloat(e.target.value);
                  if (editingGender === 'female') {
                    return { ...prev, scaleFemale: val };
                  }
                  // Sync mode: update both if they are currently same
                  if (prev.scaleFemale === prev.scale) {
                    return { ...prev, scale: val, scaleFemale: val };
                  }
                  return { ...prev, scale: val };
                })} 
                className={`w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer ${editingGender === 'female' ? 'slider-pink' : 'slider-red'}`} 
              />
              <div className="text-[10px] text-gray-500 mt-1">Resize item: 0.10x (tiny) to 3.00x (huge)</div>
            </div>
          </div>
        </div>
  );
}
