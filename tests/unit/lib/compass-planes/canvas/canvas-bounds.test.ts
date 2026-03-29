import {
  clampCanvasPositions,
  clampRectInContainer,
  clampTopLeftInRect,
} from '@/lib/compass-planes/canvas/canvas-bounds';
import { describe, expect, it } from 'vitest';

describe('clampTopLeftInRect', () => {
  it('clamps negative coordinates to zero', () => {
    expect(clampTopLeftInRect(-10, -5, 100, 50, 400, 300)).toEqual({ x: 0, y: 0 });
  });

  it('clamps bottom-right so the box stays inside', () => {
    expect(clampTopLeftInRect(900, 800, 100, 50, 400, 300)).toEqual({ x: 300, y: 250 });
  });
});

describe('clampCanvasPositions', () => {
  it('clamps each id using getDimensions', () => {
    const container = {
      clientWidth: 200,
      clientHeight: 100,
    } as HTMLElement;
    const out = clampCanvasPositions(
      [
        { id: 'a', x: -1, y: 0 },
        { id: 'b', x: 0, y: 200 },
      ],
      container,
      (id) => (id === 'a' ? { width: 50, height: 20 } : { width: 40, height: 30 }),
    );
    expect(out).toEqual([
      { id: 'a', x: 0, y: 0 },
      { id: 'b', x: 0, y: 70 },
    ]);
  });
});

describe('clampRectInContainer', () => {
  it('caps oversized width/height to the container', () => {
    expect(clampRectInContainer(5, 5, 800, 600, 200, 150, 10, 10)).toEqual({
      x: 0,
      y: 0,
      w: 200,
      h: 150,
    });
  });

  it('keeps position when the rect already fits', () => {
    expect(clampRectInContainer(12, 20, 100, 80, 500, 400, 10, 10)).toEqual({
      x: 12,
      y: 20,
      w: 100,
      h: 80,
    });
  });

  it('pulls top-left back when overflowing past the right/bottom edge', () => {
    expect(clampRectInContainer(180, 120, 80, 60, 200, 150, 10, 10)).toEqual({
      x: 120,
      y: 90,
      w: 80,
      h: 60,
    });
  });
});
