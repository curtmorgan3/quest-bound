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
  const justDroppedRef = useRef<boolean>(false);

  /** Pending pointer: we have pointer down but haven't committed to drag yet. */
  const pendingPointerRef = useRef<{
    item: InventoryItemWithData;
    startClientX: number;
    startClientY: number;
    lastClientX: number;
    lastClientY: number;
    pointerId: number;
    target: HTMLElement;
  } | null>(null);
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const DRAG_DISTANCE_THRESHOLD_PX = 10;
  const LONG_PRESS_MS = 500;

  const { placeItemInTargetGrid } = useInventoryPlacement();
  const { activeDrag, beginDrag, cancelDrag, resolveDrop, updateDragPosition } =
    useInventoryDragContext();

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

    if (justDroppedRef.current) {
      justDroppedRef.current = false;
      return;
    }
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

  // Clear any local drag state whenever the global drag context is cleared.
  useEffect(() => {
    if (!activeDrag) {
      setDragState(null);
      isDragging.current = false;
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
        longPressTimerRef.current = null;
      }
      pendingPointerRef.current = null;
    }
  }, [activeDrag]);

  const handlePointerDown = (e: React.PointerEvent, item: InventoryItemWithData) => {
    e.stopPropagation();
    e.preventDefault();

    const target = e.currentTarget as HTMLElement;

    try {
      target.setPointerCapture(e.pointerId);
    } catch (error) {
      console.warn('Failed to set pointer capture:', error);
    }

    const clientX = e.clientX;
    const clientY = e.clientY;

    pendingPointerRef.current = {
      item,
      startClientX: clientX,
      startClientY: clientY,
      lastClientX: clientX,
      lastClientY: clientY,
      pointerId: e.pointerId,
      target,
    };

    if (e.pointerType === 'touch') {
      longPressTimerRef.current = setTimeout(() => {
        longPressTimerRef.current = null;
        const pending = pendingPointerRef.current;
        if (!pending) return;
        setContextMenu({
          item: pending.item,
          x: pending.lastClientX,
          y: pending.lastClientY,
        });
        try {
          pending.target.releasePointerCapture(pending.pointerId);
        } catch {
          // ignore
        }
        pendingPointerRef.current = null;
      }, LONG_PRESS_MS);
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const clientX = e.clientX;
    const clientY = e.clientY;
    const pointerX = clientX - rect.left;
    const pointerY = clientY - rect.top;

    const pending = pendingPointerRef.current;
    if (pending) {
      pending.lastClientX = clientX;
      pending.lastClientY = clientY;
      const distance = Math.hypot(
        clientX - pending.startClientX,
        clientY - pending.startClientY,
      );
      if (distance >= DRAG_DISTANCE_THRESHOLD_PX) {
        if (longPressTimerRef.current) {
          clearTimeout(longPressTimerRef.current);
          longPressTimerRef.current = null;
        }
        pendingPointerRef.current = null;
        isDragging.current = true;
        const { item } = pending;
        const offsetX = pointerX - item.x * cellWidth;
        const offsetY = pointerY - item.y * cellHeight;
        setDragState({
          itemId: item.id,
          startX: item.x,
          startY: item.y,
          offsetX,
          offsetY,
          currentX: pointerX - offsetX,
          currentY: pointerY - offsetY,
        });
        beginDrag(
          { item, source: 'node' },
          { clientX, clientY },
        );
        updateDragPosition({ clientX, clientY });
      }
      return;
    }

    if (!dragState) return;
    if (e.buttons === 0) return;

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

    updateDragPosition({ clientX, clientY });
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    e.stopPropagation();
    e.preventDefault();

    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }

    if (pendingPointerRef.current) {
      pendingPointerRef.current = null;
      return;
    }

    if (!dragState || !characterContext) return;

    if (!isDragging.current) {
      setDragState(null);
      cancelDrag();
      return;
    }

    const target = e.currentTarget as HTMLElement;
    target.releasePointerCapture(e.pointerId);

    const item = inventoryItems.find((i) => i.id === dragState.itemId);
    if (!item) {
      setDragState(null);
      cancelDrag();
      return;
    }

    const resolved = resolveDrop(e.clientX, e.clientY);

    if (!resolved) {
      justDroppedRef.current = true;
      setDragState(null);
      cancelDrag();
      return;
    }

    // For drops onto this same component, set a committed position so the
    // item appears at its new location while waiting for the database
    // update to propagate.
    if (resolved.targetComponentId === component.id) {
      setDragState((prev) =>
        prev
          ? {
              ...prev,
              committedX: resolved.cellX,
              committedY: resolved.cellY,
            }
          : prev,
      );
    }

    justDroppedRef.current = true;
    placeItemInTargetGrid({
      item,
      targetComponentId: resolved.targetComponentId,
      cellX: resolved.cellX,
      cellY: resolved.cellY,
      config: resolved.config,
    });

    // Hide the global preview immediately, but keep dragState until
    // inventoryItems reflect the new position/component.
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
