import { useNotifications } from '@/hooks';
import { db } from '@/stores';
import type { Asset } from '@/types';
import { useLiveQuery } from 'dexie-react-hooks';
import { useCallback } from 'react';
import { useParams } from 'react-router-dom';

export const useAssets = (_rulesetId?: string) => {
  const { rulesetId: paramRulesetId } = useParams();
  const rulesetId = _rulesetId ?? paramRulesetId;
  const { addNotification } = useNotifications();

  const query = useCallback(() => {
    if (rulesetId) {
      return db.assets.where('rulesetId').equals(rulesetId).toArray();
    }

    return db.assets.toArray();
  }, [rulesetId]);

  // Get all assets for the current ruleset
  const assets = useLiveQuery(query, [rulesetId]);

  const createAsset = async (
    file: File,
    directory?: string,
    overrideRulesetId?: string,
  ): Promise<string> => {
    const targetRulesetId = rulesetId || overrideRulesetId || null;

    // Check for duplicate filename in the same directory and ruleset
    const assetsQuery = targetRulesetId
      ? db.assets.where('rulesetId').equals(targetRulesetId)
      : db.assets.filter((asset) => !asset.rulesetId);

    const existingAsset = await assetsQuery
      .filter(
        (asset) =>
          asset.filename === file.name &&
          (asset.directory || undefined) === (directory || undefined),
      )
      .first();

    if (existingAsset) {
      addNotification(
        `An asset named "${file.name}" already exists. Referencing that asset instead.`,
        {
          type: 'info',
        },
      );
      return existingAsset.id;
    }

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
            rulesetId: targetRulesetId,
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

  return {
    assets: assets ?? ([] as Asset[]),
    createAsset,
    createDirectory,
    deleteAsset,
    updateAsset,
  };
};
