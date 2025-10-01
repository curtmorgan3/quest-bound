import type { EditorComponent, EditorState } from '../types';

let editorState: EditorState;

export function setEditorState(state: EditorState) {
  editorState = state;
}

export function getComponentState(id: string) {
  const state = editorState.get(id);
  if (!state) {
    console.warn(`Component with id ${id} not found in state`);
  }
  return state;
}

export function setComponetState(id: string, state: Partial<EditorComponent>) {
  const existing = editorState.get(id);
  if (existing) {
    editorState.set(id, { ...existing, ...state });
  }
}

export function getAllComponents() {
  return Array.from(editorState.values());
}

export { editorState };
