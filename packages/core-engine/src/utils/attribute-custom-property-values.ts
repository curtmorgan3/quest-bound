import { parseEntityCustomPropertiesJson } from '@/utils/parse-entity-custom-properties-json';

/** Initial per-character values from ruleset attribute custom property schema (defaults). */
export function initialAttributeCustomPropertyValuesFromSchemaJson(
  json: string | null | undefined,
): Record<string, string | number | boolean> | undefined {
  const defs = parseEntityCustomPropertiesJson(json);
  if (defs.length === 0) return undefined;
  const out: Record<string, string | number | boolean> = {};
  for (const d of defs) {
    out[d.id] = d.defaultValue;
  }
  return out;
}

/**
 * When ruleset attribute `customProperties` JSON changes, keep existing values for ids that
 * still exist and use schema defaults for new ids; drop removed ids.
 */
export function mergeAttributeCustomPropertyValuesForSchemaJson(
  prev: Record<string, string | number | boolean> | null | undefined,
  json: string | null | undefined,
): Record<string, string | number | boolean> {
  const defs = parseEntityCustomPropertiesJson(json);
  if (defs.length === 0) return {};
  const out: Record<string, string | number | boolean> = {};
  for (const d of defs) {
    out[d.id] = prev?.[d.id] ?? d.defaultValue;
  }
  return out;
}
