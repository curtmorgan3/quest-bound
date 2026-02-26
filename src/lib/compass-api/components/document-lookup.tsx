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
import type { Document } from '@/types';
import { useVirtualizer } from '@tanstack/react-virtual';
import { Check, ChevronsUpDown, XIcon } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useDocuments } from '../hooks/rulesets/use-documents';

type ListRow =
  | { type: 'category'; label: string; estimatedSize: number }
  | { type: 'entry'; entry: Document; estimatedSize: number };

interface DocumentLookupProps {
  /** Limit results to documents in this ruleset (ruleset-scoped only). */
  rulesetId?: string;
  /** Limit results to documents in this world. */
  worldId?: string;
  /** When set with worldId, limit to documents in this location. */
  locationId?: string;
  /** Limit results to documents in this campaign (campaign-scoped; have campaignId and locationId, no worldId). Optionally combine with locationId. */
  campaignId?: string;
  /** Callback fired when a document is selected */
  onSelect: (document: Document) => void;
  /** Callback fired when the clear button is clicked */
  onDelete?: () => void;
  /** Optional placeholder text for the input */
  placeholder?: string;
  /** Optional className for the trigger button */
  className?: string;
  /** Optional value to show a pre-selected document by ID */
  value?: string | null;
  /** Optional disabled state */
  disabled?: boolean;
  label?: string;
  id?: string;
}

export const DocumentLookup = ({
  rulesetId,
  worldId,
  locationId,
  campaignId,
  onSelect,
  onDelete,
  placeholder = 'Search documents...',
  className,
  value,
  disabled = false,
  label = 'Document',
  id,
}: DocumentLookupProps) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const parentRef = useRef<HTMLDivElement>(null);

  const options = useMemo(() => {
    if (campaignId) return { campaignId, locationId };
    if (worldId) return { worldId, locationId };
    if (rulesetId) return { rulesetId };
    return undefined;
  }, [campaignId, worldId, locationId, rulesetId]);
  const { documents } = useDocuments(options);

  const selectedDocument = value ? documents.find((doc) => doc.id === value) : undefined;

  const searchLower = search.toLowerCase().trim();
  const groupedDocuments = useMemo(() => {
    const filtered = searchLower
      ? documents.filter(
          (doc) =>
            doc.title.toLowerCase().includes(searchLower) ||
            (doc.description?.toLowerCase().includes(searchLower) ?? false) ||
            (doc.category?.toLowerCase().includes(searchLower) ?? false),
        )
      : documents;

    return filtered.reduce(
      (acc, doc) => {
        const category = doc.category || 'Uncategorized';
        if (!acc[category]) {
          acc[category] = [];
        }
        acc[category].push(doc);
        return acc;
      },
      {} as Record<string, Document[]>,
    );
  }, [documents, searchLower]);

  const rows = useMemo((): ListRow[] => {
    const result: ListRow[] = [];
    const categories = Object.keys(groupedDocuments).sort();
    for (const category of categories) {
      result.push({ type: 'category', label: category, estimatedSize: 24 });
      for (const doc of groupedDocuments[category]) {
        const hasDescription = Boolean(doc.description);
        result.push({
          type: 'entry',
          entry: doc,
          estimatedSize: hasDescription ? 56 : 40,
        });
      }
    }
    return result;
  }, [groupedDocuments]);

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

  const handleSelect = (doc: Document) => {
    onSelect(doc);
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
              data-testid='document-lookup'>
              {selectedDocument ? selectedDocument.title : placeholder}
              <>
                {selectedDocument && onDelete && (
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
          <PopoverContent className='w-[300px] p-0' align='start'>
            <Command shouldFilter={false}>
              <CommandInput placeholder={placeholder} value={search} onValueChange={setSearch} />
              <CommandList>
                <CommandEmpty>No documents found.</CommandEmpty>
                {rows.length > 0 ? (
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
                                    selectedDocument?.id === row.entry.id
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
                ) : null}
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
};
