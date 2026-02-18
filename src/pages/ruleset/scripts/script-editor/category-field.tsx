import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { useScripts } from '@/lib/compass-api';
import { Check, ChevronsUpDown, Plus, XIcon } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

export interface CategoryFieldProps {
  value: string | null;
  onChange: (value: string | null) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  label?: string;
}

/**
 * Type-ahead dropdown for script category. Shows all categories used across
 * scripts in the current ruleset. When no match is found, shows an action
 * to create a category from the current field value.
 */
export function CategoryField({
  value,
  onChange,
  placeholder = 'Search categories...',
  className,
  disabled = false,
  label = 'Category',
}: CategoryFieldProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const { scripts } = useScripts();

  const allCategories = useMemo(() => {
    const categories = new Set<string>();
    for (const script of scripts) {
      const cat = script.category?.trim();
      if (cat) categories.add(cat);
    }
    return Array.from(categories).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
  }, [scripts]);

  const searchLower = search.toLowerCase().trim();
  const filteredCategories = useMemo(() => {
    if (!searchLower) return allCategories;
    return allCategories.filter((cat) => cat.toLowerCase().includes(searchLower));
  }, [allCategories, searchLower]);

  const canCreateFromSearch =
    searchLower.length > 0 &&
    !allCategories.some((c) => c.toLowerCase() === searchLower);
  const displayValue = value ?? '';

  useEffect(() => {
    if (open) setSearch('');
  }, [open]);

  const handleSelect = (category: string) => {
    onChange(category);
    setOpen(false);
  };

  const handleCreate = () => {
    const newCategory = search.trim();
    if (newCategory) {
      onChange(newCategory);
      setOpen(false);
    }
  };

  return (
    <div className='flex flex-col gap-2'>
      <Label>{label}</Label>
      <div className='flex gap-2'>
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant='outline'
              role='combobox'
              aria-expanded={open}
              className={cn('w-full justify-between', className)}
              disabled={disabled}>
              {displayValue || placeholder}
              <>
                {value && (
                  <div
                    onClick={(e) => {
                      e.stopPropagation();
                      onChange(null);
                    }}
                    style={{ flexGrow: 1, display: 'flex', justifyContent: 'end' }}>
                    <XIcon className='clickable' fontSize={12} />
                  </div>
                )}
                <ChevronsUpDown className='ml-2 h-4 w-4 shrink-0 opacity-50' />
              </>
            </Button>
          </PopoverTrigger>
          <PopoverContent className='w-[240px] p-0' align='start'>
            <Command shouldFilter={false}>
              <CommandInput placeholder={placeholder} value={search} onValueChange={setSearch} />
              <CommandList>
                {canCreateFromSearch && (
                  <CommandItem onSelect={handleCreate}>
                    <Plus className='mr-2 h-4 w-4' />
                    Create &quot;{search.trim()}&quot;
                  </CommandItem>
                )}
                {filteredCategories.map((cat) => (
                  <CommandItem key={cat} value={cat} onSelect={() => handleSelect(cat)}>
                    <Check className={cn('mr-2 h-4 w-4', value === cat ? 'opacity-100' : 'opacity-0')} />
                    {cat}
                  </CommandItem>
                ))}
                {filteredCategories.length === 0 && !canCreateFromSearch && (
                  <CommandEmpty>No categories found.</CommandEmpty>
                )}
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}
