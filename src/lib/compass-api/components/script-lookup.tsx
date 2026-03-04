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
import type { Script, ScriptEntityType } from '@/types';
import { useVirtualizer } from '@tanstack/react-virtual';
import { Check, ChevronsUpDown, XIcon } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useScripts } from '../hooks/scripts/use-scripts';

type ListRow =
  | { type: 'category'; label: string; estimatedSize: number }
  | { type: 'entry'; entry: Script; estimatedSize: number };

interface ScriptLookupProps {
  /** Callback fired when a script is selected */
  onSelect: (script: Script) => void;
  /** Callback fired when the delete button is clicked */
  onDelete?: () => void;
  /** Optional placeholder text for the input */
  placeholder?: string;
  /** Optional className for the trigger button */
  className?: string;
  /** Optional value to show a pre-selected script by ID */
  value?: string | null;
  /** Optional disabled state */
  disabled?: boolean;
  /** Filter lookup by script entityType (attribute, action, item, global, etc.) */
  filterEntityType?: ScriptEntityType;
  /** Filter lookup by script category */
  filterCategory?: string;
  /** Exclude these script IDs from the list (e.g. when building a multi-select) */
  excludeIds?: string[];
  /** Optional campaign context; when set, only scripts for this campaign are shown */
  campaignId?: string;
  label?: string;
  id?: string;
  'data-testid'?: string;
}

export const ScriptLookup = ({
  onSelect,
  onDelete,
  placeholder = 'Search scripts...',
  className,
  value,
  disabled = false,
  filterEntityType,
  filterCategory,
  excludeIds,
  campaignId,
  label = 'Script',
  id,
  'data-testid': dataTestId,
}: ScriptLookupProps) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const parentRef = useRef<HTMLDivElement>(null);
  const { scripts: allScripts } = useScripts(campaignId);

  let scripts = allScripts;

  if (filterEntityType) {
    scripts = scripts.filter((s) => s.entityType === filterEntityType);
  }
  if (filterCategory) {
    scripts = scripts.filter((s) => s.category === filterCategory);
  }
  if (excludeIds?.length) {
    const exclude = new Set(excludeIds);
    scripts = scripts.filter((s) => !exclude.has(s.id));
  }

  const selectedScript = value ? scripts.find((script) => script.id === value) : undefined;

  const searchLower = search.toLowerCase().trim();
  const groupedScripts = useMemo(() => {
    const filtered = searchLower
      ? scripts.filter((script) => {
          const category = script.category ?? 'Uncategorized';
          return (
            script.name.toLowerCase().includes(searchLower) ||
            category.toLowerCase().includes(searchLower) ||
            script.entityType.toLowerCase().includes(searchLower)
          );
        })
      : scripts;

    return filtered.reduce(
      (acc, script) => {
        const category = script.category || 'Uncategorized';
        if (!acc[category]) {
          acc[category] = [];
        }
        acc[category].push(script);
        return acc;
      },
      {} as Record<string, Script[]>,
    );
  }, [scripts, searchLower]);

  const rows = useMemo((): ListRow[] => {
    const result: ListRow[] = [];
    const categories = Object.keys(groupedScripts).sort();
    for (const category of categories) {
      result.push({ type: 'category', label: category, estimatedSize: 24 });
      for (const script of groupedScripts[category]) {
        const hasMeta = Boolean(script.category) || Boolean(script.entityType);
        result.push({
          type: 'entry',
          entry: script,
          estimatedSize: hasMeta ? 56 : 40,
        });
      }
    }
    return result;
  }, [groupedScripts]);

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

  const handleSelect = (script: Script) => {
    onSelect(script);
    setOpen(false);
  };

  const renderScriptMeta = (script: Script) => {
    const parts: string[] = [];
    if (script.entityType) {
      parts.push(script.entityType);
    }
    if (script.category) {
      parts.push(script.category);
    }
    if (parts.length === 0) return null;
    return (
      <span className='text-xs text-muted-foreground truncate max-w-[220px]'>
        {parts.join(' • ')}
      </span>
    );
  };

  return (
    <div className='flex flex-col gap-1' id={id}>
      <Label className='text-xs text-muted-foreground'>{label}</Label>
      <div className='flex gap-2'>
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant='outline'
              role='combobox'
              aria-expanded={open}
              className={cn('w-full justify-between h-[32px]', className)}
              disabled={disabled}
              data-testid={dataTestId}>
              {selectedScript ? selectedScript.name : placeholder}
              <>
                {selectedScript && (
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
          <PopoverContent className='w-[320px] p-0' align='start'>
            <Command shouldFilter={false}>
              <CommandInput placeholder={placeholder} value={search} onValueChange={setSearch} />
              <CommandList>
                <CommandEmpty>No scripts found.</CommandEmpty>
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
                                value={`${row.entry.name} ${row.entry.category ?? ''} ${row.entry.entityType}`}
                                onSelect={() => handleSelect(row.entry)}>
                                <Check
                                  className={cn(
                                    'mr-2 h-4 w-4',
                                    selectedScript?.id === row.entry.id
                                      ? 'opacity-100'
                                      : 'opacity-0',
                                  )}
                                />
                                <div className='flex flex-col'>
                                  <span>{row.entry.name}</span>
                                  {renderScriptMeta(row.entry)}
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

