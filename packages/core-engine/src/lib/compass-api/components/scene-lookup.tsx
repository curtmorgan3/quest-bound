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
import type { CampaignScene } from '@/types';
import { useVirtualizer } from '@tanstack/react-virtual';
import { Check, ChevronsUpDown, XIcon } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useCampaignScenes } from '../hooks/campaigns/use-campaign-scenes';

type ListRow =
  | { type: 'category'; label: string; estimatedSize: number }
  | { type: 'entry'; entry: CampaignScene; estimatedSize: number };

interface SceneLookupProps {
  campaignId: string | undefined;
  /** Callback fired when a scene is selected */
  onSelect: (scene: CampaignScene) => void;
  /** Callback fired when the delete button is clicked */
  onDelete?: () => void;
  /** Optional placeholder text for the input */
  placeholder?: string;
  /** Optional className for the trigger button */
  className?: string;
  /** Optional value to show a pre-selected scene by ID */
  value?: string | null;
  /** Optional disabled state */
  disabled?: boolean;
  label?: string;
  id?: string;
}

export const SceneLookup = ({
  campaignId,
  onSelect,
  onDelete,
  placeholder = 'Search scenes...',
  className,
  value,
  disabled = false,
  label = 'Scene',
  id,
}: SceneLookupProps) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const parentRef = useRef<HTMLDivElement>(null);
  const { campaignScenes } = useCampaignScenes(campaignId);

  const scenes = useMemo(
    () =>
      [...campaignScenes].sort((a, b) => (a.name ?? '').localeCompare(b.name ?? '', undefined, { sensitivity: 'base' })),
    [campaignScenes],
  );

  const selectedScene = value ? scenes.find((s) => s.id === value) : undefined;

  const searchLower = search.toLowerCase().trim();
  const groupedScenes = useMemo(() => {
    const filtered = searchLower
      ? scenes.filter(
          (s) =>
            s.name.toLowerCase().includes(searchLower) ||
            (s.category ?? '').toLowerCase().includes(searchLower),
        )
      : scenes;

    return filtered.reduce(
      (acc, scene) => {
        const category = scene.category || 'Uncategorized';
        if (!acc[category]) acc[category] = [];
        acc[category].push(scene);
        return acc;
      },
      {} as Record<string, CampaignScene[]>,
    );
  }, [scenes, searchLower]);

  const rows = useMemo((): ListRow[] => {
    const result: ListRow[] = [];
    const categories = Object.keys(groupedScenes).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
    for (const category of categories) {
      result.push({ type: 'category', label: category, estimatedSize: 24 });
      const entries = [...groupedScenes[category]].sort((a, b) =>
        a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }),
      );
      for (const scene of entries) {
        result.push({ type: 'entry', entry: scene, estimatedSize: 40 });
      }
    }
    return result;
  }, [groupedScenes]);

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

  const handleSelect = (scene: CampaignScene) => {
    onSelect(scene);
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
              disabled={disabled || !campaignId}
              data-testid='scene-lookup'>
              {selectedScene ? selectedScene.name : placeholder}
              <>
                {selectedScene && (
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
                <CommandEmpty>No scenes found.</CommandEmpty>
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
                                value={`${row.entry.name} ${row.entry.category ?? ''}`}
                                onSelect={() => handleSelect(row.entry)}>
                                <Check
                                  className={cn(
                                    'mr-2 h-4 w-4',
                                    selectedScene?.id === row.entry.id ? 'opacity-100' : 'opacity-0',
                                  )}
                                />
                                <span>{row.entry.name}</span>
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

