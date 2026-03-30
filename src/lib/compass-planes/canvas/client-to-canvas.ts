/**
 * Maps pointer coordinates from the viewport into the scroll coordinate space of `container`
 * (the canvas root, e.g. `#base-editor`).
 *
 * When the canvas root has `transform: scale(viewScale)` with `transform-origin: 0 0`, pass the
 * same `viewScale` so pointer math matches logical component coordinates.
 */
export function clientToCanvas(
  clientX: number,
  clientY: number,
  container: HTMLElement,
  viewScale = 1,
): { x: number; y: number } {
  const r = container.getBoundingClientRect();
  const s = viewScale > 0 && Number.isFinite(viewScale) ? viewScale : 1;
  return {
    x: (clientX - r.left) / s + container.scrollLeft,
    y: (clientY - r.top) / s + container.scrollTop,
  };
}

export function snapScalarToGrid(value: number, gridSize: number): number {
  if (gridSize <= 0) return value;
  return Math.round(value / gridSize) * gridSize;
}

export function snapPointToGrid(
  x: number,
  y: number,
  gridSize: number,
): { x: number; y: number } {
  return {
    x: snapScalarToGrid(x, gridSize),
    y: snapScalarToGrid(y, gridSize),
  };
}

/**
 * Inverse of `transform: translate(tx, ty) scale(scale)` with `transform-origin: 0 0` on the canvas
 * root, where the canvas sits inside a scrollable viewport whose visible rect is `viewportRect`.
 */
export function clientToCanvasSheetFit(
  clientX: number,
  clientY: number,
  viewportRect: DOMRectReadOnly,
  translateX: number,
  translateY: number,
  scale: number,
  scrollLeft = 0,
  scrollTop = 0,
): { x: number; y: number } {
  const s = scale > 0 && Number.isFinite(scale) ? scale : 1;
  const relX = clientX - viewportRect.left + scrollLeft;
  const relY = clientY - viewportRect.top + scrollTop;
  return {
    x: (relX - translateX) / s,
    y: (relY - translateY) / s,
  };
}
