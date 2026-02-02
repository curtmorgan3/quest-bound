import { useErrorHandler } from '@/hooks';
import { db } from '@/stores';
import type { Document } from '@/types';
import { useLiveQuery } from 'dexie-react-hooks';
import { useActiveRuleset } from './use-active-ruleset';

export const useDocuments = (rulesetId?: string) => {
  const { activeRuleset } = useActiveRuleset();
  const { handleError } = useErrorHandler();

  const effectiveRulesetId = rulesetId ?? activeRuleset?.id;

  const documents = useLiveQuery(
    () =>
      db.documents
        .where('rulesetId')
        .equals(effectiveRulesetId ?? 0)
        .toArray(),
    [effectiveRulesetId],
  );

  const createDocument = async (data: Partial<Document>) => {
    if (!activeRuleset) return;
    const now = new Date().toISOString();
    try {
      await db.documents.add({
        ...data,
        id: crypto.randomUUID(),
        rulesetId: activeRuleset.id,
        createdAt: now,
        updatedAt: now,
      } as Document);
    } catch (e) {
      handleError(e as Error, {
        component: 'useDocuments/createDocument',
        severity: 'medium',
      });
    }
  };

  const updateDocument = async (id: string, data: Partial<Document>) => {
    const now = new Date().toISOString();
    try {
      await db.documents.update(id, {
        ...data,
        updatedAt: now,
      });
    } catch (e) {
      handleError(e as Error, {
        component: 'useDocuments/updateDocument',
        severity: 'medium',
      });
    }
  };

  const deleteDocument = async (id: string) => {
    try {
      await db.documents.delete(id);
    } catch (e) {
      handleError(e as Error, {
        component: 'useDocuments/deleteDocument',
        severity: 'medium',
      });
    }
  };

  return { documents: documents ?? [], createDocument, updateDocument, deleteDocument };
};
