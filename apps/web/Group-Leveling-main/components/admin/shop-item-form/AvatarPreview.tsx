import React from 'react';
import AnimatedEquip from '@/components/AnimatedEquip';

interface AvatarPreviewProps {
  formData: any;
  previewZoom: number;
  setPreviewZoom: React.Dispatch<React.SetStateAction<number>>;
  currentMaskUrl: string | null;
  positioning: any;
  maleBaseBodyItem: any;
  femaleBaseBodyItem: any;
  getAvatarImage: () => string;
  SKIN_TINT_SLOTS: string[];
  baseLayerPreviewUrl: string | null;
  baseLayerFetchedUrl: string | null;
  editingItem: any;
  previewUrl: string | null;
  editingGender: 'male' | 'female';
  isDragging: boolean;
  handleMouseDown: (e: React.MouseEvent) => void;
  skinColor: string;
  setSkinColor: React.Dispatch<React.SetStateAction<string>>;
  showHandPreview: boolean;
  handOpacity: number;
  previewGripType: string | null;
  shopItems: any[];
  isAnimated: boolean;
  animConfig: any;
}

export const AvatarPreview: React.FC<AvatarPreviewProps> = ({
  formData,
  previewZoom,
  setPreviewZoom,
  currentMaskUrl,
  positioning,
  maleBaseBodyItem,
  femaleBaseBodyItem,
  getAvatarImage,
  SKIN_TINT_SLOTS,
  baseLayerPreviewUrl,
  baseLayerFetchedUrl,
  editingItem,
  previewUrl,
  editingGender,
  isDragging,
  handleMouseDown,
  skinColor,
  setSkinColor,
  showHandPreview,
  handOpacity,
  previewGripType,
  shopItems,
  isAnimated,
  animConfig,
}) => {
  return (
    <div className="relative">
      <div className="absolute top-4 right-4 z-20 flex flex-col gap-2">
        <button
          type="button"
          onClick={() => setPreviewZoom((prev) => Math.min(prev + 0.1, 3.0))}
          className="w-8 h-8 bg-gray-800/80 hover:bg-gray-700 text-white rounded-full flex items-center justify-center border border-gray-600 font-bold transition-colors"
          title="Zoom In"
        >
          +
        </button>
        <button
          type="button"
          onClick={() => setPreviewZoom((prev) => Math.max(prev - 0.1, 0.5))}
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
              margin: previewZoom <= 1 ? '0 auto' : undefined,
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
                    style={
                      currentMaskUrl && (formData.eraser_mask_targets?.includes('base_body') || formData.eraser_mask_targets?.includes('avatar'))
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
                    {(() => {
                      const isBaseBodyAvatar =
                        positioning.selectedAvatar === 'male_base_body' || positioning.selectedAvatar === 'female_base_body';
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
                                  maskRepeat: 'no-repeat',
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

                      return (
                        <img src={getAvatarImage()} alt="Base Avatar" className="absolute inset-0 w-full h-full object-contain" />
                      );
                    })()}
                  </div>
                </div>
              )}

              {SKIN_TINT_SLOTS.includes(formData.slot) &&
              (baseLayerPreviewUrl ||
                baseLayerFetchedUrl ||
                editingItem?.image_base_url ||
                (['base_body', 'hand_grip'].includes(formData.slot) && (previewUrl || editingItem?.image_url))) ? (
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
                    cursor: isDragging ? 'grabbing' : 'grab',
                    ...(currentMaskUrl && formData.eraser_mask_targets?.includes(formData.slot) ? {
                      WebkitMaskImage: `url(${currentMaskUrl})`,
                      maskImage: `url(${currentMaskUrl})`,
                      WebkitMaskSize: 'contain',
                      WebkitMaskPosition: 'center',
                      WebkitMaskRepeat: 'no-repeat',
                    } : {})
                  }}
                  onMouseDown={handleMouseDown}
                >
                  {(() => {
                    const baseUrl =
                      baseLayerFetchedUrl ||
                      baseLayerPreviewUrl ||
                      editingItem?.image_base_url ||
                      (['base_body', 'hand_grip'].includes(formData.slot) ? previewUrl || editingItem?.image_url : '') ||
                      '';
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
                          maskRepeat: 'no-repeat',
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
                        mixBlendMode: formData.slot === 'hand_grip' || formData.slot === 'base_body' ? 'multiply' : 'normal',
                      }}
                    />
                  )}
                </div>
              ) : (
                <>
                  {/* Ghost Hand Preview for Weapons & Avatars */}
                  {(() => {
                    const activePreviewGrip =
                      formData.slot === 'weapon'
                        ? formData.grip_type
                        : ['avatar', 'base_body'].includes(formData.slot)
                          ? previewGripType
                          : null;

                    if (!activePreviewGrip || !showHandPreview) return null;

                    const targetGender = editingGender === 'female' ? 'female' : 'male';
                    const handItem = shopItems.find((i: any) => {
                      if (i.slot !== 'hand_grip' || i.grip_type !== activePreviewGrip) return false;
                      const itemGender = Array.isArray(i.gender) ? i.gender : [i.gender];
                      return itemGender.includes(targetGender) || itemGender.includes('unisex');
                    });

                    if (!handItem?.image_url) return null;

                    const isFemaleHand = targetGender === 'female';
                    const hScale =
                      isFemaleHand && handItem.scale_female !== null && handItem.scale_female !== undefined
                        ? handItem.scale_female
                        : handItem.scale || 1;
                    const hX =
                      isFemaleHand && handItem.offset_x_female !== null && handItem.offset_x_female !== undefined
                        ? handItem.offset_x_female
                        : handItem.offset_x || 0;
                    const hY =
                      isFemaleHand && handItem.offset_y_female !== null && handItem.offset_y_female !== undefined
                        ? handItem.offset_y_female
                        : handItem.offset_y || 0;
                    const hRot =
                      isFemaleHand && handItem.rotation_female !== null && handItem.rotation_female !== undefined
                        ? handItem.rotation_female
                        : handItem.rotation || 0;
                    const hZIndex = handItem.z_index ?? 90;

                    return (
                      <div className="absolute inset-0 w-full h-full" style={{ zIndex: hZIndex }}>
                        <div
                          className="absolute inset-0 w-full h-full pointer-events-none"
                          style={
                            currentMaskUrl && formData.eraser_mask_targets?.includes('hand_grip')
                              ? {
                                  WebkitMaskImage: `url(${currentMaskUrl})`,
                                  maskImage: `url(${currentMaskUrl})`,
                                  WebkitMaskSize: 'contain',
                                  WebkitMaskPosition: 'center',
                                  WebkitMaskRepeat: 'no-repeat',
                                }
                              : {}
                          }
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
                                maskRepeat: 'no-repeat',
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
      {SKIN_TINT_SLOTS.includes(formData.slot) && (
        <div className="mt-3 space-y-2">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">Skin color (base layer tint)</p>
          <div className="flex flex-wrap items-center gap-2">
            {[
              { hex: '#FFDBAC', label: 'Light' },
              { hex: '#F1C27D', label: 'Light warm' },
              { hex: '#E0AC69', label: 'Medium light' },
              { hex: '#C68642', label: 'Tan' },
              { hex: '#B87333', label: 'Filipino brown' },
              { hex: '#A0522D', label: 'Brown' },
              { hex: '#8D5524', label: 'Light skin Black' },
              { hex: '#5C3317', label: 'Dark brown' },
              { hex: '#3D2314', label: 'Dark skin' },
              { hex: '#2C1810', label: 'Black' },
            ].map(({ hex, label }) => (
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
  );
};
