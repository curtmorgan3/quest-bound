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
import { parseEntityCustomPropertiesJson } from '@/utils/parse-entity-custom-properties-json';

const CONDITIONAL_RENDER_CUSTOM_PROPERTY_NONE = '__none__';

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
  { value: 'isEmpty', label: 'Is empty' },
  { value: 'isNotEmpty', label: 'Is not empty' },
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
  conditionalRenderAttributeCustomPropertyId?: string | null;
  conditionalRenderLogic?: ConditionalRenderLogic | null;
  onSelect: (attr: Attribute | null) => void;
  onDelete: () => void;
  onCustomPropertyChange: (customPropertyId: string | null) => void;
  onLogicChange: (logic: ConditionalRenderLogic | null) => void;
}

export const ConditionalRenderEdit = ({
  attributeId,
  conditionalRenderAttributeCustomPropertyId,
  conditionalRenderLogic,
  onSelect,
  onDelete,
  onCustomPropertyChange,
  onLogicChange,
}: ConditionalRenderEditProps) => {
  const { attributes } = useAttributes();
  const selectedAttribute = attributeId ? attributes?.find((a) => a.id === attributeId) : undefined;
  const customPropertyDefs = selectedAttribute
    ? parseEntityCustomPropertiesJson(selectedAttribute.customProperties)
    : [];
  const selectedCustomDef = conditionalRenderAttributeCustomPropertyId
    ? customPropertyDefs.find((d) => d.id === conditionalRenderAttributeCustomPropertyId)
    : undefined;
  const attributeType: AttributeType | undefined = selectedCustomDef
    ? (selectedCustomDef.type as AttributeType)
    : selectedAttribute?.type;

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
          {customPropertyDefs.length > 0 && (
            <div className='flex flex-col gap-2'>
              <Label
                htmlFor='conditional-render-attribute-custom-property'
                className='text-xs text-muted-foreground'>
                Custom property (optional)
              </Label>
              <Select
                value={
                  conditionalRenderAttributeCustomPropertyId &&
                  customPropertyDefs.some((d) => d.id === conditionalRenderAttributeCustomPropertyId)
                    ? conditionalRenderAttributeCustomPropertyId
                    : CONDITIONAL_RENDER_CUSTOM_PROPERTY_NONE
                }
                onValueChange={(v) =>
                  onCustomPropertyChange(
                    v === CONDITIONAL_RENDER_CUSTOM_PROPERTY_NONE ? null : v,
                  )
                }>
                <SelectTrigger
                  id='conditional-render-attribute-custom-property'
                  className='h-8 w-full'>
                  <SelectValue placeholder='Use main attribute value' />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={CONDITIONAL_RENDER_CUSTOM_PROPERTY_NONE}>
                    None (main attribute value)
                  </SelectItem>
                  {customPropertyDefs.map((def) => (
                    <SelectItem key={def.id} value={def.id}>
                      {def.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className='flex flex-col gap-2'>
            <Label htmlFor='conditional-render-operator'>
              {isBoolean ? 'Condition' : 'Operator'}
            </Label>
            <Select
              value={isBoolean ? booleanSelectValue : logic.operator}
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
          {!isBoolean && logic.operator !== 'isEmpty' && logic.operator !== 'isNotEmpty' && (
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
