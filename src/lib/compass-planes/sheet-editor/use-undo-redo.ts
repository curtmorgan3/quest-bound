import type { Component } from '@/types';
import { useCallback, useEffect, useRef, useState } from 'react';

const MAX_HISTORY = 50;

function deepCopyComponents(components: Component[]): Component[] {
  return components.map((c) => ({ ...c }));
}

interface UseUndoRedoOptions {
  components: Component[];
  onComponentsRestored?: (components: Component[]) => void;
}

export interface UndoRedoActions {
  pushUndoSnapshot: () => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
}

/**
 * Maintains undo/redo history for component edits. Push a snapshot before each
 * mutation; undo/redo restore full component state via onComponentsRestored.
 */
export const useUndoRedo = ({
  components,
  onComponentsRestored,
}: UseUndoRedoOptions): UndoRedoActions => {
  const componentsRef = useRef(components);
  const [undoStack, setUndoStack] = useState<Component[][]>([]);
  const [redoStack, setRedoStack] = useState<Component[][]>([]);

  useEffect(() => {
    componentsRef.current = components;
  }, [components]);

  const pushUndoSnapshot = useCallback(() => {
    const snapshot = deepCopyComponents(componentsRef.current);
    setUndoStack((prev) => {
      const next = [...prev, snapshot].slice(-MAX_HISTORY);
      return next;
    });
    setRedoStack([]);
  }, []);

  const undo = useCallback(() => {
    if (!onComponentsRestored) return;
    setUndoStack((prev) => {
      if (prev.length === 0) return prev;
      const snapshot = prev[prev.length - 1];
      const current = deepCopyComponents(componentsRef.current);
      setRedoStack((r) => [...r, current].slice(-MAX_HISTORY));
      queueMicrotask(() => onComponentsRestored(snapshot));
      return prev.slice(0, -1);
    });
  }, [onComponentsRestored]);

  const redo = useCallback(() => {
    if (!onComponentsRestored) return;
    setRedoStack((prev) => {
      if (prev.length === 0) return prev;
      const snapshot = prev[prev.length - 1];
      const current = deepCopyComponents(componentsRef.current);
      setUndoStack((u) => [...u, current].slice(-MAX_HISTORY));
      queueMicrotask(() => onComponentsRestored(snapshot));
      return prev.slice(0, -1);
    });
  }, [onComponentsRestored]);

  return {
    pushUndoSnapshot,
    undo,
    redo,
    canUndo: undoStack.length > 0,
    canRedo: redoStack.length > 0,
  };
};
