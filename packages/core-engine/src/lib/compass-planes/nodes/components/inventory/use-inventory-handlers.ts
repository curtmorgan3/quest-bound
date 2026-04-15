import { getComponentData } from '@/lib/compass-planes/utils';
import { CharacterContext, type InventoryItemWithData } from '@/stores';
import type { Component, InventoryComponentData } from '@/types';
import { useContext } from 'react';
import type { ContextMenuState } from './item-context-menu';
import { findFirstEmptySlot } from './utils';

interface UseInventoryHandlers {
  component: Component;
  cellHeight: number;
  cellWidth: number;
  gridCols: number;
  gridRows: number;
  contextMenu: ContextMenuState | null;
  setContextMenu: (state: ContextMenuState | null) => void;
  inventoryItems: InventoryItemWithData[];
}

export function useInventoryHandlers({
  component,
  cellHeight,
  cellWidth,
  gridRows,
  gridCols,
  contextMenu,
  setContextMenu,
  inventoryItems,
}: UseInventoryHandlers) {
  const characterContext = useContext(CharacterContext);
  const data = getComponentData(component) as InventoryComponentData;

  const handleOpenInventory = () => {
    if (!characterContext) {
      console.warn('No character context from ViewInventoryNode');
      return;
    }

    characterContext.setInventoryPanelConfig({
      open: true,
      inventoryComponentId: component.id,
      typeRestriction: data.typeRestriction,
      categoryRestriction: data.categoryRestriction,
      cellWidth,
      cellHeight,
      gridCols,
      gridRows,
    });
  };

  const handleUpdateQuantity = (quantity: number) => {
    if (!characterContext || !contextMenu) return;
    characterContext.updateInventoryItem(contextMenu.item.id, { quantity });
    setContextMenu(null);
  };

  const handleRemoveItem = () => {
    if (!characterContext || !contextMenu) return;
    characterContext.removeInventoryItem(contextMenu.item.id);
    setContextMenu(null);
  };

  const handleConsumeItem = () => {
    if (!characterContext || !contextMenu) return;
    characterContext.consumeItem(contextMenu.item.id);

    if (contextMenu.item.quantity <= 1) {
      setContextMenu(null);
    }
  };

  const handleSplitStack = (splitAmount: number) => {
    if (!characterContext || !contextMenu) return;

    const item = contextMenu.item;
    const remainingQuantity = item.quantity - splitAmount;

    // Find first empty slot for the new stack
    // Exclude the item pos being split, since that will be removed. Otherwise, splitting from
    // the first available position will cause the stacks to appear in the same slot.
    const slot = findFirstEmptySlot({
      inventoryItems,
      itemHeightIn20px: item.inventoryHeight,
      itemWidthIn20px: item.inventoryWidth,
      excludeItemId: item.id,
      excludePosition: { x: item.x, y: item.y },
      cellWidth,
      cellHeight,
      gridCols,
      gridRows,
    });

    if (!slot) {
      console.warn('No empty slot available for split stack');
      setContextMenu(null);
      return;
    }

    // Update original item quantity
    characterContext.updateInventoryItem(item.id, { quantity: remainingQuantity });

    // Create new item with split amount
    characterContext.addInventoryItem({
      type: item.type,
      entityId: item.entityId,
      componentId: component.id,
      quantity: splitAmount,
      x: slot.x,
      y: slot.y,
    });

    setContextMenu(null);
  };

  return {
    handleOpenInventory,
    handleUpdateQuantity,
    handleRemoveItem,
    handleConsumeItem,
    handleSplitStack,
  };
}
