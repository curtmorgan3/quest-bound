import type {
  CharacterAttribute,
  Component,
  ComponentData,
  ConditionalRenderLogic,
  ConditionalRenderOperator,
} from '@/types';
import {
  ATTRIBUTE_VALUE_BINDING_MAX_ID,
  ATTRIBUTE_VALUE_BINDING_MIN_ID,
} from '@/utils/attribute-value-binding';
import { findEntityCustomPropertyDefById } from '@/utils/parse-entity-custom-properties-json';
import type { ReactNode } from 'react';
import { getComponentData } from '../../utils/node-conversion';

function resolveConditionalRenderValue(
  conditionAttribute: CharacterAttribute,
  customPropertyId: string | null | undefined,
): string | number | boolean {
  if (!customPropertyId) {
    return conditionAttribute.value;
  }
  if (customPropertyId === ATTRIBUTE_VALUE_BINDING_MIN_ID) {
    return conditionAttribute.min ?? '';
  }
  if (customPropertyId === ATTRIBUTE_VALUE_BINDING_MAX_ID) {
    return conditionAttribute.max ?? '';
  }
  const def = findEntityCustomPropertyDefById(
    customPropertyId,
    conditionAttribute.customProperties,
  );
  const stored = conditionAttribute.attributeCustomPropertyValues?.[customPropertyId];
  if (stored !== undefined) {
    return stored;
  }
  if (def) {
    return def.defaultValue;
  }
  return conditionAttribute.value;
}

function evaluateLogic(
  attributeValue: string | number | boolean,
  logic: ConditionalRenderLogic,
): boolean {
  const { operator, value: compareValue } = logic;
  const actual = attributeValue;

  const asNumber = (v: string | number | boolean): number =>
    typeof v === 'number' ? v : Number(v);

  const asString = (v: string | number | boolean): string =>
    typeof v === 'string' ? v : String(v);

  switch (operator as ConditionalRenderOperator) {
    case 'eq':
      return actual === compareValue;
    case 'neq':
      return actual !== compareValue;
    case 'gt':
      return asNumber(actual) > asNumber(compareValue);
    case 'gte':
      return asNumber(actual) >= asNumber(compareValue);
    case 'lt':
      return asNumber(actual) < asNumber(compareValue);
    case 'lte':
      return asNumber(actual) <= asNumber(compareValue);
    case 'contains':
      return asString(actual).includes(asString(compareValue));
    case 'notContains':
      return !asString(actual).includes(asString(compareValue));
    case 'isEmpty':
      return asString(actual).trim() === '';
    case 'isNotEmpty':
      return asString(actual).trim() !== '';
    default:
      return true;
  }
}

/**
 * Mirrors {@link NodeConditionalRender}: when false, the component should not appear in the DOM
 * (call sites must omit layout wrappers, not only inner content).
 */
export function isComponentConditionallyVisible(
  component: Component,
  characterAttributes: CharacterAttribute[] | undefined,
  componentData?: ComponentData,
): boolean {
  const data = componentData ?? getComponentData(component);
  const attributeId = data.conditionalRenderAttributeId;
  const logic = data.conditionalRenderLogic;

  if (!attributeId) {
    return true;
  }

  if (!characterAttributes?.length) {
    return true;
  }

  const conditionAttribute = characterAttributes.find((attr) => attr.attributeId === attributeId);

  if (conditionAttribute == null) {
    return true;
  }

  const resolvedValue = resolveConditionalRenderValue(
    conditionAttribute,
    data.conditionalRenderAttributeCustomPropertyId,
  );

  if (logic) {
    return evaluateLogic(resolvedValue, logic);
  }

  if (resolvedValue === false) {
    return false;
  }

  return true;
}

interface NodeConditionalRenderProps {
  children: ReactNode;
  component: Component;
  characterAttributes?: CharacterAttribute[];
  componentData?: ComponentData;
}

export const NodeConditionalRender = ({
  children,
  component,
  characterAttributes,
  componentData,
}: NodeConditionalRenderProps) => {
  if (!isComponentConditionallyVisible(component, characterAttributes, componentData)) {
    return null;
  }
  return <>{children}</>;
};
