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
import type { Attribute, AttributeType } from '@/types';
import { Check, ChevronsUpDown, XIcon } from 'lucide-react';
import { useState } from 'react';
import { useAttributes } from '../hooks/rulesets/use-attributes';

interface AttributeLookupProps {
  /** Callback fired when an attribute is selected */
  onSelect: (attribute: Attribute) => void;
  /** Callback fired when the delete button is clicked */
  onDelete?: () => void;
  /** Optional placeholder text for the input */
  placeholder?: string;
  /** Optional className for the trigger button */
  className?: string;
  /** Optional value to show a pre-selected attribute by ID */
  value?: string | null;
  /** Optional disabled state */
  disabled?: boolean;
  /** Filter lookup by type */
  filterType?: AttributeType;
  label?: string;
}

export const AttributeLookup = ({
  onSelect,
  onDelete,
  placeholder = 'Search attributes...',
  className,
  value,
  disabled = false,
  filterType,
  label = 'Attribute',
}: AttributeLookupProps) => {
  const [open, setOpen] = useState(false);
  const { attributes: allAttributes } = useAttributes();
  const attributes = filterType
    ? allAttributes.filter((a) => a.type === filterType)
    : allAttributes;

  const selectedAttribute = value ? attributes.find((attr) => attr.id === value) : undefined;

  // Group attributes by category
  const groupedAttributes = attributes.reduce(
    (acc, attr) => {
      const category = attr.category || 'Uncategorized';
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(attr);
      return acc;
    },
    {} as Record<string, Attribute[]>,
  );

  const handleSelect = (attribute: Attribute) => {
    onSelect(attribute);
    setOpen(false);
  };

  return (
    <div className='flex flex-col gap-2'>
      <Label>{label}</Label>
      <div className={`flex gap-2`}>
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant='outline'
              role='combobox'
              aria-expanded={open}
              className={cn('w-full justify-between', className)}
              disabled={disabled}>
              {selectedAttribute ? selectedAttribute.title : placeholder}
              <>
                {selectedAttribute && (
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
                <CommandEmpty>No attributes found.</CommandEmpty>
                {Object.entries(groupedAttributes).map(([category, attrs]) => (
                  <CommandGroup key={category} heading={category}>
                    {attrs.map((attribute) => (
                      <CommandItem
                        key={attribute.id}
                        value={`${attribute.title} ${attribute.description}`}
                        onSelect={() => handleSelect(attribute)}>
                        <Check
                          className={cn(
                            'mr-2 h-4 w-4',
                            selectedAttribute?.id === attribute.id ? 'opacity-100' : 'opacity-0',
                          )}
                        />
                        <div className='flex flex-col'>
                          <span>{attribute.title}</span>
                          {attribute.description && (
                            <span className='text-xs text-muted-foreground truncate max-w-[220px]'>
                              {attribute.description}
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
