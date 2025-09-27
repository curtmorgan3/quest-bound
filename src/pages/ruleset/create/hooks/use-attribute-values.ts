import { useAttributes } from '@/lib/compass-api/hooks/rulesets/use-attributes';
import type { Attribute } from '@/types';
import { useEffect, useState } from 'react';

interface UseAttributeValuesProps {
  id?: string;
  baseProperties: {
    title: string;
    description: string;
    category: string;
  };
  onCreate?: () => void;
  setTitle: (title: string) => void;
  setDescription: (description: string) => void;
  setCategory: (category: string) => void;
}

export const useAttributeValues = ({
  id = '',
  baseProperties,
  onCreate,
  setTitle,
  setDescription,
  setCategory,
}: UseAttributeValuesProps) => {
  const { attributes, createAttribute, updateAttribute } = useAttributes();
  const isEditMode = !!id;

  const activeAttribute = attributes.find((a) => a.id === id);

  useEffect(() => {
    if (isEditMode && activeAttribute) {
      setTitle(activeAttribute.title);
      setDescription(activeAttribute.description);
      setCategory(activeAttribute.category || '');
      setTypeValue(activeAttribute.type);
      setAttributeListOptions(activeAttribute.options || []);
      setMin(activeAttribute.min);
      setMax(activeAttribute.max);
      // Handle default value based on type
      if (activeAttribute.type === 'boolean') {
        setDefaultBoolean(!!activeAttribute.defaultValue);
      } else {
        setDefaultValue(activeAttribute.defaultValue.toString());
      }
    } else {
      resetAll();
    }
  }, [activeAttribute]);

  const [defaultValue, setDefaultValue] = useState<string | number>('');
  const [typeValue, setTypeValue] = useState('number');
  const [defaultBoolean, setDefaultBoolean] = useState(false);
  const [attributeListOptions, setAttributeListOptions] = useState<string[]>([]);
  const [min, setMin] = useState<number>();
  const [max, setMax] = useState<number>();

  const addListOption = (opt: string) => {
    setAttributeListOptions((prev) => [...prev, opt]);
  };

  const removeListOption = (opt: string) => {
    setAttributeListOptions((prev) => prev.filter((o) => o !== opt));
  };

  const resetAll = () => {
    setDefaultBoolean(false);
    setDefaultValue('');
    setTypeValue('number');
  };

  const attributeProperties: Partial<Attribute> = {
    type: typeValue as 'string' | 'number' | 'boolean' | 'enum',
    defaultValue:
      typeValue === 'boolean'
        ? defaultBoolean
        : typeValue === 'number'
          ? (defaultValue ?? 0)
          : defaultValue,
    options: typeValue === 'enum' ? attributeListOptions : undefined,
    min: typeValue === 'number' ? min : undefined,
    max: typeValue === 'number' ? max : undefined,
  };

  const saveAttribute = () => {
    const data = {
      ...baseProperties,
      ...attributeProperties,
    };

    if (data.type === 'number' && data.defaultValue === '') {
      data.defaultValue = 0;
    }

    if (isEditMode) {
      updateAttribute(id, data);
    } else {
      createAttribute(data);
      resetAll();
    }

    onCreate?.();
  };

  return {
    saveAttribute,
    defaultValue,
    typeValue,
    defaultBoolean,
    setDefaultValue,
    setTypeValue,
    setDefaultBoolean,
    addListOption,
    attributeListOptions,
    removeListOption,
    min,
    max,
    setMin,
    setMax,
  };
};
