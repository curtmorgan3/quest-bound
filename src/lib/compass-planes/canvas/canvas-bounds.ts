/**
 * Keep canvas-space boxes inside a rectangular editor surface (container client rect).
 */

export function clampTopLeftInRect(
  x: number,
  y: number,
  itemWidth: number,
  itemHeight: number,
  containerWidth: number,
  containerHeight: number,
): { x: number; y: number } {
  const w = Math.max(0, itemWidth);
  const h = Math.max(0, itemHeight);
  const cw = Math.max(0, containerWidth);
  const ch = Math.max(0, containerHeight);
  const maxX = Math.max(0, cw - w);
  const maxY = Math.max(0, ch - h);
  return {
    x: Math.min(Math.max(0, x), maxX),
    y: Math.min(Math.max(0, y), maxY),
  };
}

export function clampCanvasPositions(
  positions: { id: string; x: number; y: number }[],
  container: HTMLElement,
  getDimensions: (id: string) => { width: number; height: number },
): { id: string; x: number; y: number }[] {
  const cw = container.clientWidth;
  const ch = container.clientHeight;
  return positions.map((p) => {
    const { width, height } = getDimensions(p.id);
    const { x, y } = clampTopLeftInRect(p.x, p.y, width, height, cw, ch);
    return { ...p, x, y };
  });
}

/** After resize math, keep width/height within the container and the box fully inside. */
export function clampRectInContainer(
  x: number,
  y: number,
  w: number,
  h: number,
  containerWidth: number,
  containerHeight: number,
  minW: number,
  minH: number,
): { x: number; y: number; w: number; h: number } {
  const cw = Math.max(0, containerWidth);
  const ch = Math.max(0, containerHeight);
  const width = Math.max(minW, Math.min(w, cw));
  const height = Math.max(minH, Math.min(h, ch));
  const { x: cx, y: cy } = clampTopLeftInRect(x, y, width, height, cw, ch);
  return { x: cx, y: cy, w: width, h: height };
}
