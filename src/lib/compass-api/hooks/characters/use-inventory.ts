import { useErrorHandler } from '@/hooks';
import { db, type InventoryItemWithData } from '@/stores';
import type { Inventory, InventoryItem } from '@/types';
import { buildItemCustomProperties } from '@/utils/custom-property-utils';
import { useLiveQuery } from 'dexie-react-hooks';
import { useActions, useAttributes, useItems } from '../rulesets';
import { useCharacterAttributes } from './use-character-attributes';

export const useInventory = (inventoryId: string, characterId: string) => {
  const { handleError } = useErrorHandler();
  const { actions } = useActions();
  const { items } = useItems();
  const { attributes } = useAttributes();
  const { characterAttributes } = useCharacterAttributes(characterId);

  const inventory = useLiveQuery(() => db.inventories.get(inventoryId), [inventoryId]);

  const inventoryItems = useLiveQuery(
    () =>
      db.inventoryItems
        .where('inventoryId')
        .equals(inventory?.id ?? '')
        .toArray(),
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
      if (data.type === 'item' && data.entityId) {
        customProperties = await buildItemCustomProperties(db, data.entityId);
      }
      await db.inventoryItems.add({
        ...data,
        customProperties,
        id: crypto.randomUUID(),
        inventoryId: inventory.id,
        createdAt: now,
        updatedAt: now,
      } as InventoryItem);
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
    } catch (e) {
      handleError(e as Error, {
        component: 'useInventory/updateInventoryItem',
        severity: 'medium',
      });
    }
  };

  const removeInventoryItem = async (id: string) => {
    try {
      await db.inventoryItems.delete(id);
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
