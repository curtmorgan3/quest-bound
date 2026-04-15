import { splitRowsIntoBulkPutBatchesApprox } from '@/lib/campaign-play/realtime/campaign-realtime-batch';
import { describe, expect, it } from 'vitest';

describe('splitRowsIntoBulkPutBatchesApprox', () => {
  it('returns empty for no rows', () => {
    expect(splitRowsIntoBulkPutBatchesApprox('t', [], 100)).toEqual([]);
  });

  it('keeps a single row in one batch', () => {
    const rows = [{ id: '1' }];
    expect(splitRowsIntoBulkPutBatchesApprox('inventoryItems', rows, 10_000)).toEqual([
      { table: 'inventoryItems', rows },
    ]);
  });

  it('splits when rows exceed max bytes', () => {
    const fat = { id: 'x', data: 'y'.repeat(500) };
    const batches = splitRowsIntoBulkPutBatchesApprox('t', [fat, fat, fat], 400);
    expect(batches.length).toBeGreaterThan(1);
    expect(batches.reduce((n, b) => n + b.rows.length, 0)).toBe(3);
  });
});
