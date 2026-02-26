/**
 * Central page to manage a ruleset's CustomProperties.
 * Lists properties in alphabetical order with inline controls for label, type, and default value.
 */

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
  Button,
  CategoryField,
  Input,
  Label,
  PageWrapper,
  RulesetColorPicker,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components';
import { useCustomProperties } from '@/lib/compass-api';
import type { CustomPropertyType } from '@/types';
import { rgbToHex } from '@/utils';
import { Plus, Search, Trash } from 'lucide-react';
import { useMemo, useState } from 'react';
import type { RGBColor } from 'react-color';
import { useParams } from 'react-router-dom';
import { CustomPropertyPicker } from '../items/custom-property-picker';

const PROP_TYPES: CustomPropertyType[] = ['string', 'number', 'boolean', 'color'];

export function ManageCustomProperties() {
  const { rulesetId } = useParams<{ rulesetId: string }>();
  const { customProperties, updateCustomProperty, deleteCustomProperty } =
    useCustomProperties(rulesetId);

  const [nameFilter, setNameFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [createMode, setCreateMode] = useState(false);
  const doNotAsk = localStorage.getItem('qb.confirmOnDelete') === 'false';

  const existingCategories = useMemo(
    () =>
      [...new Set(customProperties.map((cp) => cp.category).filter((c): c is string => !!c))].sort(
        (a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }),
      ),
    [customProperties],
  );

  const categoryFilterOptions = useMemo(
    () => [
      { value: '__all__', label: 'All categories' },
      ...existingCategories.map((c) => ({ value: c, label: c })),
    ],
    [existingCategories],
  );

  const sortedAndFiltered = useMemo(() => {
    let filtered = customProperties;
    if (nameFilter.trim()) {
      filtered = filtered.filter((cp) =>
        cp.label.toLowerCase().includes(nameFilter.toLowerCase().trim()),
      );
    }
    if (categoryFilter && categoryFilter !== '__all__') {
      filtered = filtered.filter((cp) => (cp.category?.trim() ?? '') === categoryFilter);
    }
    return [...filtered].sort((a, b) =>
      a.label.localeCompare(b.label, undefined, { sensitivity: 'base' }),
    );
  }, [customProperties, nameFilter, categoryFilter]);

  const handleCreateSelect = async (id: string) => {
    setPickerOpen(false);
    setCreateMode(false);
  };

  const handleLabelChange = (id: string, label: string) => {
    updateCustomProperty(id, { label });
  };

  const handleTypeChange = (id: string, type: CustomPropertyType) => {
    const newDefault =
      type === 'number' ? 0 : type === 'boolean' ? false : type === 'color' ? '' : '';
    updateCustomProperty(id, { type, defaultValue: newDefault });
  };

  const handleDefaultValueChange = (id: string, value: string | number | boolean) => {
    updateCustomProperty(id, { defaultValue: value });
  };

  const handleCategoryChange = (id: string, value: string | null) => {
    updateCustomProperty(id, { category: value ?? undefined });
  };

  const handleDelete = (id: string) => {
    deleteCustomProperty(id);
  };

  return (
    <PageWrapper
      title='Custom Properties'
      headerActions={
        <Button
          size='sm'
          className='gap-1'
          onClick={() => {
            setCreateMode(true);
            setPickerOpen(true);
          }}>
          <Plus className='h-4 w-4' />
          Create Property
        </Button>
      }
      filterRow={
        <div className='flex flex-wrap items-center gap-4 px-4 py-2'>
          <div className='relative flex-1 min-w-[200px] max-w-[280px]'>
            <Search className='absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none' />
            <Input
              type='search'
              placeholder='Filter by label...'
              value={nameFilter}
              onChange={(e) => setNameFilter(e.target.value)}
              className='pl-9'
              aria-label='Filter custom properties by label'
            />
          </div>
          <div className='flex items-center gap-2'>
            <Label htmlFor='custom-property-category-filter' className='text-sm'>
              Category
            </Label>
            <Select
              value={categoryFilter ?? '__all__'}
              onValueChange={(v) => setCategoryFilter(v === '__all__' ? null : v)}>
              <SelectTrigger id='custom-property-category-filter' className='w-[180px]'>
                <SelectValue placeholder='All categories' />
              </SelectTrigger>
              <SelectContent>
                {categoryFilterOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      }>
      <CustomPropertyPicker
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        onSelect={handleCreateSelect}
        initialMode={createMode ? 'create' : 'select'}
      />

      <div className='rounded-md border'>
        {sortedAndFiltered.length === 0 ? (
          <div className='flex flex-col items-center justify-center py-12 text-center px-4'>
            <p className='text-sm font-medium'>
              {nameFilter.trim() || categoryFilter
                ? 'No matching custom properties'
                : 'Add custom properties in ruleset settings'}
            </p>
            <p className='text-sm text-muted-foreground mb-4'>
              {nameFilter.trim() || categoryFilter
                ? 'Try a different filter.'
                : 'Create custom properties for characters and items.'}
            </p>
            {!nameFilter.trim() && !categoryFilter && (
              <Button
                variant='outline'
                size='sm'
                className='gap-1'
                onClick={() => {
                  setCreateMode(true);
                  setPickerOpen(true);
                }}>
                <Plus className='h-4 w-4' />
                Create
              </Button>
            )}
          </div>
        ) : (
          <div className='divide-y'>
            {sortedAndFiltered.map((cp) => (
              <div key={cp.id} className='flex items-center gap-4 px-4 py-3 hover:bg-muted/50'>
                <div className='flex-1 min-w-0 flex flex-row items-end gap-4'>
                  <div className='flex flex-col gap-1 min-w-[120px] flex-1'>
                    <Label className='text-xs text-muted-foreground'>Label</Label>
                    <Input
                      value={cp.label}
                      onChange={(e) => handleLabelChange(cp.id, e.target.value)}
                      onBlur={(e) => handleLabelChange(cp.id, e.target.value)}
                      placeholder='Label'
                      className='h-8'
                    />
                  </div>
                  <div className='flex flex-col gap-1 min-w-[140px] flex-1'>
                    <CategoryField
                      value={cp.category ?? null}
                      onChange={(v) => handleCategoryChange(cp.id, v)}
                      existingCategories={existingCategories}
                      placeholder='Category'
                      label=''
                      className='h-8'
                    />
                  </div>
                  <div className='flex flex-col gap-1 w-[120px] shrink-0'>
                    <Label className='text-xs text-muted-foreground'>Type</Label>
                    <Select
                      value={cp.type}
                      onValueChange={(v) => handleTypeChange(cp.id, v as CustomPropertyType)}>
                      <SelectTrigger className='h-8'>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PROP_TYPES.map((t) => (
                          <SelectItem key={t} value={t}>
                            {t}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className='flex flex-col gap-1 min-w-[140px] flex-1'>
                    <Label className='text-xs text-muted-foreground'>Default value</Label>
                    {cp.type === 'boolean' ? (
                      <Select
                        value={String(cp.defaultValue ?? false)}
                        onValueChange={(v) => handleDefaultValueChange(cp.id, v === 'true')}>
                        <SelectTrigger className='h-8'>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value='false'>false</SelectItem>
                          <SelectItem value='true'>true</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : cp.type === 'color' ? (
                      <div className='flex items-center gap-2'>
                        <RulesetColorPicker
                          color={(cp.defaultValue as string) || undefined}
                          label='Default color'
                          disableAlpha
                          onUpdate={(color: RGBColor) =>
                            handleDefaultValueChange(cp.id, rgbToHex(color.r, color.g, color.b))
                          }
                        />
                        <Input
                          value={(cp.defaultValue as string) || ''}
                          onChange={(e) => handleDefaultValueChange(cp.id, e.target.value)}
                          placeholder='#000000'
                          className='h-8 flex-1 max-w-[120px]'
                        />
                      </div>
                    ) : cp.type === 'number' ? (
                      <Input
                        type='number'
                        value={String(cp.defaultValue ?? '')}
                        onChange={(e) =>
                          handleDefaultValueChange(
                            cp.id,
                            e.target.value === '' ? 0 : Number(e.target.value),
                          )
                        }
                        placeholder='0'
                        className='h-8'
                      />
                    ) : (
                      <Input
                        value={String(cp.defaultValue ?? '')}
                        onChange={(e) => handleDefaultValueChange(cp.id, e.target.value)}
                        placeholder='Default'
                        className='h-8'
                      />
                    )}
                  </div>
                </div>
                <div className='flex items-center gap-1 shrink-0'>
                  {doNotAsk ? (
                    <Button
                      variant='ghost'
                      size='sm'
                      onClick={() => handleDelete(cp.id)}
                      className='text-destructive hover:text-destructive'>
                      <Trash className='h-4 w-4' />
                    </Button>
                  ) : (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant='ghost'
                          size='sm'
                          className='text-destructive hover:text-destructive'>
                          <Trash className='h-4 w-4' />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>
                            Delete custom property &quot;{cp.label}&quot;?
                          </AlertDialogTitle>
                          <AlertDialogDescription>
                            Delete custom property &quot;{cp.label}&quot;?
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDelete(cp.id)}
                            className='bg-destructive text-destructive-foreground hover:bg-destructive/90'>
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </PageWrapper>
  );
}
