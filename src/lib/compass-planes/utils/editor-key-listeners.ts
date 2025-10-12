import { clearSelection, getSelectedComponents, setPlacingType } from '../cache';
import { handleComponentCrud } from './handle-component-crud';
import { handleCopyComponents, handlePasteComponents } from './handle-copy-paste';

const keyMap = new Map<string, string>([
  ['cancel', 'Escape'],
  ['delete', 'Backspace'],
  ['copy', 'c'],
  ['paste', 'v'],
]);

const listeners: Array<(e: KeyboardEvent) => void> = [];

export function clearEditorKeyListeners() {
  for (const listener of listeners) {
    window.removeEventListener('keydown', listener);
  }
}

function registerEvent(trigger: string, cb: () => void, restrictToMeta = false) {
  const listener = (e: KeyboardEvent) => {
    if (e.key === keyMap.get(trigger)) {
      if (restrictToMeta && !e.metaKey) return;
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

  registerEvent('delete', () => {
    const selected = getSelectedComponents();
    handleComponentCrud.onComponentsDeleted(selected);
  });

  registerEvent('copy', handleCopyComponents, true);

  registerEvent('paste', handlePasteComponents, true);
}
