import { db } from '@/stores';
import type { Font } from '@/types';
import { useLiveQuery } from 'dexie-react-hooks';
import { useCallback } from 'react';
import { useParams } from 'react-router-dom';

export const useFonts = (_rulesetId?: string) => {
  const { rulesetId: paramRulesetId } = useParams();
  const rulesetId = _rulesetId ?? paramRulesetId;

  const query = useCallback(() => {
    if (rulesetId) {
      return db.fonts.where('rulesetId').equals(rulesetId).toArray();
    }

    return db.fonts.toArray();
  }, [rulesetId]);

  // Get all fonts for the current ruleset
  const fonts = useLiveQuery(query, [rulesetId]);

  const createFont = async (file: File, label?: string): Promise<string> => {
    if (!rulesetId) {
      throw new Error('No rulesetId provided');
    }

    const reader = new FileReader();
    return new Promise<string>((resolve, reject) => {
      reader.onloadend = async () => {
        const base64String = reader.result as string;
        try {
          const fontLabel = label || file.name.replace(/\.[^/.]+$/, '');
          const id = await db.fonts.add({
            id: crypto.randomUUID(),
            rulesetId,
            label: fontLabel,
            data: base64String,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
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

  const deleteFont = async (id: string) => {
    await db.fonts.delete(id);
  };

  const updateFont = async (id: string, updates: Partial<Font>) => {
    await db.fonts.update(id, {
      ...updates,
      updatedAt: new Date().toISOString(),
    });
  };

  return {
    fonts: fonts ?? ([] as Font[]),
    createFont,
    deleteFont,
    updateFont,
  };
};
