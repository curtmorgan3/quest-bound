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
import type { CampaignEvent } from '@/types';
import { Check, ChevronsUpDown, XIcon } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useCampaignEvents } from '../hooks/campaigns/use-campaign-events';

interface EventLookupProps {
  campaignId: string | undefined;
  onSelect: (event: CampaignEvent) => void;
  /** Optional: show currently selected event by id. When set, trigger shows event label. */
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

export const EventLookup = ({
  campaignId,
  onSelect,
  value,
  onDelete,
  placeholder = 'Search events...',
  className,
  popoverContentClassName,
  disabled = false,
  label = 'Event',
  id,
  'data-testid': dataTestId,
}: EventLookupProps) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const { campaignEvents } = useCampaignEvents(campaignId);

  const selectedEvent = value ? campaignEvents.find((e) => e.id === value) : undefined;

  const searchLower = search.toLowerCase().trim();
  const filteredEvents = useMemo(() => {
    if (!searchLower) return campaignEvents;
    return campaignEvents.filter((e) => e.label.toLowerCase().includes(searchLower));
  }, [campaignEvents, searchLower]);

  useEffect(() => {
    if (open) setSearch('');
  }, [open]);

  const handleSelect = (event: CampaignEvent) => {
    onSelect(event);
    setOpen(false);
  };

  return (
    <div className='flex flex-col gap-2' id={id}>
      <Label>{label}</Label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant='outline'
            role='combobox'
            aria-expanded={open}
            className={cn('w-full justify-between', className)}
            disabled={disabled || !campaignId}
            data-testid={dataTestId}>
            {selectedEvent ? (
              <span className='truncate'>{selectedEvent.label}</span>
            ) : (
              placeholder
            )}
            <>
              {selectedEvent && onDelete && (
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
        <PopoverContent
          className={cn('w-[300px] p-0', popoverContentClassName)}
          align='start'>
          <Command shouldFilter={false}>
            <CommandInput placeholder={placeholder} value={search} onValueChange={setSearch} />
            <CommandList>
              <CommandEmpty>No events found.</CommandEmpty>
              {filteredEvents.map((event) => (
                <CommandItem
                  key={event.id}
                  value={event.label}
                  onSelect={() => handleSelect(event)}>
                  <Check
                    className={cn(
                      'mr-2 h-4 w-4',
                      selectedEvent?.id === event.id ? 'opacity-100' : 'opacity-0',
                    )}
                  />
                  <span>{event.label}</span>
                </CommandItem>
              ))}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
};
