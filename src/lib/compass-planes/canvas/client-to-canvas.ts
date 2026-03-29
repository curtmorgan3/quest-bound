/**
 * Maps pointer coordinates from the viewport into the scroll coordinate space of `container`
 * (the canvas root, e.g. `#base-editor`).
 */
export function clientToCanvas(
  clientX: number,
  clientY: number,
  container: HTMLElement,
): { x: number; y: number } {
  const r = container.getBoundingClientRect();
  return {
    x: clientX - r.left + container.scrollLeft,
    y: clientY - r.top + container.scrollTop,
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
