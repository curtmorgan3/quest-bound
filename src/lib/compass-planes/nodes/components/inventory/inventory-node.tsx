import {
  getBackgroundStyle,
  getColorStyle,
  getComponentData,
  useComponentStyles,
} from '@/lib/compass-planes/utils';
import { CharacterContext, WindowEditorContext, useInventoryDragContext } from '@/stores';
import type { Component, InventoryComponentData } from '@/types';
import { useNodeId } from '@xyflow/react';
import { memo, useContext, useEffect, useState } from 'react';
import { ResizableNode } from '../../decorators';
import { ItemContextMenu, type ContextMenuState } from './item-context-menu';
import { useInventoryHandlers } from './use-inventory-handlers';
import { useInventoryPointers } from './use-inventory-pointers';

export const EditInventoryNode = () => {
  const { getComponent } = useContext(WindowEditorContext);
  const id = useNodeId();
  const component = id ? getComponent(id) : null;
  const css = useComponentStyles(component);

  if (!id) return null;
  if (!component) return null;

  const data = getComponentData(component) as InventoryComponentData;
  const gridColor = css.color || '#ccc';
  const bgStyle = getBackgroundStyle(css);
  const gridImage = `
    linear-gradient(to right, ${gridColor} ${css.outlineWidth}px, transparent ${css.outlineWidth}px),
    linear-gradient(to bottom, ${gridColor} ${css.outlineWidth}px, transparent ${css.outlineWidth}px)
  `;

  const cellWidth = (data.cellWidth ?? 1) * 20;
  const cellHeight = (data.cellHeight ?? 1) * 20;

  const containerStyle = bgStyle.background
    ? {
        backgroundImage: `${bgStyle.background}, ${gridImage}`,
        backgroundSize: `100% 100%, ${cellWidth}px ${cellHeight}px`,
      }
    : {
        ...bgStyle,
        backgroundImage: gridImage,
        backgroundSize: `${cellWidth}px ${cellHeight}px`,
      };

  return (
    <ResizableNode component={component}>
      <div
        style={{
          height: component.height,
          width: component.width,
          ...containerStyle,
          borderRadius: css.borderRadius,
          overflow: 'hidden',
        }}></div>
    </ResizableNode>
  );
};

