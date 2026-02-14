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
import type { Attribute, AttributeType } from '@/types';
import { useVirtualizer } from '@tanstack/react-virtual';
import { Check, ChevronsUpDown, XIcon } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useAttributes } from '../hooks/rulesets/use-attributes';

type ListRow =
  | { type: 'category'; label: string; estimatedSize: number }
  | { type: 'entry'; entry: Attribute; estimatedSize: number };

interface AttributeLookupProps {
  /** Callback fired when an attribute is selected */
  onSelect: (attribute: Attribute) => void;
  /** Callback fired when the delete button is clicked */
  onDelete?: () => void;
  /** Optional placeholder text for the input */
  placeholder?: string;
  /** Optional className for the trigger button */
  className?: string;
  /** Optional value to show a pre-selected attribute by ID */
  value?: string | null;
  /** Optional disabled state */
  disabled?: boolean;
  /** Filter lookup by type */
  filterType?: AttributeType;
  label?: string;
}

export const AttributeLookup = ({
  onSelect,
  onDelete,
  placeholder = 'Search attributes...',
  className,
  value,
  disabled = false,
  filterType,
  label = 'Attribute',
}: AttributeLookupProps) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const parentRef = useRef<HTMLDivElement>(null);
  const { attributes: allAttributes } = useAttributes();
  const attributes = filterType
    ? allAttributes.filter((a) => a.type === filterType)
    : allAttributes;

  const selectedAttribute = value ? attributes.find((attr) => attr.id === value) : undefined;

  const searchLower = search.toLowerCase().trim();
  const groupedAttributes = useMemo(() => {
    const filtered = searchLower
      ? attributes.filter(
          (attr) =>
            attr.title.toLowerCase().includes(searchLower) ||
            (attr.description ?? '').toLowerCase().includes(searchLower) ||
            (attr.category ?? 'Uncategorized').toLowerCase().includes(searchLower),
        )
      : attributes;

    return filtered.reduce(
      (acc, attr) => {
        const category = attr.category || 'Uncategorized';
        if (!acc[category]) {
          acc[category] = [];
        }
        acc[category].push(attr);
        return acc;
      },
      {} as Record<string, Attribute[]>,
    );
  }, [attributes, searchLower]);

  const rows = useMemo((): ListRow[] => {
    const result: ListRow[] = [];
    const categories = Object.keys(groupedAttributes).sort();
    for (const category of categories) {
      result.push({ type: 'category', label: category, estimatedSize: 24 });
      for (const attr of groupedAttributes[category]) {
        const hasDescription = Boolean(attr.description);
        result.push({
          type: 'entry',
          entry: attr,
          estimatedSize: hasDescription ? 56 : 40,
        });
      }
    }
    return result;
  }, [groupedAttributes]);

  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: (index) => rows[index]?.estimatedSize ?? 44,
    overscan: 5,
  });

  // Reset search when popover opens so the list isn't cleared by stale/cmdk-driven filter state
  useEffect(() => {
    if (open) setSearch('');
  }, [open]);

  useEffect(() => {
    if (!open || rows.length === 0) return;
    const raf = requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        virtualizer.measure();
      });
    });
    return () => cancelAnimationFrame(raf);
  }, [open, rows.length, virtualizer]);

  const handleSelect = (attribute: Attribute) => {
    onSelect(attribute);
    setOpen(false);
  };

  return (
    <div className='flex flex-col gap-2'>
      <Label>{label}</Label>
      <div className={`flex gap-2`}>
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant='outline'
              role='combobox'
              aria-expanded={open}
              className={cn('w-full justify-between', className)}
              disabled={disabled}>
              {selectedAttribute ? selectedAttribute.title : placeholder}
              <>
                {selectedAttribute && (
                  <div
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete?.();
                    }}
                    style={{ flexGrow: 1, display: 'flex', justifyContent: 'end' }}>
                    <XIcon className='clickable' fontSize={12} />
                  </div>
                )}
                <ChevronsUpDown className='ml-2 h-4 w-4 shrink-0 opacity-50' />
              </>
            </Button>
          </PopoverTrigger>
          <PopoverContent className='w-[300px] p-0' align='start'>
            <Command shouldFilter={false}>
              <CommandInput placeholder={placeholder} value={search} onValueChange={setSearch} />
              <CommandList>
                <CommandEmpty>No attributes found.</CommandEmpty>
                {rows.length > 0 && (
                  <div
                    ref={parentRef}
                    className='h-[300px] overflow-auto'
                    style={{ contain: 'strict' }}>
                    <div
                      style={{
                        height: `${virtualizer.getTotalSize()}px`,
                        width: '100%',
                        position: 'relative',
                      }}>
                      {virtualizer.getVirtualItems().map((virtualRow) => {
                        const row = rows[virtualRow.index];
                        if (!row) return null;
                        return (
                          <div
                            key={virtualRow.key}
                            data-index={virtualRow.index}
                            ref={virtualizer.measureElement}
                            style={{
                              position: 'absolute',
                              top: 0,
                              left: 0,
                              width: '100%',
                              transform: `translateY(${virtualRow.start}px)`,
                            }}
                            className='pb-0.5'>
                            {row.type === 'category' && (
                              <div className='text-muted-foreground px-2 py-1.5 text-xs font-medium'>
                                {row.label}
                              </div>
                            )}
                            {row.type === 'entry' && (
                              <CommandItem
                                value={`${row.entry.title} ${row.entry.description ?? ''}`}
                                onSelect={() => handleSelect(row.entry)}>
                                <Check
                                  className={cn(
                                    'mr-2 h-4 w-4',
                                    selectedAttribute?.id === row.entry.id
                                      ? 'opacity-100'
                                      : 'opacity-0',
                                  )}
                                />
                                <div className='flex flex-col'>
                                  <span>{row.entry.title}</span>
                                  {row.entry.description && (
                                    <span className='text-xs text-muted-foreground truncate max-w-[220px]'>
                                      {row.entry.description}
                                    </span>
                                  )}
                                </div>
                              </CommandItem>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
};
