import type { ChildWindowAnchor, ChildWindowPlacementMode } from '@/types';

const DEFAULT_CHILD_W = 320;
const DEFAULT_CHILD_H = 240;

/** Gap between the clicked component and the opened child window (relative placement only). */
const RELATIVE_OPEN_BUFFER_PX = 8;

/** Point on a rectangle (origin top-left) for the given anchor, in local coordinates. */
function anchorOffsetInRect(
  anchor: Exclude<ChildWindowAnchor, 'positioned'>,
  width: number,
  height: number,
): { ox: number; oy: number } {
  const cx = width / 2;
  const cy = height / 2;
  switch (anchor) {
    case 'topLeft':
      return { ox: 0, oy: 0 };
    case 'topCenter':
      return { ox: cx, oy: 0 };
    case 'topRight':
      return { ox: width, oy: 0 };
    case 'leftCenter':
      return { ox: 0, oy: cy };
    case 'center':
      return { ox: cx, oy: cy };
    case 'rightCenter':
      return { ox: width, oy: cy };
    case 'bottomLeft':
      return { ox: 0, oy: height };
    case 'bottomCenter':
      return { ox: cx, oy: height };
    case 'bottomRight':
      return { ox: width, oy: height };
    default:
      return { ox: 0, oy: 0 };
  }
}

/**
 * For relative placement, the named anchor is on the **source** rect (clicked component); the
 * **opposite** anchor on the child window meets that point (e.g. Top Left → child bottom-right
 * touches component top-left).
 */
function oppositeAnchorForRelative(
  anchor: Exclude<ChildWindowAnchor, 'positioned'>,
): Exclude<ChildWindowAnchor, 'positioned'> {
  switch (anchor) {
    case 'topLeft':
      return 'bottomRight';
    case 'topCenter':
      return 'bottomCenter';
    case 'topRight':
      return 'bottomLeft';
    case 'leftCenter':
      return 'rightCenter';
    case 'center':
      return 'center';
    case 'rightCenter':
      return 'leftCenter';
    case 'bottomLeft':
      return 'topRight';
    case 'bottomCenter':
      return 'topCenter';
    case 'bottomRight':
      return 'topLeft';
    default:
      return 'center';
  }
}

/**
 * Shifts the touch point away from the component interior so the child window sits with a small gap.
 */
function relativeBufferOffset(
  anchor: Exclude<ChildWindowAnchor, 'positioned'>,
): { dx: number; dy: number } {
  const b = RELATIVE_OPEN_BUFFER_PX;
  switch (anchor) {
    case 'topLeft':
      return { dx: -b, dy: -b };
    case 'topCenter':
      return { dx: 0, dy: -b };
    case 'topRight':
      return { dx: b, dy: -b };
    case 'leftCenter':
      return { dx: -b, dy: 0 };
    case 'center':
      return { dx: 0, dy: 0 };
    case 'rightCenter':
      return { dx: b, dy: 0 };
    case 'bottomLeft':
      return { dx: -b, dy: b };
    case 'bottomCenter':
      return { dx: 0, dy: b };
    case 'bottomRight':
      return { dx: b, dy: b };
    default:
      return { dx: 0, dy: 0 };
  }
}

export function resolveChildWindowCanvasPosition(opts: {
  mode: ChildWindowPlacementMode;
  anchor: ChildWindowAnchor;
  explicitX: number;
  explicitY: number;
  parentRect: { x: number; y: number; width: number; height: number };
  childWidth?: number;
  childHeight?: number;
  /** Used when mode is `fixed` and anchor is not `positioned`. */
  canvasRect?: { x: number; y: number; width: number; height: number } | null;
  /**
   * When mode is `relative`, placement is relative to this rect (clicked component on canvas).
   * If missing, falls back to `parentRect` with the same opposite-anchor rules.
   */
  relativeComponentRect?: { x: number; y: number; width: number; height: number } | null;
}): { x: number; y: number } {
  const cw = opts.childWidth ?? DEFAULT_CHILD_W;
  const ch = opts.childHeight ?? DEFAULT_CHILD_H;

  if (opts.anchor === 'positioned') {
    return { x: opts.explicitX, y: opts.explicitY };
  }

  if (opts.mode === 'relative') {
    const frame = opts.relativeComponentRect ?? {
      x: opts.parentRect.x,
      y: opts.parentRect.y,
      width: Math.max(1, opts.parentRect.width),
      height: Math.max(1, opts.parentRect.height),
    };
    const fp = anchorOffsetInRect(opts.anchor, frame.width, frame.height);
    const buf = relativeBufferOffset(opts.anchor);
    const touch = { x: frame.x + fp.ox + buf.dx, y: frame.y + fp.oy + buf.dy };
    const childAnchor = oppositeAnchorForRelative(opts.anchor);
    const cp = anchorOffsetInRect(childAnchor, cw, ch);
    return { x: touch.x - cp.ox, y: touch.y - cp.oy };
  }

  const useCanvas =
    opts.mode === 'fixed' &&
    opts.canvasRect != null &&
    opts.canvasRect.width > 0 &&
    opts.canvasRect.height > 0;

  const frame = useCanvas
    ? opts.canvasRect!
    : {
        x: opts.parentRect.x,
        y: opts.parentRect.y,
        width: Math.max(1, opts.parentRect.width),
        height: Math.max(1, opts.parentRect.height),
      };

  const fp = anchorOffsetInRect(opts.anchor, frame.width, frame.height);
  const cp = anchorOffsetInRect(opts.anchor, cw, ch);

  return {
    x: frame.x + fp.ox - cp.ox,
    y: frame.y + fp.oy - cp.oy,
  };
}
