import type { Component } from '@/types';
import { useCallback, useEffect, useRef, useState } from 'react';

const MAX_HISTORY = 50;
const PUSH_DEBOUNCE_MS = 300;

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
 * Snapshots are debounced so rapid updates (e.g. per-pixel drags) produce one entry.
 */
export const useUndoRedo = ({
  components,
  onComponentsRestored,
}: UseUndoRedoOptions): UndoRedoActions => {
  const componentsRef = useRef(components);
  const undoStackRef = useRef<Component[][]>([]);
  const redoStackRef = useRef<Component[][]>([]);
  const pendingSnapshotRef = useRef<Component[] | null>(null);
  const pushTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const actionIsUndoRedo = useRef<boolean>(false);

  const [, setVersion] = useState(0);
  const triggerRender = useCallback(() => setVersion((v) => v + 1), []);

  useEffect(() => {
    componentsRef.current = components;
  }, [components]);

  useEffect(() => {
    return () => {
      if (pushTimeoutRef.current) clearTimeout(pushTimeoutRef.current);
    };
  }, []);

  const flushPendingPush = useCallback(() => {
    if (pushTimeoutRef.current) {
      clearTimeout(pushTimeoutRef.current);
      pushTimeoutRef.current = null;
    }
    const snapshot = pendingSnapshotRef.current;
    pendingSnapshotRef.current = null;

    if (snapshot) {
      undoStackRef.current = [...undoStackRef.current, snapshot].slice(-MAX_HISTORY);
      redoStackRef.current = [];
      triggerRender();
    }
  }, [triggerRender]);

  const pushUndoSnapshot = useCallback(() => {
    if (actionIsUndoRedo.current) {
      actionIsUndoRedo.current = false;
      return;
    }

    if (pendingSnapshotRef.current === null) {
      pendingSnapshotRef.current = deepCopyComponents(componentsRef.current);
    }
    if (pushTimeoutRef.current) clearTimeout(pushTimeoutRef.current);
    pushTimeoutRef.current = setTimeout(flushPendingPush, PUSH_DEBOUNCE_MS);
  }, [flushPendingPush]);

  const undo = useCallback(() => {
    if (!onComponentsRestored) return;
    const stack = undoStackRef.current;
    if (stack.length === 0) return;
    actionIsUndoRedo.current = true;
    const snapshot = stack[stack.length - 1];
    const current = deepCopyComponents(componentsRef.current);
    undoStackRef.current = stack.slice(0, -1);
    redoStackRef.current = [...redoStackRef.current, current].slice(-MAX_HISTORY);
    triggerRender();
    queueMicrotask(() => onComponentsRestored(snapshot));
  }, [onComponentsRestored, triggerRender]);

  const redo = useCallback(() => {
    if (!onComponentsRestored) return;
    const stack = redoStackRef.current;
    if (stack.length === 0) return;
    actionIsUndoRedo.current = true;
    const snapshot = stack[stack.length - 1];
    const current = deepCopyComponents(componentsRef.current);
    redoStackRef.current = stack.slice(0, -1);
    undoStackRef.current = [...undoStackRef.current, current].slice(-MAX_HISTORY);
    triggerRender();
    queueMicrotask(() => onComponentsRestored(snapshot));
  }, [onComponentsRestored, triggerRender]);

  return {
    pushUndoSnapshot,
    undo,
    redo,
    canUndo: undoStackRef.current.length > 0,
    canRedo: redoStackRef.current.length > 0,
  };
};
