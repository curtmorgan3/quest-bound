import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
  Avatar,
  AvatarFallback,
  AvatarImage,
  Button,
  Card,
} from '@/components';
import {
  CharacterLookup,
  useCampaignCharacters,
  useCampaigns,
  useCharacter,
  useRulesets,
  useWorlds,
} from '@/lib/compass-api';
import type { Campaign } from '@/types';
import { Trash2, UserMinus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useCampaignPlayCharacterList } from './hooks/use-campaign-play-character-list';

function CampaignCardCharacterSection({ campaign }: { campaign: Campaign }) {
  const { campaignCharacters, createCampaignCharacter, deleteCampaignCharacter } =
    useCampaignCharacters(campaign.id);
  const { characters } = useCharacter();
  const withNames = useCampaignPlayCharacterList({ campaignCharacters });

  const playerCharacterIds = new Set(characters.map((c) => c.id));
  const playerCampaignCharacters = withNames.filter(
    (entry) => playerCharacterIds.has(entry.cc.characterId) && !entry.character?.isNpc,
  );

  const handleAddCharacter = async (characterId: string) => {
    await createCampaignCharacter(campaign.id, characterId, {});
  };

  return (
    <div className='flex flex-col gap-3 pt-1'>
      <ul className='flex flex-col gap-1'>
        {playerCampaignCharacters.map(({ cc, character }) => (
          <li
            key={cc.id}
            className='flex items-center justify-between gap-2 rounded-md border px-2 py-1.5'>
            <div className='flex min-w-0 flex-1 items-center gap-2'>
              <Avatar className='size-8 shrink-0 rounded-md'>
                <AvatarImage src={character?.image ?? ''} alt={character?.name ?? 'Character'} />
                <AvatarFallback className='rounded-md text-xs'>
                  {(character?.name ?? '?').slice(0, 1).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span className='truncate text-sm'>{character?.name ?? 'Unknown'}</span>
            </div>
            <Button
              type='button'
              variant='ghost'
              size='icon'
              className='shrink-0 text-muted-foreground hover:text-destructive'
              aria-label='Remove from campaign'
              data-testid='campaign-character-remove'
              onClick={() => deleteCampaignCharacter(cc.id)}>
              <UserMinus className='h-4 w-4' />
            </Button>
          </li>
        ))}
      </ul>
      <CharacterLookup
        campaignId={campaign.id}
        rulesetId={campaign.rulesetId}
        onSelect={(character) => handleAddCharacter(character.id)}
        placeholder='Add character...'
        label=''
        data-testid='campaign-character-lookup'
      />
    </div>
  );
}

export function CampaignsList() {
  const { campaigns, deleteCampaign } = useCampaigns();
  const { worlds } = useWorlds();
  const { rulesets } = useRulesets();
  const navigate = useNavigate();

  const getWorldLabel = (id: string) => worlds.find((w) => w.id === id)?.label ?? 'Unknown world';
  const getRulesetTitle = (id: string) =>
    rulesets.find((r) => r.id === id)?.title ?? 'Unknown ruleset';

  const sortedCampaigns = [...campaigns].sort(
    (a, b) =>
      getWorldLabel(a.worldId).localeCompare(getWorldLabel(b.worldId)) ||
      getRulesetTitle(a.rulesetId).localeCompare(getRulesetTitle(b.rulesetId)),
  );

  return (
    <div className='flex h-full w-full flex-col gap-4 p-4'>
      <h1 className='text-4xl font-bold'>Campaigns</h1>
      <div className='flex items-center gap-4'>
        <Button
          className='w-[180px]'
          data-testid='campaigns-create'
          onClick={() => navigate('/campaigns/new')}>
          Create New
        </Button>
      </div>

      <div className='flex flex-col gap-3'>
        {sortedCampaigns.map((campaign) => (
          <Card key={campaign.id} className='overflow-hidden' data-testid='campaign-card'>
            <div className='flex flex-row items-center justify-between p-4'>
              <div className='min-w-0'>
                <p className='font-medium'>{campaign.label || 'Unnamed campaign'}</p>
                <p className='text-sm text-muted-foreground'>
                  {getWorldLabel(campaign.worldId)} · {getRulesetTitle(campaign.rulesetId)}
                </p>
              </div>
              <div className='flex items-center gap-2'>
                <Button
                  variant='outline'
                  size='sm'
                  onClick={() => navigate(`/campaigns/${campaign.id}`)}
                  data-testid='campaign-card-open'>
                  Open
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      type='button'
                      variant='outline'
                      size='icon'
                      className='shrink-0 text-muted-foreground hover:text-destructive'
                      aria-label='Delete campaign'
                      data-testid='campaign-card-delete'>
                      <Trash2 className='h-4 w-4' />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete campaign?</AlertDialogTitle>
                      <p className='text-sm text-muted-foreground'>
                        This will permanently delete the campaign and its characters, items, and
                        events. This cannot be undone.
                      </p>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        className='bg-destructive text-destructive-foreground hover:bg-destructive/90'
                        onClick={() => deleteCampaign(campaign.id)}
                        data-testid='campaign-delete-confirm'>
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
            <Accordion type='single' collapsible className='border-t'>
              <AccordionItem value='characters' className='border-none'>
                <AccordionTrigger className='px-4 py-3 text-sm'>Characters</AccordionTrigger>
                <AccordionContent className='px-4 pb-4'>
                  <CampaignCardCharacterSection campaign={campaign} />
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </Card>
        ))}
      </div>

      {sortedCampaigns.length === 0 && (
        <div className='flex flex-col items-center justify-center py-12 text-muted-foreground'>
          <p className='text-lg'>No campaigns yet</p>
          <p className='text-sm'>Create a campaign by selecting a world and a ruleset</p>
        </div>
      )}
    </div>
  );
}
