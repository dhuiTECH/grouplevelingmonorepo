'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Upload, X, Image as ImageIcon } from 'lucide-react';

interface DungeonImagePickerProps {
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

export default function DungeonImagePicker({ selectedImageUrl, onSelect }: DungeonImagePickerProps) {
  const [images, setImages] = useState<StorageFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);


  // Fetch images from Supabase storage
  const fetchImages = async () => {
    try {
      setLoading(true);
      console.log('🔍 Fetching images from Dungeons/dungeon-images');

      const { data, error } = await supabase.storage
        .from('Dungeons')
        .list('dungeon-images');

      if (error) {
        console.error('Error fetching images:', error);
        console.error('Error details:', {
          message: error.message
        });
        setError(`Failed to load images: ${error.message}`);
      } else {
        console.log('✅ Successfully fetched images:', data?.length || 0);
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

  // Upload image to Supabase storage
  const uploadImage = async (file: File) => {
    try {
      setUploading(true);
      const fileName = `${Date.now()}-${file.name}`;

      const { data, error } = await supabase.storage
        .from('Dungeons')
        .upload(`dungeon-images/${fileName}`, file);

      if (error) {
        console.error('Upload error:', error);
        console.error('Error details:', {
          message: error.message
        });
        setError(`Failed to upload image: ${error.message}`);
      } else {
        console.log('✅ Successfully uploaded image:', data?.path);
        // Refresh the image list
        await fetchImages();
      }
    } catch (err) {
      console.error('Upload error:', err);
      setError('Failed to upload image');
    } finally {
      setUploading(false);
    }
  };

  // Handle file selection
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      uploadImage(file);
    }
    // Reset input
    e.target.value = '';
  };

  // Get public URL for image
  const getImageUrl = (fileName: string) => {
    const { data } = supabase.storage
      .from('Dungeons')
      .getPublicUrl(`dungeon-images/${fileName}`);

    console.log('🖼️ Generated URL for', fileName, ':', data.publicUrl);
    return data.publicUrl;
  };

  useEffect(() => {
    fetchImages();
  }, []);

  return (
    <div className="space-y-4">
      {/* Upload Section */}
      <div className="system-glass p-4">
        <div className="flex items-center gap-3">
          <label className="flex-1">
            <input
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
              disabled={uploading}
            />
            <div className={`flex items-center justify-center gap-2 px-4 py-2 clip-tech-button text-[10px] font-black uppercase transition-all cursor-pointer ${
              uploading
                ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                : 'bg-cyan-600 hover:bg-cyan-500 text-white'
            }`}>
              {uploading ? (
                <>
                  <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>
                  Uploading...
                </>
              ) : (
                <>
                  <Upload size={14} />
                  System Upload
                </>
              )}
            </div>
          </label>

          <button
            onClick={fetchImages}
            className="px-3 py-2 clip-tech-button bg-gray-600 hover:bg-gray-500 text-white text-[10px] font-black uppercase transition-all"
            title="Refresh Images"
          >
            <ImageIcon size={14} />
          </button>
        </div>

        {error && (
          <div className="mt-2 text-red-400 text-xs font-bold">
            {error}
          </div>
        )}
      </div>

      {/* Current Selection */}
      {selectedImageUrl && (
        <div className="system-glass p-3">
          <div className="text-[10px] font-black uppercase text-cyan-400 mb-2">
            Current Selection:
          </div>
          <div className="flex items-center gap-3">
            <div className="w-16 h-16 rounded overflow-hidden border-2 border-cyan-400 shadow-lg shadow-cyan-500/50 ring-2 ring-cyan-400/50">
              <img
                src={selectedImageUrl}
                alt="Selected dungeon"
                className="w-full h-full object-cover"
                onError={(e) => {
                  console.error('❌ Selected image failed to load:', selectedImageUrl);
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                  const parent = target.parentElement;
                  if (parent) {
                    parent.innerHTML = `
                      <div class="w-full h-full bg-gray-800 flex items-center justify-center text-gray-400">
                        <div class="text-center">
                          <div class="text-xs font-bold">LOAD</div>
                          <div class="text-[8px]">ERROR</div>
                        </div>
                      </div>
                    `;
                  }
                }}
                onLoad={() => {
                  console.log('✅ Selected image loaded successfully:', selectedImageUrl);
                }}
              />
            </div>
            <div className="flex-1 text-xs text-gray-400 truncate">
              {selectedImageUrl.split('/').pop()}
            </div>
            <button
              onClick={() => onSelect('')}
              className="p-1 clip-tech-button bg-red-600 hover:bg-red-500 text-white"
              title="Clear Selection"
            >
              <X size={12} />
            </button>
          </div>
        </div>
      )}

      {/* Image Grid */}
      <div className="system-glass p-4">
        <div className="text-[8px] font-black uppercase text-cyan-400 mb-3">
          Available Images ({images.length})
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin w-6 h-6 border-2 border-cyan-400 border-t-transparent rounded-full"></div>
          </div>
        ) : images.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <ImageIcon size={24} className="mx-auto mb-2 opacity-50" />
            <div className="text-xs font-bold uppercase">No Images Found</div>
            <div className="text-[10px] opacity-70">Upload some dungeon images to get started</div>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-3">
            {images.map((image) => {
              const imageUrl = getImageUrl(image.name);
              const isSelected = selectedImageUrl === imageUrl;

              return (
                <button
                  key={image.name}
                  onClick={() => onSelect(imageUrl)}
                  className={`relative group transition-all duration-200 ${
                    isSelected
                      ? 'ring-2 ring-cyan-400 ring-offset-2 ring-offset-gray-900'
                      : 'hover:scale-105'
                  }`}
                >
                  <div className={`aspect-square rounded-lg overflow-hidden border-2 transition-all ${
                    isSelected
                      ? 'border-cyan-400 shadow-lg shadow-cyan-500/50 ring-2 ring-cyan-400/50'
                      : 'border-cyan-500/30 group-hover:border-cyan-400'
                  }`}>
                    <img
                      src={imageUrl}
                      alt={image.name}
                      className="w-full h-full object-cover"
                      loading="lazy"
                      onError={(e) => {
                        console.error('❌ Image failed to load:', imageUrl);
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                        const parent = target.parentElement;
                        if (parent) {
                          parent.innerHTML = `
                            <div class="w-full h-full bg-gray-800 flex items-center justify-center text-gray-400">
                              <div class="text-center">
                                <div class="text-xs font-bold">LOAD</div>
                                <div class="text-[8px]">ERROR</div>
                              </div>
                            </div>
                          `;
                        }
                      }}
                      onLoad={() => {
                        console.log('✅ Image loaded successfully:', imageUrl);
                      }}
                    />
                  </div>

                  {isSelected && (
                    <div className="absolute -top-1 -right-1 w-5 h-5 bg-cyan-500 rounded-full flex items-center justify-center">
                      <div className="w-2 h-2 bg-white rounded-full"></div>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
