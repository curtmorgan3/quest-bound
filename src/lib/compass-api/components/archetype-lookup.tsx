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
import type { Archetype } from '@/types';
import { useVirtualizer } from '@tanstack/react-virtual';
import { Check, ChevronsUpDown, XIcon } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useArchetypes } from '../hooks/archetypes/use-archetypes';

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
}

export const ArchetypeLookup = ({
  rulesetId,
  onSelect,
  onDelete,
  placeholder = 'Search archetypes...',
  className,
  value,
  disabled = false,
  label = 'Archetype',
  id,
  'data-testid': dataTestId,
}: ArchetypeLookupProps) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const parentRef = useRef<HTMLDivElement>(null);
  const { archetypes: allArchetypes } = useArchetypes(rulesetId);
  const archetypes = allArchetypes.filter((arch) => !arch.isDefault);

  const selectedArchetype = value ? archetypes.find((a) => a.id === value) : undefined;

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

  const handleSelect = (archetype: Archetype) => {
    onSelect(archetype);
    setOpen(false);
  };

  return (
    <div className='flex flex-col gap-2' id={id}>
      <Label>{label}</Label>
      <div className='flex gap-2'>
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant='outline'
              role='combobox'
              aria-expanded={open}
              className={cn('w-full justify-between', className)}
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
          <PopoverContent className='w-[300px] p-0' align='start'>
            <Command shouldFilter={false}>
              <CommandInput placeholder={placeholder} value={search} onValueChange={setSearch} />
              <CommandList>
                <CommandEmpty>No archetypes found.</CommandEmpty>
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
    </div>
  );
};
