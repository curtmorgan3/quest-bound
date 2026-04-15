import type { EntityCustomPropertyDef } from '@/types';

export function parseEntityCustomPropertiesJson(
  raw: string | undefined | null,
): EntityCustomPropertyDef[] {
  if (raw == null || raw.trim() === '') return [];
  try {
    const v = JSON.parse(raw) as unknown;
    if (!Array.isArray(v)) return [];
    const out: EntityCustomPropertyDef[] = [];
    for (const el of v) {
      if (!el || typeof el !== 'object') continue;
      const o = el as Record<string, unknown>;
      const name = typeof o.name === 'string' ? o.name.trim() : '';
      if (!name) continue;
      const type =
        o.type === 'number' || o.type === 'boolean' || o.type === 'string' ? o.type : 'string';
      let defaultValue: string | number | boolean =
        type === 'number' ? 0 : type === 'boolean' ? false : '';
      if (type === 'number') {
        if (typeof o.defaultValue === 'number' && Number.isFinite(o.defaultValue)) {
          defaultValue = o.defaultValue;
        } else if (o.defaultValue != null && o.defaultValue !== '') {
          const n = Number(o.defaultValue);
          defaultValue = Number.isFinite(n) ? n : 0;
        }
      } else if (type === 'boolean') {
        defaultValue = Boolean(o.defaultValue);
      } else {
        defaultValue = o.defaultValue != null ? String(o.defaultValue) : '';
      }
      const rawId = typeof o.id === 'string' ? o.id.trim() : '';
      const id = rawId || `legacy:${out.length}:${name}`;
      out.push({ id, name, type, defaultValue });
    }
    return out;
  } catch {
    return [];
  }
}

/** Resolve a custom property by stable id from ruleset attribute JSON, then character attribute snapshot. */
export function findEntityCustomPropertyDefById(
  propertyId: string,
  ...customPropertyJsonSources: (string | null | undefined)[]
): EntityCustomPropertyDef | null {
  for (const raw of customPropertyJsonSources) {
    const list = parseEntityCustomPropertiesJson(raw);
    const hit = list.find((p) => p.id === propertyId);
    if (hit) return hit;
  }
  return null;
}
