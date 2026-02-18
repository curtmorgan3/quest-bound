import type { ComponentUpdate } from '@/lib/compass-api';
import { useRef } from 'react';
import { editorEmitter } from './editor-emitter';

type ExternalComponentChangeEvent = {
  updates: ComponentUpdate[];
};

type PartialNodeUpdate = {
  id: string;
  x?: number;
  y?: number;
  z?: number;
  selected?: boolean;
};

export type ExternalComponentChangeCallback = Map<string, PartialNodeUpdate>;

export const COMPONENTS_POSITION_CHANGE_EVENT = 'component-position-change';

type EventCallback = (updateMap: ExternalComponentChangeCallback) => void;

/**
 * Fires when a component changes outside the context of react-flow in a way that should force
 * the nodes to rerender, e.g. component is created, position changes from the edit panel or keyboard shortcuts.
 */
export const useSubscribeExteriorComponentChanges = (callback: EventCallback) => {
  const subscribed = useRef<boolean>(false);

  if (!subscribed.current) {
    subscribed.current = true;
    editorEmitter.on(COMPONENTS_POSITION_CHANGE_EVENT, (details: ExternalComponentChangeEvent) => {
      const { updates } = details;
      const updateMap = new Map<string, PartialNodeUpdate>();

      updates.forEach((update) => {
        const node: PartialNodeUpdate = {
          id: update.id,
          selected: update.selected,
          x: update.x,
          y: update.y,
          z: update.z,
        };

        updateMap.set(update.id, node);
      });

      callback(updateMap);
    });
  }
};

export function fireExternalComponentChangeEvent(details: ExternalComponentChangeEvent) {
  editorEmitter.emit(COMPONENTS_POSITION_CHANGE_EVENT, details);
}
