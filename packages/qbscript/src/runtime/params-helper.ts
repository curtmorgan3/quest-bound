export interface ScriptParamsHelper {
  get: (name: string) => any;
}

/**
 * Create a params helper from a plain record.
 * Keys are stored in a trimmed, lower-cased form; lookups are case-insensitive
 * and return null when a name is missing.
 */
export function createParamsHelperFromRecord(
  record: Record<string, any> | null | undefined,
): ScriptParamsHelper {
  const byKey = new Map<string, any>();

  if (record && typeof record === 'object') {
    for (const [rawKey, value] of Object.entries(record)) {
      const trimmed = String(rawKey).trim();
      if (!trimmed) continue;
      const key = trimmed.toLowerCase();
      byKey.set(key, value);
    }
  }

  return {
    get(name: string): any {
      if (name == null) return null;
      const trimmed = String(name).trim();
      if (!trimmed) return null;
      const key = trimmed.toLowerCase();
      return byKey.has(key) ? byKey.get(key) ?? null : null;
    },
  };
}

