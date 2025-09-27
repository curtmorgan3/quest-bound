import type { EditorState } from '../types';

let editorState: EditorState;

export function setEditorState(state: EditorState) {
  editorState = state;
}

export { editorState };
