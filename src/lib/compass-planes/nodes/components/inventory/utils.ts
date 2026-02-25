// Check if placing an item at (x, y) would collide with any other items

import type { InventoryItemWithData } from '@/stores';

// Returns the colliding item if found, or null if no collision
interface findCollidingItem {
  movingItemId: string;
  x: number;
  y: number;
  widthInCells: number;
  heightInCells: number;
  inventoryItems: InventoryItemWithData[];
  cellWidth: number;
  cellHeight: number;
}

export const findCollidingItem = ({
  movingItemId,
  x,
  y,
  widthInCells,
  heightInCells,
  inventoryItems,
  cellHeight,
  cellWidth,
}: findCollidingItem): InventoryItemWithData | null => {
  for (const other of inventoryItems) {
    // Skip the item being moved
    if (other.id === movingItemId) continue;

    // Calculate other item's size in cells
    const otherWidthInPixels = other.inventoryWidth * 20;
    const otherHeightInPixels = other.inventoryHeight * 20;
    const otherWidthInCells = Math.ceil(otherWidthInPixels / cellWidth);
    const otherHeightInCells = Math.ceil(otherHeightInPixels / cellHeight);

    // Check for rectangle overlap
    const noOverlap =
      x >= other.x + otherWidthInCells || // moving item is to the right
      x + widthInCells <= other.x || // moving item is to the left
      y >= other.y + otherHeightInCells || // moving item is below
      y + heightInCells <= other.y; // moving item is above

    if (!noOverlap) {
      return other; // collision detected, return the colliding item
    }
  }
  return null;
};

interface HasCollision {
  x: number;
  y: number;
  existingItems: InventoryItemWithData[];
  cellWidth: number;
  cellHeight: number;
  excludePosition: { x: number; y: number };
  widthInCells: number;
  heightInCells: number;
}

export const hasCollision = ({
  x,
  y,
  existingItems,
  cellWidth,
  cellHeight,
  excludePosition,
  widthInCells,
  heightInCells,
}: HasCollision): boolean => {
  if (excludePosition?.x === x && excludePosition?.y === y) return true;
  for (const other of existingItems) {
    const otherWidthInPixels = other.inventoryWidth * 20;
    const otherHeightInPixels = other.inventoryHeight * 20;
    const otherWidthInCells = Math.ceil(otherWidthInPixels / cellWidth);
    const otherHeightInCells = Math.ceil(otherHeightInPixels / cellHeight);

    const noOverlap =
      x >= other.x + otherWidthInCells ||
      x + widthInCells <= other.x ||
      y >= other.y + otherHeightInCells ||
      y + heightInCells <= other.y;

    if (!noOverlap) return true;
  }
  return false;
};

interface FindFirstEmptySlot {
  itemWidthIn20px: number;
  itemHeightIn20px: number;
  excludeItemId?: string;
  excludePosition?: { x: number; y: number };
  cellHeight: number;
  cellWidth: number;
  inventoryItems: InventoryItemWithData[];
  gridRows: number;
  gridCols: number;
}

export const findFirstEmptySlot = ({
  itemHeightIn20px,
  itemWidthIn20px,
  excludeItemId,
  excludePosition,
  cellHeight,
  cellWidth,
  inventoryItems,
  gridCols,
  gridRows,
}: FindFirstEmptySlot): { x: number; y: number } | null => {
  const itemWidthInPixels = itemWidthIn20px * 20;
  const itemHeightInPixels = itemHeightIn20px * 20;
  const itemWidthInCells = Math.ceil(itemWidthInPixels / cellWidth);
  const itemHeightInCells = Math.ceil(itemHeightInPixels / cellHeight);

  const existingItems = inventoryItems.filter((item) => item.id !== excludeItemId);

  const hasCollision = (x: number, y: number): boolean => {
    if (excludePosition?.x === x && excludePosition?.y === y) return true;
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

  for (let y = 0; y <= gridRows - itemHeightInCells; y++) {
    for (let x = 0; x <= gridCols - itemWidthInCells; x++) {
      if (!hasCollision(x, y)) {
        return { x, y };
      }
    }
  }

  return null;
};
