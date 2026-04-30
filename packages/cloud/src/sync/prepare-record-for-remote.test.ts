import { describe, expect, it } from 'vitest';
import {
  prepareRecordForRemote,
  prepareRemoteForLocal,
} from '@/lib/cloud/sync/sync-utils';

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

  it('maps pages `order` to remote `page_order` and omits camelCase `order`', () => {
    const out = prepareRecordForRemote('pages', {
      id: 'p',
      rulesetId: 'r',
      label: 'Stats',
      createdAt: 'x',
      updatedAt: 'y',
      order: '2',
    } as Record<string, unknown>);
    expect(out.order).toBeUndefined();
    expect(out.page_order).toBe(2);
  });

  it('maps nullish pages order to NULL page_order', () => {
    const out = prepareRecordForRemote('pages', {
      id: 'p',
      rulesetId: 'r',
      label: 'Bio',
      createdAt: 'x',
      updatedAt: 'y',
      order: null,
    } as Record<string, unknown>);
    expect(out.page_order).toBeNull();
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

describe('prepareRemoteForLocal', () => {
  it('maps remote page_order to local order for pages', () => {
    const out = prepareRemoteForLocal(
      { id: 'p', page_order: 3, label: 'Spells' } as Record<string, unknown>,
      'pages',
    );
    expect(out.order).toBe(3);
    expect(out.pageOrder).toBeUndefined();
  });

  it('omits local order when remote page_order is null', () => {
    const out = prepareRemoteForLocal(
      { id: 'p', page_order: null, label: 'Notes' } as Record<string, unknown>,
      'pages',
    );
    expect(out.order).toBeUndefined();
  });
});
