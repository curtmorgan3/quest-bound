import { Point } from 'pixi.js';

const selectedComponentIds = new Set<string>();

export function selectComponent(id: string) {
  selectedComponentIds.add(id);
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

const dragMousePosition = new Point();
const dragStartPosition = new Point();

export { dragMousePosition, dragStartPosition };

const draggedComponentIds = new Set<string>();

export function startDragging(id: string) {
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
}

export function componentsAreDragging() {
  return draggedComponentIds.size > 0;
}

export function getDraggedComponents() {
  return Array.from(draggedComponentIds);
}

export { draggedComponentIds };
