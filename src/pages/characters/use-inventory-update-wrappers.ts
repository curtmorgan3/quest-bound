import { useInventory } from '@/lib/compass-api';
import type { Character, InventoryItem } from '@/types';

type ItemEvent = 'on_equip' | 'on_unequip' | 'on_consume';

interface UseInventoryUpdateWrapperes {
  character?: Character;
}

export const useInventoryUpdateWrappers = ({ character }: UseInventoryUpdateWrapperes) => {
  const { inventoryItems, addInventoryItem, updateInventoryItem, removeInventoryItem } =
    useInventory(character?.inventoryId ?? '', character?.id ?? '');

  const fireItemEvent = async (itemId: string, event: ItemEvent) => {
    console.log('fire: ', event, itemId);
  };

  const addItemAndFireEvent = async (
    data: Omit<InventoryItem, 'id' | 'createdAt' | 'updatedAt' | 'inventoryId'>,
  ) => {
    await addInventoryItem(data);
  };

  const updateItemAndFireEvent = async (id: string, data: Partial<InventoryItem>) => {
    const fireEvent = (event: ItemEvent) => fireItemEvent(id, event);

    if (data.isEquipped === true) {
      fireEvent('on_equip');
    }

    if (data.isEquipped === false) {
      fireEvent('on_unequip');
    }

    updateInventoryItem(id, data);
  };

  /**
   * Fires on_consume event and reduces qty by 1
   * Removes item if new qty is 0
   */
  const consumeItem = (id: string) => {
    fireItemEvent(id, 'on_consume');

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
