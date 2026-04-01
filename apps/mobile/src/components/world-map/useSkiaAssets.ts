import { useState, useEffect, useRef } from 'react';
import { Skia, SkImage } from '@shopify/react-native-skia';

// Global cache to avoid reloading across unmounts/remounts
const globalImageCache = new Map<string, SkImage>();

export const useSkiaAssets = (urls: string[]) => {
  const [images, setImages] = useState<Map<string, SkImage>>(new Map(globalImageCache));
  const fetchingUrls = useRef(new Set<string>());

  // Stringify to prevent referential equality checks from firing the effect
  const urlsString = [...urls].sort().join(',');

  useEffect(() => {
    let active = true;
    const urlList = urlsString ? urlsString.split(',').filter(Boolean) : [];

    const loadImages = async () => {
      let changed = false;
      // Merge from global cache so url-list churn never drops already-decoded images (empty tiles).
      const newImages = new Map(globalImageCache);

      const promises = urlList.map(async (url) => {
        if (!url) return;
        const cleanUrl = url.split('?')[0];

        if (newImages.has(cleanUrl) || fetchingUrls.current.has(cleanUrl)) return;

        fetchingUrls.current.add(cleanUrl);
        try {
          const response = await fetch(url);
          const arrayBuffer = await response.arrayBuffer();
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
