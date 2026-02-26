import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import type { Location } from '@/types';
import { Check, ChevronsUpDown, MapPinned, XIcon } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useAllLocations } from '../hooks/locations/use-locations';

interface LocationLookupProps {
  worldId: string | undefined;
  onSelect: (location: Location) => void;
  /** Optional: show currently selected location by id. When set, trigger shows location label. */
  value?: string | null;
  /** Optional: when value is set, show clear (X) button that calls this. */
  onDelete?: () => void;
  placeholder?: string;
  className?: string;
  /** Applied to the popover content. Use e.g. z-[110] when rendered inside a portaled overlay so the popover is clickable. */
  popoverContentClassName?: string;
  disabled?: boolean;
  label?: string;
  id?: string;
  'data-testid'?: string;
}

export const LocationLookup = ({
  worldId,
  onSelect,
  value,
  onDelete,
  placeholder = 'Search locations...',
  className,
  popoverContentClassName,
  disabled = false,
  label = 'Location',
  id,
  'data-testid': dataTestId,
}: LocationLookupProps) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const locations = useAllLocations(worldId);

  const selectedLocation = value ? locations.find((loc) => loc.id === value) : undefined;

  const searchLower = search.toLowerCase().trim();
  const filteredLocations = useMemo(() => {
    if (!searchLower) return locations;
    return locations.filter(
      (loc) =>
        (loc.label ?? '').toLowerCase().includes(searchLower) ||
        (loc.id ?? '').toLowerCase().includes(searchLower),
    );
  }, [locations, searchLower]);

  useEffect(() => {
    if (open) setSearch('');
  }, [open]);

  const handleSelect = (location: Location) => {
    onSelect(location);
    setOpen(false);
  };

  return (
    <div className='flex flex-col gap-1' id={id}>
      <Label className='text-xs text-muted-foreground'>{label}</Label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant='outline'
            role='combobox'
            aria-expanded={open}
            className={cn('w-full justify-between h-[32px]', className)}
            disabled={disabled || !worldId}
            data-testid={dataTestId}>
            {selectedLocation ? (
              <span className='truncate'>{selectedLocation.label ?? 'Unnamed'}</span>
            ) : (
              placeholder
            )}
            <>
              {selectedLocation && onDelete && (
                <div
                  role='button'
                  tabIndex={-1}
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete();
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onDelete();
                    }
                  }}
                  className='flex flex-1 justify-end'
                  aria-label='Clear selection'>
                  <XIcon className='size-4 shrink-0 opacity-70 hover:opacity-100' />
                </div>
              )}
              <ChevronsUpDown className='ml-2 h-4 w-4 shrink-0 opacity-50' />
            </>
          </Button>
        </PopoverTrigger>
        <PopoverContent className={cn('w-[300px] p-0', popoverContentClassName)} align='start'>
          <Command shouldFilter={false}>
            <CommandInput placeholder={placeholder} value={search} onValueChange={setSearch} />
            <CommandList>
              <CommandEmpty>No locations found.</CommandEmpty>
              {filteredLocations.map((loc) => (
                <CommandItem
                  key={loc.id}
                  value={`${loc.label ?? ''} ${loc.id}`}
                  onSelect={() => handleSelect(loc)}>
                  <Check
                    className={cn(
                      'mr-2 h-4 w-4',
                      selectedLocation?.id === loc.id ? 'opacity-100' : 'opacity-0',
                    )}
                  />
                  <MapPinned className='mr-2 size-4 shrink-0' />
                  <span className='truncate'>{loc.label ?? 'Unnamed'}</span>
                </CommandItem>
              ))}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
};
