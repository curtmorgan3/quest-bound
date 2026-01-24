import { useAttributes } from '@/lib/compass-api';
import { CharacterContext } from '@/stores';
import type { Component } from '@/types';
import { useContext } from 'react';
import { getComponentData } from './node-conversion';

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

  if (!characterContext) {
    const rulesetAttribute = attributes.find((attr) => attr.id === attributeId);
    return rulesetAttribute
      ? {
          name: rulesetAttribute.title,
          value: rulesetAttribute.defaultValue,
        }
      : null;
  }

  const characterAttribute = characterContext.getCharacterAttribute(attributeId);
  return characterAttribute
    ? {
        name: characterAttribute.title,
        value: characterAttribute.defaultValue,
      }
    : null;
};
