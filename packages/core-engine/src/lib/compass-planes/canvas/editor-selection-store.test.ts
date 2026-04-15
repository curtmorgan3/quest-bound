import { describe, expect, it } from 'vitest';

import { createEditorSelectionStore } from '@/lib/compass-planes/canvas/editor-selection-store';

describe('createEditorSelectionStore', () => {
  it('replaces selection on a plain click', () => {
    const s = createEditorSelectionStore();
    s.getState().applyPointerClick('a', { shiftKey: false, metaKey: false, ctrlKey: false });
    expect([...s.getState().selectedIds]).toEqual(['a']);
    s.getState().applyPointerClick('b', { shiftKey: false, metaKey: false, ctrlKey: false });
    expect([...s.getState().selectedIds]).toEqual(['b']);
  });

  it('adds and toggles with Shift', () => {
    const s = createEditorSelectionStore();
    s.getState().applyPointerClick('a', { shiftKey: false, metaKey: false, ctrlKey: false });
    s.getState().applyPointerClick('b', { shiftKey: true, metaKey: false, ctrlKey: false });
    expect(new Set(s.getState().selectedIds)).toEqual(new Set(['a', 'b']));
    s.getState().applyPointerClick('a', { shiftKey: true, metaKey: false, ctrlKey: false });
    expect(new Set(s.getState().selectedIds)).toEqual(new Set(['b']));
  });

  it('replaces on marquee without modifiers', () => {
    const s = createEditorSelectionStore();
    s.getState().setSelection(['x']);
    s.getState().applyMarquee(['a', 'b'], { shiftKey: false, metaKey: false, ctrlKey: false });
    expect(new Set(s.getState().selectedIds)).toEqual(new Set(['a', 'b']));
  });

  it('unions marquee hits with modifiers', () => {
    const s = createEditorSelectionStore();
    s.getState().setSelection(['x']);
    s.getState().applyMarquee(['a', 'b'], { shiftKey: false, metaKey: false, ctrlKey: true });
    expect(new Set(s.getState().selectedIds)).toEqual(new Set(['x', 'a', 'b']));
  });
});
