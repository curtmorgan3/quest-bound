import { useErrorHandler } from '@/hooks';
import { db } from '../../db';
import { useApiLoadingStore } from '@/stores/api-loading-store';
import type { Document } from '@/types';
import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect } from 'react';
import { useAssets } from '../assets';
import { useActiveRuleset } from './use-active-ruleset';

export interface UseDocumentsOptions {
  /** When set, return only ruleset-scoped documents (excludes documents that belong to a world or campaign). */
  rulesetId?: string;
  /** When set, return documents belonging to this world; optionally combine with locationId. */
  worldId?: string;
  /** When set with worldId, return only documents in this location. */
  locationId?: string;
  /** When set, return documents belonging to this campaign (have campaignId and locationId, no worldId); optionally filter by locationId. */
  campaignId?: string;
  /** When set with campaignId, return only documents associated with this campaign scene. */
  campaignSceneId?: string;
}

/**
 * Hook to query and mutate documents. Pass either rulesetId (ruleset context) or worldId (world context).
 * In ruleset context, only documents that belong to the ruleset and not to a world are returned.
 */
export const useDocuments = (rulesetIdOrOptions?: string | UseDocumentsOptions) => {
  const { activeRuleset } = useActiveRuleset();
  const { handleError } = useErrorHandler();
  const { assets } = useAssets();

  const options: UseDocumentsOptions =
    typeof rulesetIdOrOptions === 'string'
      ? { rulesetId: rulesetIdOrOptions }
      : (rulesetIdOrOptions ?? {});

  const effectiveRulesetId = options.rulesetId ?? activeRuleset?.id;
  const worldId = options.worldId;
  const locationId = options.locationId;
  const campaignId = options.campaignId;
  const campaignSceneId = options.campaignSceneId;

  const documents = useLiveQuery(() => {
    if (campaignId) {
      return db.documents
        .where('campaignId')
        .equals(campaignId)
        .filter(
          (d) =>
            (locationId == null || d.locationId === locationId) &&
            (campaignSceneId == null || d.campaignSceneId === campaignSceneId),
        )
        .toArray();
    }
    if (worldId) {
      return db.documents
        .where('worldId')
        .equals(worldId)
        .filter((d) => locationId == null || d.locationId === locationId)
        .toArray();
    }
    if (effectiveRulesetId) {
      return db.documents
        .where('rulesetId')
        .equals(effectiveRulesetId)
        .filter((d) => d.worldId == null && d.campaignId == null)
        .toArray();
    }
    return Promise.resolve([] as Document[]);
  }, [effectiveRulesetId, worldId, locationId, campaignId, campaignSceneId]);

  const isLoading = documents === undefined;
  useEffect(() => {
    useApiLoadingStore.getState().setLoading('documents', isLoading);
  }, [isLoading]);

  const createDocument = async (data: Partial<Document>) => {
    const canCreate = data.campaignId ?? data.worldId ?? data.rulesetId ?? effectiveRulesetId;
    if (!canCreate) return;
    const now = new Date().toISOString();
    try {
      await db.documents.add({
        ...data,
        id: crypto.randomUUID(),
        rulesetId:
          data.rulesetId ?? (data.worldId || data.campaignId ? undefined : effectiveRulesetId),
        worldId: data.campaignId ? null : data.worldId,
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
      if (data.assetId === null && !data.image) {
        data.image = null;
      }
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

  // assetInjectorMiddleware is not working with PDFs. Temporary fix.
  const documentsWithData =
    documents?.map((doc) => {
      const assetId = doc.pdfAssetId;
      if (!assetId) return doc;
      const asset = assets.find((asset) => asset.id === assetId);
      if (!asset) return doc;
      return {
        ...doc,
        pdfData: asset.data,
      };
    }) ?? [];

  return {
    documents: documentsWithData,
    isLoading,
    createDocument,
    updateDocument,
    deleteDocument,
  };
};
