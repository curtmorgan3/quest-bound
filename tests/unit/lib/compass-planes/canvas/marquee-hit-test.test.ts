import { describe, expect, it } from 'vitest';

import {
  idsIntersectingMarquee,
  normalizeMarqueeRect,
  rectsIntersect,
} from '@/lib/compass-planes/canvas/marquee-hit-test';

describe('normalizeMarqueeRect', () => {
  it('normalizes negative width/height drags', () => {
    expect(normalizeMarqueeRect(100, 100, 40, 60)).toEqual({
      x: 40,
      y: 60,
      width: 60,
      height: 40,
    });
  });
});

describe('rectsIntersect', () => {
  it('detects overlap', () => {
    const a = { x: 0, y: 0, width: 10, height: 10 };
    const b = { x: 5, y: 5, width: 10, height: 10 };
    expect(rectsIntersect(a, b)).toBe(true);
  });

  it('returns false when separated', () => {
    const a = { x: 0, y: 0, width: 10, height: 10 };
    const b = { x: 20, y: 0, width: 10, height: 10 };
    expect(rectsIntersect(a, b)).toBe(false);
  });

  it('returns false when only edges touch (zero area overlap)', () => {
    const a = { x: 0, y: 0, width: 10, height: 10 };
    const b = { x: 10, y: 0, width: 5, height: 5 };
    expect(rectsIntersect(a, b)).toBe(false);
  });
});

describe('idsIntersectingMarquee', () => {
  it('returns ids for items that intersect the marquee', () => {
    const items = [
      { id: 'a', x: 0, y: 0, width: 20, height: 20 },
      { id: 'b', x: 100, y: 100, width: 10, height: 10 },
    ];
    const marquee = { x: 10, y: 10, width: 50, height: 50 };
    expect(idsIntersectingMarquee(items, marquee)).toEqual(['a']);
  });
});
