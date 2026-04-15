import { CategoryField } from '@/components/composites/category-field';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { ComponentUpdate } from '@/lib/compass-api';
import { useActions, useAttributes, useItems } from '@/lib/compass-api';
import {
  fireExternalComponentChangeEvent,
  getComponentData,
  updateComponentData,
} from '@/lib/compass-planes/utils';
import type { Component, InventoryComponentData } from '@/types';
import { useMemo } from 'react';

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

  const { items } = useItems();
  const { actions } = useActions();
  const { attributes } = useAttributes();

  const currentType = firstComponentData?.typeRestriction;
  const cellWidth = firstComponentData?.cellWidth ?? 1;
  const cellHeight = firstComponentData?.cellHeight ?? 1;
  const categoryRestriction = firstComponentData?.categoryRestriction ?? '';
  const showItemAs = firstComponentData?.showItemAs ?? 'image';
  const showLabelTooltip = firstComponentData?.showLabelTooltip === true;

  const existingCategories = useMemo(() => {
    if (!currentType) return [];

    const source =
      currentType === 'item'
        ? items
        : currentType === 'action'
          ? actions
          : currentType === 'attribute'
            ? attributes
            : [];

    const categories = new Set<string>();
    for (const entry of source) {
      const cat = entry.category?.trim();
      if (cat) categories.add(cat);
    }

    return Array.from(categories).sort((a, b) =>
      a.localeCompare(b, undefined, { sensitivity: 'base' }),
    );
  }, [currentType, items, actions, attributes]);

  const handleTypeChange = async (value: string) => {
    if (editableComponents.length === 0) return;

    const typeRestriction =
      value === 'none' ? undefined : (value as InventoryComponentData['typeRestriction']);

    const update: Record<any, any> = { typeRestriction };

    if (!typeRestriction) update.categoryRestriction = '';

    const updates = editableComponents.map((component) => ({
      id: component.id,
      data: updateComponentData(component.data, update),
    }));

    await updateComponents(updates);
    fireExternalComponentChangeEvent({ updates });
  };

  const handleCellDimensionChange = async (
    dimension: 'cellWidth' | 'cellHeight',
    value: number,
  ) => {
    if (editableComponents.length === 0) return;

    // Ensure minimum value of 1
    const sanitizedValue = Math.max(1, Math.floor(value) || 1);

    const updates = editableComponents.map((component) => ({
      id: component.id,
      data: updateComponentData(component.data, { [dimension]: sanitizedValue }),
    }));

    await updateComponents(updates);
    fireExternalComponentChangeEvent({ updates });
  };

  const handleCategoryRestrictionChange = async (value: string) => {
    if (editableComponents.length === 0) return;

    const updates = editableComponents.map((component) => ({
      id: component.id,
      data: updateComponentData(component.data, { categoryRestriction: value || undefined }),
    }));

    await updateComponents(updates);
    fireExternalComponentChangeEvent({ updates });
  };

  const handleShowItemAsChange = async (value: string) => {
    if (editableComponents.length === 0) return;

    const showItemAsValue = value as 'image' | 'title';

    const updates = editableComponents.map((component) => ({
      id: component.id,
      data: updateComponentData(component.data, {
        showItemAs: showItemAsValue,
        ...(showItemAsValue !== 'image' ? { showLabelTooltip: undefined } : {}),
      }),
    }));

    await updateComponents(updates);
    fireExternalComponentChangeEvent({ updates });
  };

  const handleShowLabelTooltipChange = async (checked: boolean) => {
    if (editableComponents.length === 0) return;

    const updates = editableComponents.map((component) => ({
      id: component.id,
      data: updateComponentData(component.data, {
        showLabelTooltip: checked ? true : undefined,
      }),
    }));

    await updateComponents(updates);
    fireExternalComponentChangeEvent({ updates });
  };

  const isDisabled = editableComponents.length === 0;

  return (
    <div className='flex flex-col w-full gap-2 pb-2 border-b-1'>
      <div className='flex gap-2'>
        <div className='flex flex-col gap-1 flex-1'>
          <label className='text-xs text-muted-foreground'>Cell Unit Width</label>
          <Input
            type='number'
            min={1}
            value={cellWidth}
            onChange={(e) => handleCellDimensionChange('cellWidth', parseInt(e.target.value, 10))}
            disabled={isDisabled}
          />
        </div>
        <div className='flex flex-col gap-1 flex-1'>
          <label className='text-xs text-muted-foreground'>Cell Unit Height</label>
          <Input
            type='number'
            min={1}
            value={cellHeight}
            onChange={(e) => handleCellDimensionChange('cellHeight', parseInt(e.target.value, 10))}
            disabled={isDisabled}
          />
        </div>
      </div>
      <div className='flex flex-col gap-1' id='inventory-type-restriction'>
        <label className='text-xs text-muted-foreground'>Type Restriction</label>
        <Select
          value={currentType ?? 'none'}
          onValueChange={handleTypeChange}
          disabled={isDisabled}>
          <SelectTrigger className='w-full'>
            <SelectValue placeholder='Select inventory type' />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value='none'>None</SelectItem>
            <SelectItem value='item'>Item</SelectItem>
            <SelectItem value='action'>Action</SelectItem>
            <SelectItem value='attribute'>Attribute</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className='flex flex-col gap-1'>
        <CategoryField
          value={categoryRestriction || null}
          onChange={(v) => handleCategoryRestrictionChange(v ?? '')}
          existingCategories={existingCategories}
          placeholder='Enter category...'
          label='Category Restriction'
          disabled={isDisabled || !currentType}
        />
      </div>

      <div className='flex flex-col gap-1'>
        <label className='text-xs text-muted-foreground'>Show Item As</label>
        <Select value={showItemAs} onValueChange={handleShowItemAsChange} disabled={isDisabled}>
          <SelectTrigger className='w-full'>
            <SelectValue placeholder='Select display mode' />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value='image'>Image</SelectItem>
            <SelectItem value='title'>Title</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {showItemAs === 'image' && (
        <div className='flex items-center gap-2'>
          <Checkbox
            id='inventory-show-label-tooltip'
            checked={showLabelTooltip}
            onCheckedChange={(v) => handleShowLabelTooltipChange(v === true)}
            disabled={isDisabled}
          />
          <Label
            htmlFor='inventory-show-label-tooltip'
            className='text-xs font-normal text-muted-foreground cursor-pointer'>
            Show label tooltip on hover
          </Label>
        </div>
      )}
    </div>
  );
};
