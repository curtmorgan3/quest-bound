import { useInventory } from '@/lib/compass-api';
import { useExecuteItemEvent } from '@/lib/compass-logic';
import type { InventoryPanelConfig } from '@/stores';
import type { Action, Attribute, Character, InventoryItem, Item, RollFn } from '@/types';
import { useMemo } from 'react';
import { findFirstEmptySlot } from '../character-inventory-panel';

type ItemEvent = 'on_equip' | 'on_unequip' | 'on_consume';

interface UseInventoryUpdateWrapperes {
  inventoryPanelConfig: InventoryPanelConfig;
  setInventoryPanelConfig: (config: InventoryPanelConfig) => void;
  character?: Character;
  roll?: RollFn;
}

export const useCharacterInventoryHandlers = ({
  character,
  roll,
  inventoryPanelConfig,
  setInventoryPanelConfig,
}: UseInventoryUpdateWrapperes) => {
  const { inventoryItems, addInventoryItem, updateInventoryItem, removeInventoryItem } =
    useInventory(character?.inventoryId ?? '', character?.id ?? '');

  const { executeItemEvent } = useExecuteItemEvent();

  const rulesetItemIdToInventoryItem = useMemo(() => {
    const map = new Map<string, string>();

    inventoryItems.forEach((item) => {
      map.set(item.id, item.entityId);
    });

    return map;
  }, [inventoryItems]);

  const fireItemEvent = async (itemId: string, event: ItemEvent) => {
    if (!character) return;
    executeItemEvent(itemId, character.id, event, roll);
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

  const handleSelectInventoryEntity = (
    entity: Action | Item | Attribute,
    type: 'action' | 'item' | 'attribute',
  ) => {
    if (inventoryPanelConfig.addToDefaultInventory) {
      addItemAndFireEvent({
        type,
        entityId: entity.id,
        componentId: '',
        quantity: 1,
        x: 0,
        y: 0,
      });
      return;
    }

    if (!inventoryPanelConfig.inventoryComponentId) {
      console.warn('No component ID available when adding item to inventory.');
      return;
    }

    // Get the entity's inventory dimensions (default to 2x2 if not specified)
    const itemWidth =
      (entity as Item).inventoryWidth ??
      (entity as Action).inventoryWidth ??
      (entity as Attribute).inventoryWidth ??
      2;
    const itemHeight =
      (entity as Item).inventoryHeight ??
      (entity as Action).inventoryHeight ??
      (entity as Attribute).inventoryHeight ??
      2;

    // Find the first empty slot
    const slot = findFirstEmptySlot({
      inventoryItems,
      inventoryPanelConfig,
      itemHeightIn20px: itemHeight,
      itemWidthIn20px: itemWidth,
    });

    if (!slot) {
      console.warn('No empty slot available in inventory.');
      setInventoryPanelConfig({});
      return;
    }

    addItemAndFireEvent({
      type,
      entityId: entity.id,
      componentId: inventoryPanelConfig.inventoryComponentId,
      quantity: 1,
      x: slot.x,
      y: slot.y,
    });
  };

  return {
    inventoryItems,
    handleSelectInventoryEntity,
    addItemAndFireEvent,
    updateItemAndFireEvent,
    removeItemAndFireEvent,
    consumeItem,
  };
};
