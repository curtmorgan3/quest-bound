import {
  clearSelection,
  getSelectedComponents,
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
  ['group', 'g'],
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

      e.preventDefault();
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

  registerEvent(
    'group',
    () => {
      const selectedComponents = getSelectedComponents();
      const groupIds = new Set(selectedComponents.map((c) => c.groupId).filter(Boolean));

      // If all components grouped together, ungroup
      // Otherwise, multiple groups selected, group together

      const newGroupId = crypto.randomUUID();

      handleComponentCrud.onComponentsUpdated(
        selectedComponents.map((c) => ({
          ...c,
          groupId: groupIds.size === 1 ? null : newGroupId,
        })),
      );
    },
    'require',
  );
}
