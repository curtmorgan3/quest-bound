import { db } from '@/stores';
import type { Asset } from '@/types';
import { useLiveQuery } from 'dexie-react-hooks';
import { gridSquare } from './editor-assets';

export const useAssets = (rulesetId?: string) => {
  // Get all assets for the current ruleset
  const assets =
    useLiveQuery(
      () => (rulesetId ? db.assets.where('rulesetId').equals(rulesetId).toArray() : []),
      [rulesetId],
    ) || [];

  const createAsset = async (
    file: File,
    directory?: string,
    overrideRulesetId?: string,
  ): Promise<string> => {
    const reader = new FileReader();
    return new Promise<string>((resolve, reject) => {
      reader.onloadend = async () => {
        const base64String = reader.result as string;
        try {
          const id = await db.assets.add({
            id: crypto.randomUUID(),
            data: base64String,
            type: file.type,
            filename: file.name,
            directory: directory || undefined,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            rulesetId: rulesetId || overrideRulesetId || null,
          });

          resolve(id);
        } catch (error) {
          reject(error);
        }
      };
      reader.onerror = () => {
        reject(new Error('Failed to read the file.'));
      };
      reader.readAsDataURL(file);
    });
  };

  const createDirectory = async (dirName: string, parent = '', rulesetId?: string) => {
    const folderContent = '';
    const folderFile: File = new File([folderContent], `.folder-${dirName}`, {
      type: 'text/plain',
    });

    await createAsset(folderFile, parent, rulesetId);
  };

  const deleteAsset = async (id: string) => {
    await db.assets.delete(id);
  };

  const updateAsset = async (id: string, updates: Partial<Asset>) => {
    await db.assets.update(id, {
      ...updates,
      updatedAt: new Date().toISOString(),
    });
  };

  const bootstrapInitialRulesetAssets = async (rulesetId: string) => {
    await createDirectory('Editor Assets', undefined, rulesetId);

    await db.assets.add({
      id: crypto.randomUUID(),
      data: gridSquare,
      type: 'image/png',
      filename: 'grid-square.png',
      directory: 'Editor Assets',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      rulesetId,
    });
  };

  return {
    assets,
    createAsset,
    bootstrapInitialRulesetAssets,
    createDirectory,
    deleteAsset,
    updateAsset,
  };
};
