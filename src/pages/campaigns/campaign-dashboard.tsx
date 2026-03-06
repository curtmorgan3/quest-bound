import { Avatar, AvatarFallback, AvatarImage, Button, Label, Switch } from '@/components';
import { PageWrapper } from '@/components/composites';
import {
  useCampaign,
  useCampaignCharacters,
  useCampaignScenes,
  useCharacter,
} from '@/lib/compass-api';
import { runSceneAdvanceFromUI } from '@/lib/compass-logic/runtime';
import {
  startSceneTurnBasedMode,
  stopSceneTurnBasedMode,
} from '@/lib/compass-logic/runtime/advance-turn-order';
import type { SheetViewerBackdropClickDetail } from '@/lib/compass-planes/sheet-viewer';
import { SHEET_VIEWER_BACKDROP_CLICK } from '@/lib/compass-planes/sheet-viewer';
import { db } from '@/stores';
import { ChevronRight, FileText, ScrollText, Zap } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ActiveScene } from './active-scene';
import { CampaignCharacterSheet } from './campaign-controls';
import { CampaignEventsPanel } from './campaign-events-panel';
import { CampaignGameLog } from './campaign-game-log';
import { useCampaignPlayCharacterList } from './hooks';
import { ManagePlayerCharacters } from './manage-player-characters';
import { NpcStage } from './npc-stage';
import { SceneDocumentPanel } from './scene-document-panel';
import { TurnOrderScene } from './turn-order-scene';

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
  const [advancing, setAdvancing] = useState(false);

  const { campaignScenes } = useCampaignScenes(campaignId);
  const currentScene = sceneId ? campaignScenes.find((s) => s.id === sceneId) : undefined;
  const campaignTitle = currentScene
    ? `${campaign?.label ?? 'Unnamed campaign'} > ${currentScene.name ?? 'Unnamed scene'}`
    : campaign?.label ?? 'Unnamed campaign';

  const sceneCharactersByTurnOrder = useMemo(
    () =>
      sceneId && withNames.length > 0
        ? withNames
            .filter(
              (entry) =>
                entry.cc.campaignSceneId === sceneId &&
                (entry.cc.active === true || !entry.character?.isNpc),
            )
            .sort((a, b) => (a.cc.turnOrder ?? 0) - (b.cc.turnOrder ?? 0))
            .map((entry) => entry.cc)
        : [],
    [sceneId, withNames],
  );
  const currentStepInCycle = currentScene?.turnBasedMode
    ? Math.min(
        currentScene.currentStepInCycle ?? 0,
        Math.max(0, sceneCharactersByTurnOrder.length - 1),
      )
    : -1;
  const currentTurnCampaignCharacterId =
    currentStepInCycle >= 0 && sceneCharactersByTurnOrder[currentStepInCycle]
      ? sceneCharactersByTurnOrder[currentStepInCycle].id
      : null;

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
        title={campaignTitle}
        headerActions={
          <div className='flex items-center gap-2'>
            {sceneId && currentScene && (
              <div className='flex items-center gap-3'>
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

                <div className='flex items-center border-l pl-2 gap-2'>
                  <Switch
                    id='turn-based-mode'
                    checked={!!currentScene.turnBasedMode}
                    onCheckedChange={async (checked) => {
                      if (!campaignId || !sceneId) return;
                      try {
                        if (checked) {
                          await startSceneTurnBasedMode(db, campaignId, sceneId);
                        } else {
                          await stopSceneTurnBasedMode(db, campaignId, sceneId);
                        }
                      } catch (e) {
                        console.warn('Turn-based mode toggle failed', e);
                      }
                    }}
                    data-testid='turn-based-mode-switch'
                  />
                  <Label htmlFor='turn-based-mode' className='text-sm cursor-pointer'>
                    Turn Mode
                  </Label>
                </div>
                {currentScene.turnBasedMode && (
                  <>
                    <Button
                      variant='outline'
                      size='sm'
                      onClick={async () => {
                        if (!campaignId || !sceneId || !campaign?.rulesetId) return;
                        setAdvancing(true);
                        try {
                          await runSceneAdvanceFromUI({
                            db,
                            rulesetId: campaign.rulesetId,
                            campaignId,
                            campaignSceneId: sceneId,
                          });
                        } catch (e) {
                          console.warn('Advance turn failed', e);
                        } finally {
                          setAdvancing(false);
                        }
                      }}
                      disabled={advancing}
                      aria-label='Next turn'
                      data-testid='next-turn-button'>
                      <ChevronRight className='h-4 w-4' />
                    </Button>
                  </>
                )}
              </div>
            )}
            {sceneId && currentScene && (
              <div className='h-6 w-px shrink-0 bg-border self-center' aria-hidden />
            )}

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
            <CampaignCharacterSheet
              hideGameLog
              campaignId={campaignId}
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
          </div>
        }>
        <div className='flex min-h-0 flex-1'>
          <NpcStage
            campaignId={campaign.id}
            rulesetId={campaign.rulesetId}
            sceneId={sceneId}
            onCardHover={setHoveredCampaignCharacterId}
          />
          {currentScene?.turnBasedMode && sceneId ? (
            <TurnOrderScene
              campaignId={campaign.id}
              sceneId={sceneId}
              currentTurnCycle={currentScene.currentTurnCycle ?? 1}
              currentTurnCampaignCharacterId={currentTurnCampaignCharacterId ?? null}
              hoveredCampaignCharacterId={hoveredCampaignCharacterId}
              onAvatarClick={(characterId) =>
                setSheetCharacterId((prev) => (prev === characterId ? null : characterId))
              }
            />
          ) : (
            <ActiveScene
              campaignId={campaign.id}
              sceneId={sceneId}
              hoveredCampaignCharacterId={hoveredCampaignCharacterId}
              onAvatarClick={(characterId) =>
                setSheetCharacterId((prev) => (prev === characterId ? null : characterId))
              }
            />
          )}
          {showCampaignLog && (
            <CampaignGameLog campaignId={campaign.id} rulesetId={campaign.rulesetId} />
          )}
        </div>
      </PageWrapper>
    </>
  );
}
