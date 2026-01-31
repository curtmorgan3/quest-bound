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
import type { Action } from '@/types';
import { Check, ChevronsUpDown } from 'lucide-react';
import { useState } from 'react';
import { useActions } from '../hooks/rulesets/use-actions';

interface ActionLookupProps {
  /** Callback fired when an action is selected */
  onSelect: (action: Action) => void;
  /** Callback fired when the delete button is clicked */
  onDelete?: () => void;
  /** Optional placeholder text for the input */
  placeholder?: string;
  /** Optional className for the trigger button */
  className?: string;
  /** Optional value to show a pre-selected action by ID */
  value?: string | null;
  /** Optional disabled state */
  disabled?: boolean;
  /** Filter lookup by category */
  filterCategory?: string;
  label?: string;
}

export const ActionLookup = ({
  onSelect,
  onDelete,
  placeholder = 'Search actions...',
  className,
  value,
  disabled = false,
  filterCategory,
  label = 'Action',
}: ActionLookupProps) => {
  const [open, setOpen] = useState(false);
  const { actions: allActions } = useActions();
  const actions = filterCategory
    ? allActions.filter((a) => a.category === filterCategory)
    : allActions;

  const selectedAction = value ? actions.find((action) => action.id === value) : undefined;

  // Group actions by category
  const groupedActions = actions.reduce(
    (acc, action) => {
      const category = action.category || 'Uncategorized';
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(action);
      return acc;
    },
    {} as Record<string, Action[]>,
  );

  const handleSelect = (action: Action) => {
    onSelect(action);
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
            {selectedAction ? selectedAction.title : placeholder}
            <ChevronsUpDown className='ml-2 h-4 w-4 shrink-0 opacity-50' />
          </Button>
        </PopoverTrigger>
        <PopoverContent className='w-[300px] p-0' align='start'>
          <Command>
            <CommandInput placeholder={placeholder} />
            <CommandList>
              <CommandEmpty>No actions found.</CommandEmpty>
              {Object.entries(groupedActions).map(([category, categoryActions]) => (
                <CommandGroup key={category} heading={category}>
                  {categoryActions.map((action) => (
                    <CommandItem
                      key={action.id}
                      value={`${action.title} ${action.description}`}
                      onSelect={() => handleSelect(action)}>
                      <Check
                        className={cn(
                          'mr-2 h-4 w-4',
                          selectedAction?.id === action.id ? 'opacity-100' : 'opacity-0',
                        )}
                      />
                      <div className='flex flex-col'>
                        <span>{action.title}</span>
                        {action.description && (
                          <span className='text-xs text-muted-foreground truncate max-w-[220px]'>
                            {action.description}
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
