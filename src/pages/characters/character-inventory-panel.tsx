import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
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
import { CharacterContext, type InventoryItemWithData } from '@/stores';
import { db } from '@/stores';
import { useVirtualizer } from '@tanstack/react-virtual';
import { GaugeIcon, PackageIcon, Plus, ZapIcon } from 'lucide-react';
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

function DefaultInventoryEntryRow({ item }: { item: InventoryItemWithData }) {
  const Icon = item.type === 'item' ? PackageIcon : item.type === 'action' ? ZapIcon : GaugeIcon;
  const image = item.image ?? null;
  return (
    <div className='w-full text-left px-2 py-1.5 rounded-md text-sm flex items-center gap-2'>
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
        {item.description && (
          <p className='text-xs text-muted-foreground line-clamp-1'>{item.description}</p>
        )}
      </div>
    </div>
  );
}

export const CharacterInventoryPanel = ({ open, onOpenChange }: CharacterInventoryPanelProps) => {
  const { characterId } = useParams<{ characterId: string }>();
  const { setInventoryPanelConfig } = useContext(CharacterContext);
  const { character, updateCharacter } = useCharacter(characterId);
  const { inventoryItems } = useInventory(character?.inventoryId ?? '', character?.id ?? '');

  const [typeFilter, setTypeFilter] = useState<InventoryItemType>('item');
  const parentRef = useRef<HTMLDivElement>(null);

  const handleOpenInventoryPanel = () => {
    setInventoryPanelConfig({
      open: true,
      addToDefaultInventory: true,
      type: typeFilter,
    });
  };

  // Ensure default inventory exists when opening the panel
  useEffect(() => {
    if (!open || !character?.id || character.inventoryId) return;
    const run = async () => {
      try {
        const now = new Date().toISOString();
        const inventoryId = crypto.randomUUID();
        await db.inventories.add({
          id: inventoryId,
          characterId: character.id,
          items: [],
          createdAt: now,
          updatedAt: now,
        });
        await updateCharacter(character.id, { inventoryId });
      } catch (e) {
        console.error('Failed to create default inventory:', e);
      }
    };
    run();
  }, [
    open,
    character?.id,
    character?.inventoryId,
    character?.name,
    character?.rulesetId,
    updateCharacter,
  ]);

  // Default inventory = items without a component association (no componentId or empty)
  const defaultItems = useMemo(() => {
    if (!inventoryItems?.length) return [];
    return inventoryItems.filter((item) => !item.componentId || item.componentId === '');
  }, [inventoryItems]);

  const filteredItems = useMemo(() => {
    const filtered = defaultItems.filter((item) => item.type === typeFilter);
    return [...filtered].sort((a, b) => a.title.localeCompare(b.title));
  }, [defaultItems, typeFilter]);

  const rows = useMemo((): ListRow[] => {
    return filteredItems.map((entry) => ({
      type: 'entry' as const,
      entry,
      estimatedSize: entry.description ? 56 : 40,
    }));
  }, [filteredItems]);

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
            Items in this character&apos;s default inventory (not assigned to a sheet component).
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

        <Button variant='outline' className='w-full gap-2' onClick={handleOpenInventoryPanel}>
          <Plus className='h-4 w-4' />
          Add from ruleset
        </Button>

        {defaultItems.length === 0 && (
          <div className='flex-1 flex items-center justify-center text-center py-8 text-muted-foreground'>
            <p>No items in the default inventory.</p>
          </div>
        )}

        {defaultItems.length > 0 && rows.length === 0 && (
          <div className='flex-1 flex items-center justify-center text-center py-8 text-muted-foreground'>
            <p>No {typeFilter}s in the default inventory.</p>
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
                    <DefaultInventoryEntryRow item={row.entry} />
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
