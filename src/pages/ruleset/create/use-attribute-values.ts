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
  const [typeValue, setTypeValue] = useState('string');
  const [defaultBoolean, setDefaultBoolean] = useState(false);
  const [attributeListOptions, setAttributeListOptions] = useState<string[]>([]);

  const addListOption = (opt: string) => {
    setAttributeListOptions((prev) => [...prev, opt]);
  };

  const removeListOption = (opt: string) => {
    setAttributeListOptions((prev) => prev.filter((o) => o !== opt));
  };

  const resetAll = () => {
    setDefaultBoolean(false);
    setDefaultValue('');
    setTypeValue('string');
  };

  const attributeProperties: Partial<Attribute> = {
    type: typeValue as 'string' | 'number' | 'boolean' | 'enum',
    defaultValue: typeValue === 'boolean' ? defaultBoolean : defaultValue,
    options: typeValue === 'enum' ? attributeListOptions : undefined,
  };

  const saveAttribute = () => {
    const data = {
      ...baseProperties,
      ...attributeProperties,
    };

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
  };
};
