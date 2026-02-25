import type { InventoryDropTargetConfig } from '@/stores';
import { CharacterContext, type InventoryItemWithData } from '@/stores';
import type { InventoryItem } from '@/types';
import { useCallback, useContext } from 'react';
import { findCollidingItem } from './utils';

interface PlaceItemInTargetGridArgs {
  item: InventoryItemWithData;
  targetComponentId: string;
  cellX: number;
  cellY: number;
  config: InventoryDropTargetConfig;
}

export const useInventoryPlacement = () => {
  const characterContext = useContext(CharacterContext);

  const placeItemInTargetGrid = useCallback(
    ({ item, targetComponentId, cellX, cellY, config }: PlaceItemInTargetGridArgs): void => {
      if (!characterContext) return;

      const { inventoryItems, updateInventoryItem, removeInventoryItem } = characterContext;

      const targetItems = inventoryItems.filter((entry) => entry.componentId === targetComponentId);

      const itemWidthInPixels = item.inventoryWidth * 20;
      const itemHeightInPixels = item.inventoryHeight * 20;
      const itemWidthInCells = Math.ceil(itemWidthInPixels / config.cellWidth);
      const itemHeightInCells = Math.ceil(itemHeightInPixels / config.cellHeight);

      const maxX = config.gridCols - itemWidthInCells;
      const maxY = config.gridRows - itemHeightInCells;

      const clampedX = Math.max(0, Math.min(cellX, maxX));
      const clampedY = Math.max(0, Math.min(cellY, maxY));

      const collidingItem = findCollidingItem({
        movingItemId: item.id,
        x: clampedX,
        y: clampedY,
        widthInCells: itemWidthInCells,
        heightInCells: itemHeightInCells,
        inventoryItems: targetItems,
        cellHeight: config.cellHeight,
        cellWidth: config.cellWidth,
      });

      if (collidingItem) {
        const canStack =
          collidingItem.entityId === item.entityId &&
          collidingItem.stackSize > 1 &&
          collidingItem.quantity < collidingItem.stackSize;

        if (!canStack) {
          return;
        }

        const spaceInStack = collidingItem.stackSize - collidingItem.quantity;
        const amountToAdd = Math.min(item.quantity, spaceInStack);
        const remainder = item.quantity - amountToAdd;

        updateInventoryItem(collidingItem.id, {
          quantity: collidingItem.quantity + amountToAdd,
        });

        if (remainder > 0) {
          const update: Partial<InventoryItem> = {
            quantity: remainder,
          };
          if (item.componentId !== targetComponentId) {
            update.componentId = targetComponentId;
            update.x = clampedX;
            update.y = clampedY;
          }
          updateInventoryItem(item.id, update);
        } else {
          removeInventoryItem(item.id);
        }

        return;
      }

      const update: Partial<InventoryItem> = {
        x: clampedX,
        y: clampedY,
      };

      if (item.componentId !== targetComponentId) {
        update.componentId = targetComponentId;
      }

      updateInventoryItem(item.id, update);
    },
    [characterContext],
  );

  return {
    placeItemInTargetGrid,
  };
};
