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
  const [undoStack, setUndoStack] = useState<Component[][]>([]);
  const [redoStack, setRedoStack] = useState<Component[][]>([]);
  const pendingSnapshotRef = useRef<Component[] | null>(null);
  const pushTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  console.log('undo: ', undoStack.length);
  console.log('redo: ', redoStack.length);

  const actionIsUndoRedo = useRef<boolean>(false);

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

    console.log('snap');

    if (snapshot) {
      setUndoStack((prev) => [...prev, snapshot].slice(-MAX_HISTORY));
      setRedoStack([]);
    }
  }, []);

  const pushUndoSnapshot = useCallback(() => {
    if (actionIsUndoRedo.current) {
      // Don't register action if in the undo/redo buffer
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
    actionIsUndoRedo.current = true;
    console.log('undo!!');
    setUndoStack((prev) => {
      if (prev.length === 0) return prev;
      console.log('set udno stack');
      const snapshot = prev[prev.length - 1];
      const current = deepCopyComponents(componentsRef.current);
      setRedoStack((r) => [...r, current].slice(-MAX_HISTORY));
      queueMicrotask(() => onComponentsRestored(snapshot));
      return prev.slice(0, -1);
    });
  }, [onComponentsRestored]);

  const redo = useCallback(() => {
    if (!onComponentsRestored) return;
    actionIsUndoRedo.current = true;
    console.log('redo!!');
    setRedoStack((prev) => {
      if (prev.length === 0) return prev;
      console.log('set redo stack');
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
