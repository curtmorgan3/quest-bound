import { clearSelection, setPlacingType } from '../cache';

const keyMap = new Map<string, string>([['cancel', 'Escape']]);

const listeners: Array<(e: KeyboardEvent) => void> = [];

export function clearEditorListeners() {
  for (const listener of listeners) {
    window.removeEventListener('keydown', listener);
  }
}

function registerEvent(trigger: string, cb: () => void) {
  const listener = (e: KeyboardEvent) => {
    if (e.key === keyMap.get(trigger)) {
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
}
