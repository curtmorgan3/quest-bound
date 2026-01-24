import { useAttributes } from '@/lib/compass-api';
import { CharacterContext } from '@/stores';
import type { Attribute, CharacterAttribute, Component } from '@/types';
import { useContext } from 'react';
import { getComponentData } from './node-conversion';

type ComponentData = {
  name: string;
  value: string | number | boolean;
};

/**
 * If a component has no attribute reference, returns component.data
 *
 * If in character context, looks for character.attributes[component.attributeRef]
 *
 * Otherwise, returns attribute data
 */
export const useComponentData = (component: Component) => {
  const characterContext = useContext(CharacterContext);
  const { attributeId } = component;
  const { attributes } = useAttributes();

  if (!attributeId) {
    return getComponentData(component);
  }

  const rulesetAttribute = attributes.find((attr) => attr.id === attributeId);

  if (!characterContext) {
    return interpolateComponentData(convertToComponentData(rulesetAttribute));
  }

  const characterAttribute = characterContext.getCharacterAttribute(attributeId);
  return interpolateComponentData(convertToComponentData(characterAttribute));
};

function convertToComponentData(
  attribute: Attribute | CharacterAttribute | null | undefined,
): ComponentData | null {
  if (!attribute) {
    return null;
  }

  const value: string | number | boolean = (attribute as any).value ?? attribute.defaultValue;

  return {
    name: attribute.title,
    value,
  };
}

function interpolateComponentData(componentData: ComponentData | null): ComponentData | null {
  if (!componentData) return null;
  const value = componentData.value;
  return {
    ...componentData,
    value: value.toString().replace('{{this.name}}', componentData.name),
  };
}
