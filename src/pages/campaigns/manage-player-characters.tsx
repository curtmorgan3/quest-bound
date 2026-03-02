import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Button,
  Label,
} from '@/components';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Command,
  CommandEmpty,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import type { CampaignCharacter, Character } from '@/types';
import { Trash2, UserPlus } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';

interface ManagePlayerCharactersProps {
  campaignCharacters: CampaignCharacter[];
  characters: Character[];
  rulesetId?: string | null;
  onAddCharacter: (characterId: string) => Promise<void> | void;
  onRemoveCharacter: (campaignCharacterId: string) => Promise<void> | void;
}

export function ManagePlayerCharacters({
  campaignCharacters,
  characters,
  rulesetId,
  onAddCharacter,
  onRemoveCharacter,
}: ManagePlayerCharactersProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (nextOpen) setSearch('');
  };

  const playerCampaignCharacters = useMemo(() => {
    return campaignCharacters
      .map((cc) => ({
        cc,
        character: characters.find((c) => c.id === cc.characterId),
      }))
      .filter(
        ({ character }) =>
          !!character &&
          character.isNpc !== true &&
          (!rulesetId || character.rulesetId === rulesetId),
      );
  }, [campaignCharacters, characters, rulesetId]);

  const filteredAddableCharacters = useMemo(() => {
    const alreadyInCampaignIds = new Set(campaignCharacters.map((cc) => cc.characterId));
    const baseList =
      rulesetId != null
        ? characters.filter(
            (c) =>
              c.rulesetId === rulesetId &&
              c.isNpc !== true &&
              !alreadyInCampaignIds.has(c.id),
          )
        : [];

    const searchLower = search.toLowerCase().trim();
    if (!searchLower) return baseList;

    return baseList.filter((c) => (c.name ?? '').toLowerCase().includes(searchLower));
  }, [campaignCharacters, characters, rulesetId, search]);

  const handleAdd = useCallback(
    async (characterId: string) => {
      await onAddCharacter(characterId);
      handleOpenChange(false);
    },
    [onAddCharacter],
  );

  const handleRemove = useCallback(
    async (campaignCharacterId: string) => {
      await onRemoveCharacter(campaignCharacterId);
    },
    [onRemoveCharacter],
  );

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button
          variant='outline'
          size='sm'
          data-testid='campaign-dashboard-add-character'
          className='gap-1'>
          <UserPlus className='h-4 w-4' />
          Manage Player Characters
        </Button>
      </DialogTrigger>
      <DialogContent className='sm:max-w-md' showCloseButton>
        <DialogHeader>
          <DialogTitle>Manage Player Characters</DialogTitle>
          <DialogDescription>
            Add player characters to this campaign or remove existing ones.
          </DialogDescription>
        </DialogHeader>

        <div className='flex flex-col gap-4'>
          <div className='flex flex-col gap-2'>
            <Label className='text-xs text-muted-foreground'>In this campaign</Label>
            {playerCampaignCharacters.length === 0 ? (
              <p className='text-sm text-muted-foreground'>
                No player characters in this campaign yet.
              </p>
            ) : (
              <div className='flex flex-col gap-2'>
                {playerCampaignCharacters.map(({ cc, character }) => (
                  <div
                    key={cc.id}
                    className='flex items-center gap-2 rounded-md border px-2 py-1'>
                    <Avatar className='size-8 shrink-0 rounded-md'>
                      <AvatarImage
                        src={character?.image ?? ''}
                        alt={character?.name ?? 'Character'}
                      />
                      <AvatarFallback className='rounded-md text-xs'>
                        {(character?.name ?? '?').slice(0, 1).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className='flex-1 min-w-0'>
                      <div className='truncate text-sm font-medium'>
                        {character?.name ?? 'Unnamed'}
                      </div>
                    </div>
                    <Button
                      variant='ghost'
                      size='icon'
                      className='h-7 w-7 text-muted-foreground hover:text-destructive'
                      aria-label={`Remove ${character?.name ?? 'character'} from campaign`}
                      onClick={() => void handleRemove(cc.id)}>
                      <Trash2 className='h-4 w-4' />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className='flex flex-col gap-2'>
            <Label className='text-xs text-muted-foreground'>Add from ruleset</Label>
            <Command shouldFilter={false} className='rounded-lg border'>
              <CommandInput
                placeholder='Search characters...'
                value={search}
                onValueChange={setSearch}
              />
              <CommandList>
                <CommandEmpty>No characters to add.</CommandEmpty>
                {filteredAddableCharacters.map((character) => (
                  <CommandItem
                    key={character.id}
                    value={`${character.id} ${character.name ?? ''}`}
                    onSelect={() => void handleAdd(character.id)}
                    className='flex items-center gap-2'>
                    <Avatar className='size-8 shrink-0 rounded-md'>
                      <AvatarImage
                        src={character.image ?? ''}
                        alt={character.name ?? 'Character'}
                      />
                      <AvatarFallback className='rounded-md text-xs'>
                        {(character.name ?? '?').slice(0, 1).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span>{character.name ?? 'Unnamed'}</span>
                  </CommandItem>
                ))}
              </CommandList>
            </Command>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

