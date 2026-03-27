import { Avatar, AvatarFallback, AvatarImage, Button, Label, Switch } from '@/components';
import { PageWrapper } from '@/components/composites';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useCampaignPlayRealtime, useFeatureFlag } from '@/hooks';
import { CAMPAIGN_REALTIME_PLAY_FEATURE_FLAG } from '@/lib/campaign-play/campaign-play-constants';
import { shouldBlockCampaignOrchestration } from '@/lib/campaign-play/campaign-play-orchestration-gate';
import {
  useActiveRuleset,
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
import { cn } from '@/lib/utils';
import { db, useCloudAuthStore } from '@/stores';
import { useCampaignPlaySessionStore } from '@/stores/campaign-play-session-store';
import type { Character } from '@/types';
import { getFeatureFlag } from '@/utils/feature-flags';
import { ChevronLeft, ChevronRight, FileText, Globe, Zap } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ActiveScene } from './active-scene';
import { CampaignCharacterSheet } from './campaign-controls';
import { CampaignEventsPanel } from './campaign-events-panel';
import { CampaignGameLog } from './campaign-game-log';
import { CampaignPlayInviteSheet } from './campaign-play-invite-sheet';
import { useCampaignPlayCharacterList } from './hooks';
import { ManagePlayerCharacters } from './manage-player-characters';
import { NpcStage } from './npc-stage';
import { SceneDocumentPanel } from './scene-document-panel';
import { TurnOrderScene } from './turn-order-scene';

const DASHBOARD_COLUMNS_STORAGE_KEY = 'qb.campaignDashboard.columns';
const HOST_REALTIME_BY_CAMPAIGN_STORAGE_KEY = 'qb.campaignDashboard.hostRealtimeByCampaignId';

interface StoredColumnState {
  left: boolean;
  center: boolean;
  right: boolean;
}

function loadColumnState(): StoredColumnState {
  if (typeof window === 'undefined') return { left: false, center: false, right: false };
  try {
    const raw = localStorage.getItem(DASHBOARD_COLUMNS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as StoredColumnState;
      if (
        typeof parsed?.left === 'boolean' &&
        typeof parsed?.center === 'boolean' &&
        typeof parsed?.right === 'boolean'
      ) {
        return parsed;
      }
    }
  } catch {
    // ignore invalid stored state
  }
  return { left: false, center: false, right: false };
}

function saveColumnState(state: StoredColumnState) {
  try {
    localStorage.setItem(DASHBOARD_COLUMNS_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore quota / private mode
  }
}

function loadHostRealtimeByCampaignId(): Record<string, boolean> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(HOST_REALTIME_BY_CAMPAIGN_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    const out: Record<string, boolean> = {};
    for (const [k, v] of Object.entries(parsed as Record<string, unknown>)) {
      if (v === true) out[k] = true;
    }
    return out;
  } catch {
    return {};
  }
}

