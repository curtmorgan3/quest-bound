import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Button,
} from '@/components';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { PageWrapper } from '@/components/composites';
import {
  Command,
  CommandEmpty,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  useCampaign,
  useCampaignCharacters,
  useCharacter,
} from '@/lib/compass-api';
import { CampaignCharacterSheet } from './campaign-controls';
import { useCampaignPlayCharacterList } from './hooks';
import { UserPlus } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

export function CampaignDashboard() {
  const { campaignId } = useParams<{ campaignId: string }>();
  const campaign = useCampaign(campaignId);
  const navigate = useNavigate();
  const { campaignCharacters, createCampaignCharacter } =
    useCampaignCharacters(campaignId);
  const withNames = useCampaignPlayCharacterList({ campaignCharacters });
  const { characters } = useCharacter();

  const [addCharacterOpen, setAddCharacterOpen] = useState(false);
  const [addCharacterSearch, setAddCharacterSearch] = useState('');
  const [sheetCharacterId, setSheetCharacterId] = useState<string | null>(null);

  const playerCharacterIds = new Set(characters.map((c) => c.id));
  const campaignPlayerCharacters = withNames.filter(
    (entry) => playerCharacterIds.has(entry.cc.characterId) && !entry.character?.isNpc,
  );

  const alreadyInCampaignIds = new Set(campaignCharacters.map((cc) => cc.characterId));
  const playerCharactersForRuleset = (campaign?.rulesetId
    ? characters.filter(
        (c) => c.rulesetId === campaign.rulesetId && c.isNpc !== true,
      )
    : []
  ).filter((c) => !alreadyInCampaignIds.has(c.id));

  const searchLower = addCharacterSearch.toLowerCase().trim();
  const filteredAddableCharacters = searchLower
    ? playerCharactersForRuleset.filter((c) =>
        (c.name ?? '').toLowerCase().includes(searchLower),
      )
    : playerCharactersForRuleset;

  useEffect(() => {
    if (addCharacterOpen) setAddCharacterSearch('');
  }, [addCharacterOpen]);

  const handleAddCharacter = useCallback(
    async (characterId: string) => {
      if (!campaign) return;
      await createCampaignCharacter(campaign.id, characterId, {});
      setAddCharacterOpen(false);
    },
    [campaign, createCampaignCharacter],
  );

  if (campaignId && campaign === undefined) {
    return (
      <div className='flex h-full w-full items-center justify-center p-4'>
        <p className='text-muted-foreground'>Loading…</p>
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className='flex h-full w-full flex-col items-center justify-center gap-4 p-4'>
        <p className='text-muted-foreground'>Campaign not found</p>
        <Button variant='outline' onClick={() => navigate('/campaigns')}>
          Back to campaigns
        </Button>
      </div>
    );
  }

  return (
    <>
      <PageWrapper
        title={campaign.label ?? 'Unnamed campaign'}
        headerActions={
          <div className='flex items-center gap-2'>
            <div className='flex gap-2'>
              {campaignPlayerCharacters.map(({ cc, character }) => (
                <button
                  type='button'
                  key={cc.id}
                  onClick={() =>
                    setSheetCharacterId((current) =>
                      current === cc.characterId ? null : cc.characterId,
                    )
                  }
                  className='rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-ring'
                  aria-label={
                    sheetCharacterId === cc.characterId
                      ? 'Close character sheet'
                      : `Open ${character?.name ?? 'character'} sheet`
                  }
                  title={character?.name ?? 'Character'}>
                  <Avatar className='size-8 shrink-0 rounded-md'>
                    <AvatarImage
                      src={character?.image ?? ''}
                      alt={character?.name ?? 'Character'}
                    />
                    <AvatarFallback className='rounded-md text-xs'>
                      {(character?.name ?? '?').slice(0, 1).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </button>
              ))}
            </div>
            <CampaignCharacterSheet
              characterId={sheetCharacterId ?? undefined}
              open={!!sheetCharacterId}
              onClose={() => setSheetCharacterId(null)}
            />
            <Button
              variant='outline'
              size='sm'
              onClick={() => setAddCharacterOpen(true)}
              data-testid='campaign-dashboard-add-character'
              className='gap-1'>
              <UserPlus className='h-4 w-4' />
              Add Player Character
            </Button>
          </div>
        }>
        <div className='flex flex-col gap-4 p-4'></div>
      </PageWrapper>

      <Dialog open={addCharacterOpen} onOpenChange={setAddCharacterOpen}>
        <DialogContent className='sm:max-w-md' showCloseButton>
          <DialogHeader>
            <DialogTitle>Add Player Character</DialogTitle>
          </DialogHeader>
          <Command shouldFilter={false} className='rounded-lg border'>
            <CommandInput
              placeholder='Search characters...'
              value={addCharacterSearch}
              onValueChange={setAddCharacterSearch}
            />
            <CommandList>
              <CommandEmpty>No characters to add.</CommandEmpty>
              {filteredAddableCharacters.map((character) => (
                <CommandItem
                  key={character.id}
                  value={`${character.id} ${character.name ?? ''}`}
                  onSelect={() => handleAddCharacter(character.id)}
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
        </DialogContent>
      </Dialog>
    </>
  );
}
