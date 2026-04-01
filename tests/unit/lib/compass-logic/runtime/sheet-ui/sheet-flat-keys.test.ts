import { ComponentTypes } from '@/lib/compass-planes/nodes/node-types';
import { classifyFlatKey } from '@/lib/compass-logic/runtime/sheet-ui/sheet-flat-keys';
import type { Component } from '@/types';
import { describe, expect, it } from 'vitest';

const baseRow = {
  type: ComponentTypes.TEXT,
} as Component;

const inputRow = {
  type: ComponentTypes.INPUT,
} as Component;

describe('classifyFlatKey', () => {
  it('classifies layout keys', () => {
    expect(classifyFlatKey('x', baseRow)).toBe('layout');
    expect(classifyFlatKey('width', baseRow)).toBe('layout');
  });

  it('ignores node kind type on non-input', () => {
    expect(classifyFlatKey('type', baseRow)).toBe('ignore');
  });

  it('maps type to data for input components', () => {
    expect(classifyFlatKey('type', inputRow)).toBe('data');
  });

  it('ignores window reserved key', () => {
    expect(classifyFlatKey('window', baseRow)).toBe('ignore');
  });

  it('classifies known style keys', () => {
    expect(classifyFlatKey('opacity', baseRow)).toBe('style');
    expect(classifyFlatKey('fontSize', baseRow)).toBe('style');
  });

  it('defaults unknown keys to data', () => {
    expect(classifyFlatKey('referenceLabel', baseRow)).toBe('data');
    expect(classifyFlatKey('value', baseRow)).toBe('data');
  });
});
