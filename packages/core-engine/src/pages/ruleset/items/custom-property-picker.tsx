import {
  Button,
  CategoryField,
  Checkbox,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  ImageUpload,
  Input,
  Label,
  RulesetColorPicker,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components';
import { useActiveRuleset, useAssets, useCustomProperties } from '@/lib/compass-api';
import type { CustomPropertyType } from '@/types';
import { rgbToHex } from '@/utils';
import { Plus, Search } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
const PROP_TYPES: CustomPropertyType[] = ['string', 'number', 'boolean', 'color', 'image'];

interface CustomPropertyPickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (customPropertyId: string) => void;
  excludeIds?: string[];
  /** When set, open directly in create mode instead of select. */
  initialMode?: 'select' | 'create';
}

export function CustomPropertyPicker({
  open,
  onOpenChange,
  onSelect,
  excludeIds = [],
  initialMode = 'select',
}: CustomPropertyPickerProps) {
  const { activeRuleset } = useActiveRuleset();
  const { customProperties, createCustomProperty } = useCustomProperties(activeRuleset?.id);
  const [mode, setMode] = useState<'select' | 'create'>(initialMode);
  const { assets } = useAssets();

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (open) {
      setMode(initialMode);
      setLabelFilter('');
      setCategoryFilter('__all__');
      setSelectedIds(new Set());
    }
  }, [open, initialMode]);

  const [createLabel, setCreateLabel] = useState('');
  const [createType, setCreateType] = useState<CustomPropertyType>('string');
  const [createCategory, setCreateCategory] = useState('');
  const [createDefaultValue, setCreateDefaultValue] = useState('');
  const [creating, setCreating] = useState(false);

  const selectedAsset = assets.find((a) => a.id === createDefaultValue);

  const available = customProperties.filter((cp) => !excludeIds.includes(cp.id));

  const [labelFilter, setLabelFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('__all__');

  const existingCategories = useMemo(
    () =>
      [...new Set(available.map((cp) => cp.category).filter((c): c is string => !!c))].sort(
        (a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }),
      ),
    [available],
  );

  const categoryFilterOptions = useMemo(
    () => [
      { value: '__all__', label: 'All categories' },
      ...existingCategories.map((c) => ({ value: c, label: c })),
    ],
    [existingCategories],
  );

  const filteredAvailable = useMemo(() => {
    let filtered = available;
    if (labelFilter.trim()) {
      filtered = filtered.filter((cp) =>
        cp.label.toLowerCase().includes(labelFilter.toLowerCase().trim()),
      );
    }
    if (categoryFilter && categoryFilter !== '__all__') {
      filtered = filtered.filter((cp) => (cp.category?.trim() ?? '') === categoryFilter);
    }
    return [...filtered].sort((a, b) =>
      a.label.localeCompare(b.label, undefined, { sensitivity: 'base' }),
    );
  }, [available, labelFilter, categoryFilter]);

  const toggleSelected = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleAddSelected = useCallback(async () => {
    for (const id of selectedIds) {
      await Promise.resolve(onSelect(id));
    }
    onOpenChange(false);
  }, [selectedIds, onSelect, onOpenChange]);

  const handleCreate = useCallback(async () => {
    if (!createLabel.trim() || !activeRuleset) return;
    setCreating(true);
    try {
      const defaultValue =
        createType === 'number'
          ? createDefaultValue === ''
            ? 0
            : Number(createDefaultValue)
          : createType === 'boolean'
            ? createDefaultValue === 'true'
            : createType === 'color'
              ? createDefaultValue || ''
              : createDefaultValue;
      const id = await createCustomProperty({
        label: createLabel.trim(),
        type: createType,
        category: createCategory.trim() || undefined,
        defaultValue,
      });
      if (id) {
        onSelect(id);
        onOpenChange(false);
      }
      setCreateLabel('');
      setCreateCategory('');
      setCreateDefaultValue('');
      setMode('select');
    } finally {
      setCreating(false);
    }
  }, [
    createLabel,
    createType,
    createCategory,
    createDefaultValue,
    activeRuleset,
    createCustomProperty,
    onSelect,
    onOpenChange,
  ]);

  const handleClose = useCallback(() => {
    setMode('select');
    setCreateLabel('');
    setCreateCategory('');
    setCreateDefaultValue('');
    setLabelFilter('');
    setCategoryFilter('__all__');
    setSelectedIds(new Set());
    onOpenChange(false);
  }, [onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className='min-w-[360px] max-w-[90vw]'>
        <DialogHeader>
          <DialogTitle>
            {mode === 'select' ? 'Select custom property' : 'Create custom property'}
          </DialogTitle>
          <DialogDescription>
            {mode === 'select' ? 'Select custom property' : 'Create custom property'}
          </DialogDescription>
        </DialogHeader>
        {mode === 'select' ? (
          <div className='flex flex-col gap-4'>
            {available.length === 0 ? (
              <>
                <p className='text-sm text-muted-foreground'>
                  No unused custom properties in this ruleset. Create one first.
                </p>
                <Button
                  variant='outline'
                  size='sm'
                  className='gap-1 w-fit'
                  onClick={() => setMode('create')}>
                  <Plus className='h-4 w-4' />
                  Create new
                </Button>
              </>
            ) : (
              <>
                <div className='flex flex-col gap-2'>
                  <div className='relative'>
                    <Search className='absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground' />
                    <Input
                      placeholder='Filter by label'
                      value={labelFilter}
                      onChange={(e) => setLabelFilter(e.target.value)}
                      className='h-8 pl-8'
                      aria-label='Filter by label'
                    />
                  </div>
                  <div className='grid gap-1.5'>
                    <Label htmlFor='custom-property-picker-category' className='text-xs'>
                      Category
                    </Label>
                    <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                      <SelectTrigger id='custom-property-picker-category' className='h-8'>
                        <SelectValue />
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
                {filteredAvailable.length === 0 ? (
                  <p className='text-sm text-muted-foreground'>No properties match the filter.</p>
                ) : (
                  <div className='flex flex-col gap-1 max-h-[240px] overflow-auto'>
                    {filteredAvailable.map((cp) => (
                      <label
                        key={cp.id}
                        className='flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 hover:bg-accent/50 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring'>
                        <Checkbox
                          checked={selectedIds.has(cp.id)}
                          onCheckedChange={() => toggleSelected(cp.id)}
                          onKeyDown={(e) => e.key === 'Enter' && toggleSelected(cp.id)}
                        />
                        <span className='flex-1 text-left'>
                          {cp.label}
                          <span className='ml-2 text-xs text-muted-foreground'>({cp.type})</span>
                        </span>
                      </label>
                    ))}
                  </div>
                )}
                <DialogFooter>
                  <Button
                    variant='outline'
                    size='sm'
                    className='gap-1'
                    onClick={() => setMode('create')}>
                    <Plus className='h-4 w-4' />
                    Create new
                  </Button>
                  <Button size='sm' onClick={handleAddSelected} disabled={selectedIds.size === 0}>
                    Add {selectedIds.size > 0 ? `(${selectedIds.size})` : ''}
                  </Button>
                </DialogFooter>
              </>
            )}
          </div>
        ) : (
          <div className='flex flex-col gap-4'>
            <div className='grid gap-2'>
              <Label>Label</Label>
              <Input
                placeholder='e.g. Armor Value'
                value={createLabel}
                onChange={(e) => setCreateLabel(e.target.value)}
              />
            </div>
            <div className='grid gap-2'>
              <Label>Type</Label>
              <Select
                value={createType}
                onValueChange={(v) => {
                  setCreateType(v as CustomPropertyType);
                  setCreateDefaultValue('');
                }}>
                <SelectTrigger>
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
            <CategoryField
              value={createCategory || null}
              onChange={(v) => setCreateCategory(v ?? '')}
              existingCategories={[
                ...new Set(
                  customProperties.map((cp) => cp.category).filter((c): c is string => !!c),
                ),
              ]}
              placeholder='e.g. Combat'
              label='Category (optional)'
            />
            <div className='grid gap-2'>
              <Label>Default value (optional)</Label>
              {createType === 'boolean' ? (
                <Select value={createDefaultValue || 'false'} onValueChange={setCreateDefaultValue}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='false'>false</SelectItem>
                    <SelectItem value='true'>true</SelectItem>
                  </SelectContent>
                </Select>
              ) : createType === 'color' ? (
                <RulesetColorPicker
                  color={createDefaultValue || undefined}
                  label='Default color'
                  disableAlpha
                  onUpdate={(value) => {
                    if (typeof value === 'string') return;
                    setCreateDefaultValue(rgbToHex(value.r, value.g, value.b));
                  }}
                />
              ) : createType === 'image' ? (
                <ImageUpload
                  image={selectedAsset?.data || undefined}
                  rulesetId={activeRuleset?.id}
                  onUpload={(assetId) => setCreateDefaultValue(assetId)}
                  onRemove={() => setCreateDefaultValue('')}
                  hideSelectAsset={false}
                  height={64}
                  width={64}
                />
              ) : (
                <Input
                  type={createType === 'number' ? 'number' : 'text'}
                  placeholder={createType === 'number' ? '0' : 'Default'}
                  value={createDefaultValue}
                  onChange={(e) => setCreateDefaultValue(e.target.value)}
                />
              )}
            </div>
            <DialogFooter>
              <Button variant='outline' onClick={() => setMode('select')}>
                Back
              </Button>
              <Button onClick={handleCreate} disabled={!createLabel.trim() || creating}>
                {creating ? 'Creating…' : 'Create'}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
