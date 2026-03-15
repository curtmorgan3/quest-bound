import { getSyncState } from '@/lib/cloud/sync/sync-state';
import { deleteAssetIfUnreferenced } from './asset-hooks';
import type { DB } from './types';

export function registerDocumentDbHooks(db: DB) {
  // When a document is deleted, delete its assets if nothing else references them
  db.documents.hook('deleting', (_primKey, obj) => {
    if (getSyncState().isSyncing) return;
    const doc = obj as { assetId?: string | null; pdfAssetId?: string | null } | undefined;
    const assetsToCheck: string[] = [];
    if (doc?.assetId) assetsToCheck.push(doc.assetId);
    if (doc?.pdfAssetId) assetsToCheck.push(doc.pdfAssetId);
    if (assetsToCheck.length > 0) {
      setTimeout(() => {
        Promise.all(assetsToCheck.map((id) => deleteAssetIfUnreferenced(db, id))).catch((error) =>
          console.error('Failed to delete unreferenced assets for document:', error),
        );
      }, 0);
    }
  });

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
