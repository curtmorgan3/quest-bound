import { Button } from '@/components';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { EventLookup } from '@/lib/compass-api';
import { useQBScriptClient } from '@/lib/compass-logic/worker/hooks';
import { activateButtonStyle } from '@/palette';
import { db } from '@/stores';
import type { CampaignEvent, CampaignEventScene } from '@/types';
import { useLiveQuery } from 'dexie-react-hooks';
import { FileText, Trash2, Zap } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';

type EventSceneWithEvent = CampaignEventScene & { event: CampaignEvent };

export interface CampaignEventsPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campaignId: string | undefined;
  sceneId: string | undefined;
  sceneName?: string;
  /** When set, on_activate runs as this character. */
  actingCharacterId?: string | null;
}

export function CampaignEventsPanel({
  open,
  onOpenChange,
  campaignId,
  sceneId,
  sceneName,
  actingCharacterId,
}: CampaignEventsPanelProps) {
  const [activatingEventId, setActivatingEventId] = useState<string | null>(null);
  const client = useQBScriptClient();

  const hasScene = Boolean(campaignId && sceneId);

  const eventsForScene = useLiveQuery(async (): Promise<EventSceneWithEvent[]> => {
    if (!sceneId || !campaignId) return [];

    const links = await db.campaignEventScenes.where('campaignSceneId').equals(sceneId).toArray();
    if (links.length === 0) return [];

    const events = await db.campaignEvents.bulkGet(links.map((l) => l.campaignEventId));
    return links
      .map((link) => {
        const event = events.find((e) => e?.id === link.campaignEventId);
        return event && event.campaignId === campaignId
          ? ({ ...link, event } as EventSceneWithEvent)
          : null;
      })
      .filter((x): x is EventSceneWithEvent => x != null);
  }, [sceneId, campaignId]);

  const sortedEventsForScene = useMemo(
    () =>
      (eventsForScene ?? []).slice().sort((a, b) =>
        (a.event.label ?? '').localeCompare(b.event.label ?? '', undefined, {
          sensitivity: 'base',
        }),
      ),
    [eventsForScene],
  );

  const handleAddEventToScene = useCallback(
    async (event: CampaignEvent) => {
      if (!sceneId) return;
      // Avoid duplicate links
      if (eventsForScene?.some((link) => link.campaignEventId === event.id)) return;
      const now = new Date().toISOString();
      await db.campaignEventScenes.add({
        id: crypto.randomUUID(),
        campaignEventId: event.id,
        campaignSceneId: sceneId,
        createdAt: now,
        updatedAt: now,
      } as CampaignEventScene);
    },
    [eventsForScene, sceneId],
  );

  const handleUpdateParameterValue = useCallback(
    async (linkId: string, paramId: string, value: string) => {
      try {
        const link = (await db.campaignEventScenes.get(linkId)) as CampaignEventScene | undefined;
        if (!link) return;
        const existing = link.parameterValues ?? {};
        const next: Record<string, any> = { ...existing };
        if (value === '') {
          delete next[paramId];
        } else {
          next[paramId] = value;
        }
        await db.campaignEventScenes.update(linkId, {
          parameterValues: next,
          updatedAt: new Date().toISOString(),
        } as Partial<CampaignEventScene>);
      } catch (e) {
        console.warn('[CampaignEventsPanel] Failed to update parameter value', e);
      }
    },
    [],
  );

  const handleRemoveEventFromScene = useCallback(async (linkId: string) => {
    await db.campaignEventScenes.delete(linkId);
  }, []);

  const handleActivateEvent = useCallback(
    async (event: CampaignEvent) => {
      if (!event.scriptId || !sceneId) return;
      setActivatingEventId(event.id);
      try {
        await client
          .executeCampaignEventEvent(event.id, sceneId, 'on_activate', null)
          .catch((err) => console.warn('[CampaignEventsPanel] on_activate script failed:', err));
      } finally {
        setActivatingEventId((current) => (current === event.id ? null : current));
      }
    },
    [actingCharacterId, client, sceneId],
  );

  const hasEvents = sortedEventsForScene.length > 0;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side='right'
        className='flex w-full flex-col gap-0 border-l p-0 sm:max-w-xl [&>button]:absolute [&>button]:right-4 [&>button]:top-4'>
        <SheetHeader className='shrink-0 border-b px-6 py-4'>
          <SheetTitle className='pr-8'>
            {sceneName ? `${sceneName} — Events` : 'Scene events'}
          </SheetTitle>
          <SheetDescription>
            {hasScene
              ? 'Associate campaign events with this scene and optionally trigger their scripts.'
              : 'Open a scene to associate campaign events.'}
          </SheetDescription>
        </SheetHeader>
        <div className='flex min-h-0 flex-1 flex-col overflow-hidden'>
          {!hasScene ? (
            <div className='flex flex-1 items-center justify-center p-6 text-muted-foreground'>
              <div className='flex flex-col items-center gap-2'>
                <FileText className='h-12 w-12' />
                <p>Open a scene to associate events</p>
              </div>
            </div>
          ) : (
            <div className='flex min-h-0 flex-1 flex-col gap-4 overflow-auto p-6'>
              <div className='space-y-2'>
                <p className='text-sm text-muted-foreground'>
                  Link existing campaign events to this scene.
                </p>
                <EventLookup
                  campaignId={campaignId}
                  label='Add event'
                  placeholder='Search events...'
                  onSelect={handleAddEventToScene}
                  popoverContentClassName='z-[110]'
                  data-testid='scene-events-add-lookup'
                />
              </div>

              <div className='space-y-2'>
                <p className='text-sm font-medium'>Events in this scene</p>
                {!hasEvents ? (
                  <p className='text-sm text-muted-foreground'>
                    No events are associated with this scene yet.
                  </p>
                ) : (
                  <div className='flex flex-col gap-2'>
                    {sortedEventsForScene.map((link) => {
                      const { event } = link;
                      const canActivate = Boolean(event.scriptId);
                      const isActivating = activatingEventId === event.id;
                      return (
                        <div
                          key={link.id}
                          className='flex items-center justify-between rounded-md border bg-card px-3 py-2'>
                          <div className='flex flex-col gap-0.5'>
                            <span className='text-sm font-medium'>{event.label}</span>
                            {event.category && (
                              <span className='text-xs text-muted-foreground'>
                                {event.category}
                              </span>
                            )}
                            {event.parameters && event.parameters.length > 0 && (
                              <div className='mt-1 flex flex-col gap-1'>
                                {event.parameters.map((param) => (
                                  <div
                                    key={param.id}
                                    className='flex items-center gap-2 text-xs text-muted-foreground'>
                                    <span className='w-32 truncate'>
                                      {param.name}{' '}
                                      <span className='text-[0.7rem] uppercase'>
                                        ({param.type})
                                      </span>
                                    </span>
                                    <input
                                      className='flex-1 rounded border px-1 py-0.5 text-xs bg-background'
                                      value={(
                                        (link.parameterValues ?? {})[param.id] ??
                                        param.defaultValue ??
                                        ''
                                      ).toString()}
                                      onChange={(e) =>
                                        handleUpdateParameterValue(
                                          link.id,
                                          param.id,
                                          e.target.value,
                                        )
                                      }
                                      placeholder={
                                        param.defaultValue == null
                                          ? 'Scene value (optional)'
                                          : `Default: ${String(param.defaultValue)}`
                                      }
                                    />
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                          <div className='flex items-center gap-1.5'>
                            {event.scriptId && (
                              <Button
                                type='button'
                                variant='outline'
                                size='icon'
                                disabled={!canActivate || isActivating}
                                style={activateButtonStyle}
                                title={!event.scriptId ? 'No script assigned' : 'Run on_activate'}
                                onClick={() => handleActivateEvent(event)}
                                data-testid={`scene-event-zap-${event.id}`}>
                                <Zap className='h-4 w-4' />
                              </Button>
                            )}
                            <Button
                              type='button'
                              variant='ghost'
                              size='icon'
                              onClick={() => handleRemoveEventFromScene(link.id)}
                              title='Remove event from scene'
                              data-testid={`scene-event-remove-${link.id}`}>
                              <Trash2 className='h-4 w-4' />
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
