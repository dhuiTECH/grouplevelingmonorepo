import { useState, useEffect, useRef } from 'react';
import { Skia, SkImage } from '@shopify/react-native-skia';
import * as FileSystem from 'expo-file-system/legacy';
import { getLocalAssetUri } from '@/utils/assetManager';

export const globalImageCache = new Map<string, SkImage>();

async function loadFromLocalOrNetwork(url: string): Promise<ArrayBuffer> {
  const cleanUrl = url.split('?')[0];
  const localPath = getLocalAssetUri(cleanUrl);

  try {
    const info = await FileSystem.getInfoAsync(localPath);
    if (info.exists && info.size && info.size > 0) {
      const base64 = await FileSystem.readAsStringAsync(localPath, {
        encoding: FileSystem.EncodingType.Base64,
      });
      const binaryStr = atob(base64);
      const bytes = new Uint8Array(binaryStr.length);
      for (let i = 0; i < binaryStr.length; i++) {
        bytes[i] = binaryStr.charCodeAt(i);
      }
      return bytes.buffer;
    }
  } catch {}

  const response = await fetch(url);
  return response.arrayBuffer();
}

export const useSkiaAssets = (urls: string[]) => {
  const [images, setImages] = useState<Map<string, SkImage>>(new Map(globalImageCache));
  const fetchingUrls = useRef(new Set<string>());

  const urlsString = [...urls].sort().join(',');

  useEffect(() => {
    let active = true;
    const urlList = urlsString ? urlsString.split(',').filter(Boolean) : [];

    const loadImages = async () => {
      let changed = false;
      const newImages = new Map(globalImageCache);

      const promises = urlList.map(async (url) => {
        if (!url) return;
        const cleanUrl = url.split('?')[0];

        if (newImages.has(cleanUrl) || fetchingUrls.current.has(cleanUrl)) return;

        fetchingUrls.current.add(cleanUrl);
        try {
          const arrayBuffer = await loadFromLocalOrNetwork(url);
          const data = Skia.Data.fromBytes(new Uint8Array(arrayBuffer));
          const img = Skia.Image.MakeImageFromEncoded(data);

          if (img) {
            newImages.set(cleanUrl, img);
            globalImageCache.set(cleanUrl, img);
            changed = true;
          }
        } catch (e) {
          console.warn('Failed to load Skia image:', url, e);
        } finally {
          fetchingUrls.current.delete(cleanUrl);
        }
      });

      await Promise.all(promises);

      if (active && changed) {
        setImages(new Map(globalImageCache));
      }
    };

    if (urlList.length > 0) {
      loadImages();
    }

    return () => {
      active = false;
    };
  }, [urlsString]);

  return images;
};
