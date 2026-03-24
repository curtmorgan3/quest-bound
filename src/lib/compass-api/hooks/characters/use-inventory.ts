import { filterNotSoftDeleted, softDeletePatch } from '@/lib/data/soft-delete';
import { useErrorHandler } from '@/hooks';
import { isCampaignPlayClientRelayForCampaign } from '@/lib/campaign-play/campaign-play-action-relay';
import { sendCampaignPlayManualCharacterUpdate } from '@/lib/campaign-play/realtime/campaign-play-manual-broadcast';
import { db, type InventoryItemWithData } from '@/stores';
import type { Inventory, InventoryItem } from '@/types';
import { buildItemCustomProperties } from '@/utils/custom-property-utils';
import { useLiveQuery } from 'dexie-react-hooks';
import { useCallback } from 'react';
import { useActions, useAttributes, useItems } from '../rulesets';
import { type CharacterSheetCampaignPlayContext, useCharacterAttributes } from './use-character-attributes';

export const useInventory = (
  inventoryId: string,
  characterId: string,
  campaignPlay?: CharacterSheetCampaignPlayContext,
) => {
  const { handleError } = useErrorHandler();
  const { actions } = useActions();
  const { items } = useItems();
  const { attributes } = useAttributes();
  const { characterAttributes } = useCharacterAttributes(characterId);

  const broadcastInventoryRows = useCallback(
    (rows: InventoryItem[]) => {
      if (!campaignPlay || rows.length === 0) return;
      if (!isCampaignPlayClientRelayForCampaign(campaignPlay.campaignId)) return;
      void sendCampaignPlayManualCharacterUpdate({
        campaignId: campaignPlay.campaignId,
        campaignSceneId: campaignPlay.campaignSceneId,
        batches: [
          {
            table: 'inventoryItems',
            rows: rows.map((r) => ({ ...r } as Record<string, unknown>)),
          },
        ],
      }).catch((err) => console.warn('[useInventory] campaign manual broadcast failed', err));
    },
    [campaignPlay],
  );

  const inventory = useLiveQuery(() => db.inventories.get(inventoryId), [inventoryId]);

  const inventoryItems = useLiveQuery(
    async () => {
      const id = inventory?.id ?? '';
      if (!id) return [];
      const rows = await db.inventoryItems.where('inventoryId').equals(id).toArray();
      return filterNotSoftDeleted(rows);
    },
    [inventory],
  );

  const inventoryItemsWithImages: InventoryItemWithData[] = (inventoryItems ?? []).map((entity) => {
    const itemRef = items.find((item) => item.id === entity.entityId);
    const actionRef = actions.find((action) => action.id === entity.entityId);
    const attributeRef = attributes.find((attr) => attr.id === entity.entityId);

    const characterAttributeRef = characterAttributes.find(
      (attr) => attr.attributeId === entity.entityId,
    );

    return {
      ...entity,
      title: itemRef?.title ?? actionRef?.title ?? attributeRef?.title ?? '',
      description:
        entity.description ??
        itemRef?.description ??
        actionRef?.description ??
        attributeRef?.description ??
        '',
      category: itemRef?.category ?? actionRef?.category ?? attributeRef?.category,
      image: itemRef?.image ?? actionRef?.image ?? attributeRef?.image ?? undefined,
      inventoryWidth:
        itemRef?.inventoryWidth ?? actionRef?.inventoryWidth ?? attributeRef?.inventoryWidth ?? 2,
      inventoryHeight:
        itemRef?.inventoryHeight ??
        actionRef?.inventoryHeight ??
        attributeRef?.inventoryHeight ??
        2,
      stackSize: itemRef?.stackSize ?? 1,
      value: characterAttributeRef?.value,
      isEquippable: itemRef?.isEquippable ?? false,
      isConsumable: itemRef?.isConsumable ?? false,
      customProperties: entity.customProperties ?? {},
      weight: itemRef?.weight ?? 0,
    };
  });

  const addInventoryItem = async (
    data: Omit<InventoryItem, 'id' | 'createdAt' | 'updatedAt' | 'inventoryId'>,
  ) => {
    if (!inventory) return;
    const now = new Date().toISOString();
    try {
      let customProperties: Record<string, string | number | boolean> =
        data.customProperties ?? {};
      let actionIds = data.actionIds;
      if (data.type === 'item' && data.entityId) {
        customProperties = await buildItemCustomProperties(db, data.entityId);
        if (actionIds === undefined) {
          const item = await db.items.get(data.entityId);
          actionIds = item?.actionIds ?? [];
        }
      }
      const newId = crypto.randomUUID();
      await db.inventoryItems.add({
        ...data,
        customProperties,
        actionIds: actionIds ?? [],
        id: newId,
        inventoryId: inventory.id,
        createdAt: now,
        updatedAt: now,
      } as InventoryItem);
      const row = await db.inventoryItems.get(newId);
      if (row) broadcastInventoryRows([row]);
    } catch (e) {
      handleError(e as Error, {
        component: 'useInventory/addInventoryItem',
        severity: 'medium',
      });
    }
  };

  const updateInventoryItem = async (id: string, data: Partial<InventoryItem>) => {
    const now = new Date().toISOString();
    try {
      await db.inventoryItems.update(id, {
        ...data,
        updatedAt: now,
      });
      const row = await db.inventoryItems.get(id);
      if (row) broadcastInventoryRows([row]);
    } catch (e) {
      handleError(e as Error, {
        component: 'useInventory/updateInventoryItem',
        severity: 'medium',
      });
    }
  };

  const removeInventoryItem = async (id: string) => {
    try {
      // Defer so the delete runs outside any existing IDB transaction (e.g. from a hook or
      // live query). Otherwise IDB throws "The specified object store was not found" when the
      // current transaction doesn't include the inventoryItems store.
      await new Promise<void>((resolve, reject) => {
        setTimeout(async () => {
          try {
            await db.inventoryItems.update(id, softDeletePatch());
            const row = await db.inventoryItems.get(id);
            if (row) broadcastInventoryRows([row]);
            resolve();
          } catch (err) {
            reject(err);
          }
        }, 0);
      });
    } catch (e) {
      handleError(e as Error, {
        component: 'useInventory/removeInventoryItem',
        severity: 'medium',
      });
    }
  };

  const updateInventory = async (data: Partial<Inventory>) => {
    if (!inventory) return;
    const now = new Date().toISOString();
    try {
      await db.inventories.update(inventory.id, {
        ...data,
        updatedAt: now,
      });
    } catch (e) {
      handleError(e as Error, {
        component: 'useInventory/updateInventory',
        severity: 'medium',
      });
    }
  };

  return {
    inventory: inventory ?? null,
    inventoryItems: inventoryItemsWithImages ?? [],
    addInventoryItem,
    updateInventoryItem,
    removeInventoryItem,
    updateInventory,
  };
};
