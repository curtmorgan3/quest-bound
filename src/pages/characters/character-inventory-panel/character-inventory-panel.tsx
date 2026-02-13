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
import { ItemContextMenu } from '@/lib/compass-planes/nodes/components/inventory/item-context-menu';
import { PopoverScrollContainerContext } from '@/stores';
import type { InventoryItemType } from '@/types';
import { Plus, SearchIcon } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { DefaultInventoryEntryRow } from './default-inventory-row';
import { useCharacterInventoryItems } from './use-character-inventory-items';
import { useCharacterInventoryMethods } from './use-character-inventory-methods';

type CharacterInventoryPanelProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export const CharacterInventoryPanel = ({ open, onOpenChange }: CharacterInventoryPanelProps) => {
  const { characterId } = useParams<{ characterId: string }>();
  const { character } = useCharacter(characterId);
  const { inventoryItems } = useInventory(character?.inventoryId ?? '', character?.id ?? '');
  const sheetContentRef = useRef<HTMLDivElement>(null);

  const [typeFilter, setTypeFilter] = useState<InventoryItemType>('item');
  const [titleFilter, setTitleFilter] = useState('');

  const totalInventoryWeight = inventoryItems.reduce((acc, current) => (acc += current.weight), 0);
  const parentRef = useRef<HTMLDivElement>(null);

  const {
    contextMenu,
    setContextMenu,
    handleCloseContextMenu,
    handleItemClick,
    handleOpenInventoryPanel,
    handleRemoveItem,
    handleSplitStack,
    handleUpdateLabel,
    handleUpdateQuantity,
    handleUpdateEquipped,
  } = useCharacterInventoryMethods({
    typeFilter,
  });

  const { rows, virtualizer } = useCharacterInventoryItems({
    inventoryItems,
    titleFilter,
    typeFilter,
    parentRef,
    contextMenu,
  });

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
      <SheetContent ref={sheetContentRef} side='left' className='flex flex-col p-[8px]'>
        <PopoverScrollContainerContext.Provider value={sheetContentRef}>
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
                            onUpdateLabel={handleUpdateLabel}
                            onRemove={handleRemoveItem}
                            onSplit={handleSplitStack}
                            onToggleEquipped={
                              contextMenu.item.isEquippable
                                ? () => handleUpdateEquipped(!contextMenu.item.isEquipped)
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
        </PopoverScrollContainerContext.Provider>
      </SheetContent>
    </Sheet>
  );
};
