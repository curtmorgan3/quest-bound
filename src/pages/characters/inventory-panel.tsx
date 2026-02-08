import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { useActions, useAssets, useAttributes, useItems } from '@/lib/compass-api';
import { CharacterContext } from '@/stores';
import type { Action, Attribute, Item } from '@/types';
import { useVirtualizer } from '@tanstack/react-virtual';
import { GaugeIcon, PackageIcon, SearchIcon, ZapIcon } from 'lucide-react';
import { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

type InventoryPanelProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type?: 'item' | 'action' | 'attribute';
  includeIds?: string[];
  excludeIds?: string[];
  onSelect?: (item: Item | Action | Attribute, type: 'item' | 'action' | 'attribute') => void;
};

type GroupedItems = Record<string, (Item | Action | Attribute)[]>;

type ListRow =
  | { type: 'section'; label: string; estimatedSize: number }
  | { type: 'category'; label: string; estimatedSize: number }
  | {
      type: 'entry';
      entry: Item | Action | Attribute;
      entryType: 'item' | 'action' | 'attribute';
      estimatedSize: number;
    };

function EntryRow({
  entry,
  entryType,
  getImage,
  onSelect,
}: {
  entry: Item | Action | Attribute;
  entryType: 'item' | 'action' | 'attribute';
  getImage: (e: Item | Action | Attribute) => string | null;
  onSelect: (e: Item | Action | Attribute, t: 'item' | 'action' | 'attribute') => void;
}) {
  const image = getImage(entry);
  const Icon =
    entryType === 'item'
      ? PackageIcon
      : entryType === 'action'
        ? ZapIcon
        : GaugeIcon;
  return (
    <button
      type='button'
      onClick={() => onSelect(entry, entryType)}
      className='w-full text-left px-2 py-1.5 rounded-md text-sm hover:bg-accent hover:text-accent-foreground transition-colors flex items-center gap-2'>
      <Avatar className='h-8 w-8 rounded-md shrink-0'>
        {image ? (
          <AvatarImage
            src={image}
            alt={entry.title}
            className='object-cover'
          />
        ) : (
          <AvatarFallback className='rounded-md bg-muted'>
            <Icon className='h-4 w-4 text-muted-foreground' />
          </AvatarFallback>
        )}
      </Avatar>
      <div className='min-w-0 flex-1'>
        <span className='font-medium'>{entry.title}</span>
        {entry.description && (
          <p className='text-xs text-muted-foreground line-clamp-1'>
            {entry.description}
          </p>
        )}
      </div>
    </button>
  );
}

