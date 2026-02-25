import { CharacterContext, type InventoryItemWithData, useInventoryDragContext } from '@/stores';
import type { Component } from '@/types';
import { useContext, useEffect, useRef, useState } from 'react';
import type { ContextMenuState } from './item-context-menu';
import { useInventoryPlacement } from './use-inventory-placement';

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

  const { placeItemInTargetGrid } = useInventoryPlacement();
  const { beginDrag, cancelDrag, resolveDrop, updateDragPosition } = useInventoryDragContext();

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

    beginDrag(
      {
        item,
        source: 'node',
      },
      { clientX: e.clientX, clientY: e.clientY },
    );
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

    updateDragPosition({ clientX: e.clientX, clientY: e.clientY });
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    e.stopPropagation();
    e.preventDefault();
    dragDistance.current = 0;
    if (!dragState || !characterContext) return;

    const target = e.currentTarget as HTMLElement;
    target.releasePointerCapture(e.pointerId);

    const item = inventoryItems.find((i) => i.id === dragState.itemId);
    if (!item) {
      setDragState(null);
      cancelDrag();
      return;
    }

    const resolved = resolveDrop(e.clientX, e.clientY);

    if (resolved) {
      placeItemInTargetGrid({
        item,
        targetComponentId: resolved.targetComponentId,
        cellX: resolved.cellX,
        cellY: resolved.cellY,
        config: resolved.config,
      });
    }

    setDragState(null);
    cancelDrag();
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
