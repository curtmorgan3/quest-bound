import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
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
import { GaugeIcon, PackageIcon, SearchIcon, ZapIcon } from 'lucide-react';
import { useCallback, useContext, useMemo, useState } from 'react';

type InventoryPanelProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type?: 'item' | 'action' | 'attribute';
  includeIds?: string[];
  excludeIds?: string[];
  onSelect?: (item: Item | Action | Attribute, type: 'item' | 'action' | 'attribute') => void;
};

type GroupedItems = Record<string, (Item | Action | Attribute)[]>;

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

        <ScrollArea className='flex-1 -mx-4 px-4'>
          <div className='space-y-6 pb-4'>
            {/* Items Section */}
            {itemCategories.length > 0 && (
              <div className='space-y-4'>
                {(!type || type === 'item') &&
                  (actionCategories.length > 0 || attributeCategories.length > 0) && (
                    <h3 className='text-sm font-semibold text-muted-foreground uppercase tracking-wide'>
                      Items
                    </h3>
                  )}
                {itemCategories.map((category) => (
                  <div key={`item-${category}`} className='space-y-1'>
                    <h4 className='text-sm font-medium text-foreground'>{category}</h4>
                    <div className='space-y-0.5'>
                      {filteredAndGrouped.items[category].map((item) => {
                        const image = getImage(item);
                        return (
                          <button
                            key={item.id}
                            onClick={() => handleItemClick(item, 'item')}
                            className='w-full text-left px-2 py-1.5 rounded-md text-sm hover:bg-accent hover:text-accent-foreground transition-colors flex items-center gap-2'>
                            <Avatar className='h-8 w-8 rounded-md shrink-0'>
                              {image ? (
                                <AvatarImage
                                  src={image}
                                  alt={item.title}
                                  className='object-cover'
                                />
                              ) : (
                                <AvatarFallback className='rounded-md bg-muted'>
                                  <PackageIcon className='h-4 w-4 text-muted-foreground' />
                                </AvatarFallback>
                              )}
                            </Avatar>
                            <div className='min-w-0 flex-1'>
                              <span className='font-medium'>{item.title}</span>
                              {item.description && (
                                <p className='text-xs text-muted-foreground line-clamp-1'>
                                  {item.description}
                                </p>
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Actions Section */}
            {actionCategories.length > 0 && (
              <div className='space-y-4'>
                {(!type || type === 'action') &&
                  (itemCategories.length > 0 || attributeCategories.length > 0) && (
                    <h3 className='text-sm font-semibold text-muted-foreground uppercase tracking-wide'>
                      Actions
                    </h3>
                  )}
                {actionCategories.map((category) => (
                  <div key={`action-${category}`} className='space-y-1'>
                    <h4 className='text-sm font-medium text-foreground'>{category}</h4>
                    <div className='space-y-0.5'>
                      {filteredAndGrouped.actions[category].map((action) => {
                        const image = getImage(action);
                        return (
                          <button
                            key={action.id}
                            onClick={() => handleItemClick(action, 'action')}
                            className='w-full text-left px-2 py-1.5 rounded-md text-sm hover:bg-accent hover:text-accent-foreground transition-colors flex items-center gap-2'>
                            <Avatar className='h-8 w-8 rounded-md shrink-0'>
                              {image ? (
                                <AvatarImage
                                  src={image}
                                  alt={action.title}
                                  className='object-cover'
                                />
                              ) : (
                                <AvatarFallback className='rounded-md bg-muted'>
                                  <ZapIcon className='h-4 w-4 text-muted-foreground' />
                                </AvatarFallback>
                              )}
                            </Avatar>
                            <div className='min-w-0 flex-1'>
                              <span className='font-medium'>{action.title}</span>
                              {action.description && (
                                <p className='text-xs text-muted-foreground line-clamp-1'>
                                  {action.description}
                                </p>
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Attributes Section */}
            {attributeCategories.length > 0 && (
              <div className='space-y-4'>
                {(!type || type === 'attribute') &&
                  (itemCategories.length > 0 || actionCategories.length > 0) && (
                    <h3 className='text-sm font-semibold text-muted-foreground uppercase tracking-wide'>
                      Attributes
                    </h3>
                  )}
                {attributeCategories.map((category) => (
                  <div key={`attribute-${category}`} className='space-y-1'>
                    <h4 className='text-sm font-medium text-foreground'>{category}</h4>
                    <div className='space-y-0.5'>
                      {filteredAndGrouped.attributes[category].map((attribute) => {
                        const image = getImage(attribute);
                        return (
                          <button
                            key={attribute.id}
                            onClick={() => handleItemClick(attribute, 'attribute')}
                            className='w-full text-left px-2 py-1.5 rounded-md text-sm hover:bg-accent hover:text-accent-foreground transition-colors flex items-center gap-2'>
                            <Avatar className='h-8 w-8 rounded-md shrink-0'>
                              {image ? (
                                <AvatarImage
                                  src={image}
                                  alt={attribute.title}
                                  className='object-cover'
                                />
                              ) : (
                                <AvatarFallback className='rounded-md bg-muted'>
                                  <GaugeIcon className='h-4 w-4 text-muted-foreground' />
                                </AvatarFallback>
                              )}
                            </Avatar>
                            <div className='min-w-0 flex-1'>
                              <span className='font-medium'>{attribute.title}</span>
                              {attribute.description && (
                                <p className='text-xs text-muted-foreground line-clamp-1'>
                                  {attribute.description}
                                </p>
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Empty state */}
            {itemCategories.length === 0 &&
              actionCategories.length === 0 &&
              attributeCategories.length === 0 && (
                <div className='text-center py-8 text-muted-foreground'>
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
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
};
