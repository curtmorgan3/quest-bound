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
import type { Archetype, ArchetypeWithVariantOptions } from '@/types';
import { useVirtualizer } from '@tanstack/react-virtual';
import { Check, ChevronsUpDown, XIcon } from 'lucide-react';
import type { RefObject } from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useArchetypes } from '@/lib/compass-api/hooks/archetypes/use-archetypes';

type ListRow = { type: 'entry'; entry: Archetype; estimatedSize: number };

interface ArchetypeLookupProps {
  /** Ruleset ID - required to fetch archetypes */
  rulesetId: string | undefined;
  /** Callback fired when an archetype is selected */
  onSelect: (archetype: Archetype) => void;
  /** Callback fired when the delete button is clicked */
  onDelete?: () => void;
  /** Optional placeholder text for the input */
  placeholder?: string;
  /** Optional className for the trigger button */
  className?: string;
  /** Optional value to show a pre-selected archetype by ID */
  value?: string | null;
  /** Optional disabled state */
  disabled?: boolean;
  label?: string;
  id?: string;
  'data-testid'?: string;
  allowDefault?: boolean;
  /** Applied to the popover content. Use e.g. z-[110] when rendered inside a portaled overlay. */
  popoverContentClassName?: string;
  wrapperClassName?: string;
  /** Archetype IDs to exclude from the list (e.g. already added to character). */
  excludeIds?: string[];
  /** When the selected archetype has variants, current variant value (or null for none). */
  variantValue?: string | null;
  /** Callback when user selects or clears a variant. Only used when selected archetype has variantOptions. */
  onVariantSelect?: (variant: string | null) => void;
  /** Placeholder for the variant lookup when shown. */
  variantPlaceholder?: string;
  /** Label for the variant lookup when shown. */
  variantLabel?: string;
  /** When set, popover content is portaled into this element (e.g. Sheet content) so scroll works inside modals. */
  popoverContainerRef?: RefObject<HTMLElement | null>;
}

