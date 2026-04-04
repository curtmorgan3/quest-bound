/**
 * Stable deep equality for cloud sync conflict detection (plain objects, arrays, primitives).
 */

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function sortedEntries(obj: Record<string, unknown>): [string, unknown][] {
  return Object.keys(obj)
    .sort()
    .map((k) => [k, obj[k]] as [string, unknown]);
}

function normalizeValue(v: unknown): unknown {
  if (v === undefined) return null;
  if (Array.isArray(v)) return v.map(normalizeValue);
  if (isPlainObject(v)) {
    const out: Record<string, unknown> = {};
    for (const [k, val] of sortedEntries(v)) {
      out[k] = normalizeValue(val);
    }
    return out;
  }
  return v;
}

/** True when merge candidates represent the same logical row for conflict purposes. */
export function syncRecordsDeepEqual(
  a: Record<string, unknown>,
  b: Record<string, unknown>,
): boolean {
  return JSON.stringify(normalizeValue(a)) === JSON.stringify(normalizeValue(b));
}
