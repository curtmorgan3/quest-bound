import { getComponentData, getComponentStyles } from '@/lib/compass-planes/utils';
import { CharacterContext, WindowEditorContext, type InventoryItemWithData } from '@/stores';
import type { Component, InventoryComponentData } from '@/types';
import { useNodeId } from '@xyflow/react';
import { useContext, useRef, useState } from 'react';
import { ResizableNode } from '../../decorators';
import { ItemContextMenu, type ContextMenuState } from './item-context-menu';

export const EditInventoryNode = () => {
  const { getComponent } = useContext(WindowEditorContext);
  const id = useNodeId();

  if (!id) return null;
  const component = getComponent(id);
  if (!component) return null;

  return (
    <ResizableNode component={component}>
      <ViewInventoryNode component={component} />
    </ResizableNode>
  );
};

type DragState = {
  itemId: string;
  startX: number;
  startY: number;
  offsetX: number;
  offsetY: number;
  currentX: number;
  currentY: number;
};

export const ViewInventoryNode = ({ component }: { component: Component }) => {
  const characterContext = useContext(CharacterContext);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);

  const isDragging = useRef<boolean>(false);
  const dragDistance = useRef<number>(0);

  const css = getComponentStyles(component);
  const data = getComponentData(component) as InventoryComponentData;
  const gridColor = css.color || '#ccc';

  const cellWidth = (data.cellWidth ?? 1) * 20;
  const cellHeight = (data.cellHeight ?? 1) * 20;
  const gridCols = Math.floor(component.width / cellWidth);
  const gridRows = Math.floor(component.height / cellHeight);

  const inventoryItems = (characterContext?.inventoryItems ?? []).filter(
    (item) => item.componentId === component.id,
  );

  const handleOpenInventory = () => {
    if (!characterContext) {
      console.warn('No character context from ViewInventoryNode');
      return;
    }

    characterContext.setInventoryPanelConfig({
      open: true,
      inventoryComponentId: component.id,
      cellWidth,
      cellHeight,
      gridCols,
      gridRows,
    });
  };

  const findFirstEmptySlot = (
    itemWidthIn20px: number,
    itemHeightIn20px: number,
    excludeItemId?: string,
    excludePosition?: { x: number; y: number },
  ): { x: number; y: number } | null => {
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

  const handleCloseContextMenu = () => {
    setContextMenu(null);
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

  const handleSplitStack = (splitAmount: number) => {
    if (!characterContext || !contextMenu) return;

    const item = contextMenu.item;
    const remainingQuantity = item.quantity - splitAmount;

    // Find first empty slot for the new stack
    // Exclude the item pos being split, since that will be removed. Otherwise, splitting from
    // the first available position will cause the stacks to appear in the same slot.
    const slot = findFirstEmptySlot(item.inventoryWidth, item.inventoryHeight, item.id, {
      x: item.x,
      y: item.y,
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

  // Check if placing an item at (x, y) would collide with any other items
  // Returns the colliding item if found, or null if no collision
  const findCollidingItem = (
    movingItemId: string,
    x: number,
    y: number,
    widthInCells: number,
    heightInCells: number,
  ): InventoryItemWithData | null => {
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

  const handlePointerDown = (e: React.PointerEvent, item: InventoryItemWithData) => {
    e.stopPropagation();
    e.preventDefault();

    const target = e.currentTarget as HTMLElement;
    target.setPointerCapture(e.pointerId);

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
    const collidingItem = findCollidingItem(
      dragState.itemId,
      clampedX,
      clampedY,
      itemWidthInCells,
      itemHeightInCells,
    );

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
        } else {
          // Remove the dragged item entirely
          characterContext.removeInventoryItem(item.id);
        }
      }
      // If collision but can't stack, item stays in original position (no update needed)
    } else {
      // No collision - update position if changed
      if (clampedX !== dragState.startX || clampedY !== dragState.startY) {
        characterContext.updateInventoryItem(dragState.itemId, {
          x: clampedX,
          y: clampedY,
        });
      }
    }

    setDragState(null);
  };

  const getItemPosition = (item: InventoryItemWithData) => {
    if (dragState?.itemId === item.id) {
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

  return (
    <>
      <div
        ref={containerRef}
        onDoubleClick={handleOpenInventory}
        onClick={() => setContextMenu(null)}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        style={{
          position: 'relative',
          height: component.height,
          width: component.width,
          backgroundColor: css.backgroundColor,
          borderRadius: css.borderRadius,
          outline: css.outline,
          outlineColor: css.outlineColor,
          outlineWidth: css.outlineWidth,
          backgroundSize: `${cellWidth}px ${cellHeight}px`,
          backgroundImage: `
            linear-gradient(to right, ${gridColor} 1px, transparent 1px),
            linear-gradient(to bottom, ${gridColor} 1px, transparent 1px)
          `,
          overflow: 'hidden',
        }}>
        {inventoryItems.map((invItem) => {
          const pos = getItemPosition(invItem);
          const isDragging = dragState?.itemId === invItem.id;

          return (
            <div
              key={invItem.id}
              onDoubleClick={(e) => e.stopPropagation()}
              onClick={(e) => handleItemClick(e, invItem)}
              onPointerDown={(e) => handlePointerDown(e, invItem)}
              style={{
                position: 'absolute',
                left: pos.left,
                top: pos.top,
                width: 20 * invItem.inventoryWidth,
                height: 20 * invItem.inventoryHeight,
                cursor: isDragging ? 'grabbing' : 'grab',
                opacity: isDragging ? 0.8 : 1,
                zIndex: isDragging ? 10 : 1,
                touchAction: 'none',
                userSelect: 'none',
              }}>
              <img
                src={invItem.image ?? ''}
                alt={invItem.title}
                draggable={false}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                }}
              />
              {invItem.quantity > 1 && (
                <span
                  style={{
                    position: 'absolute',
                    top: 2,
                    right: 2,
                    minWidth: 16,
                    height: 16,
                    padding: '0 4px',
                    backgroundColor: 'rgba(0, 0, 0, 0.75)',
                    color: '#fff',
                    fontSize: 11,
                    fontWeight: 600,
                    borderRadius: 8,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    lineHeight: 1,
                  }}>
                  {invItem.quantity}
                </span>
              )}
            </div>
          );
        })}
      </div>
      {contextMenu && (
        <ItemContextMenu
          item={contextMenu.item}
          position={{ x: contextMenu.x, y: contextMenu.y }}
          onClose={handleCloseContextMenu}
          onUpdateQuantity={handleUpdateQuantity}
          onRemove={handleRemoveItem}
          onSplit={handleSplitStack}
        />
      )}
    </>
  );
};
