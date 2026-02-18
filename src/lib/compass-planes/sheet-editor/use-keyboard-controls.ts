import { type ComponentUpdate } from '@/lib/compass-api';
import type { Component } from '@/types';
import { useKeyListeners } from '@/utils';
import { useState } from 'react';
import { fireExternalComponentChangeEvent } from '../utils';

interface UseKeyboardControls {
  components: Component[];
  onComponentsUpdated: (updates: Array<ComponentUpdate>) => void;
  onComponentsCreated: (updates: Array<Partial<Component>>) => void;
  onComponentsDeleted: (ids: Array<string>) => void;
  undo: () => void;
  redo: () => void;
}

export const useKeyboardControls = ({
  components,
  onComponentsCreated,
  onComponentsDeleted,
  onComponentsUpdated,
  undo,
  redo,
}: UseKeyboardControls) => {
  const selectedComponents = components.filter((c) => c.selected);
  const [copiedComponents, setCopiedComponents] = useState<Component[]>([]);

  const copy = (shouldCut?: boolean) => {
    setCopiedComponents([...selectedComponents]);
    if (shouldCut) {
      onComponentsDeleted(selectedComponents.map((c) => c.id));
    }
  };

  const paste = () => {
    onComponentsCreated(
      copiedComponents.map((c) => ({
        ...c,
        id: undefined,
        x: c.x + 20,
        y: c.y + 20,
      })),
    );
    onComponentsUpdated(
      selectedComponents.map((c) => ({
        id: c.id,
        selected: false,
      })),
    );

    fireExternalComponentChangeEvent({
      updates: selectedComponents.map((component) => ({
        id: component.id,
        selected: false,
      })),
    });
  };

  const toggleLock = () => {
    onComponentsUpdated(
      selectedComponents.map((c) => ({
        id: c.id,
        locked: !c.locked,
      })),
    );
  };

  useKeyListeners({
    onKeyDown: (e) => {
      const isShortcut = (e.meta || e.control) && ['z', 'y', 'c', 'x', 'v'].includes(e.key);
      const isLockShortcut = (e.meta || e.control) && e.shift && e.key === 'l';
      if (isShortcut || isLockShortcut) {
        e.preventDefault?.();
      }
      if (e.key === 'z' && (e.meta || e.control)) {
        if (e.shift) {
          redo();
        } else {
          undo();
        }
      } else if (e.key === 'y' && (e.meta || e.control)) {
        redo();
      } else if (e.key === 'c' && (e.meta || e.control)) {
        copy();
      } else if (e.key === 'x' && (e.meta || e.control)) {
        copy(true);
      } else if (e.key === 'v' && (e.meta || e.control)) {
        paste();
      } else if (e.key === 'l' && (e.meta || e.control) && e.shift) {
        toggleLock();
      }
    },
  });
};
