import { useNotifications } from '@/hooks';
import { db } from '@/stores';
import type { Asset } from '@/types';
import { useLiveQuery } from 'dexie-react-hooks';
import { useCallback } from 'react';
import { useParams } from 'react-router-dom';

export const useAssets = (_rulesetId?: string | null, worldId?: string | null) => {
  const { rulesetId: paramRulesetId } = useParams();
  // Explicitly ignore active ruleset if null is provided
  const rulesetId = _rulesetId === null ? undefined : (_rulesetId ?? paramRulesetId);
  const { addNotification } = useNotifications();

  const query = useCallback(() => {
    if (rulesetId) {
      return db.assets.where('rulesetId').equals(rulesetId).toArray();
    }

    return db.assets.toArray();
  }, [rulesetId]);

  // Get all assets for the current ruleset
  const assets = useLiveQuery(query, [rulesetId]);

  /** Thrown when filename already exists in the ruleset (filename uniqueness per ruleset). */
  const duplicateFilenameError = (filename: string) =>
    new Error(`An asset named "${filename}" already exists in this ruleset. Use a different name.`);

  const createAsset = async (
    file: File,
    _directory?: string,
    overrideRulesetId?: string,
  ): Promise<string> => {
    const targetRulesetId = rulesetId ?? overrideRulesetId ?? null;

    if (targetRulesetId != null) {
      const existing = await db.assets
        .where('[rulesetId+filename]')
        .equals([targetRulesetId, file.name])
        .first();
      if (existing) {
        addNotification(duplicateFilenameError(file.name).message, { type: 'error' });
        throw duplicateFilenameError(file.name);
      }
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
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            rulesetId: targetRulesetId,
            worldId,
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

  const createUrlAsset = async (
    url: string,
    options: { filename: string; rulesetId?: string | null; worldId?: string | null },
  ): Promise<string> => {
    const { filename, rulesetId: optRulesetId, worldId: optWorldId } = options;
    const targetRulesetId = optRulesetId ?? rulesetId ?? null;

    if (targetRulesetId != null) {
      const existing = await db.assets
        .where('[rulesetId+filename]')
        .equals([targetRulesetId, filename])
        .first();
      if (existing) {
        addNotification(duplicateFilenameError(filename).message, { type: 'error' });
        throw duplicateFilenameError(filename);
      }
    }

    const id = crypto.randomUUID();
    await db.assets.add({
      id,
      data: url,
      type: 'url',
      filename,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      rulesetId: targetRulesetId,
      worldId: optWorldId ?? worldId,
    });
    return id;
  };

  const createDirectory = async (_dirName: string, _parent = '', _rulesetId?: string) => {
    throw new Error('Directories are no longer supported; use filename-only assets.');
  };

  const deleteAsset = async (id: string) => {
    await db.assets.delete(id);
  };

  const updateAsset = async (id: string, updates: Partial<Asset>) => {
    if (updates.filename != null) {
      const asset = await db.assets.get(id);
      if (asset && asset.rulesetId != null) {
        const existing = await db.assets
          .where('[rulesetId+filename]')
          .equals([asset.rulesetId, updates.filename])
          .first();
        if (existing && existing.id !== id) {
          addNotification(duplicateFilenameError(updates.filename).message, { type: 'error' });
          throw duplicateFilenameError(updates.filename);
        }
      }
    }
    await db.assets.update(id, {
      ...updates,
      updatedAt: new Date().toISOString(),
    });
  };

  return {
    assets: assets ?? ([] as Asset[]),
    createAsset,
    createUrlAsset,
    createDirectory,
    deleteAsset,
    updateAsset,
  };
};
