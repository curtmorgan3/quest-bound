import type { Component } from '@/types';
import type { Container } from 'pixi.js';
import type { ComponentType } from '..';
import { getCameraPosition, getPlacingType, getZoom, setPlacingType } from '../cache';
import { defaultComponentMap } from '../components/common/defaults';

interface Props {
  backgroundContainer: Container;
  onCreated: (comps: Array<Component>) => void;
}

/**
 * Determines position from background pointer event and type from create component menu selection.
 * Creates a new component from defaults.
 * Passes that back up through onCreated callbacks.
 * New components are added to the DB in CompositeEditor and passed back through to the editorState.
 * setEditorState checks the diff and draws components.
 */
export function handleCreateComponents({ backgroundContainer, onCreated }: Props) {
  backgroundContainer.on('click', (e) => {
    const placingType = getPlacingType();

    if (placingType) {
      const cameraPos = getCameraPosition();
      const zoom = getZoom();
      const adjustedX = (e.globalX + cameraPos.x) * zoom;
      const adjustedY = (e.globalY + cameraPos.y) * zoom;

      const comp = createComponentFromDefault(placingType, adjustedX, adjustedY);
      if (!comp) return;
      onCreated([comp]);
      setPlacingType(null);
    }
  });
}

function createComponentFromDefault(type: ComponentType, x: number, y: number): Component | null {
  const comp = defaultComponentMap.get(type);
  if (!comp) {
    console.error(`Component type ${type} not found in default map`);
    return null;
  }
  comp.id = crypto.randomUUID();
  comp.x = x;
  comp.y = y;

  return comp;
}
