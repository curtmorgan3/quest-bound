import { useInventory } from '@/lib/compass-api';
import { executeItemEvent } from '@/lib/compass-logic';
import { db } from '@/stores';
import type { Character, InventoryItem } from '@/types';
import { useMemo } from 'react';

type ItemEvent = 'on_equip' | 'on_unequip' | 'on_consume';

interface UseInventoryUpdateWrapperes {
  character?: Character;
}

export const useInventoryUpdateWrappers = ({ character }: UseInventoryUpdateWrapperes) => {
  const { inventoryItems, addInventoryItem, updateInventoryItem, removeInventoryItem } =
    useInventory(character?.inventoryId ?? '', character?.id ?? '');

  const rulesetItemIdToInventoryItem = useMemo(() => {
    const map = new Map<string, string>();

    inventoryItems.forEach((item) => {
      map.set(item.id, item.entityId);
    });

    return map;
  }, [inventoryItems]);

  const fireItemEvent = async (itemId: string, event: ItemEvent) => {
    if (!character) return;
    const res = await executeItemEvent(db, itemId, character.id, event);
    console.log(res);
  };

  const addItemAndFireEvent = async (
    data: Omit<InventoryItem, 'id' | 'createdAt' | 'updatedAt' | 'inventoryId'>,
  ) => {
    await addInventoryItem(data);
  };

  const updateItemAndFireEvent = async (id: string, data: Partial<InventoryItem>) => {
    const entityId = rulesetItemIdToInventoryItem.get(id);
    if (entityId) {
      const fireEvent = (event: ItemEvent) => fireItemEvent(entityId, event);

      if (data.isEquipped === true) {
        fireEvent('on_equip');
      }

      if (data.isEquipped === false) {
        fireEvent('on_unequip');
      }
    }

    updateInventoryItem(id, data);
  };

  /**
   * Fires on_consume event and reduces qty by 1
   * Removes item if new qty is 0
   */
  const consumeItem = (id: string) => {
    const entityId = rulesetItemIdToInventoryItem.get(id);
    if (entityId) {
      fireItemEvent(entityId, 'on_consume');
    }

    const item = inventoryItems.find((item) => item.id === id);
    if (!item) return;

    if (item.quantity <= 1) {
      removeInventoryItem(id);
    } else {
      updateInventoryItem(id, {
        quantity: item.quantity - 1,
      });
    }
  };

  const removeItemAndFireEvent = async (id: string) => {
    removeInventoryItem(id);
  };

  return {
    inventoryItems,
    addItemAndFireEvent,
    updateItemAndFireEvent,
    removeItemAndFireEvent,
    consumeItem,
  };
};
