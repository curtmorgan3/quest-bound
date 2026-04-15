import type { Attribute, Character, CharacterAttribute } from '@/types';

interface InjectCharacterData {
  value: string | number | boolean;
  attributes: Attribute[];
  getCharacterAttribute?: (attributeId: string) => CharacterAttribute | null;
  characterData?: Character;
}

export function injectCharacterData({
  value,
  attributes,
  getCharacterAttribute,
  characterData,
}: InjectCharacterData): string | number | boolean {
  if (typeof value !== 'string') return value;

  // Replace all {{<attribute title>}} with that attribute's value for the character
  return value.replace(/\{\{([^}]+)\}\}/g, (match, placeholder) => {
    const key = placeholder.trim();
    if (key === 'name') {
      return characterData?.name ?? match;
    }
    const attribute = attributes.find((attr) => attr.title.toLowerCase() === key.toLowerCase());
    if (attribute && getCharacterAttribute) {
      const characterAttribute = getCharacterAttribute(attribute.id);
      const attrValue = characterAttribute?.value;
      return attrValue !== undefined && attrValue !== null ? String(attrValue) : match;
    }
    return match;
  });
}
