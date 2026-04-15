export type CanvasAxisRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type SelectableCanvasItem = CanvasAxisRect & { id: string };

/** Normalizes a drag rectangle so x/y is the top-left and width/height are non-negative. */
export function normalizeMarqueeRect(
  ax: number,
  ay: number,
  bx: number,
  by: number,
): CanvasAxisRect {
  const x = Math.min(ax, bx);
  const y = Math.min(ay, by);
  return {
    x,
    y,
    width: Math.abs(bx - ax),
    height: Math.abs(by - ay),
  };
}

export function rectsIntersect(a: CanvasAxisRect, b: CanvasAxisRect): boolean {
  return !(
    a.x + a.width <= b.x ||
    b.x + b.width <= a.x ||
    a.y + a.height <= b.y ||
    b.y + b.height <= a.y
  );
}

export function idsIntersectingMarquee(
  items: SelectableCanvasItem[],
  marquee: CanvasAxisRect,
): string[] {
  return items.filter((item) => rectsIntersect(item, marquee)).map((item) => item.id);
}
