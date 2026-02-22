import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components';
import { LocationLookup, useCampaign } from '@/lib/compass-api';
import { useCampaignContext } from '@/stores';
import { Navigation } from 'lucide-react';
import { useState } from 'react';
import { useParams } from 'react-router-dom';

export function JumpTo() {
  const { campaignId } = useParams<{ campaignId: string }>();
  const campaign = useCampaign(campaignId);
  const { campaignPlayerCharacters, jumpToCharacter, navigateTo, viewingLocationId } =
    useCampaignContext();
  const [open, setOpen] = useState(false);

  const handleSelectCharacter = (characterId: string) => {
    jumpToCharacter(characterId);
    setOpen(false);
  };

  const handleSelectLocation = (location: { id: string }) => {
    navigateTo(location.id);
    setOpen(false);
  };

  return (
    <>
      <Button variant='outline' size='sm' onClick={() => setOpen(true)}>
        <Navigation className='h-4 w-4' />
        Jump to
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className='max-w-sm'>
          <DialogHeader>
            <DialogTitle>Jump to</DialogTitle>
          </DialogHeader>
          <div className='flex flex-col gap-4'>
            <div className='space-y-2'>
              <p className='text-xs font-medium text-muted-foreground'>Character</p>
              <div className='flex max-h-40 flex-col gap-1 overflow-auto rounded-md border p-1'>
                {campaignPlayerCharacters.map((character) => (
                  <button
                    key={character.id}
                    type='button'
                    onClick={() => handleSelectCharacter(character.characterId)}
                    className='flex items-center gap-2 rounded-md px-2 py-2 text-left text-sm hover:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-ring'>
                    <Avatar className='size-8 shrink-0 rounded-md'>
                      <AvatarImage
                        src={character.image ?? ''}
                        alt={character.name ?? 'Character'}
                      />
                      <AvatarFallback className='rounded-md text-xs'>
                        {(character.name ?? '?').slice(0, 1).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className='truncate font-medium'>{character.name ?? 'Unknown'}</span>
                    {character.currentLocationId === viewingLocationId && (
                      <span className='ml-auto text-xs text-muted-foreground'>here</span>
                    )}
                  </button>
                ))}
                {campaignPlayerCharacters.length === 0 && (
                  <p className='py-4 text-center text-sm text-muted-foreground'>
                    No player characters in campaign
                  </p>
                )}
              </div>
            </div>
            {campaign?.worldId && (
              <LocationLookup
                worldId={campaign.worldId}
                label='Location'
                onSelect={handleSelectLocation}
                placeholder='Search locations...'
                popoverContentClassName='z-[110]'
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
