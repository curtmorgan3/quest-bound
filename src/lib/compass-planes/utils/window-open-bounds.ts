import {
  buildEffectiveLayoutMap,
  componentByIdMap,
  worldTopLeftWithEffective,
} from '@/lib/compass-planes/sheet-editor/component-world-geometry';
import { db } from '@/stores';
import type { Component } from '@/types';

const DEFAULT_W = 400;
const DEFAULT_H = 300;
const MIN_DS = 0.25;
const MAX_DS = 3;

/** Unscaled content width/height from component layout (matches `WindowNode` bounds). */
export function computeWindowContentUnscaledSize(components: Component[]): {
  width: number;
  height: number;
} {
  if (components.length === 0) {
    return { width: DEFAULT_W, height: DEFAULT_H };
  }
  const byId = componentByIdMap(components);
  const effectiveLayout = buildEffectiveLayoutMap(components, {}, null);
  let minX = Infinity;
  let minY = Infinity;
  let maxR = -Infinity;
  let maxB = -Infinity;
  for (const c of components) {
    const eff = effectiveLayout.get(c.id);
    if (!eff) continue;
    const tl = worldTopLeftWithEffective(c, byId, effectiveLayout);
    minX = Math.min(minX, tl.x);
    minY = Math.min(minY, tl.y);
    maxR = Math.max(maxR, tl.x + eff.width);
    maxB = Math.max(maxB, tl.y + eff.height);
  }
  if (!Number.isFinite(minX)) {
    return { width: DEFAULT_W, height: DEFAULT_H };
  }
  return {
    width: Math.max(0, maxR - minX),
    height: Math.max(0, maxB - minY),
  };
}

/**
 * Pixel size the window will occupy on the sheet canvas (content bounds × template displayScale).
 */
export async function getChildWindowCanvasContentSize(
  childWindowId: string,
  sheetTemplatePageId: string | null | undefined,
): Promise<{ width: number; height: number }> {
  const components = (await db.components.where('windowId').equals(childWindowId).toArray()) as Component[];
  let displayScale = 1;
  if (sheetTemplatePageId) {
    const rows = await db.rulesetWindows.where('pageId').equals(sheetTemplatePageId).toArray();
    const rw = rows.find((r) => r.windowId === childWindowId);
    if (rw?.displayScale != null && Number.isFinite(rw.displayScale)) {
      displayScale = Math.min(MAX_DS, Math.max(MIN_DS, rw.displayScale));
    }
  }
  const { width, height } = computeWindowContentUnscaledSize(components);
  return { width: width * displayScale, height: height * displayScale };
}
