import React from 'react';
import { Image, type ImageProps } from 'expo-image';
import { getLocalAssetUri } from '@/utils/assetManager';

interface CachedImageProps extends Omit<ImageProps, 'source'> {
  source: { uri: string };
}

export function CachedImage({ source, placeholder, ...rest }: CachedImageProps) {
  const localUri = getLocalAssetUri(source.uri);

  return (
    <Image
      source={{ uri: localUri }}
      placeholder={placeholder ?? { blurhash: 'L6PZfSi_.AyE_3t7t7R**0o#DgR4' }}
      placeholderContentFit={rest.contentFit ?? 'cover'}
      {...rest}
    />
  );
}
