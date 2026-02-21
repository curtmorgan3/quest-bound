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
import { useCampaignContext } from '../campaign-provider';
import { useMemo, useState } from 'react';

export function JumpToCharacter() {
  const { campaignPlayerCharacters, jumpToCharacter, viewingLocationId } =
    useCampaignContext();
  const [open, setOpen] = useState(false);

  const hasPlayerCharactersElsewhere = useMemo(
    () =>
      campaignPlayerCharacters.some(
        (c) => c.currentLocationId !== viewingLocationId,
      ),
    [campaignPlayerCharacters, viewingLocationId],
  );

  const handleSelect = (characterId: string) => {
    jumpToCharacter(characterId);
    setOpen(false);
  };

  if (!hasPlayerCharactersElsewhere) return null;

  return (
    <>
      <Button variant='outline' size='sm' onClick={() => setOpen(true)}>
        Jump to character
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className='max-w-sm'>
          <DialogHeader>
            <DialogTitle>Jump to character</DialogTitle>
          </DialogHeader>
          <div className='flex max-h-60 flex-col gap-1 overflow-auto'>
            {campaignPlayerCharacters.map((character) => (
              <button
                key={character.id}
                type='button'
                onClick={() => handleSelect(character.characterId)}
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
                <span className='truncate font-medium'>
                  {character.name ?? 'Unknown'}
                </span>
              </button>
            ))}
            {campaignPlayerCharacters.length === 0 && (
              <p className='py-4 text-center text-sm text-muted-foreground'>
                No player characters in campaign
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
