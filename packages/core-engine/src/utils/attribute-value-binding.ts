import type { Attribute } from '@/types';

/** Reserved `ComponentData.attributeCustomPropertyId` for the attribute schema minimum (number attributes). */
export const ATTRIBUTE_VALUE_BINDING_MIN_ID = '__questbound:attribute:min';

/** Reserved `ComponentData.attributeCustomPropertyId` for the attribute schema maximum (number attributes). */
export const ATTRIBUTE_VALUE_BINDING_MAX_ID = '__questbound:attribute:max';

const SCHEMA_BINDING_IDS = new Set([
  ATTRIBUTE_VALUE_BINDING_MIN_ID,
  ATTRIBUTE_VALUE_BINDING_MAX_ID,
]);

export function isAttributeSchemaValueBindingId(id: string | null | undefined): boolean {
  return id != null && id !== '' && SCHEMA_BINDING_IDS.has(id);
}

export function getNumberAttributeSchemaBindingOptions(
  attr: Pick<Attribute, 'type' | 'min' | 'max'> | null | undefined,
): Array<{ id: string; name: string }> {
  if (!attr || attr.type !== 'number') return [];
  const out: Array<{ id: string; name: string }> = [];
  if (attr.min !== undefined && Number.isFinite(attr.min)) {
    out.push({ id: ATTRIBUTE_VALUE_BINDING_MIN_ID, name: 'Min' });
  }
  if (attr.max !== undefined && Number.isFinite(attr.max)) {
    out.push({ id: ATTRIBUTE_VALUE_BINDING_MAX_ID, name: 'Max' });
  }
  return out;
}
