import { Avatar, AvatarFallback, AvatarImage, Button } from '@/components';
import { PageWrapper } from '@/components/composites';
import {
  useCampaign,
  useCampaignCharacters,
  useCampaignScenes,
  useCharacter,
} from '@/lib/compass-api';
import type { SheetViewerBackdropClickDetail } from '@/lib/compass-planes/sheet-viewer';
import { SHEET_VIEWER_BACKDROP_CLICK } from '@/lib/compass-planes/sheet-viewer';
import { FileText, ScrollText, Zap } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ActiveScene } from './active-scene';
import { CampaignCharacterSheet } from './campaign-controls';
import { CampaignEventsPanel } from './campaign-events-panel';
import { CampaignGameLog } from './campaign-game-log';
import { useCampaignPlayCharacterList } from './hooks';
import { ManagePlayerCharacters } from './manage-player-characters';
import { NpcStage } from './npc-stage';
import { SceneDocumentPanel } from './scene-document-panel';

export function CampaignDashboard() {
  const { campaignId, sceneId } = useParams<{ campaignId: string; sceneId?: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const campaign = useCampaign(campaignId);
  const navigate = useNavigate();
  const { campaignCharacters, createCampaignCharacter, deleteCampaignCharacter } =
    useCampaignCharacters(campaignId);
  const withNames = useCampaignPlayCharacterList({ campaignCharacters });
  const { characters } = useCharacter();

  const [sheetCharacterId, setSheetCharacterId] = useState<string | null>(null);
  const [hoveredCampaignCharacterId, setHoveredCampaignCharacterId] = useState<string | null>(null);
  const [sceneDocumentPanelOpen, setSceneDocumentPanelOpen] = useState(false);
  const [sceneEventsPanelOpen, setSceneEventsPanelOpen] = useState(false);
  const [showCampaignLog, setShowCampaignLog] = useState(true);
  const [characterSheetTransparentBackground, setCharacterSheetTransparentBackground] =
    useState(true);

  const { campaignScenes } = useCampaignScenes(campaignId);
  const currentScene = sceneId ? campaignScenes.find((s) => s.id === sceneId) : undefined;

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

    window.addEventListener(SHEET_VIEWER_BACKDROP_CLICK, handleSheetBackdropClick as EventListener);

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
              hideGameLog
              characterId={sheetCharacterId ?? undefined}
              open={!!sheetCharacterId}
              transparentBackground={characterSheetTransparentBackground}
              onTransparentBackgroundChange={setCharacterSheetTransparentBackground}
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
                await createCampaignCharacter(campaign.id, characterId, {
                  ...(sceneId ? { campaignSceneId: sceneId } : {}),
                });
              }}
              onRemoveCharacter={async (campaignCharacterId) => {
                await deleteCampaignCharacter(campaignCharacterId);
              }}
            />
            <Button
              variant='ghost'
              size='icon'
              onClick={() => setSceneDocumentPanelOpen(true)}
              aria-label='Scene document'
              title={sceneId ? 'Link a document to this scene' : 'Open a scene to link a document'}
              data-testid='scene-document-panel-trigger'>
              <FileText className='h-4 w-4' />
            </Button>
            <Button
              variant='ghost'
              size='icon'
              onClick={() => setSceneEventsPanelOpen(true)}
              aria-label='Scene events'
              title={sceneId ? 'Link events to this scene' : 'Open a scene to link events'}
              data-testid='scene-events-panel-trigger'>
              <Zap className='h-4 w-4' />
            </Button>
            <Button
              variant='ghost'
              size='icon'
              onClick={() => setShowCampaignLog((v) => !v)}
              aria-label={showCampaignLog ? 'Hide game log' : 'Show game log'}
              title={showCampaignLog ? 'Hide game log' : 'Show game log'}
              data-testid='campaign-log-toggle'
              className={showCampaignLog ? 'text-primary' : undefined}>
              <ScrollText className='h-4 w-4' />
            </Button>
            <SceneDocumentPanel
              open={sceneDocumentPanelOpen}
              onOpenChange={setSceneDocumentPanelOpen}
              campaignId={campaign.id}
              sceneId={sceneId}
              sceneName={currentScene?.name}
            />
            <CampaignEventsPanel
              open={sceneEventsPanelOpen}
              onOpenChange={setSceneEventsPanelOpen}
              campaignId={campaign.id}
              sceneId={sceneId}
              sceneName={currentScene?.name}
              actingCharacterId={sheetCharacterId}
            />
          </div>
        }>
        <div className='flex min-h-0 flex-1'>
          <NpcStage
            campaignId={campaign.id}
            rulesetId={campaign.rulesetId}
            sceneId={sceneId}
            onCardHover={setHoveredCampaignCharacterId}
          />
          <ActiveScene
            campaignId={campaign.id}
            sceneId={sceneId}
            hoveredCampaignCharacterId={hoveredCampaignCharacterId}
            onAvatarClick={(characterId) =>
              setSheetCharacterId((prev) => (prev === characterId ? null : characterId))
            }
          />
          {showCampaignLog && (
            <CampaignGameLog campaignId={campaign.id} rulesetId={campaign.rulesetId} />
          )}
        </div>
      </PageWrapper>
    </>
  );
}
