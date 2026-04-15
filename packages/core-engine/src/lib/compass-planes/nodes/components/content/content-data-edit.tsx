import { Checkbox } from '@/components/ui/checkbox';
import { type ComponentUpdate } from '@/lib/compass-api';
import {
  fireExternalComponentChangeEvent,
  getComponentData,
  updateComponentData,
} from '@/lib/compass-planes/utils';
import type { Component, ContentComponentData } from '@/types';

interface ContentDataEditProps {
  components: Array<Component>;
  handleUpdate: (key: string, value: number | string | boolean | null) => void;
  updateComponents: (updates: Array<ComponentUpdate>) => Promise<void>;
}

export const ContentDataEdit = ({
  components,
  handleUpdate: _handleUpdate,
  updateComponents,
}: ContentDataEditProps) => {
  const editableComponents = components.filter((c) => !c.locked);

  const firstComponent = components[0];
  const firstComponentData = firstComponent
    ? (getComponentData(firstComponent) as ContentComponentData)
    : null;
  const readOnly = firstComponentData?.readOnly ?? false;

  const handleReadOnlyChange = async (checked: boolean) => {
    if (editableComponents.length === 0) return;
    const updates = editableComponents.map((component) => ({
      id: component.id,
      data: updateComponentData(component.data, { readOnly: checked }),
    }));
    await updateComponents(updates);
    fireExternalComponentChangeEvent({ updates });
  };

  return (
    <div className='flex w-full flex-col gap-3 border-b border-border pb-2'>
      <div className='flex items-center gap-2'>
        <Checkbox
          id='content-read-only'
          checked={readOnly}
          onCheckedChange={(checked) => handleReadOnlyChange(checked === true)}
          disabled={editableComponents.length === 0}
          onKeyDown={(e) => e.stopPropagation()}
        />
        <label
          htmlFor='content-read-only'
          className='text-xs leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70'>
          Read Only
        </label>
      </div>
    </div>
  );
};
