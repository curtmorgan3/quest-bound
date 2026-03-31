import type { Attribute, CharacterAttribute } from '@/types';
import { initialAttributeCustomPropertyValuesFromSchemaJson } from '@/utils/attribute-custom-property-values';

/**
 * Creates a new `CharacterAttribute` row from a ruleset `Attribute`, including `customProperties`
 * copied from the definition.
 */
export function seedCharacterAttributeFromRulesetAttribute(
  attr: Attribute,
  characterId: string,
  now: string,
): CharacterAttribute {
  const attributeCustomPropertyValues =
    initialAttributeCustomPropertyValuesFromSchemaJson(attr.customProperties);
  return {
    ...attr,
    id: crypto.randomUUID(),
    characterId,
    attributeId: attr.id,
    value: attr.defaultValue,
    customProperties: attr.customProperties,
    ...(attributeCustomPropertyValues != null
      ? { attributeCustomPropertyValues }
      : {}),
    createdAt: now,
    updatedAt: now,
  } as CharacterAttribute;
}
