import {
  clearSelection,
  getSelectedComponentsIds,
  redoAction,
  setPlacingType,
  undoAction,
} from '../cache';
import { handleComponentCrud } from './handle-component-crud';
import { handleCopyComponents, handlePasteComponents } from './handle-copy-paste';

const keyMap = new Map<string, string>([
  ['cancel', 'Escape'],
  ['delete', 'Backspace'],
  ['copy', 'c'],
  ['paste', 'v'],
  ['undo', 'z'],
  ['redo', 'z'],
]);

const listeners: Array<(e: KeyboardEvent) => void> = [];

export function clearEditorKeyListeners() {
  for (const listener of listeners) {
    window.removeEventListener('keydown', listener);
  }
}

function registerEvent(
  trigger: string,
  cb: () => void,
  metaBehavior?: 'require' | 'prevent',
  shiftBehavior?: 'require' | 'prevent',
) {
  const listener = (e: KeyboardEvent) => {
    if (e.key === keyMap.get(trigger)) {
      if (metaBehavior === 'require' && !e.metaKey) return;
      if (metaBehavior === 'prevent' && e.metaKey) return;

      if (shiftBehavior === 'require' && !e.shiftKey) return;
      if (shiftBehavior === 'prevent' && e.shiftKey) return;

      cb();
    }
  };

  window.addEventListener('keydown', listener);
  listeners.push(listener);
}

export function addEditorKeyListeners(): void {
  registerEvent('cancel', () => {
    clearSelection();
    setPlacingType(null);
  });

  registerEvent(
    'delete',
    () => {
      const selected = getSelectedComponentsIds();
      handleComponentCrud.onComponentsDeleted(selected);
    },
    'require',
  );

  registerEvent('copy', handleCopyComponents, 'require');
  registerEvent('paste', handlePasteComponents, 'require');

  registerEvent('undo', undoAction, 'require', 'prevent');
  registerEvent('redo', redoAction, 'require', 'require');
}
