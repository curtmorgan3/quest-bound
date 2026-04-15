/**
 * Matches the sheet canvas editor: Shift or platform selection modifier (⌘ on Mac, Ctrl elsewhere)
 * extends the current selection instead of replacing it.
 */
export type EditorSelectionPointerModifiers = {
  shiftKey: boolean;
  metaKey: boolean;
  ctrlKey: boolean;
};

export function isAdditiveEditorSelection(m: EditorSelectionPointerModifiers): boolean {
  return m.shiftKey || m.metaKey || m.ctrlKey;
}
