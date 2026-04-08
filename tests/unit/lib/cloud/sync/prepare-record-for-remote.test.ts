import { describe, expect, it } from 'vitest';
import { prepareRecordForRemote } from '@/lib/cloud/sync/sync-utils';

describe('prepareRecordForRemote', () => {
  it('maps empty min/max to null for attributes (avoids Postgres float8 "" error)', () => {
    const out = prepareRecordForRemote('attributes', {
      id: 'a',
      rulesetId: 'r',
      title: 't',
      description: 'd',
      type: 'number',
      createdAt: 'x',
      updatedAt: 'y',
      min: '',
      max: '  ',
    } as Record<string, unknown>);
    expect(out.min).toBeNull();
    expect(out.max).toBeNull();
  });

  it('maps empty min/max to null for characterAttributes', () => {
    const out = prepareRecordForRemote('characterAttributes', {
      id: 'ca',
      characterId: 'c',
      attributeId: 'attr',
      value: '0',
      rulesetId: 'r',
      title: 't',
      description: 'd',
      type: 'number',
      createdAt: 'x',
      updatedAt: 'y',
      min: '',
    } as Record<string, unknown>);
    expect(out.min).toBeNull();
  });

  it('coerces numeric strings and normalizes required component floats', () => {
    const out = prepareRecordForRemote('components', {
      id: 'c',
      rulesetId: 'r',
      windowId: 'w',
      type: 'text',
      x: '',
      y: '10',
      z: 0,
      height: 1,
      width: 2,
      rotation: '',
      data: '{}',
      style: '{}',
      createdAt: 'x',
      updatedAt: 'y',
    } as Record<string, unknown>);
    expect(out.x).toBe(0);
    expect(out.y).toBe(10);
    expect(out.rotation).toBe(0);
  });
});
