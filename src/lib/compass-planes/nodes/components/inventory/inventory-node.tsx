import { getComponentData, getComponentStyles } from '@/lib/compass-planes/utils';
import { CharacterContext, type InventoryItemWithData, WindowEditorContext } from '@/stores';
import type { Component, InventoryComponentData } from '@/types';
import { useNodeId } from '@xyflow/react';
import { useContext, useRef, useState } from 'react';
import { ResizableNode } from '../../decorators';

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

  const css = getComponentStyles(component);
  const data = getComponentData(component) as InventoryComponentData;
  const gridColor = css.color || '#ccc';

  const cellWidth = (data.cellWidth ?? 1) * 20;
  const cellHeight = (data.cellHeight ?? 1) * 20;

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
    });
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
    if (!dragState || !characterContext) return;

    const target = e.currentTarget as HTMLElement;
    target.releasePointerCapture(e.pointerId);

    // Get the dragged item to check bounds
    const item = inventoryItems.find((i) => i.id === dragState.itemId);
    if (!item) {
      setDragState(null);
      return;
    }

    // Calculate grid dimensions
    const gridCols = Math.floor(component.width / cellWidth);
    const gridRows = Math.floor(component.height / cellHeight);

    // Snap to nearest cell (add half cell for proper rounding)
    const snappedX = Math.floor((dragState.currentX + cellWidth / 2) / cellWidth);
    const snappedY = Math.floor((dragState.currentY + cellHeight / 2) / cellHeight);

    // Clamp to valid range: 0 to (gridSize - 1) for 1x1 items
    // For larger items, max position ensures item stays within grid
    const maxX = gridCols;
    const maxY = gridRows;
    const clampedX = Math.max(0, Math.min(snappedX, maxX));
    const clampedY = Math.max(0, Math.min(snappedY, maxY));

    console.log('Drop debug:', {
      currentX: dragState.currentX,
      currentY: dragState.currentY,
      cellWidth,
      cellHeight,
      componentWidth: component.width,
      componentHeight: component.height,
      gridCols,
      gridRows,
      itemWidth: item.inventoryWidth,
      itemHeight: item.inventoryHeight,
      snappedX,
      snappedY,
      maxX,
      maxY,
      clampedX,
      clampedY,
    });

    // Update position if changed
    if (clampedX !== dragState.startX || clampedY !== dragState.startY) {
      characterContext.updateInventoryItem(dragState.itemId, {
        x: clampedX,
        y: clampedY,
      });
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
    <div
      ref={containerRef}
      onDoubleClick={handleOpenInventory}
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
          <img
            key={invItem.id}
            src={invItem.image ?? ''}
            alt={invItem.title}
            draggable={false}
            onPointerDown={(e) => handlePointerDown(e, invItem)}
            style={{
              position: 'absolute',
              left: pos.left,
              top: pos.top,
              width: 20 * invItem.inventoryWidth,
              height: 20 * invItem.inventoryHeight,
              objectFit: 'cover',
              cursor: isDragging ? 'grabbing' : 'grab',
              opacity: isDragging ? 0.8 : 1,
              zIndex: isDragging ? 10 : 1,
              touchAction: 'none',
              userSelect: 'none',
            }}
          />
        );
      })}
    </div>
  );
};
