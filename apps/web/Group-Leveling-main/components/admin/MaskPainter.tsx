"use client";

import React, { useRef, useState, useEffect } from 'react';
import AnimatedEquip from '@/components/AnimatedEquip';

interface MaskPainterProps {
  baseReferenceUrl: string; // The thing we are erasing
  itemUrl: string;          // The item doing the erasing
  offsetX: number;
  offsetY: number;
  scale: number;
  rotation: number;
  useFullSize?: boolean; // If true, forces 512x512. If false, uses natural size.
  isAnimated?: boolean;
  animConfig?: {
    frameWidth: number;
    frameHeight: number;
    totalFrames: number;
    fps: number;
  };
  secondaryReference?: {
    url: string;
    offsetX: number;
    offsetY: number;
    scale: number;
    rotation: number;
    zIndex?: number;
    opacity?: number;
    useFullSize?: boolean;
    isAnimated?: boolean;
    animConfig?: {
      frameWidth: number;
      frameHeight: number;
      totalFrames: number;
      fps: number;
    };
  };
  onSaveMask: (base64Png: string) => void; 
}

export const MaskPainter = ({ 
  baseReferenceUrl, 
  itemUrl, 
  offsetX,
  offsetY,
  scale,
  rotation,
  useFullSize = false,
  isAnimated = false,
  animConfig = { frameWidth: 0, frameHeight: 0, totalFrames: 1, fps: 10 },
  secondaryReference,
  onSaveMask 
}: MaskPainterProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [brushSize, setBrushSize] = useState(15);
  const [previewZoom, setPreviewZoom] = useState(1.0);
  const [itemOpacity, setItemOpacity] = useState(0.7);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [showBrush, setShowBrush] = useState(false);
  const [isAutoMasking, setIsAutoMasking] = useState(false);
  const [alphaThreshold, setAlphaThreshold] = useState(150);
  const [isEraser, setIsEraser] = useState(false);
  const [autoMaskOn, setAutoMaskOn] = useState(false);
  const cachedStampDataRef = useRef<ImageData | null>(null);
  const cachedItemUrlRef = useRef<string | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = 'black'; 
    ctx.lineWidth = brushSize;
  }, [brushSize]);

  // Adjust coordinates for zoom
  const getMousePos = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return {
      x: (e.clientX - rect.left) / previewZoom,
      y: (e.clientY - rect.top) / previewZoom
    };
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    ctx.globalCompositeOperation = isEraser ? 'destination-out' : 'source-over';
    ctx.lineWidth = brushSize;
    const pos = getMousePos(e);
    setMousePos(pos);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
    setIsDrawing(true);
  };

  const draw = (pos: { x: number, y: number }) => {
    if (!isDrawing) return;
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    ctx.lineWidth = brushSize;
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const pos = getMousePos(e);
    setMousePos(pos);
    if (isDrawing) {
      draw(pos);
    }
  };

  const stopDrawing = () => setIsDrawing(false);

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    canvas?.getContext('2d')?.clearRect(0, 0, canvas.width, canvas.height);
  };

  const handleExport = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      // Create a temporary canvas to invert the mask logic
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = canvas.width;
      tempCanvas.height = canvas.height;
      const tCtx = tempCanvas.getContext('2d');
      
      if (tCtx) {
        // 1. Fill the canvas with solid black (This keeps the character visible)
        tCtx.fillStyle = 'black';
        tCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
        
        // 2. Draw the user's strokes using 'destination-out' to punch transparent holes
        tCtx.globalCompositeOperation = 'destination-out';
        tCtx.drawImage(canvas, 0, 0);
        
        // 3. Export the resulting "swiss cheese" mask
        onSaveMask(tempCanvas.toDataURL('image/png'));
      }
    }
  };

  const stampFromPixelData = (data: ImageData, mainCtx: CanvasRenderingContext2D) => {
    mainCtx.fillStyle = 'black';
    for (let y = 0; y < 256; y++) {
      for (let x = 0; x < 256; x++) {
        const i = (y * 256 + x) * 4;
        if (data.data[i + 3] > alphaThreshold) {
          mainCtx.fillRect(x * 2, y * 2, 2, 2);
        }
      }
    }
  };

  const runStampFromCache = () => {
    const mainCanvas = canvasRef.current;
    const mainCtx = mainCanvas?.getContext('2d');
    const data = cachedStampDataRef.current;
    if (!mainCanvas || !mainCtx || !data) return;
    mainCtx.clearRect(0, 0, mainCanvas.width, mainCanvas.height);
    stampFromPixelData(data, mainCtx);
  };

  const handleAutoMask = () => {
    if (!itemUrl || isAnimated) return;
    const mainCanvas = canvasRef.current;
    if (!mainCanvas) return;

    const mainCtx = mainCanvas.getContext('2d');
    if (mainCtx) mainCtx.clearRect(0, 0, mainCanvas.width, mainCanvas.height);

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      setIsAutoMasking(true);
      try {
        const off = document.createElement('canvas');
        off.width = 256;
        off.height = 256;
        const octx = off.getContext('2d');
        if (!octx) {
          setIsAutoMasking(false);
          return;
        }
        octx.clearRect(0, 0, 256, 256);
        const centerX = 64 + offsetX / 2;
        const centerY = 64 + offsetY / 2;
        const s = scale / 2;
        const r = (rotation * Math.PI) / 180;
        const w = img.naturalWidth || img.width;
        const h = img.naturalHeight || img.height;
        octx.save();
        octx.translate(centerX, centerY);
        octx.rotate(r);
        octx.scale(s, s);
        octx.translate(-w / 2, -h / 2);
        octx.drawImage(img, 0, 0, w, h);
        octx.restore();

        const data = octx.getImageData(0, 0, 256, 256);
        cachedStampDataRef.current = data;
        cachedItemUrlRef.current = itemUrl;

        const ctx = mainCanvas.getContext('2d');
        if (ctx) stampFromPixelData(data, ctx);
      } finally {
        setIsAutoMasking(false);
      }
    };
    img.onerror = () => setIsAutoMasking(false);
    img.src = itemUrl;
  };

  useEffect(() => {
    if (!autoMaskOn || !itemUrl || isAnimated) return;
    if (cachedStampDataRef.current && cachedItemUrlRef.current === itemUrl) {
      runStampFromCache();
    } else {
      handleAutoMask();
    }
  }, [alphaThreshold, itemUrl]);

  const handleToggleAutoMask = () => {
    const next = !autoMaskOn;
    setAutoMaskOn(next);
    if (next && itemUrl && !isAnimated) {
      handleAutoMask();
    }
    if (!next) {
      cachedStampDataRef.current = null;
      cachedItemUrlRef.current = null;
    }
  };

  return (
    <div className="flex flex-col items-center gap-4 p-4 bg-gray-900 rounded-xl border border-gray-700 max-h-[90vh] overflow-y-auto">
      <div className="flex justify-between w-full items-center">
        <h3 className="text-white font-bold">Mask Painter</h3>
        <div className="flex gap-2">
          <button type="button" onClick={() => setPreviewZoom(prev => Math.min(prev + 0.1, 3.0))} className="w-8 h-8 bg-gray-800 text-white rounded-full font-bold">+</button>
          <button type="button" onClick={() => setPreviewZoom(prev => Math.max(prev - 0.1, 0.5))} className="w-8 h-8 bg-gray-800 text-white rounded-full font-bold">-</button>
          <button type="button" onClick={() => setPreviewZoom(1.0)} className="w-8 h-8 bg-gray-800 text-white rounded-full text-[10px] font-bold">1:1</button>
        </div>
      </div>
      
      <div className="relative border border-gray-600 custom-scrollbar" style={{ width: 520, height: 520, overflow: previewZoom > 1 ? 'auto' : 'hidden' }}>
        <div className="relative" style={{ width: 512 * previewZoom, height: 512 * previewZoom, margin: previewZoom <= 1 ? '0 auto' : undefined }}>
          <div 
            className="w-[512px] h-[512px] bg-gray-800 relative"
            style={{ transform: `scale(${previewZoom})`, transformOrigin: 'top left' }}
          >
            {/* Base Reference Layer */}
            <img 
              src={baseReferenceUrl} 
              className="absolute inset-0 w-full h-full object-contain pointer-events-none" 
              crossOrigin="anonymous" 
            />

            {/* Secondary Reference Layer (e.g. Hand Grip or Weapon) */}
            {secondaryReference && (
              <div
                className="absolute pointer-events-none"
                style={{
                  left: `${128 + secondaryReference.offsetX}px`,
                  top: `${128 + secondaryReference.offsetY}px`,
                  zIndex: secondaryReference.zIndex ?? 15,
                  transform: `translate(-50%, -50%) scale(${secondaryReference.scale}) rotate(${secondaryReference.rotation}deg)`,
                  transformOrigin: 'center',
                  opacity: secondaryReference.opacity ?? 1,
                }}
              >
                {secondaryReference.isAnimated && secondaryReference.animConfig && secondaryReference.animConfig.frameWidth > 0 ? (
                  <AnimatedEquip 
                    src={secondaryReference.url} 
                    frameWidth={secondaryReference.animConfig.frameWidth} 
                    frameHeight={secondaryReference.animConfig.frameHeight} 
                    totalFrames={secondaryReference.animConfig.totalFrames} 
                    fps={secondaryReference.animConfig.fps} 
                  />
                ) : (
                  <img 
                    src={secondaryReference.url} 
                    className="pointer-events-none select-none" 
                    style={{ 
                      width: secondaryReference.useFullSize ? '512px' : 'auto', 
                      height: secondaryReference.useFullSize ? '512px' : 'auto',
                      maxWidth: 'none',
                      maxHeight: 'none',
                      objectFit: secondaryReference.useFullSize ? 'contain' : 'initial'
                    }}
                    crossOrigin="anonymous" 
                  />
                )}
              </div>
            )}

            {/* The canvas we draw on - it's sized exactly to the base body (512x512) */}
            <canvas
              ref={canvasRef}
              width={512}
              height={512}
              className={`absolute inset-0 z-10 ${showBrush ? 'cursor-none' : 'cursor-crosshair'}`}
              onMouseDown={startDrawing}
              onMouseMove={handleMouseMove}
              onMouseUp={stopDrawing}
              onMouseEnter={() => setShowBrush(true)}
              onMouseLeave={() => {
                stopDrawing();
                setShowBrush(false);
              }}
              style={{ opacity: 0.8 }} // Slight transparency so we can see the canvas bounds vs item
            />

            {/* Brush Preview Circle */}
            {showBrush && (
              <div
                className="absolute rounded-full border border-white pointer-events-none z-50"
                style={{
                  width: brushSize,
                  height: brushSize,
                  left: mousePos.x,
                  top: mousePos.y,
                  transform: 'translate(-50%, -50%)',
                  backgroundColor: 'rgba(255, 255, 255, 0.2)',
                  boxShadow: '0 0 0 1px black',
                }}
              />
            )}

            {/* The Item Layer with its transforms */}
            {itemUrl && (
              <div
                className="absolute pointer-events-none"
                style={{
                  left: `${128 + offsetX}px`,
                  top: `${128 + offsetY}px`,
                  zIndex: 20,
                  transform: `translate(-50%, -50%) scale(${scale}) rotate(${rotation}deg)`,
                  transformOrigin: 'center',
                  opacity: itemOpacity,
                }}
              >
                {isAnimated && animConfig.frameWidth > 0 ? (
                  <AnimatedEquip 
                    src={itemUrl} 
                    frameWidth={animConfig.frameWidth} 
                    frameHeight={animConfig.frameHeight} 
                    totalFrames={animConfig.totalFrames} 
                    fps={animConfig.fps} 
                  />
                ) : (
                  <img 
                    src={itemUrl} 
                    className="pointer-events-none select-none" 
                    style={{ 
                      width: useFullSize ? '512px' : 'auto', 
                      height: useFullSize ? '512px' : 'auto',
                      maxWidth: 'none',
                      maxHeight: 'none',
                      objectFit: useFullSize ? 'contain' : 'initial'
                    }}
                    crossOrigin="anonymous" 
                  />
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex w-full justify-between items-center bg-gray-800/50 p-3 rounded-lg border border-gray-700 flex-wrap gap-3">
        <div className="flex flex-col gap-2 min-w-[100px] flex-1">
          <div className="flex justify-between items-center">
            <label className="text-[10px] font-black uppercase text-gray-400">Brush Size</label>
            <span className="text-[10px] text-blue-400 font-bold">{brushSize}px</span>
          </div>
          <input type="range" min="2" max="60" value={brushSize} onChange={(e) => setBrushSize(Number(e.target.value))} className="w-full accent-blue-500 h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer" />
          <div className="flex gap-1 mt-1">
            <button
              type="button"
              onClick={() => setIsEraser(false)}
              className={`flex-1 px-2 py-1 rounded text-[10px] font-bold transition-colors ${!isEraser ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-400 hover:bg-gray-600'}`}
            >
              Brush
            </button>
            <button
              type="button"
              onClick={() => setIsEraser(true)}
              className={`flex-1 px-2 py-1 rounded text-[10px] font-bold transition-colors ${isEraser ? 'bg-amber-600 text-white' : 'bg-gray-700 text-gray-400 hover:bg-gray-600'}`}
            >
              Eraser
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-2 min-w-[100px] flex-1">
          <div className="flex justify-between items-center">
            <label className="text-[10px] font-black uppercase text-gray-400">Auto-Mask Strictness</label>
            <span className="text-[10px] text-amber-400 font-bold">{alphaThreshold}</span>
          </div>
          <input type="range" min="1" max="255" value={alphaThreshold} onChange={(e) => setAlphaThreshold(Number(e.target.value))} className="w-full accent-amber-500 h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer" />
        </div>

        <div className="flex flex-col gap-2 min-w-[100px] flex-1">
          <div className="flex justify-between items-center">
            <label className="text-[10px] font-black uppercase text-gray-400">Item Opacity</label>
            <span className="text-[10px] text-purple-400 font-bold">{Math.round(itemOpacity * 100)}%</span>
          </div>
          <input type="range" min="0" max="1" step="0.01" value={itemOpacity} onChange={(e) => setItemOpacity(Number(e.target.value))} className="w-full accent-purple-500 h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer" />
        </div>

        <div className="flex gap-2 items-center flex-wrap">
          <button onClick={clearCanvas} className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 rounded text-xs font-bold transition-colors">Clear</button>
          <span className="inline-flex items-center gap-1" title="When on, move the Strictness slider to see a live preview of the mask.">
            <button
              type="button"
              onClick={handleToggleAutoMask}
              disabled={!itemUrl || isAnimated || isAutoMasking}
              className={`px-4 py-2 rounded text-xs font-bold transition-colors inline-flex items-center gap-1 ${autoMaskOn ? 'bg-amber-600 text-white' : 'bg-amber-500/20 text-amber-400 border border-amber-500/40'} disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {isAutoMasking ? '…' : '✨'} Auto-Mask {autoMaskOn ? 'On' : 'Off'}
            </button>
            <span className="text-gray-500 cursor-help text-xs font-bold" title="When on, move the Strictness slider to see a live preview of the mask." aria-label="Info">ⓘ</span>
          </span>
          <button onClick={handleExport} className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs font-bold shadow-lg shadow-blue-900/20 transition-colors">Save Mask</button>
        </div>
      </div>
    </div>
  );
};
