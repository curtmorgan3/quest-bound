import type { Coordinates } from '@/types';
import { useViewport } from '@xyflow/react';
import { useMemo } from 'react';
import type { EditorMenuOption } from '../nodes/node-types';
import { ContextMenu } from './context-menu';

type FlowContextMenuProps = {
  isOpen: boolean;
  onClose: () => void;
  clientX: number;
  clientY: number;
  options: EditorMenuOption[];
  onSelect: (option: EditorMenuOption, coordinates: Coordinates) => void;
};

/**
 * Bridges React Flow `useViewport()` into {@link ContextMenu} coordinates (must render under `ReactFlow`).
 */
export function FlowContextMenu({
  isOpen,
  onClose,
  clientX,
  clientY,
  options,
  onSelect,
}: FlowContextMenuProps) {
  const { x: viewportX, y: viewportY } = useViewport();
  const sidebarCollapsed = localStorage.getItem('qb.sidebarCollapsed') === 'true';
  const sidebarOffset = sidebarCollapsed ? 47 : 255;

  const addComponentCoordinates = useMemo((): Coordinates => {
    const x = clientX - sidebarOffset;
    return {
      x: x - viewportX,
      y: clientY - viewportY,
    };
  }, [clientX, clientY, viewportX, viewportY, sidebarOffset]);

  return (
    <ContextMenu
      isOpen={isOpen}
      onClose={onClose}
      x={clientX}
      y={clientY}
      options={options}
      onSelect={onSelect}
      addComponentCoordinates={addComponentCoordinates}
    />
  );
}
