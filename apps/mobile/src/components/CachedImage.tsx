import React, { useState, useCallback } from 'react';
import { Image, type ImageProps, type ImageErrorEventData } from 'expo-image';
import { getLocalAssetUri } from '@/utils/assetManager';

interface CachedImageProps extends Omit<ImageProps, 'source'> {
  source: { uri: string };
}

export function CachedImage({ source, ...rest }: CachedImageProps) {
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
      onError={handleError}
      {...rest}
    />
  );
}
