import { db } from '@/stores';
import type { Component } from '@/types';
import { Point } from 'pixi.js';
import type { ComponentType, EditorState } from '../types';
import { handleComponentCrud } from '../utils/handle-component-crud';
import { editorState } from './editor-state';

//#region Selection
const selectedComponentIds = new Set<string>();

export function selectComponent(id: string) {
  selectedComponentIds.add(id);
  db.components.update(id, { selected: true });
}

export function selectComponents(ids: string[]) {
  for (const id of ids) {
    selectedComponentIds.add(id);
  }
  db.components.bulkUpdate(
    ids.map((id) => ({
      key: id,
      changes: {
        selected: true,
      },
    })),
  );
}

export function deselectComponent(id: string) {
  selectedComponentIds.delete(id);
  db.components.update(id, { selected: false });
}

export function clearSelection() {
  db.components.bulkUpdate(
    [...selectedComponentIds].map((id) => ({
      key: id,
      changes: {
        selected: false,
      },
    })),
  );
  selectedComponentIds.clear();
}

export function isSelected(id: string) {
  return selectedComponentIds.has(id);
}

export function getSelectedComponentsIds() {
  return Array.from(selectedComponentIds);
}

export function getSelectedComponents() {
  const ids = getSelectedComponentsIds();
  const components = editorState.values();
  return [...components].filter((c) => ids.includes(c.id));
}

export function getGroupedComponents(groupId: string) {
  const components = editorState.values();
  return [...components].filter((c) => c.groupId === groupId);
}

export function componentsAreSelected() {
  return selectedComponentIds.size > 0;
}

export function otherComponentIsSelected(id: string) {
  return !selectedComponentIds.has(id) && selectedComponentIds.size > 0;
}

export function toggleSelection(id: string) {
  if (selectedComponentIds.has(id)) {
    selectedComponentIds.delete(id);
    db.components.update(id, { selected: false });
  } else {
    selectedComponentIds.add(id);
    db.components.update(id, { selected: true });
  }
}

export { selectedComponentIds };
//#endregion //////////////////////////////

// #region Dragging
const dragStartPosition = new Point();
const dragClickStartPosition = new Point(-1, -1);

export { dragClickStartPosition, dragStartPosition };

const draggedComponentIds = new Set<string>();

export function startDragging(id: string, startPoint: Point) {
  dragStartPosition.copyFrom(startPoint);
  draggedComponentIds.add(id);
}

export function stopDragging(id: string) {
  draggedComponentIds.delete(id);
}

export function isDragging(id: string) {
  return draggedComponentIds.has(id);
}

export function clearDragging() {
  draggedComponentIds.clear();
  dragStartPosition.set(-1, -1);
  dragClickStartPosition.set(-1, -1);
}

export function componentsAreDragging() {
  return draggedComponentIds.size > 0;
}

export function getDraggedComponents() {
  return Array.from(draggedComponentIds);
}

export { draggedComponentIds };
// #endregion //////////////////////////////

// #region Resizing
const resizeMousePosition = new Point();
const resizeStartPosition = new Point();
let resizeCorner: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | null = null;

export { resizeMousePosition, resizeStartPosition };

let resizedComponentId: string | null = null;

export function startResizing(
  id: string,
  corner: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right',
) {
  resizedComponentId = id;
  resizeCorner = corner;
}

export function stopResizing() {
  resizedComponentId = null;
  resizeCorner = null;
}

export function isResizing(id: string) {
  return resizedComponentId === id;
}

export function clearResizing() {
  resizedComponentId = null;
}

export function componentsAreResizing() {
  return resizedComponentId !== null;
}

export function getComponentResizeCorner() {
  return resizeCorner;
}

export function getResizeComponentId() {
  return resizedComponentId;
}

// #endregion //////////////////////////////

// #region Placing
let placingType: ComponentType | null = null;

export const isPlacingType = () => !!placingType;
export const setPlacingType = (type: ComponentType | null) => (placingType = type);
export const getPlacingType = () => placingType;

// #endregion

// #region Copying
let copiedComponents: Array<Component> = [];

export function copyComponents(components: Array<Component>): void {
  copiedComponents = components;
}

export function clearCopiedComponents(): void {
  copiedComponents = [];
}

export function getCopiedComponents(): Array<Component> {
  return copiedComponents;
}
// #endregion

// #region Undo/Redo
type BufferAction = 'create' | 'delete' | 'set';

type UndoRedoBuffer = {
  action: BufferAction;
  state: Array<Component>;
  prevState?: EditorState;
};

const undoBuffer: Array<UndoRedoBuffer> = [];
const redoBuffer: Array<UndoRedoBuffer> = [];

export function addToUndoBuffer(buffer: UndoRedoBuffer) {
  if (undoBuffer.length >= 100) {
    undoBuffer.shift();
  }
  undoBuffer.push(buffer);
}

export function undoAction() {
  const lastAction = undoBuffer.pop();
  if (!lastAction) return;
  redoBuffer.push(lastAction);

  switch (lastAction.action) {
    case 'create':
      //delete component
      handleComponentCrud.onComponentsDeleted(lastAction.state.map((c) => c.id));
      break;
    case 'delete':
      //create component
      handleComponentCrud.onComponentsCreated(lastAction.state);
      break;
    case 'set':
      // reset component state
      handleComponentCrud.onComponentsUpdated(lastAction.state);
      break;
  }
}

export function redoAction() {
  const lastAction = redoBuffer.pop();
  if (!lastAction) return;

  switch (lastAction.action) {
    case 'create':
      //create component
      handleComponentCrud.onComponentsCreated(lastAction.state);
      break;
    case 'delete':
      //delete component
      handleComponentCrud.onComponentsDeleted(lastAction.state.map((c) => c.id));
      break;
    case 'set':
      // reset component state
      handleComponentCrud.onComponentsUpdated(
        lastAction.state.map((c) => {
          const prevState = lastAction.prevState?.get(c.id);
          return prevState ?? c;
        }),
      );
      break;
  }
  undoBuffer.push(lastAction);
}

// #endregion
