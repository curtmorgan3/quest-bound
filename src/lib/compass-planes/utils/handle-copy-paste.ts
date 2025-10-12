import {
  clearSelection,
  copyComponents,
  editorState,
  getCopiedComponents,
  getSelectedComponents,
  selectComponents,
} from '../cache';
import { getRelativeMousePosition } from './editor-mouse-listeners';
import { handleComponentCrud } from './handle-component-crud';

export function handlePasteComponents() {
  const copiedComps = [...getCopiedComponents()];
  const pastedComps = [];

  const mousePos = getRelativeMousePosition();

  let leftMostComponent = copiedComps[0];
  for (const comp of copiedComps) {
    if (comp.x < leftMostComponent.x) {
      leftMostComponent = comp;
    }
  }

  for (const component of copiedComps) {
    const offsetX = component.x - leftMostComponent.x;
    const offsetY = component.y - leftMostComponent.y;

    pastedComps.push({
      ...component,
      id: crypto.randomUUID(),
      x: mousePos.x + offsetX,
      y: mousePos.y + offsetY,
    });
  }

  handleComponentCrud.onComponentsCreated(pastedComps);

  clearSelection();
  selectComponents(pastedComps.map((c) => c.id));
}

export function handleCopyComponents() {
  const selectedIds = getSelectedComponents();
  const copiedComps = [];

  for (const id of selectedIds) {
    const comp = editorState.get(id);
    if (comp) {
      copiedComps.push(comp);
    }
  }

  copyComponents(copiedComps);
}
