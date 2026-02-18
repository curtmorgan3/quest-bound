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
import type { Page } from '@/types';
import { useVirtualizer } from '@tanstack/react-virtual';
import { Check, ChevronsUpDown, XIcon } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { RulesetPageWithPage } from '../hooks/rulesets/use-ruleset-pages';
import { useRulesetPages } from '../hooks/rulesets/use-ruleset-pages';

type ListRow =
  | { type: 'category'; label: string; estimatedSize: number }
  | { type: 'entry'; entry: RulesetPageWithPage; estimatedSize: number };

interface PageLookupProps {
  /** Callback fired when a page is selected */
  onSelect: (page: Page) => void;
  /** Callback fired when the delete button is clicked */
  onDelete?: () => void;
  /** Optional placeholder text for the input */
  placeholder?: string;
  /** Optional className for the trigger button */
  className?: string;
  /** Optional value to show a pre-selected page by ID */
  value?: string | null;
  /** Optional disabled state */
  disabled?: boolean;
  label?: string;
}

export const PageLookup = ({
  onSelect,
  onDelete,
  placeholder = 'Search pages...',
  className,
  value,
  disabled = false,
  label = 'Page',
}: PageLookupProps) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const parentRef = useRef<HTMLDivElement>(null);
  const { pages } = useRulesetPages();

  const selectedPage = value ? pages.find((p) => p.id === value) : undefined;

  const searchLower = search.toLowerCase().trim();
  const groupedPages = useMemo(() => {
    const filtered = searchLower
      ? pages.filter(
          (p) =>
            p.label.toLowerCase().includes(searchLower) ||
            (p.category ?? 'Uncategorized').toLowerCase().includes(searchLower),
        )
      : pages;

    return filtered.reduce(
      (acc, page) => {
        const category = page.category || 'Uncategorized';
        if (!acc[category]) {
          acc[category] = [];
        }
        acc[category].push(page);
        return acc;
      },
      {} as Record<string, RulesetPageWithPage[]>,
    );
  }, [pages, searchLower]);

  const rows = useMemo((): ListRow[] => {
    const result: ListRow[] = [];
    const categories = Object.keys(groupedPages).sort();
    for (const category of categories) {
      result.push({ type: 'category', label: category, estimatedSize: 24 });
      for (const page of groupedPages[category]) {
        result.push({
          type: 'entry',
          entry: page,
          estimatedSize: 40,
        });
      }
    }
    return result;
  }, [groupedPages]);

  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: (index) => rows[index]?.estimatedSize ?? 44,
    overscan: 5,
  });

  // Reset search when popover opens
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

  const handleSelect = (page: RulesetPageWithPage) => {
    onSelect(page);
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
              {selectedPage ? selectedPage.label : placeholder}
              <>
                {selectedPage && (
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
                <CommandEmpty>No pages found.</CommandEmpty>
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
                                value={`${row.entry.label} ${row.entry.category ?? ''}`}
                                onSelect={() => handleSelect(row.entry)}>
                                <Check
                                  className={cn(
                                    'mr-2 h-4 w-4',
                                    selectedPage?.id === row.entry.id ? 'opacity-100' : 'opacity-0',
                                  )}
                                />
                                <span>{row.entry.label}</span>
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