export const ArchetypeLookup = ({
  rulesetId,
  onSelect,
  onDelete,
  placeholder = 'Search archetypes...',
  className,
  wrapperClassName = '',
  value,
  disabled = false,
  label = 'Archetype',
  id,
  'data-testid': dataTestId,
  allowDefault = false,
  popoverContentClassName,
  excludeIds,
  variantValue = null,
  onVariantSelect,
  variantPlaceholder = 'Select variant...',
  variantLabel = 'Variant',
  popoverContainerRef,
}: ArchetypeLookupProps) => {
  const [open, setOpen] = useState(false);
  const [variantOpen, setVariantOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [variantSearch, setVariantSearch] = useState('');
  const parentRef = useRef<HTMLDivElement>(null);
  const variantParentRef = useRef<HTMLDivElement>(null);
  const { archetypes: allArchetypes } = useArchetypes(rulesetId);
  const archetypes = useMemo(() => {
    let list = allArchetypes.filter((arch) => {
      if (allowDefault) return true;
      return !arch.isDefault;
    });
    if (excludeIds?.length) {
      const set = new Set(excludeIds);
      list = list.filter((a) => !set.has(a.id));
    }
    return list;
  }, [allArchetypes, allowDefault, excludeIds]);

  const selectedArchetype = value ? archetypes.find((a) => a.id === value) : undefined;
  const selectedWithVariants = selectedArchetype as ArchetypeWithVariantOptions | undefined;
  const variantOptions = selectedWithVariants?.variantOptions ?? [];
  const hasVariants = variantOptions.length > 0 && onVariantSelect;

  const searchLower = search.toLowerCase().trim();
  const filteredArchetypes = useMemo(() => {
    if (!searchLower) return archetypes;
    return archetypes.filter(
      (a) =>
        a.name.toLowerCase().includes(searchLower) ||
        (a.description?.toLowerCase().includes(searchLower) ?? false),
    );
  }, [archetypes, searchLower]);

  const rows = useMemo((): ListRow[] => {
    return filteredArchetypes.map((a) => ({
      type: 'entry' as const,
      entry: a,
      estimatedSize: a.description ? 56 : 40,
    }));
  }, [filteredArchetypes]);

  const variantSearchLower = variantSearch.toLowerCase().trim();
  const filteredVariants = useMemo(() => {
    if (!variantSearchLower) return variantOptions;
    return variantOptions.filter((v) => v.toLowerCase().includes(variantSearchLower));
  }, [variantOptions, variantSearchLower]);

  const variantRows = useMemo(() => {
    const list: { value: string | null; estimatedSize: number }[] = [
      { value: null, estimatedSize: 40 },
    ];
    for (const v of filteredVariants) {
      list.push({ value: v, estimatedSize: 40 });
    }
    return list;
  }, [filteredVariants]);

  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: (index) => rows[index]?.estimatedSize ?? 44,
    overscan: 5,
  });

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

  const variantVirtualizer = useVirtualizer({
    count: variantRows.length,
    getScrollElement: () => variantParentRef.current,
    estimateSize: (index) => variantRows[index]?.estimatedSize ?? 40,
    overscan: 5,
  });

  useEffect(() => {
    if (variantOpen) setVariantSearch('');
  }, [variantOpen]);

  useEffect(() => {
    if (!variantOpen || variantRows.length === 0) return;
    const raf = requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        variantVirtualizer.measure();
      });
    });
    return () => cancelAnimationFrame(raf);
  }, [variantOpen, variantRows.length, variantVirtualizer]);

  const handleSelect = (archetype: Archetype) => {
    onSelect(archetype);
    setOpen(false);
  };

  const handleVariantSelect = (value: string | null) => {
    onVariantSelect?.(value);
    setVariantOpen(false);
  };

  return (
    <div className={`flex flex-col gap-1 ${wrapperClassName}`} id={id}>
      <Label className='text-xs text-muted-foreground'>{label}</Label>
      <div className='flex gap-2'>
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant='outline'
              role='combobox'
              aria-expanded={open}
              className={cn('w-full justify-between h-[32px]', className)}
              disabled={disabled || !rulesetId}
              data-testid={dataTestId}>
              {selectedArchetype ? (
                <span className='truncate'>
                  {selectedArchetype.name}
                  {selectedArchetype.isDefault && (
                    <span className='text-muted-foreground ml-1'>(default)</span>
                  )}
                </span>
              ) : (
                placeholder
              )}
              <>
                {selectedArchetype && (
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
          <PopoverContent
            className={cn('w-[300px] p-0', popoverContentClassName)}
            align='start'
            container={popoverContainerRef?.current ?? undefined}>
            <Command shouldFilter={false}>
              <CommandInput placeholder={placeholder} value={search} onValueChange={setSearch} />
              <CommandList>
                <CommandEmpty>No archetypes found.</CommandEmpty>
                {rows.length > 0 && (
                  <div
                    ref={parentRef}
                    className='h-[300px] overflow-auto'
                    style={{ contain: 'strict' }}
                    onWheel={(e) => e.stopPropagation()}>
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
                            key={row.entry.id}
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
                            <CommandItem
                              value={`${row.entry.name} ${row.entry.description ?? ''}`}
                              onSelect={() => handleSelect(row.entry)}>
                              <Check
                                className={cn(
                                  'mr-2 h-4 w-4',
                                  selectedArchetype?.id === row.entry.id
                                    ? 'opacity-100'
                                    : 'opacity-0',
                                )}
                              />
                              <div className='flex flex-col'>
                                <span>
                                  {row.entry.name}
                                  {row.entry.isDefault && (
                                    <span className='text-muted-foreground ml-1 text-xs'>
                                      (default)
                                    </span>
                                  )}
                                </span>
                                {row.entry.description && (
                                  <span className='text-xs text-muted-foreground truncate max-w-[220px]'>
                                    {row.entry.description}
                                  </span>
                                )}
                              </div>
                            </CommandItem>
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

      {hasVariants && (
        <div className='flex flex-col gap-1'>
          <Label className='text-xs text-muted-foreground'>{variantLabel}</Label>
          <div className='flex gap-2'>
            <Popover open={variantOpen} onOpenChange={setVariantOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant='outline'
                  role='combobox'
                  aria-expanded={variantOpen}
                  className={cn('w-full justify-between h-[32px]', className)}
                  disabled={disabled}>
                  {variantValue ?? variantPlaceholder}
                  <ChevronsUpDown className='ml-2 h-4 w-4 shrink-0 opacity-50' />
                </Button>
              </PopoverTrigger>
              <PopoverContent
                className={cn('w-[300px] p-0', popoverContentClassName)}
                align='start'
                container={popoverContainerRef?.current ?? undefined}>
                <Command shouldFilter={false}>
                  <CommandInput
                    placeholder='Search variants...'
                    value={variantSearch}
                    onValueChange={setVariantSearch}
                  />
                  <CommandList>
                    <CommandEmpty>No variants found.</CommandEmpty>
                    {variantRows.length > 0 && (
                      <div
                        ref={variantParentRef}
                        className='h-[200px] overflow-auto'
                        style={{ contain: 'strict' }}
                        onWheel={(e) => e.stopPropagation()}>
                        <div
                          style={{
                            height: `${variantVirtualizer.getTotalSize()}px`,
                            width: '100%',
                            position: 'relative',
                          }}>
                          {variantVirtualizer.getVirtualItems().map((virtualRow) => {
                            const row = variantRows[virtualRow.index];
                            if (!row) return null;
                            const isNone = row.value === null;
                            const displayLabel = isNone ? 'None' : row.value;
                            const isSelected =
                              (isNone && !variantValue) || (!isNone && variantValue === row.value);
                            return (
                              <div
                                key={isNone ? '__none__' : row.value}
                                data-index={virtualRow.index}
                                ref={variantVirtualizer.measureElement}
                                style={{
                                  position: 'absolute',
                                  top: 0,
                                  left: 0,
                                  width: '100%',
                                  transform: `translateY(${virtualRow.start}px)`,
                                }}
                                className='pb-0.5'>
                                <CommandItem
                                  value={displayLabel ?? ''}
                                  onSelect={() => handleVariantSelect(row.value)}>
                                  <Check
                                    className={cn(
                                      'mr-2 h-4 w-4',
                                      isSelected ? 'opacity-100' : 'opacity-0',
                                    )}
                                  />
                                  <span>{displayLabel}</span>
                                </CommandItem>
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
      )}
    </div>
  );
};
