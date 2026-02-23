import { Image } from 'react-native';
import { Asset } from 'expo-asset';

/**
 * Polyfill Image.resolveAssetSource for react-native-web/expo compatibility.
 * This is often needed when using libraries that expect the native resolveAssetSource
 * to be available on the Image component.
 */
function polyfillImage() {
  const ImageAny = Image as any;

  const resolveAssetSource = (source: any) => {
    if (!source) return { uri: '' };
    if (typeof source === 'object' && source.uri) {
      return source;
    }
    try {
      const asset = Asset.fromModule(source);
      return {
        uri: asset.uri,
        width: asset.width,
        height: asset.height,
      };
    } catch (e) {
      return { uri: typeof source === 'string' ? source : '' };
    }
  };

  // Polyfill the main Image object
  if (!ImageAny.resolveAssetSource) {
    try {
      ImageAny.resolveAssetSource = resolveAssetSource;
    } catch (e) {}
  }

  // Handle various "default" export patterns
  const targets = [ImageAny, ImageAny.default].filter(obj => obj && typeof obj === 'object');
  
  targets.forEach(target => {
    if (!target.resolveAssetSource) {
      try {
        target.resolveAssetSource = resolveAssetSource;
      } catch (e) {}
    }
  });

  // Most important: if ImageAny.default.resolveAssetSource is what's being called
  if (ImageAny.default && typeof ImageAny.default === 'object' && !ImageAny.default.resolveAssetSource) {
    try {
      ImageAny.default.resolveAssetSource = resolveAssetSource;
    } catch (e) {}
  }
}

polyfillImage();
