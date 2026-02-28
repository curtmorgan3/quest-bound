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
import type { Asset } from '@/types';
import { useVirtualizer } from '@tanstack/react-virtual';
import { Check, ChevronsUpDown, XIcon } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useAssets } from '../hooks/assets/use-assets';

type ListRow =
  | { type: 'category'; label: string; estimatedSize: number }
  | { type: 'entry'; entry: Asset; estimatedSize: number };

interface AssetLookupProps {
  /** Callback fired when an asset is selected */
  onSelect: (asset: Asset) => void;
  /** Callback fired when the clear button is clicked */
  onDelete?: () => void;
  /** Optional placeholder text for the trigger */
  placeholder?: string;
  /** Optional className for the trigger button */
  className?: string;
  /** Optional value: selected asset ID */
  value?: string | null;
  /** Optional disabled state */
  disabled?: boolean;
  /** Ruleset ID to scope assets (uses route param if not provided) */
  rulesetId?: string | null;
  label?: string;
  id?: string;
}

export const AssetLookup = ({
  onSelect,
  onDelete,
  placeholder = 'Search assets...',
  className,
  value,
  disabled = false,
  rulesetId,
  label = 'Asset',
  id,
}: AssetLookupProps) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const parentRef = useRef<HTMLDivElement>(null);
  const { assets } = useAssets(rulesetId ?? undefined);

  const selectedAsset = value ? assets.find((a) => a.id === value) : undefined;

  const searchLower = search.toLowerCase().trim();
  const groupedAssets = useMemo(() => {
    const filtered = searchLower
      ? assets.filter(
          (asset) =>
            asset.filename.toLowerCase().includes(searchLower) ||
            (asset.category ?? 'Uncategorized').toLowerCase().includes(searchLower) ||
            (asset.type ?? '').toLowerCase().includes(searchLower),
        )
      : assets;

    return filtered.reduce(
      (acc, asset) => {
        const category = asset.category || 'Uncategorized';
        if (!acc[category]) {
          acc[category] = [];
        }
        acc[category].push(asset);
        return acc;
      },
      {} as Record<string, Asset[]>,
    );
  }, [assets, searchLower]);

  const rows = useMemo((): ListRow[] => {
    const result: ListRow[] = [];
    const categories = Object.keys(groupedAssets).sort();
    for (const category of categories) {
      result.push({ type: 'category', label: category, estimatedSize: 24 });
      for (const asset of groupedAssets[category]) {
        result.push({
          type: 'entry',
          entry: asset,
          estimatedSize: 52,
        });
      }
    }
    return result;
  }, [groupedAssets]);

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

  const handleSelect = (asset: Asset) => {
    onSelect(asset);
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
              disabled={disabled}
              data-testid='asset-lookup'>
              {selectedAsset ? selectedAsset.filename : placeholder}
              <>
                {selectedAsset && (
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
                <CommandEmpty>No assets found.</CommandEmpty>
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
                                value={`${row.entry.filename} ${row.entry.type ?? ''} ${row.entry.category ?? ''}`}
                                onSelect={() => handleSelect(row.entry)}
                                className='flex items-center gap-2'>
                                <Check
                                  className={cn(
                                    'h-4 w-4 shrink-0',
                                    selectedAsset?.id === row.entry.id ? 'opacity-100' : 'opacity-0',
                                  )}
                                />
                                {row.entry.data &&
                                (row.entry.type === 'url' || row.entry.type.startsWith('image/')) ? (
                                  <div className='h-9 w-9 shrink-0 overflow-hidden rounded border bg-muted'>
                                    <img
                                      src={row.entry.data}
                                      alt=''
                                      className='h-full w-full object-cover'
                                    />
                                  </div>
                                ) : (
                                  <div
                                    className='h-9 w-9 shrink-0 rounded border bg-muted flex items-center justify-center text-[10px] text-muted-foreground'
                                    aria-hidden>
                                    {row.entry.type === 'url' ? 'URL' : '—'}
                                  </div>
                                )}
                                <div className='flex flex-col min-w-0 flex-1'>
                                  <span className='truncate'>{row.entry.filename}</span>
                                  <span className='text-xs text-muted-foreground'>
                                    {row.entry.type === 'url' ? 'URL' : row.entry.type}
                                  </span>
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
