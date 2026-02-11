import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAttributes, type ComponentUpdate } from '@/lib/compass-api';
import {
  fireExternalComponentChangeEvent,
  getComponentData,
  updateComponentData,
} from '@/lib/compass-planes/utils';
import type { Component, InputComponentData } from '@/types';
import { useEffect } from 'react';

interface InputDataEditProps {
  components: Array<Component>;
  handleUpdate: (key: string, value: number | string | boolean | null) => void;
  updateComponents: (updates: Array<ComponentUpdate>) => Promise<void>;
}

export const InputDataEdit = ({
  components,
  handleUpdate: _handleUpdate, // reserved for future use to match other editors
  updateComponents,
}: InputDataEditProps) => {
  const editableComponents = components.filter((c) => !c.locked);
  const firstComponent = components[0];
  const firstComponentData = firstComponent
    ? (getComponentData(firstComponent) as InputComponentData)
    : null;

  const { attributes } = useAttributes();

  const firstAttribute = firstComponent?.attributeId
    ? attributes.find((attr) => attr.id === firstComponent.attributeId)
    : null;

  const inferredTypeFromAttribute: 'text' | 'number' | null = firstAttribute
    ? firstAttribute.type === 'number'
      ? 'number'
      : 'text'
    : null;

  const currentType: 'text' | 'number' =
    firstComponentData?.type ?? inferredTypeFromAttribute ?? 'text';

  // When an attribute is associated, keep the component data type in sync with the attribute type.
  useEffect(() => {
    const syncTypeWithAttribute = async () => {
      if (!firstComponent || editableComponents.length === 0) return;
      if (!firstComponent.attributeId) return;

      const attribute = attributes.find((attr) => attr.id === firstComponent.attributeId);
      if (!attribute) return;

      const targetType: 'text' | 'number' = attribute.type === 'number' ? 'number' : 'text';
      const latestData = getComponentData(firstComponent) as InputComponentData;

      if (latestData.type === targetType) return;

      const updates = editableComponents.map((component) => ({
        id: component.id,
        data: updateComponentData(component.data, { type: targetType }),
      }));

      await updateComponents(updates);
      fireExternalComponentChangeEvent({ updates });
    };

    void syncTypeWithAttribute();
  }, [attributes, editableComponents, firstComponent, updateComponents]);

  const handleTypeChange = async (value: string) => {
    if (editableComponents.length === 0) return;

    const type = value === 'number' ? 'number' : 'text';

    const updates = editableComponents.map((component) => ({
      id: component.id,
      data: updateComponentData(component.data, { type }),
    }));

    await updateComponents(updates);
    fireExternalComponentChangeEvent({ updates });
  };

  const isDisabled = editableComponents.length === 0;

  return (
    <div className='flex flex-col w-full gap-2 pb-2 border-b-1'>
      <div className='flex flex-col gap-1'>
        <label className='text-xs text-muted-foreground'>Input Type</label>
        <Select
          value={currentType}
          onValueChange={handleTypeChange}
          disabled={isDisabled}>
          <SelectTrigger className='w-full'>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value='text'>Text</SelectItem>
            <SelectItem value='number'>Number</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
};

