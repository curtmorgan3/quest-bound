import type { DB } from './types';

export function registerDocumentDbHooks(db: DB) {
  // Delete associated assets when a document is deleted
  db.documents.hook('deleting', (_primKey, obj) => {
    const assetIds = [obj?.assetId, obj?.pdfAssetId].filter(Boolean);
    if (assetIds.length > 0) {
      setTimeout(async () => {
        try {
          await Promise.all(assetIds.map((id) => db.assets.delete(id)));
        } catch (error) {
          console.error('Failed to delete assets for document:', error);
        }
      }, 0);
    }
  });

  // Delete old assets when a document's assets are removed
  db.documents.hook('updating', (modifications, _primKey, obj) => {
    const mods = modifications as { assetId?: string | null; pdfAssetId?: string | null };
    const assetsToDelete: string[] = [];

    // Check if assetId is being set to null/undefined and there was a previous asset
    if ('assetId' in mods && !mods.assetId && obj?.assetId) {
      assetsToDelete.push(obj.assetId);
    }
    // Check if pdfAssetId is being set to null/undefined and there was a previous pdfAsset
    if ('pdfAssetId' in mods && !mods.pdfAssetId && obj?.pdfAssetId) {
      assetsToDelete.push(obj.pdfAssetId);
    }

    if (assetsToDelete.length > 0) {
      setTimeout(async () => {
        try {
          await Promise.all(assetsToDelete.map((id) => db.assets.delete(id)));
        } catch (error) {
          console.error('Failed to delete old assets for document:', error);
        }
      }, 0);
    }
  });
}
