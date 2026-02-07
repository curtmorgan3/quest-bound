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
import type { Window } from '@/types';
import { Check, ChevronsUpDown } from 'lucide-react';
import { useState } from 'react';
import { useWindows } from '../hooks/rulesets/use-windows';

interface WindowLookupProps {
  /** Callback fired when a window is selected */
  onSelect: (window: Window) => void;
  /** Callback fired when the delete button is clicked */
  onDelete?: () => void;
  /** Optional placeholder text for the input */
  placeholder?: string;
  /** Optional className for the trigger button */
  className?: string;
  /** Optional value to show a pre-selected window by ID */
  value?: string | null;
  /** Optional disabled state */
  disabled?: boolean;
  /** Filter lookup by category */
  filterCategory?: string;
  /** Window IDs to exclude from the list (e.g. current window when assigning child) */
  excludeIds?: string[];
  label?: string;
}

export const WindowLookup = ({
  onSelect,
  onDelete,
  placeholder = 'Search windows...',
  className,
  value,
  disabled = false,
  filterCategory,
  excludeIds,
  label = 'Window',
}: WindowLookupProps) => {
  const [open, setOpen] = useState(false);
  const { windows: allWindows } = useWindows();
  let windows = filterCategory
    ? allWindows.filter((w) => w.category === filterCategory)
    : allWindows;
  if (excludeIds?.length) {
    windows = windows.filter((w) => !excludeIds.includes(w.id));
  }

  const selectedWindow = value ? windows.find((win) => win.id === value) : undefined;

  // Group windows by category
  const groupedWindows = windows.reduce(
    (acc, win) => {
      const category = win.category || 'Uncategorized';
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(win);
      return acc;
    },
    {} as Record<string, Window[]>,
  );

  const handleSelect = (window: Window) => {
    onSelect(window);
    setOpen(false);
  };

  return (
    <div className='flex flex-col gap-2'>
      <Label>{label}</Label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant='outline'
            role='combobox'
            aria-expanded={open}
            className={cn('w-full justify-between', className)}
            disabled={disabled}>
            {selectedWindow ? selectedWindow.title : placeholder}
            <ChevronsUpDown className='ml-2 h-4 w-4 shrink-0 opacity-50' />
          </Button>
        </PopoverTrigger>
        <PopoverContent className='w-[300px] p-0' align='start'>
          <Command>
            <CommandInput placeholder={placeholder} />
            <CommandList>
              <CommandEmpty>No windows found.</CommandEmpty>
              {Object.entries(groupedWindows).map(([category, categoryWindows]) => (
                <CommandGroup key={category} heading={category}>
                  {categoryWindows.map((window) => (
                    <CommandItem
                      key={window.id}
                      value={`${window.title} ${window.description ?? ''}`}
                      onSelect={() => handleSelect(window)}>
                      <Check
                        className={cn(
                          'mr-2 h-4 w-4',
                          selectedWindow?.id === window.id ? 'opacity-100' : 'opacity-0',
                        )}
                      />
                      <div className='flex flex-col'>
                        <span>{window.title}</span>
                        {window.description && (
                          <span className='text-xs text-muted-foreground truncate max-w-[220px]'>
                            {window.description}
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
      {value && onDelete && (
        <Button variant='outline' onClick={onDelete} disabled={disabled}>
          Remove
        </Button>
      )}
    </div>
  );
};
