import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { ComponentUpdate } from '@/lib/compass-api';
import {
  fireExternalComponentChangeEvent,
  getComponentData,
  updateComponentData,
} from '@/lib/compass-planes/utils';
import type { Component, InventoryComponentData } from '@/types';

interface InventoryDataEditProps {
  components: Array<Component>;
  updateComponents: (updates: Array<ComponentUpdate>) => Promise<void>;
}

export const InventoryDataEdit = ({ components, updateComponents }: InventoryDataEditProps) => {
  // Filter out locked components
  const editableComponents = components.filter((c) => !c.locked);

  // Get data from the first component for display
  const firstComponentData = components[0]
    ? (getComponentData(components[0]) as InventoryComponentData)
    : null;

  const currentType = firstComponentData?.type || 'item';

  const handleTypeChange = async (value: 'item' | 'action') => {
    if (editableComponents.length === 0) return;

    const updates = editableComponents.map((component) => ({
      id: component.id,
      data: updateComponentData(component.data, { type: value }),
    }));

    await updateComponents(updates);
    fireExternalComponentChangeEvent({ updates });
  };

  const isDisabled = editableComponents.length === 0;

  return (
    <div className='flex flex-col w-full gap-2 pb-2 border-b-1'>
      <div className='flex flex-col gap-1'>
        <label className='text-xs text-muted-foreground'>Inventory Type</label>
        <Select value={currentType} onValueChange={handleTypeChange} disabled={isDisabled}>
          <SelectTrigger className='w-full'>
            <SelectValue placeholder='Select inventory type' />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value='item'>Item</SelectItem>
            <SelectItem value='action'>Action</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
};
