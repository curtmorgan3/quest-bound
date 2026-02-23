import {
  Button,
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components';
import { useActiveRuleset, useCustomProperties, useItems } from '@/lib/compass-api';
import { db } from '@/stores';
import type { ItemCustomProperty } from '@/types';
import { useLiveQuery } from 'dexie-react-hooks';
import { SlidersHorizontal, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { CustomPropertyPicker } from './custom-property-picker';

const ALL_ITEMS = '__all__';

export function ManageItemCustomPropertiesModal() {
  const { activeRuleset } = useActiveRuleset();
  const { items } = useItems();
  const { customProperties } = useCustomProperties(activeRuleset?.id);
  const [scope, setScope] = useState(ALL_ITEMS);
  const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(new Set());
  const [pickerOpen, setPickerOpen] = useState(false);

  const categories = useMemo(() => {
    const set = new Set<string>();
    for (const item of items) {
      if (item.category?.trim()) set.add(item.category.trim());
    }
    return [...set].sort((a, b) => a.localeCompare(b));
  }, [items]);

  const targetItems = useMemo(() => {
    if (scope === ALL_ITEMS) return items;
    return items.filter((i) => i.category?.trim() === scope);
  }, [items, scope]);

  const itemCustomPropertiesByItem =
    useLiveQuery(async () => {
      if (targetItems.length === 0) return new Map<string, ItemCustomProperty[]>();
      const itemIds = targetItems.map((i) => i.id);
      const all = await db.itemCustomProperties.where('itemId').anyOf(itemIds).toArray();
      const map = new Map<string, ItemCustomProperty[]>();
      for (const icp of all) {
        const list = map.get(icp.itemId) ?? [];
        list.push(icp);
        map.set(icp.itemId, list);
      }
      return map;
    }, [targetItems]) ?? new Map();

  const customPropertiesById = useMemo(() => {
    const m = new Map<string, (typeof customProperties)[0]>();
    for (const cp of customProperties) m.set(cp.id, cp);
    return m;
  }, [customProperties]);

  const toggleItemSelection = (itemId: string) => {
    setSelectedItemIds((prev) => {
      const next = new Set(prev);
      if (next.has(itemId)) next.delete(itemId);
      else next.add(itemId);
      return next;
    });
  };

  const selectAll = () => {
    setSelectedItemIds(new Set(targetItems.map((i) => i.id)));
  };

  const selectNone = () => {
    setSelectedItemIds(new Set());
  };

  const addToSelected = async (customPropertyId: string) => {
    const ids = selectedItemIds.size > 0 ? selectedItemIds : new Set(targetItems.map((i) => i.id));
    const now = new Date().toISOString();
    for (const itemId of ids) {
      const existing = await db.itemCustomProperties
        .where('[itemId+customPropertyId]')
        .equals([itemId, customPropertyId])
        .first();
      if (existing) continue;
      await db.itemCustomProperties.add({
        id: crypto.randomUUID(),
        itemId,
        customPropertyId,
        createdAt: now,
        updatedAt: now,
      } as ItemCustomProperty);
    }
    setPickerOpen(false);
  };

  const removeItemCustomProperty = async (icpId: string) => {
    await db.itemCustomProperties.delete(icpId);
  };

  return (
    <>
      <Dialog>
        <DialogTrigger asChild>
          <Button variant='outline' size='sm' aria-label='Manage custom properties'>
            <SlidersHorizontal className='h-4 w-4' />
          </Button>
        </DialogTrigger>
        <DialogContent className='min-w-[520px] max-w-[90vw] max-h-[85vh] overflow-hidden flex flex-col'>
          <DialogTitle>Manage item custom properties</DialogTitle>
          <p className='text-sm text-muted-foreground'>
            Assign custom properties to items definitions. Items will have these properties when
            added to an inventory.
          </p>
          <div className='flex flex-col gap-4 flex-1 min-h-0 overflow-auto'>
            <div className='flex flex-wrap items-end gap-4'>
              <div className='flex flex-col gap-2'>
                <Label className='text-xs text-muted-foreground'>Filter by category</Label>
                <Select value={scope} onValueChange={setScope}>
                  <SelectTrigger className='w-[180px]'>
                    <SelectValue placeholder='Scope' />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ALL_ITEMS}>All items</SelectItem>
                    {categories.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        Category: {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className='flex gap-1'>
                <Button variant='outline' size='sm' onClick={selectAll}>
                  Select all
                </Button>
                <Button variant='outline' size='sm' onClick={selectNone}>
                  Clear selection
                </Button>
              </div>
              <Button
                variant='outline'
                size='sm'
                className='gap-1'
                onClick={() => setPickerOpen(true)}
                disabled={!activeRuleset || targetItems.length === 0}>
                Add to selected items
              </Button>
            </div>

            {targetItems.length === 0 ? (
              <p className='text-sm text-muted-foreground py-4'>
                {items.length === 0 ? 'No items yet.' : 'No items in this category.'}
              </p>
            ) : (
              <div className='flex flex-col gap-2'>
                <Label className='text-xs text-muted-foreground'>
                  Items (
                  {selectedItemIds.size > 0
                    ? `${selectedItemIds.size} selected`
                    : 'click to select'}
                  )
                </Label>
                <div className='flex flex-col gap-1 max-h-[280px] overflow-auto border rounded-md p-2'>
                  {targetItems.map((item) => {
                    const icps = itemCustomPropertiesByItem.get(item.id) ?? [];
                    const isSelected = selectedItemIds.has(item.id);
                    return (
                      <div
                        key={item.id}
                        className={`rounded-md border p-2 ${isSelected ? 'ring-2 ring-primary/30' : ''}`}>
                        <div className='flex items-center gap-2'>
                          <input
                            type='checkbox'
                            checked={isSelected}
                            onChange={() => toggleItemSelection(item.id)}
                            className='rounded'
                          />
                          <span className='font-medium flex-1'>{item.title}</span>
                        </div>
                        {icps.length > 0 && (
                          <div className='flex flex-wrap gap-1 mt-2 ml-6'>
                            {icps.map((icp: ItemCustomProperty) => {
                              const cp = customPropertiesById.get(icp.customPropertyId);
                              return (
                                <span
                                  key={icp.id}
                                  className='inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs'>
                                  {cp?.label ?? icp.customPropertyId}
                                  <Button
                                    variant='ghost'
                                    size='icon'
                                    className='h-4 w-4 p-0 text-muted-foreground hover:text-destructive'
                                    onClick={() => removeItemCustomProperty(icp.id)}
                                    aria-label={`Remove ${cp?.label}`}>
                                    <Trash2 className='h-3 w-3' />
                                  </Button>
                                </span>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
      <CustomPropertyPicker
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        onSelect={addToSelected}
      />
    </>
  );
}
