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
import type { Window } from '@/types';
import { useVirtualizer } from '@tanstack/react-virtual';
import { Check, ChevronsUpDown, XIcon } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useWindows } from '../hooks/rulesets/use-windows';

type ListRow =
  | { type: 'category'; label: string; estimatedSize: number }
  | { type: 'entry'; entry: Window; estimatedSize: number };

interface WindowLookupProps {
  /** Callback fired when a window is selected */
  onSelect: (window: Window) => void;
  /** Callback fired when the delete button is clicked */
  onDelete?: () => void;
  /** Optional placeholder text for the input */
  placeholder?: string;
  /** Optional className for the trigger button */
  className?: string;
  /** Optional value to show a pre-selected window by ID */
  value?: string | null;
  /** Optional disabled state */
  disabled?: boolean;
  /** Filter lookup by category */
  filterCategory?: string;
  /** Window IDs to exclude from the list (e.g. current window when assigning child) */
  excludeIds?: string[];
  label?: string;
}

export const WindowLookup = ({
  onSelect,
  onDelete,
  placeholder = 'Search windows...',
  className,
  value,
  disabled = false,
  filterCategory,
  excludeIds,
  label = 'Window',
}: WindowLookupProps) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const parentRef = useRef<HTMLDivElement>(null);
  const { windows: allWindows } = useWindows();
  let windows = filterCategory
    ? allWindows.filter((w) => w.category === filterCategory)
    : allWindows;
  if (excludeIds?.length) {
    windows = windows.filter((w) => !excludeIds.includes(w.id));
  }

  const selectedWindow = value ? windows.find((win) => win.id === value) : undefined;

  const searchLower = search.toLowerCase().trim();
  const groupedWindows = useMemo(() => {
    const filtered = searchLower
      ? windows.filter(
          (win) =>
            win.title.toLowerCase().includes(searchLower) ||
            (win.description ?? '').toLowerCase().includes(searchLower) ||
            (win.category ?? 'Uncategorized').toLowerCase().includes(searchLower),
        )
      : windows;
    return filtered.reduce(
      (acc, win) => {
        const category = win.category || 'Uncategorized';
        if (!acc[category]) {
          acc[category] = [];
        }
        acc[category].push(win);
        return acc;
      },
      {} as Record<string, Window[]>,
    );
  }, [windows, searchLower]);

  const rows = useMemo((): ListRow[] => {
    const result: ListRow[] = [];
    const categories = Object.keys(groupedWindows).sort();
    for (const category of categories) {
      result.push({ type: 'category', label: category, estimatedSize: 24 });
      for (const win of groupedWindows[category]) {
        const hasDescription = Boolean(win.description);
        result.push({
          type: 'entry',
          entry: win,
          estimatedSize: hasDescription ? 56 : 40,
        });
      }
    }
    return result;
  }, [groupedWindows]);

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

  const handleSelect = (window: Window) => {
    onSelect(window);
    setOpen(false);
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
              {selectedWindow ? selectedWindow.title : placeholder}
              <>
                {selectedWindow && (
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
              <CommandInput
                placeholder={placeholder}
                value={search}
                onValueChange={setSearch}
              />
              <CommandList>
                <CommandEmpty>No windows found.</CommandEmpty>
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
                                    selectedWindow?.id === row.entry.id
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
