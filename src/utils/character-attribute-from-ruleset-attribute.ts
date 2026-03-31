import type { Attribute, CharacterAttribute } from '@/types';

/**
 * Creates a new `CharacterAttribute` row from a ruleset `Attribute`, including `customProperties`
 * copied from the definition.
 */
export function seedCharacterAttributeFromRulesetAttribute(
  attr: Attribute,
  characterId: string,
  now: string,
): CharacterAttribute {
  return {
    ...attr,
    id: crypto.randomUUID(),
    characterId,
    attributeId: attr.id,
    value: attr.defaultValue,
    customProperties: attr.customProperties,
    createdAt: now,
    updatedAt: now,
  } as CharacterAttribute;
}
