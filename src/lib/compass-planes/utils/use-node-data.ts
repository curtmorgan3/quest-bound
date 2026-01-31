import { useAttributes } from '@/lib/compass-api';
import { CharacterContext } from '@/stores';
import type { AttributeType, Character, Component, ComponentData } from '@/types';
import { useContext } from 'react';
import { getComponentData } from './node-conversion';

type NodeData = ComponentData & {
  name: string;
  value: string | number | boolean;
  attributeType: AttributeType;
  characterAttributeId?: string;
  options: string[];
  interpolatedValue: string | number | boolean;
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

  console.log(characterContext?.character);

  if (characterAttribute === null && rulesetAttribute && characterContext) {
    console.warn(
      `No character attribute found for ${characterContext?.character?.name}: ${rulesetAttribute?.title}`,
    );
  }

  const value =
    characterAttribute?.value ??
    characterComponentData?.get(attributeId ?? '') ??
    rulesetAttribute?.defaultValue ??
    componentData.value ??
    '';

  return {
    ...componentData,
    name:
      characterAttribute?.title ??
      rulesetAttribute?.title ??
      componentData.placeholder ??
      component.type,
    value,
    interpolatedValue: injectContextData(value, characterContext?.character),
    attributeType: rulesetAttribute?.type ?? 'string',
    characterAttributeId: characterAttribute?.id,
    options: rulesetAttribute?.options ?? [],
  };
};

function injectContextData(
  text: string | number | boolean,
  data?: Character,
): string | number | boolean {
  if (!data) return text;
  if (typeof text !== 'string') return text;
  return text.replace('{{this.name}}', data.name);
}
