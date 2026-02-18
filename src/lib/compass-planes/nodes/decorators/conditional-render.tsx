import type {
  CharacterAttribute,
  Component,
  ConditionalRenderLogic,
  ConditionalRenderOperator,
} from '@/types';
import type { ReactNode } from 'react';
import { getComponentData } from '../../utils/node-conversion';

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
    default:
      return true;
  }
}

interface NodeConditionalRenderProps {
  children: ReactNode;
  component: Component;
  characterAttributes?: CharacterAttribute[];
}

export const NodeConditionalRender = ({
  children,
  component,
  characterAttributes,
}: NodeConditionalRenderProps) => {
  const data = getComponentData(component);
  const attributeId = data.conditionalRenderAttributeId;
  const logic = data.conditionalRenderLogic;

  if (!attributeId) {
    return <>{children}</>;
  }

  if (!characterAttributes?.length) {
    return <>{children}</>;
  }

  const conditionAttribute = characterAttributes.find(
    (attr) => attr.attributeId === attributeId,
  );

  if (conditionAttribute == null) {
    return <>{children}</>;
  }

  if (logic) {
    const passes = evaluateLogic(conditionAttribute.value, logic);
    if (!passes) return null;
    return <>{children}</>;
  }

  if (conditionAttribute.value === false) {
    return null;
  }

  return <>{children}</>;
};
