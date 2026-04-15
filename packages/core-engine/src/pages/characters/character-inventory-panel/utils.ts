import type { InventoryItemWithData, InventoryPanelConfig } from '@/stores';

interface FindFirstEmptySlot {
  itemWidthIn20px: number;
  itemHeightIn20px: number;
  inventoryItems: InventoryItemWithData[];
  inventoryPanelConfig: InventoryPanelConfig;
}

export const findFirstEmptySlot = ({
  itemHeightIn20px,
  itemWidthIn20px,
  inventoryItems,
  inventoryPanelConfig,
}: FindFirstEmptySlot): { x: number; y: number } | null => {
  const { cellWidth, cellHeight, gridCols, gridRows, inventoryComponentId } = inventoryPanelConfig;

  if (!cellWidth || !cellHeight || !gridCols || !gridRows) {
    return null;
  }

  // Calculate item size in cells
  const itemWidthInPixels = itemWidthIn20px * 20;
  const itemHeightInPixels = itemHeightIn20px * 20;
  const itemWidthInCells = Math.ceil(itemWidthInPixels / cellWidth);
  const itemHeightInCells = Math.ceil(itemHeightInPixels / cellHeight);

  // Get existing items in this component
  const existingItems = inventoryItems.filter((item) => item.componentId === inventoryComponentId);

  // Check if a position collides with existing items
  const hasCollision = (x: number, y: number): boolean => {
    for (const other of existingItems) {
      const otherWidthInPixels = other.inventoryWidth * 20;
      const otherHeightInPixels = other.inventoryHeight * 20;
      const otherWidthInCells = Math.ceil(otherWidthInPixels / cellWidth);
      const otherHeightInCells = Math.ceil(otherHeightInPixels / cellHeight);

      const noOverlap =
        x >= other.x + otherWidthInCells ||
        x + itemWidthInCells <= other.x ||
        y >= other.y + otherHeightInCells ||
        y + itemHeightInCells <= other.y;

      if (!noOverlap) return true;
    }
    return false;
  };

  // Scan row by row, left to right, for the first empty slot
  for (let y = 0; y <= gridRows - itemHeightInCells; y++) {
    for (let x = 0; x <= gridCols - itemWidthInCells; x++) {
      if (!hasCollision(x, y)) {
        return { x, y };
      }
    }
  }

  // No empty slot found
  return null;
};
