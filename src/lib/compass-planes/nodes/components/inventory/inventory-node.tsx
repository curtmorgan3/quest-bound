import {
  getBackgroundStyle,
  getColorStyle,
  getComponentData,
  useComponentStyles,
} from '@/lib/compass-planes/utils';
import { CharacterContext, WindowEditorContext, useInventoryDragContext } from '@/stores';
import type { Component, InventoryComponentData } from '@/types';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useEditorItemId } from '@/lib/compass-planes/canvas/editor-item-context';
import { useComponentCanvasDimensions } from '@/lib/compass-planes/canvas/editor-item-layout-context';
import { Fragment, memo, useContext, useEffect, useState } from 'react';
import { ResizableNode } from '../../decorators';
import { ItemContextMenu, type ContextMenuState } from './item-context-menu';
import { useInventoryHandlers } from './use-inventory-handlers';
import { useInventoryPointers } from './use-inventory-pointers';

export const EditInventoryNode = () => {
  const { getComponent } = useContext(WindowEditorContext);
  const id = useEditorItemId();
  const component = id ? getComponent(id) : null;
  const css = useComponentStyles(component);

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
  const { widthStyle: cw, heightStyle: ch } = useComponentCanvasDimensions(component);

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
          height: ch,
          width: cw,
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
  const componentData = getComponentData(component);
  const data = componentData as InventoryComponentData;
  const inventoryDisabled = Boolean(componentData.disabled);

  const gridColor = css.color || '#ccc';
  const bgStyle = getBackgroundStyle(css);
  const gridImage = `
    linear-gradient(to right, ${gridColor} ${css.outlineWidth}px, transparent ${css.outlineWidth}px),
    linear-gradient(to bottom, ${gridColor} ${css.outlineWidth}px, transparent ${css.outlineWidth}px)
  `;

  const cellWidth = (data.cellWidth ?? 1) * 20;
  const cellHeight = (data.cellHeight ?? 1) * 20;
  const { width, height, widthStyle: cw, heightStyle: ch } =
    useComponentCanvasDimensions(component);
  const gridCols = Math.floor(width / cellWidth);
  const gridRows = Math.floor(height / cellHeight);
  const showItemAs = data.showItemAs ?? 'image';
  const showLabelTooltip =
    showItemAs === 'image' && data.showLabelTooltip === true;
  const typeRestriction = data.typeRestriction;
  const categoryRestriction = data.categoryRestriction;

  const inventoryItems = (characterContext?.inventoryItems ?? []).filter(
    (item) => item.componentId === component.id,
  );

  useEffect(() => {
    if (inventoryDisabled) return;
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
    inventoryDisabled,
    typeRestriction,
    categoryRestriction,
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
        role={inventoryDisabled ? undefined : 'button'}
        data-testid='inventory-grid'
        onDoubleClick={inventoryDisabled ? undefined : handleOpenInventory}
        onPointerMove={inventoryDisabled ? undefined : handlePointerMove}
        onPointerUp={inventoryDisabled ? undefined : handlePointerUp}
        style={{
          position: 'relative',
          height: ch,
          width: cw,
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
          const entityLabel = invItem.label?.trim() ? invItem.label.trim() : invItem.title;

          const cellDiv = (
            <div
              data-item-title={invItem.title}
              onDoubleClick={inventoryDisabled ? undefined : (e) => e.stopPropagation()}
              onClick={inventoryDisabled ? undefined : (e) => handleItemClick(e, invItem)}
              onPointerDown={inventoryDisabled ? undefined : (e) => handlePointerDown(e, invItem)}
              tabIndex={inventoryDisabled ? -1 : 0}
              role={inventoryDisabled ? undefined : 'button'}
              aria-label={
                inventoryDisabled ? undefined : `${invItem.title} - drag to move`
              }
              style={{
                position: 'absolute',
                left: pos.left,
                top: pos.top,
                width: 20 * invItem.inventoryWidth,
                height: 20 * invItem.inventoryHeight,
                cursor: inventoryDisabled
                  ? 'default'
                  : isDragging
                    ? 'grabbing'
                    : 'grab',
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

          return showLabelTooltip ? (
            <Tooltip key={invItem.id}>
              <TooltipTrigger asChild>{cellDiv}</TooltipTrigger>
              <TooltipContent side='top' className='max-w-xs'>
                {entityLabel}
              </TooltipContent>
            </Tooltip>
          ) : (
            <Fragment key={invItem.id}>{cellDiv}</Fragment>
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
