import React, { useState, useCallback } from 'react';
import { Image, type ImageProps } from 'expo-image';
import { getLocalAssetUri } from '@/utils/assetManager';

interface CachedImageProps extends Omit<ImageProps, 'source'> {
  source: { uri: string };
}

export function CachedImage({ source, placeholder, onError, ...rest }: CachedImageProps) {
  const [useFallback, setUseFallback] = useState(false);
  const localUri = getLocalAssetUri(source.uri);

  const handleError = useCallback(() => {
    if (!useFallback) {
      setUseFallback(true);
    }
  }, [useFallback]);

  const resolvedSource = useFallback
    ? { uri: source.uri }
    : { uri: localUri };

  return (
    <Image
      source={resolvedSource}
      placeholder={placeholder}
      onError={handleError}
      {...rest}
    />
  );
}
