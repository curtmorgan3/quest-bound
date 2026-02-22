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
import type { Character } from '@/types';
import { ChevronsUpDown } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useCampaignCharacters } from '../hooks/campaigns/use-campaign-characters';
import { useCharacter } from '../hooks/characters/use-character';

interface CharacterLookupProps {
  /** Campaign id to determine which characters are already in the campaign */
  campaignId: string;
  /** Ruleset id to filter player characters (same as campaign.rulesetId) */
  rulesetId: string;
  /** Callback fired when a character is selected (to add to campaign) */
  onSelect: (character: Character) => void;
  /** Optional placeholder text for the trigger */
  placeholder?: string;
  /** Optional className for the trigger button */
  className?: string;
  /** Optional disabled state */
  disabled?: boolean;
  label?: string;
  id?: string;
  'data-testid'?: string;
}

export const CharacterLookup = ({
  campaignId,
  rulesetId,
  onSelect,
  placeholder = 'Add character...',
  className,
  disabled = false,
  label = 'Character',
  id,
  'data-testid': dataTestId,
}: CharacterLookupProps) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const { characters } = useCharacter();
  const { campaignCharacters } = useCampaignCharacters(campaignId);

  const alreadyInCampaignIds = new Set(
    campaignCharacters.map((cc) => cc.characterId),
  );
  const playerCharactersForRuleset = characters.filter(
    (c) => c.rulesetId === rulesetId && c.isNpc !== true,
  );
  const addableCharacters = playerCharactersForRuleset.filter(
    (c) => !alreadyInCampaignIds.has(c.id),
  );

  const searchLower = search.toLowerCase().trim();
  const filteredCharacters = searchLower
    ? addableCharacters.filter((c) =>
        (c.name ?? '').toLowerCase().includes(searchLower),
      )
    : addableCharacters;

  useEffect(() => {
    if (open) setSearch('');
  }, [open]);

  const handleSelect = (character: Character) => {
    onSelect(character);
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
            disabled={disabled}
            data-testid={dataTestId ?? 'character-lookup'}>
            {placeholder}
            <ChevronsUpDown className='ml-2 h-4 w-4 shrink-0 opacity-50' />
          </Button>
        </PopoverTrigger>
        <PopoverContent className='w-[300px] p-0' align='start'>
          <Command shouldFilter={false}>
            <CommandInput
              placeholder='Search characters...'
              value={search}
              onValueChange={setSearch}
            />
            <CommandList>
              <CommandEmpty>No characters to add.</CommandEmpty>
              {filteredCharacters.map((character) => (
                <CommandItem
                  key={character.id}
                  value={`${character.id} ${character.name ?? ''}`}
                  onSelect={() => handleSelect(character)}>
                  <span>{character.name ?? 'Unnamed'}</span>
                </CommandItem>
              ))}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
};
