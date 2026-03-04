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
import type { Chart } from '@/types';
import { useVirtualizer } from '@tanstack/react-virtual';
import { Check, ChevronsUpDown, XIcon } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useCharts } from '../hooks/rulesets/use-charts';

type ListRow =
  | { type: 'category'; label: string; estimatedSize: number }
  | { type: 'entry'; entry: Chart; estimatedSize: number };

interface ChartLookupProps {
  /** Ruleset ID - required to fetch charts */
  rulesetId: string | undefined;
  /** Callback fired when a chart is selected */
  onSelect: (chart: Chart) => void;
  /** Callback fired when the delete/clear button is clicked */
  onDelete?: () => void;
  /** Optional placeholder text for the trigger */
  placeholder?: string;
  /** Optional className for the trigger button */
  className?: string;
  /** Optional value to show a pre-selected chart by ID */
  value?: string | null;
  /** Optional disabled state */
  disabled?: boolean;
  label?: string;
  id?: string;
  /** Applied to the popover content. Use e.g. z-[110] when rendered inside a portaled overlay. */
  popoverContentClassName?: string;
}

export const ChartLookup = ({
  rulesetId,
  onSelect,
  onDelete,
  placeholder = 'Search charts...',
  className,
  value,
  disabled = false,
  label = 'Chart',
  id,
  popoverContentClassName,
}: ChartLookupProps) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const parentRef = useRef<HTMLDivElement>(null);
  const { charts } = useCharts(rulesetId);

  const selectedChart = value ? charts.find((c) => c.id === value) : undefined;

  const searchLower = search.toLowerCase().trim();
  const groupedCharts = useMemo(() => {
    const filtered = searchLower
      ? charts.filter(
          (chart) =>
            chart.title.toLowerCase().includes(searchLower) ||
            (chart.description ?? '').toLowerCase().includes(searchLower) ||
            (chart.category ?? 'Uncategorized').toLowerCase().includes(searchLower),
        )
      : charts;

    return filtered.reduce(
      (acc, chart) => {
        const category = chart.category || 'Uncategorized';
        if (!acc[category]) {
          acc[category] = [];
        }
        acc[category].push(chart);
        return acc;
      },
      {} as Record<string, Chart[]>,
    );
  }, [charts, searchLower]);

  const rows = useMemo((): ListRow[] => {
    const result: ListRow[] = [];
    const categories = Object.keys(groupedCharts).sort();
    for (const category of categories) {
      result.push({ type: 'category', label: category, estimatedSize: 24 });
      for (const chart of groupedCharts[category]) {
        const hasDescription = Boolean(chart.description);
        result.push({
          type: 'entry',
          entry: chart,
          estimatedSize: hasDescription ? 56 : 40,
        });
      }
    }
    return result;
  }, [groupedCharts]);

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

  const handleSelect = (chart: Chart) => {
    onSelect(chart);
    setOpen(false);
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
              disabled={disabled || !rulesetId}
              data-testid='chart-lookup-trigger'>
              {selectedChart ? selectedChart.title : placeholder}
              <>
                {selectedChart && onDelete && (
                  <div
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete();
                    }}
                    style={{ flexGrow: 1, display: 'flex', justifyContent: 'end' }}>
                    <XIcon className='clickable' fontSize={12} />
                  </div>
                )}
                <ChevronsUpDown className='ml-2 h-4 w-4 shrink-0 opacity-50' />
              </>
            </Button>
          </PopoverTrigger>
          <PopoverContent className={cn('w-[300px] p-0', popoverContentClassName)} align='start'>
            <Command shouldFilter={false}>
              <CommandInput placeholder={placeholder} value={search} onValueChange={setSearch} />
              <CommandList>
                <CommandEmpty>No charts found.</CommandEmpty>
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
                                    selectedChart?.id === row.entry.id
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
