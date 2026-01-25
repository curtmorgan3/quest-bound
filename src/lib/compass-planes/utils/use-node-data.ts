import { useAttributes } from '@/lib/compass-api';
import { CharacterContext } from '@/stores';
import type { AttributeType, Component, ComponentData } from '@/types';
import { useContext } from 'react';
import { getComponentData } from './node-conversion';

type NodeData = ComponentData & {
  name: string;
  value: string | number | boolean;
  attributeType: AttributeType;
  characterAttributeId?: string;
  options: string[];
};

export const useNodeData = (component: Component): NodeData => {
  const characterContext = useContext(CharacterContext);
  const { attributeId } = component;
  const { attributes } = useAttributes();

  const componentData = getComponentData(component);
  const rulesetAttribute = attributeId ? attributes.find((attr) => attr.id === attributeId) : null;
  const characterAttribute =
    attributeId && characterContext ? characterContext.getCharacterAttribute(attributeId) : null;

  return {
    ...componentData,
    name:
      characterAttribute?.title ??
      rulesetAttribute?.title ??
      componentData.placeholder ??
      component.type,
    value: characterAttribute?.value ?? rulesetAttribute?.defaultValue ?? componentData.value ?? '',
    attributeType: rulesetAttribute?.type ?? 'string',
    characterAttributeId: characterAttribute?.id,
    options: rulesetAttribute?.options ?? [],
  };
};