function saveHostRealtimeByCampaignId(state: Record<string, boolean>) {
  try {
    localStorage.setItem(HOST_REALTIME_BY_CAMPAIGN_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore quota / private mode
  }
}

export function CampaignDashboard() {
  const { campaignId, sceneId } = useParams<{ campaignId: string; sceneId?: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const campaignRealtimePlayEnabled = useFeatureFlag(CAMPAIGN_REALTIME_PLAY_FEATURE_FLAG);
  const campaignPlaySession = useCampaignPlaySessionStore((s) => s.session);
  const hostCloudUserId = useCloudAuthStore((s) => s.cloudUser?.id ?? null);
  const cloudSyncEnabled = useCloudAuthStore((s) => s.cloudSyncEnabled);
  const isCloudSyncEligibilityLoading = useCloudAuthStore((s) => s.isCloudSyncEligibilityLoading);
  const showHostCampaignCloudPanel =
    cloudSyncEnabled && !isCloudSyncEligibilityLoading;
  const orchestrationBlocked = shouldBlockCampaignOrchestration(campaignId);
  const showHostRealtimeReconnectNotice =
    campaignRealtimePlayEnabled &&
    !!campaignId &&
    campaignPlaySession?.campaignId === campaignId &&
    campaignPlaySession.role === 'host' &&
    (campaignPlaySession.realtimeStatus === 'connecting' ||
      campaignPlaySession.realtimeStatus === 'error');

  const campaign = useCampaign(campaignId);
  const navigate = useNavigate();
  const { campaignCharacters, deleteCampaignCharacter, updateCampaignCharacter } =
    useCampaignCharacters(campaignId);
  const withNames = useCampaignPlayCharacterList({ campaignCharacters });
  const { characters } = useCharacter();

  const charactersById = useMemo(() => {
    const m = new Map<string, Character>();
    for (const ch of characters) m.set(ch.id, ch);
    return m;
  }, [characters]);

  const [sheetCharacterId, setSheetCharacterId] = useState<string | null>(null);
  const [hoveredCampaignCharacterId, setHoveredCampaignCharacterId] = useState<string | null>(null);
  const [sceneDocumentPanelOpen, setSceneDocumentPanelOpen] = useState(false);
  const [sceneEventsPanelOpen, setSceneEventsPanelOpen] = useState(false);
  const [guestJoinInviteSheetOpen, setGuestJoinInviteSheetOpen] = useState(false);
  const [hostRealtimeByCampaignId, setHostRealtimeByCampaignId] = useState<
    Record<string, boolean>
  >(() => loadHostRealtimeByCampaignId());
  const hostCampaignRealtimeEnabled = Boolean(
    campaignId && hostRealtimeByCampaignId[campaignId],
  );
  const setHostCampaignRealtimeEnabled = (enabled: boolean) => {
    if (!campaignId) return;
    setHostRealtimeByCampaignId((prev) => {
      if (!enabled) {
        const next = { ...prev };
        delete next[campaignId];
        return next;
      }
      return { ...prev, [campaignId]: enabled };
    });
  };
  const [characterSheetTransparentBackground, setCharacterSheetTransparentBackground] =
    useState(true);
  const [advancing, setAdvancing] = useState(false);
  const [leftColumnCollapsed, setLeftColumnCollapsed] = useState(() => loadColumnState().left);
  const [centerColumnCollapsed, setCenterColumnCollapsed] = useState(
    () => loadColumnState().center,
  );
  const [rightColumnCollapsed, setRightColumnCollapsed] = useState(() => loadColumnState().right);

  useEffect(() => {
    saveColumnState({
      left: leftColumnCollapsed,
      center: centerColumnCollapsed,
      right: rightColumnCollapsed,
    });
  }, [leftColumnCollapsed, centerColumnCollapsed, rightColumnCollapsed]);

  useEffect(() => {
    saveHostRealtimeByCampaignId(hostRealtimeByCampaignId);
  }, [hostRealtimeByCampaignId]);

  useEffect(() => {
    if (!campaignId || !getFeatureFlag(CAMPAIGN_REALTIME_PLAY_FEATURE_FLAG)) return;

    if (!cloudSyncEnabled || isCloudSyncEligibilityLoading) {
      useCampaignPlaySessionStore.getState().clearSessionIfCampaign(campaignId);
      return;
    }

    if (hostCampaignRealtimeEnabled) {
      useCampaignPlaySessionStore.getState().enterSession({
        campaignId,
        realtimeChannelName: null,
        role: 'host',
        hostSessionActive: true,
      });
      return () => {
        useCampaignPlaySessionStore.getState().clearSessionIfCampaign(campaignId);
      };
    }

    useCampaignPlaySessionStore.getState().clearSessionIfCampaign(campaignId);
    return () => {
      useCampaignPlaySessionStore.getState().clearSessionIfCampaign(campaignId);
    };
  }, [
    campaignId,
    hostCampaignRealtimeEnabled,
    cloudSyncEnabled,
    isCloudSyncEligibilityLoading,
  ]);

  useEffect(() => {
    if (!cloudSyncEnabled || isCloudSyncEligibilityLoading) {
      setGuestJoinInviteSheetOpen(false);
    }
  }, [cloudSyncEnabled, isCloudSyncEligibilityLoading]);

  useCampaignPlayRealtime({
    campaignId,
    enabled: campaignRealtimePlayEnabled && !!campaignId,
  });

  // Ensure active ruleset (and its assets) are resolved for this campaign view.
  // useActiveRuleset will derive the rulesetId from the campaignId route param
  // and trigger the ruleset-scoped asset preload effect.
  useActiveRuleset();

  const { campaignScenes } = useCampaignScenes(campaignId);
  const currentScene = sceneId ? campaignScenes.find((s) => s.id === sceneId) : undefined;
  const campaignTitle = currentScene
    ? `${campaign?.label ?? 'Unnamed campaign'} > ${currentScene.name ?? 'Unnamed scene'}`
    : (campaign?.label ?? 'Unnamed campaign');

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
                  disabled={orchestrationBlocked}
                  onRemoveCharacter={async (campaignCharacterId) => {
                    await deleteCampaignCharacter(campaignCharacterId);
                  }}
                />

                <div className='flex items-center border-l pl-2 gap-2'>
                  <Switch
                    id='turn-based-mode'
                    checked={!!currentScene.turnBasedMode}
                    disabled={orchestrationBlocked}
                    onCheckedChange={async (checked) => {
                      if (!campaignId || !sceneId || orchestrationBlocked) return;
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
                        if (!campaignId || !sceneId || !campaign?.rulesetId || orchestrationBlocked)
                          return;
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
                      disabled={advancing || orchestrationBlocked}
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
            {campaignRealtimePlayEnabled && campaignId && showHostCampaignCloudPanel && (
              <>
                <Button
                  variant='ghost'
                  size='icon'
                  onClick={() => setGuestJoinInviteSheetOpen(true)}
                  aria-label='Guest join token and host session'
                  title='Guest join token and host session'
                  data-testid='guest-join-invite-sheet-trigger'>
                  <Globe
                    className={cn('h-4 w-4', hostCampaignRealtimeEnabled && 'text-primary')}
                  />
                </Button>
                <CampaignPlayInviteSheet
                  open={guestJoinInviteSheetOpen}
                  onOpenChange={setGuestJoinInviteSheetOpen}
                  campaignId={campaign.id}
                  rulesetId={campaign.rulesetId}
                  campaignLabel={campaign.label}
                  campaignCharacters={campaignCharacters}
                  charactersById={charactersById}
                  hostCloudUserId={hostCloudUserId}
                  hostRealtimeEnabled={hostCampaignRealtimeEnabled}
                  onHostRealtimeEnabledChange={setHostCampaignRealtimeEnabled}
                />
              </>
            )}
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
              campaignSceneId={sceneId ?? undefined}
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
        {showHostRealtimeReconnectNotice && (
          <Alert className='mx-4 mt-2 shrink-0 border-amber-500/40 bg-amber-500/10 text-amber-950 dark:text-amber-100'>
            <AlertDescription className='text-sm'>
              {campaignPlaySession?.realtimeStatus === 'connecting'
                ? 'Reconnecting to campaign realtime…'
                : (campaignPlaySession?.realtimeLastError ?? 'Campaign realtime connection error')}
            </AlertDescription>
          </Alert>
        )}
        <div className='flex min-h-0 flex-1'>
          {/* Left column: Stage NPCs */}
          <div
            className={cn(
              'flex min-h-0 flex-col bg-muted/20',
              leftColumnCollapsed ? 'w-10 shrink-0 border-r border-border' : 'shrink-0',
            )}
            style={leftColumnCollapsed ? undefined : { width: 280 }}>
            {leftColumnCollapsed ? (
              <button
                type='button'
                onClick={() => setLeftColumnCollapsed(false)}
                className='flex h-full min-h-0 flex-col items-center justify-center gap-1 border-r border-border bg-muted/30 px-1 py-2 hover:bg-muted/50'
                aria-label='Expand Stage NPCs panel'>
                <ChevronRight className='size-4 shrink-0' />
                <span className='text-[10px] font-medium uppercase tracking-wide text-muted-foreground [writing-mode:vertical-rl]'>
                  Stage
                </span>
              </button>
            ) : (
              <>
                <div className='flex shrink-0 items-center justify-between gap-2 border-b border-border px-2 py-1.5'>
                  <span className='text-sm font-medium text-muted-foreground'>Stage NPCs</span>
                  <Button
                    variant='ghost'
                    size='icon'
                    className='size-7'
                    onClick={() => setLeftColumnCollapsed(true)}
                    aria-label='Collapse Stage NPCs panel'>
                    <ChevronLeft className='size-4' />
                  </Button>
                </div>
                <div className='min-h-0 flex-1 overflow-auto'>
                  <NpcStage
                    campaignId={campaign.id}
                    rulesetId={campaign.rulesetId}
                    sceneId={sceneId}
                    onCardHover={setHoveredCampaignCharacterId}
                  />
                </div>
              </>
            )}
          </div>

          {/* Center column: Scene (Active / Turn order) */}
          <div
            className={cn(
              'flex min-h-0 flex-col bg-muted/20',
              centerColumnCollapsed
                ? 'w-10 shrink-0 border-r border-border'
                : 'min-w-0 flex-1 border-r border-border',
            )}>
            {centerColumnCollapsed ? (
              <button
                type='button'
                onClick={() => setCenterColumnCollapsed(false)}
                className='flex h-full min-h-0 flex-col items-center justify-center gap-1 border-r border-border bg-muted/30 px-1 py-2 hover:bg-muted/50'
                aria-label='Expand Scene panel'>
                <ChevronRight className='size-4 shrink-0' />
                <span className='text-[10px] font-medium uppercase tracking-wide text-muted-foreground [writing-mode:vertical-rl]'>
                  Scene
                </span>
              </button>
            ) : (
              <>
                <div className='flex shrink-0 items-center justify-between gap-2 border-b border-border px-2 py-1.5'>
                  <span className='text-sm font-medium text-muted-foreground'>
                    {currentScene?.turnBasedMode ? 'Turn order' : 'Active'}
                  </span>
                  <Button
                    variant='ghost'
                    size='icon'
                    className='size-7'
                    onClick={() => setCenterColumnCollapsed(true)}
                    aria-label='Collapse Scene panel'>
                    <ChevronLeft className='size-4' />
                  </Button>
                </div>
                <div className='min-h-0 flex-1 overflow-auto'>
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
                      onReorderTurnOrder={
                        orchestrationBlocked
                          ? undefined
                          : async (orderedCampaignCharacterIds) => {
                              for (let i = 0; i < orderedCampaignCharacterIds.length; i++) {
                                await updateCampaignCharacter(orderedCampaignCharacterIds[i], {
                                  turnOrder: i,
                                });
                              }
                            }
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
                </div>
              </>
            )}
          </div>

          {/* Right column: Game Log */}
          <div
            className={cn(
              'flex min-h-0 flex-col bg-muted/20',
              rightColumnCollapsed
                ? 'w-10 shrink-0 border-l border-border'
                : 'min-w-[240px] flex-1',
            )}>
            {rightColumnCollapsed ? (
              <button
                type='button'
                onClick={() => setRightColumnCollapsed(false)}
                className='flex h-full min-h-0 flex-col items-center justify-center gap-1 border-l border-border bg-muted/30 px-1 py-2 hover:bg-muted/50'
                aria-label='Expand Game log panel'>
                <ChevronLeft className='size-4 shrink-0' />
                <span className='text-[10px] font-medium uppercase tracking-wide text-muted-foreground [writing-mode:vertical-rl]'>
                  Log
                </span>
              </button>
            ) : (
              <>
                <div className='flex shrink-0 items-center justify-between gap-2 border-b border-border px-2 py-1.5'>
                  <span className='text-sm font-medium text-muted-foreground'>Game log</span>
                  <Button
                    variant='ghost'
                    size='icon'
                    className='size-7'
                    onClick={() => setRightColumnCollapsed(true)}
                    aria-label='Collapse Game log panel'>
                    <ChevronRight className='size-4' />
                  </Button>
                </div>
                <div className='min-h-0 flex-1 overflow-auto'>
                  <CampaignGameLog campaignId={campaign.id} rulesetId={campaign.rulesetId} />
                </div>
              </>
            )}
          </div>
        </div>
      </PageWrapper>
    </>
  );
}
