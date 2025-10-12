import type { Component } from '@/types';
import { Point } from 'pixi.js';
import type { ComponentType } from '../types';

//#region Selection
const selectedComponentIds = new Set<string>();

export function selectComponent(id: string) {
  selectedComponentIds.add(id);
}

export function selectComponents(ids: string[]) {
  for (const id of ids) {
    selectedComponentIds.add(id);
  }
}

export function deselectComponent(id: string) {
  selectedComponentIds.delete(id);
}

export function clearSelection() {
  selectedComponentIds.clear();
}

export function isSelected(id: string) {
  return selectedComponentIds.has(id);
}

export function getSelectedComponents() {
  return Array.from(selectedComponentIds);
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
  } else {
    selectedComponentIds.add(id);
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
