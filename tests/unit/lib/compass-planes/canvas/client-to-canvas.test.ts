import { describe, expect, it } from 'vitest';

import {
  clientToCanvas,
  snapPointToGrid,
  snapScalarToGrid,
} from '@/lib/compass-planes/canvas/client-to-canvas';

describe('snapScalarToGrid', () => {
  it('rounds to the nearest grid step', () => {
    expect(snapScalarToGrid(0, 20)).toBe(0);
    expect(snapScalarToGrid(9, 20)).toBe(0);
    expect(snapScalarToGrid(11, 20)).toBe(20);
    expect(snapScalarToGrid(20, 20)).toBe(20);
  });

  it('returns the value when grid size is non-positive', () => {
    expect(snapScalarToGrid(13, 0)).toBe(13);
    expect(snapScalarToGrid(13, -5)).toBe(13);
  });
});

describe('snapPointToGrid', () => {
  it('snaps both axes', () => {
    expect(snapPointToGrid(15, 25, 20)).toEqual({ x: 20, y: 20 });
  });
});

describe('clientToCanvas', () => {
  it('maps client coordinates using bounding rect and scroll offsets', () => {
    const el = document.createElement('div');
    el.getBoundingClientRect = () =>
      ({
        left: 100,
        top: 50,
        right: 400,
        bottom: 350,
        width: 300,
        height: 300,
        x: 100,
        y: 50,
        toJSON: () => ({}),
      }) as DOMRect;
    Object.defineProperty(el, 'scrollLeft', { value: 10, configurable: true });
    Object.defineProperty(el, 'scrollTop', { value: 20, configurable: true });

    expect(clientToCanvas(130, 80, el)).toEqual({ x: 40, y: 50 });
  });
});
