import { useAttributes } from '@/lib/compass-api';
import { CharacterContext } from '@/stores';
import type { AttributeType, Component, ComponentData } from '@/types';
import {
  ATTRIBUTE_VALUE_BINDING_MAX_ID,
  ATTRIBUTE_VALUE_BINDING_MIN_ID,
} from '@/utils/attribute-value-binding';
import { findEntityCustomPropertyDefById } from '@/utils/parse-entity-custom-properties-json';
import { useContext, useMemo } from 'react';
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

const coerceValueByComponentType = (
  value: string | number | boolean,
  component: Component,
  attributeType: AttributeType,
  componentData: ComponentData,
): string | number | boolean => {
  switch (component.type) {
    case ComponentTypes.CHECKBOX: {
      if (typeof value === 'boolean') return value;
      if (typeof value === 'number') return value !== 0;
      const normalized = String(value).trim().toLowerCase();
      if (!normalized) return false;
      if (['false', '0', 'no', 'off'].includes(normalized)) return false;
      if (['true', '1', 'yes', 'on'].includes(normalized)) return true;
      return Boolean(value);
    }

    case ComponentTypes.INPUT: {
      const shouldBeNumber = attributeType === 'number' || componentData.type === 'number';
      if (shouldBeNumber) {
        if (value === '') return '';
        if (typeof value === 'number') return value;
        const parsed = Number(value);
        return Number.isNaN(parsed) ? '' : parsed;
      }
      return typeof value === 'string' ? value : String(value);
    }

    case ComponentTypes.TEXT:
      return attributeType === 'number' ? Number(value) : String(value);

    case ComponentTypes.CONTENT: {
      return typeof value === 'string' ? value : String(value);
    }

    default:
      return value;
  }
};

export const useNodeData = (component: Component): NodeData => {
  const characterContext = useContext(CharacterContext);
  const { attributeId } = component;
  const { attributes } = useAttributes();
  const character = characterContext?.character ?? null;
  const getCharacterAttribute = characterContext?.getCharacterAttribute;

  return useMemo(() => {
    const componentData = getComponentData(component);
    const rulesetAttribute = attributeId
      ? attributes.find((attr) => attr.id === attributeId)
      : null;
    const characterAttribute =
      attributeId && getCharacterAttribute ? getCharacterAttribute(attributeId) : null;
    const characterComponentData = character?.componentData;

    const characterComponentDataValue = characterComponentData
      ? characterComponentData[component.id]
      : null;

    const customPropertyId = componentData.attributeCustomPropertyId ?? null;
    const schemaBinding =
      customPropertyId === ATTRIBUTE_VALUE_BINDING_MIN_ID
        ? ('min' as const)
        : customPropertyId === ATTRIBUTE_VALUE_BINDING_MAX_ID
          ? ('max' as const)
          : null;

    const customDef =
      attributeId && customPropertyId && schemaBinding == null
        ? findEntityCustomPropertyDefById(
            customPropertyId,
            rulesetAttribute?.customProperties,
            characterAttribute?.customProperties,
          )
        : null;

    const attributeType: AttributeType = schemaBinding
      ? 'number'
      : customDef
        ? (customDef.type as AttributeType)
        : (rulesetAttribute?.type ?? 'string');

    let value =
      schemaBinding === 'min'
        ? (characterAttribute?.min ?? rulesetAttribute?.min ?? '')
        : schemaBinding === 'max'
          ? (characterAttribute?.max ?? rulesetAttribute?.max ?? '')
          : customDef != null && customPropertyId
            ? (characterAttribute?.attributeCustomPropertyValues?.[customPropertyId] ??
              customDef.defaultValue)
            : (characterAttribute?.value ??
              characterComponentDataValue ??
              rulesetAttribute?.defaultValue ??
              componentData.value ??
              '');

    value = coerceValueByComponentType(value, component, attributeType, componentData);

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
    if (schemaBinding) {
      const base = characterAttribute?.title ?? rulesetAttribute?.title ?? '';
      const suffix = schemaBinding === 'min' ? 'Min' : 'Max';
      name = base ? `${base} · ${suffix}` : suffix;
    } else if (customDef) {
      const base = characterAttribute?.title ?? rulesetAttribute?.title ?? '';
      name = base ? `${base} · ${customDef.name}` : customDef.name;
    }

    if (component.type === ComponentTypes.INPUT && !component?.attributeId) {
      if (componentData?.placeholder === 'Input' && !!componentData?.type) {
        name = `${componentData.type}`;
      } else {
        name = 'Input';
      }
    }

    return {
      ...componentData,
      ...(component.type === ComponentTypes.INPUT && attributeType === 'number'
        ? { type: 'number' as const }
        : {}),
      name: name ?? component.type,
      value,
      interpolatedValue: injectCharacterData({
        value,
        characterData: character,
        attributes,
        getCharacterAttribute,
      }),
      attributeType,
      characterAttributeId: characterAttribute?.id,
      options:
        customDef != null || schemaBinding != null
          ? []
          : (characterAttribute?.options ?? rulesetAttribute?.options ?? []),
      min: characterAttribute?.min ?? rulesetAttribute?.min,
      max: characterAttribute?.max ?? rulesetAttribute?.max,
      allowMultiSelect:
        customDef != null || schemaBinding != null ? false : rulesetAttribute?.allowMultiSelect,
    };
  }, [component, attributeId, attributes, character, getCharacterAttribute]);
};
