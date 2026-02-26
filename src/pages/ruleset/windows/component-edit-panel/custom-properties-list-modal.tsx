import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components';
import { useActiveRuleset, useCustomProperties } from '@/lib/compass-api';
import { Search } from 'lucide-react';
import { useMemo, useState } from 'react';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect?: (customPropertyId: string) => void;
}

export function CustomPropertiesListModal({ open, onOpenChange, onSelect }: Props) {
  const { activeRuleset } = useActiveRuleset();
  const { customProperties } = useCustomProperties(activeRuleset?.id);
  const [nameFilter, setNameFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);

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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='min-w-[420px] max-w-[90vw] max-h-[85vh] overflow-hidden flex flex-col'>
        <DialogTitle>Custom properties</DialogTitle>
        <DialogDescription>Assign a character's custom property to this value.</DialogDescription>
        <div className='flex flex-wrap items-end gap-4 py-2'>
          <div className='relative flex-1 min-w-[200px] max-w-[280px]'>
            <Search className='absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none' />
            <Input
              type='search'
              placeholder='Filter by name...'
              value={nameFilter}
              onChange={(e) => setNameFilter(e.target.value)}
              className='pl-9'
              aria-label='Filter custom properties by name'
            />
          </div>
          <div className='flex flex-col gap-1.5'>
            <Label htmlFor='custom-property-category-filter-modal' className='text-sm'>
              Category
            </Label>
            <Select
              value={categoryFilter ?? '__all__'}
              onValueChange={(v) => setCategoryFilter(v === '__all__' ? null : v)}>
              <SelectTrigger id='custom-property-category-filter-modal' className='w-[180px]'>
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
        <div className='rounded-md border flex-1 min-h-0 overflow-auto'>
          {sortedAndFiltered.length === 0 ? (
            <div className='flex flex-col items-center justify-center py-12 text-center px-4'>
              <p className='text-sm text-muted-foreground'>
                {nameFilter.trim() || categoryFilter
                  ? 'No matching custom properties'
                  : 'Add custom properties in ruleset settings'}
              </p>
            </div>
          ) : (
            <ul className='divide-y'>
              {sortedAndFiltered.map((cp) => (
                <li key={cp.id}>
                  <button
                    type='button'
                    onClick={() => onSelect?.(cp.id)}
                    className='w-full flex items-center justify-between gap-4 px-4 py-2.5 hover:bg-muted/50 text-left'>
                    <span className='font-medium truncate'>{cp.label}</span>
                    <div className='flex items-center gap-2 shrink-0 text-sm text-muted-foreground'>
                      {cp.category && (
                        <span className='rounded bg-muted px-1.5 py-0.5'>{cp.category}</span>
                      )}
                      <span>{cp.type}</span>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
