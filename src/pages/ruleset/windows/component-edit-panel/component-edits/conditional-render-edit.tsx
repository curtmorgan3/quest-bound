import {
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components';
import { AttributeLookup, useAttributes } from '@/lib/compass-api';
import type {
  Attribute,
  AttributeType,
  ConditionalRenderLogic,
  ConditionalRenderOperator,
} from '@/types';

const NUMERIC_OPERATORS: { value: ConditionalRenderOperator; label: string }[] = [
  { value: 'eq', label: 'Equals' },
  { value: 'neq', label: 'Not equals' },
  { value: 'gt', label: 'Greater than' },
  { value: 'gte', label: 'Greater than or equal' },
  { value: 'lt', label: 'Less than' },
  { value: 'lte', label: 'Less than or equal' },
];

const TEXT_LIST_OPERATORS: { value: ConditionalRenderOperator; label: string }[] = [
  { value: 'eq', label: 'Equals' },
  { value: 'neq', label: 'Not equals' },
  { value: 'contains', label: 'Contains' },
  { value: 'notContains', label: 'Does not contain' },
];

const BOOLEAN_OPTIONS: { operator: ConditionalRenderOperator; value: boolean; label: string }[] = [
  { operator: 'eq', value: true, label: 'Is true' },
  { operator: 'neq', value: true, label: 'Is not true' },
];

function getOperatorOptions(
  attributeType: AttributeType | undefined,
): { value: string; label: string }[] {
  if (attributeType === 'boolean') {
    return BOOLEAN_OPTIONS.map((opt) => ({
      value: `${opt.operator}:${opt.value}`,
      label: opt.label,
    }));
  }
  if (attributeType === 'number') {
    return NUMERIC_OPERATORS;
  }
  if (attributeType === 'string' || attributeType === 'list') {
    return TEXT_LIST_OPERATORS;
  }
  return NUMERIC_OPERATORS;
}

function getComparatorPlaceholder(attributeType: AttributeType | undefined): string {
  if (attributeType === 'number') return 'Number';
  if (attributeType === 'string') return 'Text';
  if (attributeType === 'list') return 'Value or option';
  return 'Value';
}

interface ConditionalRenderEditProps {
  attributeId?: string | null;
  conditionalRenderLogic?: ConditionalRenderLogic | null;
  onSelect: (attr: Attribute | null) => void;
  onDelete: () => void;
  onLogicChange: (logic: ConditionalRenderLogic | null) => void;
}

export const ConditionalRenderEdit = ({
  attributeId,
  conditionalRenderLogic,
  onSelect,
  onDelete,
  onLogicChange,
}: ConditionalRenderEditProps) => {
  const { attributes } = useAttributes();
  const selectedAttribute = attributeId
    ? attributes?.find((a) => a.id === attributeId)
    : undefined;
  const attributeType = selectedAttribute?.type;

  const logic = conditionalRenderLogic ?? { operator: 'eq', value: '' };
  const isBoolean = attributeType === 'boolean';

  const operatorOptions = getOperatorOptions(attributeType);

  const setOperator = (operator: ConditionalRenderOperator) => {
    onLogicChange({ ...logic, operator });
  };

  const setBooleanChoice = (value: string) => {
    const [op, val] = value.split(':');
    onLogicChange({
      operator: op as ConditionalRenderOperator,
      value: val === 'true',
    });
  };

  const setValue = (value: string) => {
    const parsed =
      value === 'true'
        ? true
        : value === 'false'
          ? false
          : Number.isFinite(Number(value))
            ? Number(value)
            : value;
    onLogicChange({ ...logic, value: parsed });
  };

  const displayValue =
    typeof logic.value === 'boolean'
      ? String(logic.value)
      : typeof logic.value === 'number'
        ? String(logic.value)
        : (logic.value ?? '');

  const booleanSelectValue = isBoolean
    ? logic.operator === 'neq' && logic.value === true
      ? 'neq:true'
      : 'eq:true'
    : logic.operator;

  return (
    <div className='flex flex-col gap-2'>
      <AttributeLookup
        label='Conditional Render'
        value={attributeId}
        onSelect={onSelect}
        onDelete={onDelete}
      />
      {attributeId && (
        <>
          <div className='flex flex-col gap-2'>
            <Label htmlFor='conditional-render-operator'>
              {isBoolean ? 'Condition' : 'Operator'}
            </Label>
            <Select
              value={
                isBoolean
                  ? booleanSelectValue
                  : logic.operator
              }
              onValueChange={(v) =>
                isBoolean ? setBooleanChoice(v) : setOperator(v as ConditionalRenderOperator)
              }>
              <SelectTrigger id='conditional-render-operator' className='h-8'>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {operatorOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {!isBoolean && (
            <div className='flex flex-col gap-2'>
              <Label htmlFor='conditional-render-comparator'>Compare to</Label>
              <Input
                id='conditional-render-comparator'
                className='h-8 rounded-[4px]'
                placeholder={getComparatorPlaceholder(attributeType)}
                value={displayValue}
                onChange={(e) => setValue(e.target.value)}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
};
