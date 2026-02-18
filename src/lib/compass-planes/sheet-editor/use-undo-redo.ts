import type { Component } from '@/types';
import { useCallback, useEffect, useRef, useState } from 'react';

const MAX_HISTORY = 50;
const PUSH_DEBOUNCE_MS = 300;

function deepCopyComponents(components: Component[]): Component[] {
  return components.map((c) => ({ ...c }));
}

/**
 * Command that can be executed (do/redo) and undone.
 * snapshotBefore is set when the command only has "before" state (undo stack
 * entry), so we can build the redo command when undoing.
 */
export interface UndoableCommand {
  execute(): void;
  undo(): void;
  snapshotBefore?: Component[];
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
 * Creates a command that restores component state. Used for both undo stack
 * entries (before state only; execute is no-op) and redo stack entries
 * (before + after).
 */
function createRestoreCommand(
  before: Component[],
  after: Component[] | null,
  onRestore: (components: Component[]) => void,
): UndoableCommand {
  const cmd: UndoableCommand = {
    execute() {
      if (after) onRestore(after);
    },
    undo() {
      onRestore(before);
    },
  };
  if (!after) cmd.snapshotBefore = before;
  return cmd;
}

/**
 * Maintains undo/redo history using the command pattern. Push a snapshot
 * before each mutation; the hook stores commands. Undo runs each command's
 * undo(); redo runs its execute(). Snapshots are debounced so rapid updates
 * (e.g. per-pixel drags) produce one entry.
 */
export const useUndoRedo = ({
  components,
  onComponentsRestored,
}: UseUndoRedoOptions): UndoRedoActions => {
  const componentsRef = useRef(components);
  const undoStackRef = useRef<UndoableCommand[]>([]);
  const redoStackRef = useRef<UndoableCommand[]>([]);
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

    if (snapshot && onComponentsRestored) {
      const command = createRestoreCommand(
        snapshot,
        null,
        onComponentsRestored,
      );
      undoStackRef.current = [...undoStackRef.current, command].slice(
        -MAX_HISTORY,
      );
      redoStackRef.current = [];
      triggerRender();
    }
  }, [onComponentsRestored, triggerRender]);

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
    const command = stack[stack.length - 1];
    const snapshotBefore = command.snapshotBefore;
    if (!snapshotBefore) return;
    actionIsUndoRedo.current = true;
    const stateAfter = deepCopyComponents(componentsRef.current);
    undoStackRef.current = stack.slice(0, -1);
    const redoCommand = createRestoreCommand(
      snapshotBefore,
      stateAfter,
      onComponentsRestored,
    );
    redoStackRef.current = [...redoStackRef.current, redoCommand].slice(
      -MAX_HISTORY,
    );
    triggerRender();
    queueMicrotask(() => command.undo());
  }, [onComponentsRestored, triggerRender]);

  const redo = useCallback(() => {
    if (!onComponentsRestored) return;
    const stack = redoStackRef.current;
    if (stack.length === 0) return;
    actionIsUndoRedo.current = true;
    const command = stack[stack.length - 1];
    const stateBefore = deepCopyComponents(componentsRef.current);
    redoStackRef.current = stack.slice(0, -1);
    const undoCommand = createRestoreCommand(
      stateBefore,
      null,
      onComponentsRestored,
    );
    undoStackRef.current = [...undoStackRef.current, undoCommand].slice(
      -MAX_HISTORY,
    );
    triggerRender();
    queueMicrotask(() => command.execute());
  }, [onComponentsRestored, triggerRender]);

  return {
    pushUndoSnapshot,
    undo,
    redo,
    canUndo: undoStackRef.current.length > 0,
    canRedo: redoStackRef.current.length > 0,
  };
};
