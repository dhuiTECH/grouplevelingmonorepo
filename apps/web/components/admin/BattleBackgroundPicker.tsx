'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Upload, X, Image as ImageIcon, Loader2, Trash2 } from 'lucide-react';

interface BattleBackgroundPickerProps {
  selectedImageUrl: string;
  onSelect: (imageUrl: string) => void;
}

interface StorageFile {
  name: string;
  id: string;
  updated_at: string;
  created_at: string;
  last_accessed_at: string;
  metadata: any;
}

export function BattleBackgroundPicker({ selectedImageUrl, onSelect }: BattleBackgroundPickerProps) {
  const [images, setImages] = useState<StorageFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deletingName, setDeletingName] = useState<string | null>(null);

  const BUCKET = 'game-assets';
  const FOLDER = 'encounters/backgrounds';

  const fetchImages = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.storage
        .from(BUCKET)
        .list(FOLDER);

      if (error) {
        console.error('Error fetching images:', error);
        setError(`Failed to load images: ${error.message}`);
      } else {
        setImages(data || []);
        setError(null);
      }
    } catch (err) {
      console.error('Error:', err);
      setError('Failed to load images');
    } finally {
      setLoading(false);
    }
  };

  const uploadImage = async (file: File) => {
    try {
      setUploading(true);
      const fileName = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;

        const { data, error } = await supabase.storage
          .from(BUCKET)
          .upload(`${FOLDER}/${fileName}`, file, {
            upsert: true,
            cacheControl: '31536000'
          });

      if (error) {
        setError(`Failed to upload image: ${error.message}`);
      } else {
        await fetchImages();
        const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(`${FOLDER}/${fileName}`);
        onSelect(urlData.publicUrl);
      }
    } catch (err) {
      setError('Failed to upload image');
    } finally {
      setUploading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) uploadImage(file);
    e.target.value = '';
  };

  const getImageUrl = (fileName: string) => {
    const { data } = supabase.storage.from(BUCKET).getPublicUrl(`${FOLDER}/${fileName}`);
    return data.publicUrl;
  };

  const deleteImage = async (fileName: string) => {
    if (!confirm(`Delete "${fileName}"? This cannot be undone.`)) return;
    try {
      setDeletingName(fileName);
      const { error: removeError } = await supabase.storage
        .from(BUCKET)
        .remove([`${FOLDER}/${fileName}`]);
      if (removeError) {
        setError(`Failed to delete: ${removeError.message}`);
        return;
      }
      const deletedUrl = getImageUrl(fileName);
      if (selectedImageUrl && (selectedImageUrl === deletedUrl || selectedImageUrl.includes(fileName))) {
        onSelect('');
      }
      await fetchImages();
    } catch (err) {
      setError('Failed to delete image');
    } finally {
      setDeletingName(null);
    }
  };

  useEffect(() => {
    fetchImages();
  }, []);

  return (
    <div className="space-y-4 bg-gray-900/40 p-4 rounded-xl border border-gray-800">
      <div className="flex items-center justify-between">
        <h4 className="text-[10px] font-black uppercase text-gray-400 flex items-center gap-2">
          <ImageIcon size={14} className="text-red-400" /> Previous Backgrounds
        </h4>
        <div className="flex gap-2">
           <label className="cursor-pointer">
            <input
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
              disabled={uploading}
            />
            <div className={`flex items-center gap-1 px-2 py-1 bg-red-600/20 hover:bg-red-600/30 text-red-400 rounded text-[9px] font-black uppercase border border-red-500/30 transition-all ${uploading ? 'opacity-50' : ''}`}>
              {uploading ? <Loader2 size={10} className="animate-spin" /> : <Upload size={10} />}
              Upload
            </div>
          </label>
          <button
            onClick={fetchImages}
            className="p-1 text-gray-500 hover:text-white transition-colors"
            title="Refresh"
          >
            <Loader2 size={14} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {error && <div className="text-red-400 text-[10px] font-bold">{error}</div>}

      <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
        {loading && images.length === 0 ? (
          <div className="col-span-full py-8 flex justify-center">
            <Loader2 size={24} className="animate-spin text-gray-600" />
          </div>
        ) : images.length === 0 ? (
          <div className="col-span-full py-8 text-center text-gray-500 text-[10px] uppercase font-bold">
            No backgrounds found
          </div>
        ) : (
          images.map((image) => {
            const imageUrl = getImageUrl(image.name);
            const isSelected = selectedImageUrl.includes(image.name);
            const isDeleting = deletingName === image.name;

            return (
              <div
                key={image.name}
                className={`relative aspect-video rounded-md overflow-hidden border-2 transition-all group ${
                  isSelected ? 'border-red-500 ring-1 ring-red-500' : 'border-gray-800 hover:border-gray-600'
                }`}
              >
                <button
                  type="button"
                  onClick={() => onSelect(imageUrl)}
                  className="absolute inset-0 w-full h-full block"
                >
                  <img
                    src={imageUrl}
                    alt={image.name}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                  {isSelected && (
                    <div className="absolute inset-0 bg-red-500/10 flex items-center justify-center pointer-events-none">
                      <div className="w-1.5 h-1.5 bg-red-500 rounded-full" />
                    </div>
                  )}
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteImage(image.name);
                  }}
                  disabled={isDeleting}
                  className="absolute top-1 right-1 p-1 rounded bg-black/70 hover:bg-red-600 text-gray-300 hover:text-white transition-colors disabled:opacity-50"
                  title="Delete background"
                >
                  {isDeleting ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                </button>
              </div>
            );
          })
        )}
      </div>

      {selectedImageUrl && (
        <div className="flex items-center gap-2 pt-2 border-t border-gray-800/50">
          <div className="flex-1 truncate text-[9px] text-gray-500 font-mono">
            {selectedImageUrl}
          </div>
          <button
            onClick={() => onSelect('')}
            className="text-gray-500 hover:text-red-400"
          >
            <X size={12} />
          </button>
        </div>
      )}
    </div>
  );
}
