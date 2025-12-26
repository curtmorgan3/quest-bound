import { db } from '@/stores';

const assetCache = new Map<string, HTMLImageElement>();

export async function getEditorAsset(filename: string): Promise<HTMLImageElement> {
  const fromCache = assetCache.get(filename);
  if (fromCache) return fromCache;

  const rulesetId = window.location.href.match(/rulesets\/[\w,-]+/)
    ? window.location.href.match(/rulesets\/[\w,-]+/)![0]?.split('rulesets/')[1]
    : null;

  if (!rulesetId) {
    console.warn('Attempted to find editor asset outside the context of a rulset');
  }

  const asset = await db.assets.where({ rulesetId, directory: 'Editor Assets', filename }).first();

  if (!asset) {
    console.error(`Cannot find asset ${filename} for ruleset ${rulesetId}`);
  }

  const image = new Image();
  image.src = asset?.data ? asset.data.replace('data:image/png;base64, ', '') : '';

  assetCache.set(filename, image);

  return image;
}

export function clearEditorAssetCache() {
  assetCache.clear();
}