export const InventoryPanel = ({
  open,
  onOpenChange,
  type,
  includeIds,
  excludeIds,
  onSelect,
}: InventoryPanelProps) => {
  const { items } = useItems();
  const { actions } = useActions();
  const { attributes } = useAttributes();
  const { assets } = useAssets();
  const [search, setSearch] = useState('');

  const { inventoryPanelConfig } = useContext(CharacterContext);
  const typeRestriction = inventoryPanelConfig?.typeRestriction;

  const getImage = useCallback(
    (entry: Item | Action | Attribute): string | null => {
      // Use the image property directly if available
      if (entry.image) return entry.image;
      // Otherwise look up from assets
      if (entry.assetId) {
        const asset = assets.find((a) => a.id === entry.assetId);
        return asset?.data ?? null;
      }
      return null;
    },
    [assets],
  );

  const filteredAndGrouped = useMemo(() => {
    const searchLower = search.toLowerCase();

    // Filter items based on props
    const filterEntries = <T extends Item | Action | Attribute>(
      entries: T[],
      entryType: 'item' | 'action' | 'attribute',
    ): T[] => {
      // If type is specified and doesn't match, return empty
      if (type && type !== entryType) return [];

      return entries.filter((entry) => {
        // Check includeIds
        if (includeIds && includeIds.length > 0 && !includeIds.includes(entry.id)) {
          return false;
        }

        // Check excludeIds
        if (excludeIds && excludeIds.includes(entry.id)) {
          return false;
        }

        if (typeRestriction && entryType !== typeRestriction) {
          return false;
        }

        // Check search
        if (search) {
          const matchesName = entry.title.toLowerCase().includes(searchLower);
          const matchesCategory = entry.category?.toLowerCase().includes(searchLower);
          if (!matchesName && !matchesCategory) {
            return false;
          }
        }

        return true;
      });
    };

    const filteredItems = filterEntries(items, 'item');
    const filteredActions = filterEntries(actions, 'action');
    const filteredAttributes = filterEntries(attributes, 'attribute');

    // Group by category
    const grouped: { items: GroupedItems; actions: GroupedItems; attributes: GroupedItems } = {
      items: {},
      actions: {},
      attributes: {},
    };

    // Group items
    filteredItems.forEach((item) => {
      const category = item.category || 'Uncategorized';
      if (!grouped.items[category]) {
        grouped.items[category] = [];
      }
      grouped.items[category].push(item);
    });

    // Group actions
    filteredActions.forEach((action) => {
      const category = action.category || 'Uncategorized';
      if (!grouped.actions[category]) {
        grouped.actions[category] = [];
      }
      grouped.actions[category].push(action);
    });

    // Group attributes
    filteredAttributes.forEach((attribute) => {
      const category = attribute.category || 'Uncategorized';
      if (!grouped.attributes[category]) {
        grouped.attributes[category] = [];
      }
      grouped.attributes[category].push(attribute);
    });

    // Sort items within each category alphabetically
    Object.values(grouped.items).forEach((categoryItems) => {
      categoryItems.sort((a, b) => a.title.localeCompare(b.title));
    });
    Object.values(grouped.actions).forEach((categoryActions) => {
      categoryActions.sort((a, b) => a.title.localeCompare(b.title));
    });
    Object.values(grouped.attributes).forEach((categoryAttributes) => {
      categoryAttributes.sort((a, b) => a.title.localeCompare(b.title));
    });

    return grouped;
  }, [items, actions, attributes, type, includeIds, excludeIds, search, typeRestriction]);

  // Get sorted category names
  const itemCategories = Object.keys(filteredAndGrouped.items).sort();
  const actionCategories = Object.keys(filteredAndGrouped.actions).sort();
  const attributeCategories = Object.keys(filteredAndGrouped.attributes).sort();

  // Flatten into a single list of rows for virtualization
  const rows = useMemo((): ListRow[] => {
    const result: ListRow[] = [];
    const typeCount =
      (itemCategories.length > 0 ? 1 : 0) +
      (actionCategories.length > 0 ? 1 : 0) +
      (attributeCategories.length > 0 ? 1 : 0);
    const hasMultipleTypes = typeCount >= 2;

    if (itemCategories.length > 0) {
      if (hasMultipleTypes) {
        result.push({ type: 'section', label: 'Items', estimatedSize: 28 });
      }
      for (const category of itemCategories) {
        result.push({ type: 'category', label: category, estimatedSize: 24 });
        for (const item of filteredAndGrouped.items[category]) {
          const hasDescription = Boolean(item.description);
          result.push({
            type: 'entry',
            entry: item,
            entryType: 'item',
            estimatedSize: hasDescription ? 56 : 40,
          });
        }
      }
    }
    if (actionCategories.length > 0) {
      if (hasMultipleTypes) {
        result.push({ type: 'section', label: 'Actions', estimatedSize: 28 });
      }
      for (const category of actionCategories) {
        result.push({ type: 'category', label: category, estimatedSize: 24 });
        for (const action of filteredAndGrouped.actions[category]) {
          const hasDescription = Boolean(action.description);
          result.push({
            type: 'entry',
            entry: action,
            entryType: 'action',
            estimatedSize: hasDescription ? 56 : 40,
          });
        }
      }
    }
    if (attributeCategories.length > 0) {
      if (hasMultipleTypes) {
        result.push({ type: 'section', label: 'Attributes', estimatedSize: 28 });
      }
      for (const category of attributeCategories) {
        result.push({ type: 'category', label: category, estimatedSize: 24 });
        for (const attribute of filteredAndGrouped.attributes[category]) {
          const hasDescription = Boolean(attribute.description);
          result.push({
            type: 'entry',
            entry: attribute,
            entryType: 'attribute',
            estimatedSize: hasDescription ? 56 : 40,
          });
        }
      }
    }
    return result;
  }, [
    filteredAndGrouped,
    itemCategories,
    actionCategories,
    attributeCategories,
    type,
  ]);

  const parentRef = useRef<HTMLDivElement>(null);
  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: (index) => rows[index]?.estimatedSize ?? 44,
    overscan: 5,
  });

  // Re-measure when panel opens so the virtualizer sees the scroll container height
  // (on first open the container may have 0 height until layout completes)
  useEffect(() => {
    if (!open || rows.length === 0) return;
    const raf = requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        virtualizer.measure();
      });
    });
    return () => cancelAnimationFrame(raf);
  }, [open, rows.length, virtualizer]);

  const handleItemClick = (
    entry: Item | Action | Attribute,
    entryType: 'item' | 'action' | 'attribute',
  ) => {
    onSelect?.(entry, entryType);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side='right' className='flex flex-col p-[8px]'>
        <SheetHeader>
          <SheetTitle>
            {type === 'item'
              ? 'Items'
              : type === 'action'
                ? 'Actions'
                : type === 'attribute'
                  ? 'Attributes'
                  : 'Items, Actions & Attributes'}
          </SheetTitle>
          <SheetDescription>
            Browse and select{' '}
            {type === 'item'
              ? 'items'
              : type === 'action'
                ? 'actions'
                : type === 'attribute'
                  ? 'attributes'
                  : 'items, actions and attributes'}{' '}
            from the ruleset.
          </SheetDescription>
        </SheetHeader>

        <div className='relative'>
          <SearchIcon className='absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground' />
          <Input
            placeholder='Search by name or category...'
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className='pl-9'
          />
        </div>

        {/* Empty state when no rows */}
        {rows.length === 0 && (
          <div className='flex-1 flex items-center justify-center text-center py-8 text-muted-foreground'>
            {search ? (
              <p>No results found for "{search}"</p>
            ) : (
              <p>
                No{' '}
                {type === 'item'
                  ? 'items'
                  : type === 'action'
                    ? 'actions'
                    : type === 'attribute'
                      ? 'attributes'
                      : 'items, actions or attributes'}{' '}
                available.
              </p>
            )}
          </div>
        )}

        {/* Virtualized scrollable list */}
        {rows.length > 0 && (
          <div
            ref={parentRef}
            className='flex-1 min-h-0 overflow-auto -mx-4 px-4'
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
                    {row.type === 'section' && (
                      <h3 className='text-sm font-semibold text-muted-foreground uppercase tracking-wide py-1'>
                        {row.label}
                      </h3>
                    )}
                    {row.type === 'category' && (
                      <h4 className='text-sm font-medium text-foreground py-1'>
                        {row.label}
                      </h4>
                    )}
                    {row.type === 'entry' && (
                      <EntryRow
                        entry={row.entry}
                        entryType={row.entryType}
                        getImage={getImage}
                        onSelect={handleItemClick}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
};