const ViewInventoryNodeComponent = ({ component }: { component: Component }) => {
  const characterContext = useContext(CharacterContext);
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const { registerDropTarget, unregisterDropTarget, activeDrag } = useInventoryDragContext();

  const css = useComponentStyles(component);
  const data = getComponentData(component) as InventoryComponentData;
  const gridColor = css.color || '#ccc';
  const bgStyle = getBackgroundStyle(css);
  const gridImage = `
    linear-gradient(to right, ${gridColor} ${css.outlineWidth}px, transparent ${css.outlineWidth}px),
    linear-gradient(to bottom, ${gridColor} ${css.outlineWidth}px, transparent ${css.outlineWidth}px)
  `;

  const cellWidth = (data.cellWidth ?? 1) * 20;
  const cellHeight = (data.cellHeight ?? 1) * 20;
  const gridCols = Math.floor(component.width / cellWidth);
  const gridRows = Math.floor(component.height / cellHeight);
  const showItemAs = data.showItemAs ?? 'image';
  const typeRestriction = data.typeRestriction;
  const categoryRestriction = data.categoryRestriction;

  const inventoryItems = (characterContext?.inventoryItems ?? []).filter(
    (item) => item.componentId === component.id,
  );

  useEffect(() => {
    const id = component.id;
    registerDropTarget(id, {
      componentId: component.id,
      getBounds: () => containerRef.current?.getBoundingClientRect() ?? null,
      cellWidth,
      cellHeight,
      gridCols,
      gridRows,
      typeRestriction,
      categoryRestriction,
    });

    return () => {
      unregisterDropTarget(id);
    };
  }, [
    component.id,
    cellWidth,
    cellHeight,
    gridCols,
    gridRows,
    registerDropTarget,
    unregisterDropTarget,
  ]);

  useEffect(() => {
    if (!contextMenu) return;
    const openedItem = inventoryItems.find((item) => item.id === contextMenu.item.id);
    if (!openedItem) return;

    if (JSON.stringify(openedItem) === JSON.stringify(contextMenu.item)) return;

    setContextMenu((prev) => ({
      x: prev?.x ?? 100,
      y: prev?.y ?? 100,
      item: openedItem,
    }));
  }, [JSON.stringify(inventoryItems), contextMenu, setContextMenu]);

  const {
    handleOpenInventory,
    handleUpdateQuantity,
    handleRemoveItem,
    handleConsumeItem,
    handleSplitStack,
  } = useInventoryHandlers({
    cellHeight,
    cellWidth,
    component,
    gridRows,
    gridCols,
    contextMenu,
    setContextMenu,
    inventoryItems,
  });

  const {
    containerRef,
    dragState,
    handleItemClick,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    getItemPosition,
  } = useInventoryPointers({
    setContextMenu,
    cellWidth,
    cellHeight,
    inventoryItems,
    component,
  });

  const handleCloseContextMenu = () => {
    setContextMenu(null);
  };

  return (
    <>
      <div
        ref={containerRef}
        role='button'
        data-testid='inventory-grid'
        onDoubleClick={handleOpenInventory}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        style={{
          position: 'relative',
          height: component.height,
          width: component.width,
          ...(bgStyle.background
            ? {
                backgroundImage: `${bgStyle.background}, ${gridImage}`,
                backgroundSize: `100% 100%, ${cellWidth}px ${cellHeight}px`,
              }
            : {
                ...bgStyle,
                backgroundImage: gridImage,
                backgroundSize: `${cellWidth}px ${cellHeight}px`,
              }),
          borderRadius: css.borderRadius,
          overflow: 'hidden',
          touchAction: 'none',
        }}>
        {inventoryItems.map((invItem) => {
          const pos = getItemPosition(invItem);
          const isDragging = dragState?.itemId === invItem.id && activeDrag?.item.id === invItem.id;

          return (
            <div
              key={invItem.id}
              data-item-title={invItem.title}
              onDoubleClick={(e) => e.stopPropagation()}
              onClick={(e) => handleItemClick(e, invItem)}
              onPointerDown={(e) => handlePointerDown(e, invItem)}
              tabIndex={0}
              role='button'
              aria-label={`${invItem.title} - drag to move`}
              style={{
                position: 'absolute',
                left: pos.left,
                top: pos.top,
                width: 20 * invItem.inventoryWidth,
                height: 20 * invItem.inventoryHeight,
                cursor: isDragging ? 'grabbing' : 'grab',
                // Hide the in-grid item while dragging so only the
                // global drag preview is visible.
                opacity: isDragging ? 0 : 1,
                zIndex: isDragging ? 10 : 1,
                touchAction: 'none',
                userSelect: 'none',
                outline: 'none',
              }}>
              {invItem.image && showItemAs === 'image' ? (
                <img
                  src={invItem.image}
                  alt={invItem.title}
                  draggable={false}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    opacity: invItem.value === false ? 0.3 : 1,
                  }}
                />
              ) : (
                <span
                  className='text-xs pl-[4px]'
                  style={{
                    ...getColorStyle(css),
                    fontFamily: css.fontFamily,
                    fontSize: css.fontSize,
                    fontStyle: css.fontStyle,
                    fontWeight: css.fontWeight,
                    opacity: invItem.value === false ? 0.3 : 1,
                  }}>
                  {invItem.title}
                </span>
              )}
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
          onUpdateLabel={(label?: string) => {
            if (!characterContext) return;
            characterContext.updateInventoryItem(contextMenu.item.id, { label });
          }}
          onRemove={handleRemoveItem}
          onSplit={handleSplitStack}
          onConsume={handleConsumeItem}
          onToggleEquipped={
            characterContext
              ? () =>
                  characterContext.updateInventoryItem(contextMenu.item.id, {
                    isEquipped: !contextMenu.item.isEquipped,
                  })
              : undefined
          }
        />
      )}
    </>
  );
};

export const ViewInventoryNode = memo(
  ViewInventoryNodeComponent,
  (prev, next) => prev.component === next.component,
);
