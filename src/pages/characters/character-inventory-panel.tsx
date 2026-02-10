import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { useCharacter, useInventory } from '@/lib/compass-api';
import {
  ItemContextMenu,
  type ContextMenuState,
} from '@/lib/compass-planes/nodes/components/inventory/item-context-menu';
import { CharacterContext, type InventoryItemWithData } from '@/stores';
import { useVirtualizer } from '@tanstack/react-virtual';
import { GaugeIcon, PackageIcon, Plus, SearchIcon, ZapIcon } from 'lucide-react';
import { useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';

type CharacterInventoryPanelProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

type InventoryItemType = 'item' | 'action' | 'attribute';

type ListRow = {
  type: 'entry';
  entry: InventoryItemWithData;
  estimatedSize: number;
};

function DefaultInventoryEntryRow({
  item,
  onItemClick,
}: {
  item: InventoryItemWithData;
  onItemClick: (e: React.MouseEvent, item: InventoryItemWithData) => void;
}) {
  const Icon = item.type === 'item' ? PackageIcon : item.type === 'action' ? ZapIcon : GaugeIcon;
  const image = item.image ?? null;
  return (
    <button
      type='button'
      onClick={(e) => onItemClick(e, item)}
      className='w-full text-left px-2 py-1.5 rounded-md text-sm flex items-center gap-2 hover:bg-accent hover:text-accent-foreground transition-colors cursor-pointer'>
      <Avatar className='h-8 w-8 rounded-md shrink-0'>
        {image ? (
          <AvatarImage src={image} alt={item.title} className='object-cover' />
        ) : (
          <AvatarFallback className='rounded-md bg-muted'>
            <Icon className='h-4 w-4 text-muted-foreground' />
          </AvatarFallback>
        )}
      </Avatar>
      <div className='min-w-0 flex-1'>
        <span className='font-medium'>{item.title}</span>
        {item.quantity > 1 && <span className='text-muted-foreground ml-1'>×{item.quantity}</span>}
      </div>
      {item.type === 'attribute' && (
        <span className='shrink-0 ml-auto italic text-muted-foreground'>
          {String(item.value ?? '')}
        </span>
      )}
    </button>
  );
}

export const CharacterInventoryPanel = ({ open, onOpenChange }: CharacterInventoryPanelProps) => {
  const { characterId } = useParams<{ characterId: string }>();
  const { setInventoryPanelConfig, updateInventoryItem, removeInventoryItem, addInventoryItem } =
    useContext(CharacterContext);
  const { character } = useCharacter(characterId);
  const { inventoryItems } = useInventory(character?.inventoryId ?? '', character?.id ?? '');

  const totalInventoryWeight = inventoryItems.reduce((acc, current) => (acc += current.weight), 0);

  const [typeFilter, setTypeFilter] = useState<InventoryItemType>('item');
  const [titleFilter, setTitleFilter] = useState('');
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const parentRef = useRef<HTMLDivElement>(null);

  const handleItemClick = (e: React.MouseEvent, item: InventoryItemWithData) => {
    e.stopPropagation();
    setContextMenu((prev) => (prev?.item.id === item.id ? null : { item, x: 0, y: 0 }));
  };

  const handleCloseContextMenu = () => setContextMenu(null);

  const handleUpdateQuantity = (quantity: number) => {
    if (!contextMenu) return;
    updateInventoryItem(contextMenu.item.id, { quantity });
    setContextMenu(null);
  };

  const handleRemoveItem = () => {
    if (!contextMenu) return;
    removeInventoryItem(contextMenu.item.id);
    setContextMenu(null);
  };

  const handleSplitStack = (splitAmount: number) => {
    if (!contextMenu) return;
    const item = contextMenu.item;
    const remainingQuantity = item.quantity - splitAmount;
    updateInventoryItem(item.id, { quantity: remainingQuantity });
    addInventoryItem({
      type: item.type,
      entityId: item.entityId,
      componentId: '',
      quantity: splitAmount,
      x: 0,
      y: 0,
    });
    setContextMenu(null);
  };

  const handleOpenInventoryPanel = () => {
    setInventoryPanelConfig({
      open: true,
      addToDefaultInventory: true,
      type: typeFilter,
    });
  };

  // Keep the open context menu item in sync with live inventory data so
  // changes like equipped state are reflected in the virtualized row.
  useEffect(() => {
    if (!contextMenu) return;
    const openedItem = inventoryItems.find((item) => item.id === contextMenu.item.id);
    if (!openedItem) return;

    if (JSON.stringify(openedItem) === JSON.stringify(contextMenu.item)) return;

    setContextMenu((prev) =>
      prev
        ? {
            x: prev.x,
            y: prev.y,
            item: openedItem,
          }
        : prev,
    );
  }, [JSON.stringify(inventoryItems), contextMenu, setContextMenu]);

  // Close context menu when panel closes
  useEffect(() => {
    if (!open) setContextMenu(null);
  }, [open]);

  const filteredItems = useMemo(() => {
    const search = titleFilter.trim().toLowerCase();
    const filtered = inventoryItems.filter((item) => {
      if (item.type !== typeFilter) return false;
      if (search && !item.title.toLowerCase().includes(search)) return false;
      return true;
    });
    return [...filtered].sort((a, b) => a.title.localeCompare(b.title));
  }, [inventoryItems, typeFilter, titleFilter]);

  const rows = useMemo((): ListRow[] => {
    const openItemId = contextMenu?.item.id;
    return filteredItems.map((entry) => {
      const baseSize = entry.description ? 56 : 40;
      const hasMenuOpen = openItemId === entry.id;
      return {
        type: 'entry' as const,
        entry,
        estimatedSize: hasMenuOpen ? 420 : baseSize,
      };
    });
  }, [filteredItems, contextMenu?.item.id]);

  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: (index) => rows[index]?.estimatedSize ?? 44,
    overscan: 5,
  });

  useEffect(() => {
    if (!open || rows.length === 0) return;
    const raf = requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        virtualizer.measure();
      });
    });
    return () => cancelAnimationFrame(raf);
  }, [open, rows.length, virtualizer]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side='left' className='flex flex-col p-[8px]'>
        <SheetHeader>
          <SheetTitle>Character Inventory</SheetTitle>
          <SheetDescription>
            Manage all items or add attributes and actions to control from this panel.
          </SheetDescription>
        </SheetHeader>

        <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as InventoryItemType)}>
          <SelectTrigger className='w-full'>
            <SelectValue placeholder='Filter by type' />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value='item'>Items</SelectItem>
            <SelectItem value='action'>Actions</SelectItem>
            <SelectItem value='attribute'>Attributes</SelectItem>
          </SelectContent>
        </Select>

        <div className='relative'>
          <SearchIcon className='absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground' />
          <Input
            placeholder='Filter by title...'
            value={titleFilter}
            onChange={(e) => setTitleFilter(e.target.value)}
            className='pl-9'
          />
        </div>

        <Button variant='outline' className='w-full gap-2' onClick={handleOpenInventoryPanel}>
          <Plus className='h-4 w-4' />
          Add from ruleset
        </Button>

        {inventoryItems.length === 0 && (
          <div className='flex-1 flex items-center justify-center text-center py-8 text-muted-foreground'>
            <p>No items in the default inventory.</p>
          </div>
        )}

        {typeFilter === 'item' && inventoryItems.length > 0 && (
          <p className='text-sm italic'>{`Total Weight: ${totalInventoryWeight}`}</p>
        )}

        {inventoryItems.length > 0 && rows.length === 0 && (
          <div className='flex-1 flex items-center justify-center text-center py-8 text-muted-foreground'>
            <p>
              {titleFilter.trim()
                ? `No ${typeFilter}s match "${titleFilter.trim()}".`
                : `No ${typeFilter}s have been added.`}
            </p>
          </div>
        )}

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
                const isMenuOpen = contextMenu?.item.id === row.entry.id;
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
                    <DefaultInventoryEntryRow item={row.entry} onItemClick={handleItemClick} />
                    {isMenuOpen && (
                      <div className='mt-1'>
                        <ItemContextMenu
                          item={contextMenu.item}
                          inline
                          onClose={handleCloseContextMenu}
                          onUpdateQuantity={handleUpdateQuantity}
                          onRemove={handleRemoveItem}
                          onSplit={handleSplitStack}
                          onToggleEquipped={
                            contextMenu.item.isEquippable
                              ? () =>
                                  updateInventoryItem(contextMenu.item.id, {
                                    isEquipped: !contextMenu.item.isEquipped,
                                  })
                              : undefined
                          }
                        />
                      </div>
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
