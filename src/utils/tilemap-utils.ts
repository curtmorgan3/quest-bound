import type { Tilemap } from '@/types';

const MAP_IMAGE_MAX_WIDTH = 900;
const MAP_IMAGE_MAX_HEIGHT = 1200;

export type TilemapAssetDimensions = {
  natural: { w: number; h: number };
  scaled: { w: number; h: number };
};

/**
 * Preloads the tilemap's asset image and returns its natural and scaled dimensions.
 * Scaling uses MAP_IMAGE_MAX_* so large images are downscaled for display.
 * Returns null if the tilemap has no assetId or image.
 */
export async function loadTilemapAssetDimensions(
  tilemap: Tilemap,
): Promise<TilemapAssetDimensions | null> {
  const { assetId, image } = tilemap;
  if (!assetId || !image) return null;

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const w = img.naturalWidth;
      const h = img.naturalHeight;
      const scaleDivisor = Math.max(
        1,
        Math.ceil(w / MAP_IMAGE_MAX_WIDTH),
        Math.ceil(h / MAP_IMAGE_MAX_HEIGHT),
      );
      const scaledW = Math.round(w / scaleDivisor);
      const scaledH = Math.round(h / scaleDivisor);
      resolve({
        natural: { w, h },
        scaled: { w: scaledW, h: scaledH },
      });
    };
    img.onerror = () => reject(new Error('Failed to load tilemap asset image'));
    img.src = image;
  });
}
