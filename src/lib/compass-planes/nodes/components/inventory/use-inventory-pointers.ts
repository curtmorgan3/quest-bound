import { CharacterContext, type InventoryItemWithData } from '@/stores';
import type { Component } from '@/types';
import { useContext, useEffect, useRef, useState } from 'react';
import type { ContextMenuState } from './item-context-menu';
import { findCollidingItem } from './utils';

type DragState = {
  itemId: string;
  startX: number;
  startY: number;
  offsetX: number;
  offsetY: number;
  currentX: number;
  currentY: number;
  committedX?: number;
  committedY?: number;
};

interface UseInventoryPointers {
  setContextMenu: (state: ContextMenuState | null) => void;
  cellWidth: number;
  cellHeight: number;
  inventoryItems: InventoryItemWithData[];
  component: Component;
}

export const useInventoryPointers = ({
  setContextMenu,
  cellWidth,
  cellHeight,
  inventoryItems,
  component,
}: UseInventoryPointers) => {
  const characterContext = useContext(CharacterContext);
  const [dragState, setDragState] = useState<DragState | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const isDragging = useRef<boolean>(false);
  const dragDistance = useRef<number>(0);

  // Clear drag state once the database update has propagated
  useEffect(() => {
    if (!dragState || dragState.committedX === undefined || dragState.committedY === undefined)
      return;

    const item = inventoryItems.find((i) => i.id === dragState.itemId);
    if (!item) {
      // Item was removed (e.g., fully stacked), clear drag state
      setDragState(null);
      return;
    }

    // Check if the item's position matches the committed position
    if (item.x === dragState.committedX && item.y === dragState.committedY) {
      setDragState(null);
    }
  }, [dragState, inventoryItems]);

  const handleItemClick = (e: React.MouseEvent, item: InventoryItemWithData) => {
    e.stopPropagation();
    e.preventDefault();

    if (isDragging.current) {
      isDragging.current = false;
      return;
    }

    setContextMenu({
      item,
      x: e.clientX,
      y: e.clientY,
    });
  };

  const handlePointerDown = (e: React.PointerEvent, item: InventoryItemWithData) => {
    e.stopPropagation();
    e.preventDefault();

    const target = e.currentTarget as HTMLElement;

    // Ensure pointer capture is set immediately for touch devices
    try {
      target.setPointerCapture(e.pointerId);
    } catch (error) {
      console.warn('Failed to set pointer capture:', error);
    }

    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const pointerX = e.clientX - rect.left;
    const pointerY = e.clientY - rect.top;

    setDragState({
      itemId: item.id,
      startX: item.x,
      startY: item.y,
      offsetX: pointerX - item.x * cellWidth,
      offsetY: pointerY - item.y * cellHeight,
      currentX: item.x * cellWidth,
      currentY: item.y * cellHeight,
    });
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragState) return;

    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    dragDistance.current = dragDistance.current + 1;

    if (dragDistance.current > 15) {
      isDragging.current = true;
    }

    const pointerX = e.clientX - rect.left;
    const pointerY = e.clientY - rect.top;

    const newX = pointerX - dragState.offsetX;
    const newY = pointerY - dragState.offsetY;

    setDragState((prev) =>
      prev
        ? {
            ...prev,
            currentX: newX,
            currentY: newY,
          }
        : null,
    );
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    e.stopPropagation();
    e.preventDefault();
    dragDistance.current = 0;
    if (!dragState || !characterContext) return;

    const target = e.currentTarget as HTMLElement;
    target.releasePointerCapture(e.pointerId);

    // Get the dragged item to check bounds
    const item = inventoryItems.find((i) => i.id === dragState.itemId);
    if (!item) {
      setDragState(null);
      return;
    }

    // Item dimensions are in 20px units, convert to pixels then to cells
    const itemWidthInPixels = item.inventoryWidth * 20;
    const itemHeightInPixels = item.inventoryHeight * 20;
    const itemWidthInCells = Math.ceil(itemWidthInPixels / cellWidth);
    const itemHeightInCells = Math.ceil(itemHeightInPixels / cellHeight);

    // Calculate grid dimensions
    const gridCols = Math.floor(component.width / cellWidth);
    const gridRows = Math.floor(component.height / cellHeight);

    // Snap to nearest cell (add half cell for proper rounding)
    const snappedX = Math.floor((dragState.currentX + cellWidth / 2) / cellWidth);
    const snappedY = Math.floor((dragState.currentY + cellHeight / 2) / cellHeight);

    // Clamp to valid range using item size in cells
    const maxX = gridCols - itemWidthInCells;
    const maxY = gridRows - itemHeightInCells;
    const clampedX = Math.max(0, Math.min(snappedX, maxX));
    const clampedY = Math.max(0, Math.min(snappedY, maxY));

    // Check for collision with other items
    const collidingItem = findCollidingItem({
      movingItemId: dragState.itemId,
      x: clampedX,
      y: clampedY,
      widthInCells: itemWidthInCells,
      heightInCells: itemHeightInCells,
      inventoryItems,
      cellHeight,
      cellWidth,
    });

    if (collidingItem) {
      // Check if items can be stacked (same entityId and stackable)
      const canStack =
        collidingItem.entityId === item.entityId &&
        collidingItem.stackSize > 1 &&
        collidingItem.quantity < collidingItem.stackSize;

      if (canStack) {
        // Calculate how many can be added to the stack
        const spaceInStack = collidingItem.stackSize - collidingItem.quantity;
        const amountToAdd = Math.min(item.quantity, spaceInStack);
        const remainder = item.quantity - amountToAdd;

        // Update the existing stack's quantity
        characterContext.updateInventoryItem(collidingItem.id, {
          quantity: collidingItem.quantity + amountToAdd,
        });

        if (remainder > 0) {
          // Update the dragged item with remaining quantity (stays in original position)
          characterContext.updateInventoryItem(item.id, {
            quantity: remainder,
          });
          // Set committed position to original position for optimistic UI
          setDragState((prev) =>
            prev ? { ...prev, committedX: dragState.startX, committedY: dragState.startY } : null,
          );
        } else {
          // Remove the dragged item entirely
          characterContext.removeInventoryItem(item.id);
          // Clear drag state immediately since item is removed
          setDragState(null);
        }
      } else {
        // If collision but can't stack, item stays in original position
        // Set committed position to original position for optimistic UI
        setDragState((prev) =>
          prev ? { ...prev, committedX: dragState.startX, committedY: dragState.startY } : null,
        );
      }
    } else {
      // No collision - update position if changed
      if (clampedX !== dragState.startX || clampedY !== dragState.startY) {
        characterContext.updateInventoryItem(dragState.itemId, {
          x: clampedX,
          y: clampedY,
        });
        // Set committed position for optimistic UI
        setDragState((prev) =>
          prev ? { ...prev, committedX: clampedX, committedY: clampedY } : null,
        );
      } else {
        // Position didn't change, just clear drag state
        setDragState(null);
      }
    }
  };

  const getItemPosition = (item: InventoryItemWithData) => {
    if (dragState?.itemId === item.id) {
      // If we have a committed position, use that (item is dropped but waiting for DB update)
      if (dragState.committedX !== undefined && dragState.committedY !== undefined) {
        return {
          left: dragState.committedX * cellWidth,
          top: dragState.committedY * cellHeight,
        };
      }
      // Otherwise use the current drag position
      return {
        left: dragState.currentX,
        top: dragState.currentY,
      };
    }
    return {
      left: item.x * cellWidth,
      top: item.y * cellHeight,
    };
  };

  return {
    containerRef,
    dragState,
    handleItemClick,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    getItemPosition,
  };
};
