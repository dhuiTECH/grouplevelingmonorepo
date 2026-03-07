import React from 'react';

interface PositioningControlsProps {
  showDualPositioning: boolean;
  editingGender: 'male' | 'female';
  setEditingGender: React.Dispatch<React.SetStateAction<'male' | 'female'>>;
  positioning: any;
  setPositioning: React.Dispatch<React.SetStateAction<any>>;
  formData: any;
  showHandPreview: boolean;
  setShowHandPreview: React.Dispatch<React.SetStateAction<boolean>>;
  previewGripType: string | null;
  setPreviewGripType: React.Dispatch<React.SetStateAction<string | null>>;
  handOpacity: number;
  setHandOpacity: React.Dispatch<React.SetStateAction<number>>;
}

export const PositioningControls: React.FC<PositioningControlsProps> = ({
  showDualPositioning,
  editingGender,
  setEditingGender,
  positioning,
  setPositioning,
  formData,
  showHandPreview,
  setShowHandPreview,
  previewGripType,
  setPreviewGripType,
  handOpacity,
  setHandOpacity,
}) => {
  return (
    <div className="bg-gray-900/40 p-3 md:p-4 rounded-lg space-y-2 md:space-y-3">
      <h4 className="text-sm font-black uppercase tracking-widest text-red-400 text-center">Position Controls</h4>

      {showDualPositioning && (
        <div className="flex justify-center mb-4">
          <div className="bg-gray-800 p-1 rounded-lg flex gap-1">
            <button
              type="button"
              onClick={() => {
                setEditingGender('male');
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
              <label htmlFor="showHandPreview" className="text-[10px] text-gray-400 font-bold cursor-pointer">
                Show
              </label>
            </div>
          </div>

          {['avatar', 'base_body'].includes(formData.slot) && (
            <div className="mb-3">
              <label className="block text-[10px] font-bold text-gray-400 mb-1">Test Grip Style</label>
              <select
                value={previewGripType || ''}
                onChange={(e) => setPreviewGripType(e.target.value || null)}
                className="w-full bg-gray-900 border border-purple-500/30 rounded px-2 py-1.5 text-xs text-gray-200 focus:ring-1 focus:ring-purple-500 outline-none"
              >
                <option value="">None</option>
                {['All Around', 'Caster', 'Shield', 'Wand'].map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
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
            min={-512}
            max={512}
            value={editingGender === 'female' ? positioning.offsetXFemale : positioning.offsetX}
            onChange={(e) =>
              setPositioning((prev: any) => {
                const val = parseInt(e.target.value);
                if (editingGender === 'female') {
                  return { ...prev, offsetXFemale: val };
                }
                if (prev.offsetXFemale === prev.offsetX) {
                  return { ...prev, offsetX: val, offsetXFemale: val };
                }
                return { ...prev, offsetX: val };
              })
            }
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
            min={-512}
            max={512}
            value={editingGender === 'female' ? positioning.offsetYFemale : positioning.offsetY}
            onChange={(e) =>
              setPositioning((prev: any) => {
                const val = parseInt(e.target.value);
                if (editingGender === 'female') {
                  return { ...prev, offsetYFemale: val };
                }
                if (prev.offsetYFemale === prev.offsetY) {
                  return { ...prev, offsetY: val, offsetYFemale: val };
                }
                return { ...prev, offsetY: val };
              })
            }
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
          <p>
            Background: <span className="text-gray-300">-20</span> · Base body: <span className="text-gray-300">0–9</span>.
          </p>
          <p>
            Suggested creator layers — Back items (capes / weapons): <span className="text-gray-300">-20 – -1</span>,
            Body/Clothes: <span className="text-gray-300">10–19</span>, Mouth: <span className="text-gray-300">20–29</span>,
            Eyes: <span className="text-gray-300">30–39</span>, Hair: <span className="text-gray-300">40–49</span>, Face
            accessories: <span className="text-gray-300">50–59</span>.
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
          onChange={(e) =>
            setPositioning((prev: any) => {
              const val = parseInt(e.target.value);
              if (editingGender === 'female') {
                return { ...prev, rotationFemale: val };
              }
              if (prev.rotationFemale === prev.rotation) {
                return { ...prev, rotation: val, rotationFemale: val };
              }
              return { ...prev, rotation: val };
            })
          }
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
          type="range"
          min={0.1}
          max={3}
          step={0.01}
          value={editingGender === 'female' ? positioning.scaleFemale : positioning.scale}
          onChange={(e) =>
            setPositioning((prev: any) => {
              const val = parseFloat(e.target.value);
              if (editingGender === 'female') {
                return { ...prev, scaleFemale: val };
              }
              if (prev.scaleFemale === prev.scale) {
                return { ...prev, scale: val, scaleFemale: val };
              }
              return { ...prev, scale: val };
            })
          }
          className={`w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer ${editingGender === 'female' ? 'slider-pink' : 'slider-red'}`}
        />
        <div className="text-[10px] text-gray-500 mt-1">Resize item: 0.10x (tiny) to 3.00x (huge)</div>
      </div>
    </div>
  );
};
