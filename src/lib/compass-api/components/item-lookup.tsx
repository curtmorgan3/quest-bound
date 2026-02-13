import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import type { Item } from '@/types';
import { Check, ChevronsUpDown, XIcon } from 'lucide-react';
import { useState } from 'react';
import { useItems } from '../hooks/rulesets/use-items';

interface ItemLookupProps {
  /** Callback fired when an item is selected */
  onSelect: (item: Item) => void;
  /** Callback fired when the delete button is clicked */
  onDelete?: () => void;
  /** Optional placeholder text for the input */
  placeholder?: string;
  /** Optional className for the trigger button */
  className?: string;
  /** Optional value to show a pre-selected item by ID */
  value?: string | null;
  /** Optional disabled state */
  disabled?: boolean;
  /** Filter lookup by category */
  filterCategory?: string;
  label?: string;
}

export const ItemLookup = ({
  onSelect,
  onDelete,
  placeholder = 'Search items...',
  className,
  value,
  disabled = false,
  filterCategory,
  label = 'Item',
}: ItemLookupProps) => {
  const [open, setOpen] = useState(false);
  const { items: allItems } = useItems();
  const items = filterCategory ? allItems.filter((i) => i.category === filterCategory) : allItems;

  const selectedItem = value ? items.find((item) => item.id === value) : undefined;

  // Group items by category
  const groupedItems = items.reduce(
    (acc, item) => {
      const category = item.category || 'Uncategorized';
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(item);
      return acc;
    },
    {} as Record<string, Item[]>,
  );

  const handleSelect = (item: Item) => {
    onSelect(item);
    setOpen(false);
  };

  return (
    <div className='flex flex-col gap-2'>
      <Label>{label}</Label>
      <div className='flex gap-2'>
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant='outline'
              role='combobox'
              aria-expanded={open}
              className={cn('w-full justify-between', className)}
              disabled={disabled}>
              {selectedItem ? selectedItem.title : placeholder}
              <>
                {selectedItem && (
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
            <Command>
              <CommandInput placeholder={placeholder} />
              <CommandList>
                <CommandEmpty>No items found.</CommandEmpty>
                {Object.entries(groupedItems).map(([category, categoryItems]) => (
                  <CommandGroup key={category} heading={category}>
                    {categoryItems.map((item) => (
                      <CommandItem
                        key={item.id}
                        value={`${item.title} ${item.description}`}
                        onSelect={() => handleSelect(item)}>
                        <Check
                          className={cn(
                            'mr-2 h-4 w-4',
                            selectedItem?.id === item.id ? 'opacity-100' : 'opacity-0',
                          )}
                        />
                        <div className='flex flex-col'>
                          <span>{item.title}</span>
                          {item.description && (
                            <span className='text-xs text-muted-foreground truncate max-w-[220px]'>
                              {item.description}
                            </span>
                          )}
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                ))}
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
};
