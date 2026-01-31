import { getComponentData, getComponentStyles } from '@/lib/compass-planes/utils';
import { CharacterContext, WindowEditorContext } from '@/stores';
import type { Component, InventoryComponentData } from '@/types';
import { useNodeId } from '@xyflow/react';
import { useContext } from 'react';
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

export const ViewInventoryNode = ({ component }: { component: Component }) => {
  const characterContext = useContext(CharacterContext);

  const css = getComponentStyles(component);
  const data = getComponentData(component) as InventoryComponentData;
  const gridColor = css.color || '#ccc';

  const cellWidth = (data.cellWidth ?? 1) * 20;
  const cellHeight = (data.cellHeight ?? 1) * 20;

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

  return (
    <div
      onClick={handleOpenInventory}
      style={{
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
      }}
    />
  );
};
