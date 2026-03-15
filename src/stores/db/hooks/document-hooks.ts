import { getSyncState } from '@/lib/cloud/sync/sync-state';
import { deleteAssetIfUnreferenced } from './asset-hooks';
import type { DB } from './types';

export function registerDocumentDbHooks(db: DB) {
  // Do not cascade-delete assets when document is deleted (assets may be shared)

  // Delete assets only when no longer referenced after a document clears them
  db.documents.hook('updating', (modifications, _primKey, obj) => {
    if (getSyncState().isSyncing) return;
    const mods = modifications as { assetId?: string | null; pdfAssetId?: string | null };
    const assetsToCheck: string[] = [];

    if ('assetId' in mods && !mods.assetId && obj?.assetId) {
      assetsToCheck.push(obj.assetId);
    }
    if ('pdfAssetId' in mods && !mods.pdfAssetId && obj?.pdfAssetId) {
      assetsToCheck.push(obj.pdfAssetId);
    }

    if (assetsToCheck.length > 0) {
      setTimeout(() => {
        Promise.all(assetsToCheck.map((id) => deleteAssetIfUnreferenced(db, id))).catch((error) =>
          console.error('Failed to delete unreferenced assets for document:', error),
        );
      }, 0);
    }
  });
}
