import { describe, expect, it } from 'vitest';
import { syncRecordsDeepEqual } from '@/lib/cloud/sync/sync-conflict-equality';

describe('syncRecordsDeepEqual', () => {
  it('treats key order as irrelevant', () => {
    expect(
      syncRecordsDeepEqual(
        { id: 'a', title: 'x', nested: { z: 1, y: 2 } },
        { title: 'x', id: 'a', nested: { y: 2, z: 1 } },
      ),
    ).toBe(true);
  });

  it('detects value differences', () => {
    expect(syncRecordsDeepEqual({ a: 1 }, { a: 2 })).toBe(false);
  });

  it('normalizes undefined to null for comparison', () => {
    expect(syncRecordsDeepEqual({ a: undefined as unknown as null }, { a: null })).toBe(true);
  });
});
