import { useAttributes } from '@/lib/compass-api';
import { CharacterContext } from '@/stores';
import type {
  Attribute,
  AttributeType,
  Character,
  CharacterAttribute,
  Component,
  ComponentData,
} from '@/types';
import { useContext } from 'react';
import { ComponentTypes } from '../nodes';
import { getComponentData } from './node-conversion';

type NodeData = ComponentData & {
  name: string;
  value: string | number | boolean;
  attributeType: AttributeType;
  characterAttributeId?: string;
  options: string[];
  interpolatedValue: string | number | boolean;
  min?: number;
  max?: number;
};

export const useNodeData = (component: Component): NodeData => {
  const characterContext = useContext(CharacterContext);
  const { attributeId } = component;
  const { attributes } = useAttributes();

  const componentData = getComponentData(component);
  const rulesetAttribute = attributeId ? attributes.find((attr) => attr.id === attributeId) : null;
  const characterAttribute =
    attributeId && characterContext ? characterContext.getCharacterAttribute(attributeId) : null;
  const characterComponentData = characterContext?.character?.componentData;

  if (characterAttribute === null && rulesetAttribute && characterContext) {
    console.warn(
      `No character attribute found for ${characterContext?.character?.name}: ${rulesetAttribute?.title}`,
    );
  }

  const characterComponentDataValue = characterComponentData
    ? characterComponentData[component.id]
    : null;

  let value =
    characterAttribute?.value ??
    characterComponentDataValue ??
    rulesetAttribute?.defaultValue ??
    componentData.value ??
    '';

  if (componentData.showSign && component.type === ComponentTypes.TEXT) {
    try {
      const val = typeof value === 'string' ? parseFloat(value) : value;
      const sign = val > 0 ? '+' : ''; //- is auto included
      value = `${sign}${value}`;
    } catch (e) {
      console.warn('Unable to parse number for sign interpolation');
    }
  }

  return {
    ...componentData,
    name:
      characterAttribute?.title ??
      rulesetAttribute?.title ??
      componentData.placeholder ??
      component.type,
    value,
    interpolatedValue: injectContextData({
      value,
      characterData: characterContext?.character,
      attributes,
      getCharacterAttribute: characterContext?.getCharacterAttribute,
    }),
    attributeType: rulesetAttribute?.type ?? 'string',
    characterAttributeId: characterAttribute?.id,
    options: rulesetAttribute?.options ?? [],
    min: characterAttribute?.min ?? rulesetAttribute?.min,
    max: characterAttribute?.max ?? rulesetAttribute?.max,
  };
};

interface InjectContextData {
  value: string | number | boolean;
  attributes: Attribute[];
  getCharacterAttribute?: (attributeId: string) => CharacterAttribute | null;
  characterData?: Character;
}

function injectContextData({
  value,
  attributes,
  getCharacterAttribute,
  characterData,
}: InjectContextData): string | number | boolean {
  if (typeof value !== 'string') return value;

  // Replace all {{<attribute title>}} with that attribute's value for the character
  return value.replace(/\{\{([^}]+)\}\}/g, (match, placeholder) => {
    const key = placeholder.trim();
    if (key === 'name') {
      return characterData?.name ?? match;
    }
    const attribute = attributes.find(
      (attr) => attr.title.toLowerCase() === key.toLowerCase(),
    );
    if (attribute && getCharacterAttribute) {
      const characterAttribute = getCharacterAttribute(attribute.id);
      const attrValue = characterAttribute?.value;
      return attrValue !== undefined && attrValue !== null
        ? String(attrValue)
        : match;
    }
    return match;
  });
}
