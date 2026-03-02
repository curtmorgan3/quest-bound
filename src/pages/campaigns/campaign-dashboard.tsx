import { Avatar, AvatarFallback, AvatarImage, Button } from '@/components';
import { PageWrapper } from '@/components/composites';
import {
  useCampaign,
  useCampaignCharacters,
  useCharacter,
} from '@/lib/compass-api';
import type { SheetViewerBackdropClickDetail } from '@/lib/compass-planes/sheet-viewer';
import { SHEET_VIEWER_BACKDROP_CLICK } from '@/lib/compass-planes/sheet-viewer';
import { CampaignCharacterSheet } from './campaign-controls';
import { useCampaignPlayCharacterList } from './hooks';
import { ActiveScene } from './active-scene';
import { NpcStage } from './npc-stage';
import { useEffect, useState } from 'react';
import { ManagePlayerCharacters } from './manage-player-characters';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';

export function CampaignDashboard() {
  const { campaignId } = useParams<{ campaignId: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const campaign = useCampaign(campaignId);
  const navigate = useNavigate();
  const { campaignCharacters, createCampaignCharacter, deleteCampaignCharacter } =
    useCampaignCharacters(campaignId);
  const withNames = useCampaignPlayCharacterList({ campaignCharacters });
  const { characters } = useCharacter();

  const [sheetCharacterId, setSheetCharacterId] = useState<string | null>(null);
  const [hoveredCampaignCharacterId, setHoveredCampaignCharacterId] = useState<string | null>(
    null,
  );

  useEffect(() => {
    if (!sheetCharacterId) return;

    const handleSheetBackdropClick = (e: CustomEvent<SheetViewerBackdropClickDetail>) => {
      const { clientX, clientY } = e.detail;
      if (typeof document === 'undefined' || !document.elementsFromPoint) return;

      const elements = document.elementsFromPoint(clientX, clientY) as Element[];
      const avatarEl = elements.find(
        (el) => el instanceof HTMLElement && el.dataset.activeNpcAvatar === 'true',
      ) as HTMLElement | undefined;

      if (avatarEl) {
        avatarEl.click();
      }
    };

    window.addEventListener(
      SHEET_VIEWER_BACKDROP_CLICK,
      handleSheetBackdropClick as EventListener,
    );

    return () =>
      window.removeEventListener(
        SHEET_VIEWER_BACKDROP_CLICK,
        handleSheetBackdropClick as EventListener,
      );
  }, [sheetCharacterId]);

  const playerCharacterIds = new Set(characters.map((c) => c.id));
  const campaignPlayerCharacters = withNames.filter(
    (entry) => playerCharacterIds.has(entry.cc.characterId) && !entry.character?.isNpc,
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
              onClose={() => {
                setSheetCharacterId(null);
                if (searchParams.has('pageId')) {
                  const next = new URLSearchParams(searchParams);
                  next.delete('pageId');
                  setSearchParams(next, { replace: true });
                }
              }}
            />
            <ManagePlayerCharacters
              campaignCharacters={campaignCharacters}
              characters={characters}
              rulesetId={campaign.rulesetId}
              onAddCharacter={async (characterId) => {
                await createCampaignCharacter(campaign.id, characterId, {});
              }}
              onRemoveCharacter={async (campaignCharacterId) => {
                await deleteCampaignCharacter(campaignCharacterId);
              }}
            />
          </div>
        }>
        <div className='flex min-h-0 flex-1'>
          <NpcStage
            campaignId={campaign.id}
            rulesetId={campaign.rulesetId}
            onCardHover={setHoveredCampaignCharacterId}
          />
          <ActiveScene
            campaignId={campaign.id}
            hoveredCampaignCharacterId={hoveredCampaignCharacterId}
            onAvatarClick={(characterId) =>
              setSheetCharacterId((prev) => (prev === characterId ? null : characterId))
            }
          />
          <div className='min-h-0 flex-1 flex flex-col gap-4 p-4' />
        </div>
      </PageWrapper>

    </>
  );
}
