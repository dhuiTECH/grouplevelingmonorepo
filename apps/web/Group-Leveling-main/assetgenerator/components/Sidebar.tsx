import React, { useRef, useState } from 'react';
import { ReferenceImage } from '../types';
import { Trash2, Upload, FileJson, X, Download, Database, ScanLine } from './Icons';

interface SidebarProps {
  references: ReferenceImage[];
  setReferences: React.Dispatch<React.SetStateAction<ReferenceImage[]>>;
  isOpen: boolean;
  onClose: () => void;
  category: string;
}

const Sidebar: React.FC<SidebarProps> = ({ references, setReferences, isOpen, onClose, category }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const importInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Filter references for the current category view
  const displayReferences = references.filter(ref => ref.category === category);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      processFiles(Array.from(e.target.files));
    }
  };

  const processFiles = (files: File[]) => {
    // Check limit on specific category
    if (displayReferences.length + files.length > 10) {
      alert(`SYSTEM WARNING: ${category} Database Capacity Limit (10)`);
      return;
    }

    files.forEach(file => {
      if (file.type !== "image/png") {
        alert(`ERROR: Invalid format ${file.name}. Require PNG.`);
        return;
      }
      
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          const newRef: ReferenceImage = {
            id: Date.now().toString() + Math.random().toString().slice(2),
            name: file.name,
            mimeType: "image/png",
            data: event.target.result as string,
            category: category // Assign current sidebar category
          };
          setReferences(prev => [...prev, newRef]);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const handleDelete = (id: string) => {
    setReferences(prev => prev.filter(ref => ref.id !== id));
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files) {
      processFiles(Array.from(e.dataTransfer.files));
    }
  };

  const exportReferences = () => {
    // Export ALL references or just current category? usually backups are global.
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(references));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", "reference_database.json");
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  const importReferences = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const imported = JSON.parse(event.target?.result as string);
          // Auto-migrate imported data if missing category
          const migrated = imported.map((r: any) => ({
             ...r,
             category: r.category || 'Other'
          }));
          setReferences(migrated);
        } catch (err) {
          alert("SYSTEM ERROR: Corrupted Data Stream");
        }
      };
      reader.readAsText(e.target.files[0]);
    }
  };

  return (
    <>
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/90 z-40 lg:hidden backdrop-blur-sm"
          onClick={onClose}
        />
      )}

      <aside 
        className={`
          fixed top-0 left-0 z-50 h-full w-80 bg-[#020617] border-r border-system/30 transform transition-transform duration-300 ease-in-out shadow-[0_0_20px_rgba(59,130,246,0.1)]
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
          lg:translate-x-0 lg:static flex flex-col
        `}
      >
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-system/20 bg-surface/50">
          <div>
            <h2 className="text-xl font-bold text-system flex items-center gap-2">
              <Database size={20} />
              REF DATABASE
            </h2>
            <div className="flex items-center gap-2 mt-1">
               <div className="h-1.5 w-1.5 bg-system rounded-full animate-pulse"></div>
               <span className="text-[10px] text-gray-400 font-mono uppercase tracking-wider">Active: {category}</span>
            </div>
          </div>
          <button onClick={onClose} className="lg:hidden text-gray-500 hover:text-system">
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
          
          {/* Stats */}
          <div className="flex justify-between items-center mb-4 text-xs font-mono text-gray-400">
            <span>STORAGE USED ({category.toUpperCase()})</span>
            <span className={displayReferences.length >= 10 ? 'text-primary' : 'text-system'}>
              [{displayReferences.length} / 10]
            </span>
          </div>

          {/* Upload Area */}
          <div 
            className={`
              border border-dashed rounded bg-[#0b1120] p-6 text-center cursor-pointer transition-all mb-6 group relative overflow-hidden
              ${isDragging ? 'border-system bg-system/10' : 'border-border hover:border-system/50'}
            `}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            {isDragging && <div className="absolute inset-0 bg-system/10 animate-pulse pointer-events-none" />}
            
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              accept="image/png" 
              multiple 
              onChange={handleFileUpload} 
            />
            <div className="flex flex-col items-center gap-3 text-gray-400 group-hover:text-system transition-colors">
              <ScanLine size={32} className="group-hover:animate-pulse" />
              <div className="text-xs uppercase tracking-wider font-bold font-mono">Upload Asset</div>
              <span className="text-[10px] text-gray-600">STYLE REFERENCE (.PNG)</span>
            </div>
          </div>

          {/* Reference Grid */}
          <div className="grid grid-cols-2 gap-3">
            {displayReferences.map((ref) => (
              <div key={ref.id} className="relative group bg-[#0b1120] border border-border p-2 hover:border-system/50 transition-colors">
                <div className="absolute top-0 right-0 w-2 h-2 border-t border-r border-system/50 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <div className="absolute bottom-0 left-0 w-2 h-2 border-b border-l border-system/50 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                
                <div className="aspect-square w-full relative mb-2 bg-[#020617]">
                  <img 
                    src={ref.data} 
                    alt={ref.name} 
                    className="w-full h-full object-contain image-pixelated opacity-70 group-hover:opacity-100 transition-opacity"
                  />
                </div>
                <div className="text-[9px] text-gray-500 truncate mb-1 font-mono uppercase">{ref.name}</div>
                <button 
                  onClick={(e) => { e.stopPropagation(); handleDelete(ref.id); }}
                  className="absolute -top-1 -right-1 bg-primaryDark text-white p-1 rounded-none hover:bg-primary transition-colors shadow-lg opacity-0 group-hover:opacity-100"
                >
                  <Trash2 size={10} />
                </button>
              </div>
            ))}
            {displayReferences.length === 0 && (
              <div className="col-span-2 text-center py-12 text-gray-600 text-xs font-mono border border-border/30 border-dashed">
                // EMPTY<br/>
                // ADD STYLE REFS FOR {category.toUpperCase()}
              </div>
            )}
          </div>
        </div>

        {/* Actions Footer */}
        <div className="p-4 border-t border-border bg-[#0b1120]">
           <div className="flex gap-2">
             <button 
                onClick={exportReferences}
                disabled={references.length === 0}
                className="flex-1 flex items-center justify-center gap-2 text-[10px] uppercase font-bold tracking-wider bg-surface hover:bg-panel text-system hover:text-white py-3 border border-border transition-all disabled:opacity-30 disabled:cursor-not-allowed"
             >
               <Download size={12} /> BACKUP
             </button>
             <button 
                onClick={() => importInputRef.current?.click()}
                className="flex-1 flex items-center justify-center gap-2 text-[10px] uppercase font-bold tracking-wider bg-surface hover:bg-panel text-system hover:text-white py-3 border border-border transition-all"
             >
               <FileJson size={12} /> RESTORE
             </button>
           </div>
           <input 
             type="file" 
             ref={importInputRef} 
             className="hidden" 
             accept="application/json" 
             onChange={importReferences} 
           />
        </div>
      </aside>
    </>
  );
};

export default Sidebar;