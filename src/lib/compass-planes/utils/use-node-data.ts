import { useAttributes } from '@/lib/compass-api';
import { CharacterContext } from '@/stores';
import type { AttributeType, Component, ComponentData } from '@/types';
import { useContext } from 'react';
import { ComponentTypes } from '../nodes';
import { injectCharacterData } from './inject-character-data';
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
  allowMultiSelect?: boolean;
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

  let name = characterAttribute?.title ?? rulesetAttribute?.title;

  if (component.type === ComponentTypes.INPUT && !component?.attributeId) {
    if (componentData?.placeholder === 'Input' && !!componentData?.type) {
      name = `${componentData.type}`;
    } else {
      name = 'Input';
    }
  }

  return {
    ...componentData,
    name: name ?? component.type,
    value,
    interpolatedValue: injectCharacterData({
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
    allowMultiSelect: rulesetAttribute?.allowMultiSelect,
  };
};
