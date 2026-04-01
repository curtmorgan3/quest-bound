import type { Component } from '@/types';

/**
 * For editor canvas nodes, `getComponent` may return a preview clone and then the same Dexie row
 * reference again for base. Referential equality would skip re-renders; compare serialized payload.
 *
 * `sheetHoverLayerActive` is set on sheet viewer merge clones when pointer-hover layer applies;
 * it must participate in equality or memo can skip re-renders while merged `data`/`style`
 * strings are unchanged (then stale inline styles remain after hover ends).
 */
export function editorNodeComponentVisualEqual(a: Component, b: Component): boolean {
  const hoverA = a.sheetHoverLayerActive === true;
  const hoverB = b.sheetHoverLayerActive === true;
  if (hoverA !== hoverB) return false;
  return a.id === b.id && a.data === b.data && a.style === b.style;
}
