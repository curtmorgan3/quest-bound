import { Button, Checkbox } from '@/components';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { ScriptLookup, useScripts } from '@/lib/compass-api';
import { useQBScriptClient } from '@/lib/compass-logic/worker/hooks';
import { activateButtonStyle } from '@/palette';
import { db } from '@/stores';
import type { CampaignEvent } from '@/types';
import { useLiveQuery } from 'dexie-react-hooks';
import { FileText, Trash2, Zap } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';

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

  const eventsForScene = useLiveQuery(async (): Promise<CampaignEvent[]> => {
    if (!sceneId || !campaignId) return [];
    const list = (await db.campaignEvents
      .where('sceneId')
      .equals(sceneId)
      .toArray()) as CampaignEvent[];
    return list.filter((ev) => ev.campaignId === campaignId);
  }, [sceneId, campaignId]);

  const { scripts } = useScripts(campaignId);
  const scriptsById = useMemo(() => {
    const map = new Map<string, (typeof scripts)[number]>();
    for (const script of scripts) {
      map.set(script.id, script);
    }
    return map;
  }, [scripts]);

  const sortedEventsForScene = useMemo(
    () =>
      (eventsForScene ?? []).slice().sort((a, b) =>
        (a.label ?? '').localeCompare(b.label ?? '', undefined, {
          sensitivity: 'base',
        }),
      ),
    [eventsForScene],
  );

  const handleAddScriptToScene = useCallback(
    async (script: (typeof scripts)[number]) => {
      if (!sceneId || !campaignId) return;
      const now = new Date().toISOString();
      await db.campaignEvents.add({
        id: crypto.randomUUID(),
        campaignId,
        sceneId,
        label: script.name,
        category: script.category,
        scriptId: script.id,
        createdAt: now,
        updatedAt: now,
      } as CampaignEvent);
    },
    [campaignId, sceneId, scripts],
  );

  const handleUpdateParameterValue = useCallback(
    async (eventId: string, paramId: string, value: string) => {
      try {
        const event = (await db.campaignEvents.get(eventId)) as CampaignEvent | undefined;
        if (!event) return;
        const existing = event.parameterValues ?? {};
        const next: Record<string, any> = { ...existing };
        if (value === '') {
          delete next[paramId];
        } else {
          next[paramId] = value;
        }
        await db.campaignEvents.update(eventId, {
          parameterValues: next,
          updatedAt: new Date().toISOString(),
        } as Partial<CampaignEvent>);
      } catch (e) {
        console.warn('[CampaignEventsPanel] Failed to update parameter value', e);
      }
    },
    [],
  );

  const handleRemoveEventFromScene = useCallback(async (eventId: string) => {
    await db.campaignEvents.delete(eventId);
  }, []);

  const handleActivateEvent = useCallback(
    async (event: CampaignEvent) => {
      if (!event.scriptId || !event.sceneId) return;
      setActivatingEventId(event.id);
      try {
        await client
          .executeCampaignEventEvent(
            event.id,
            event.sceneId,
            'on_activate',
            actingCharacterId ?? null,
          )
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
                  Attach Game Manager scripts as events for this scene.
                </p>
                <ScriptLookup
                  campaignId={campaignId}
                  label='Add script'
                  placeholder='Search Game Manager scripts...'
                  filterEntityType='gameManager'
                  onSelect={handleAddScriptToScene}
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
                    {sortedEventsForScene.map((event) => {
                      const canActivate = Boolean(event.scriptId);
                      const isActivating = activatingEventId === event.id;
                      const script = event.scriptId ? scriptsById.get(event.scriptId) : undefined;
                      const definitions = script?.parameters ?? [];
                      const values = event.parameterValues ?? {};
                      return (
                        <div
                          key={event.id}
                          className='flex items-center justify-between rounded-md border bg-card px-3 py-2'>
                          <div className='flex flex-col gap-0.5'>
                            <span className='text-sm font-medium'>{event.label}</span>
                            {event.category && (
                              <span className='text-xs text-muted-foreground'>
                                {event.category}
                              </span>
                            )}
                            {definitions.length > 0 && (
                              <div className='mt-1 flex flex-col gap-1'>
                                {definitions.map((param) => {
                                  const sceneValues = values;
                                  const resolvedValue =
                                    sceneValues[param.id] ?? param.defaultValue ?? null;
                                  if (param.type === 'boolean') {
                                    const checked =
                                      resolvedValue === true ||
                                      (typeof resolvedValue === 'string' &&
                                        resolvedValue.trim().toLowerCase() === 'true');

                                    return (
                                      <div
                                        key={param.id}
                                        className='flex items-center gap-2 text-xs text-muted-foreground'>
                                        <span className='w-32 truncate'>
                                          {param.label}{' '}
                                          <span className='text-[0.7rem] uppercase'>
                                            ({param.type})
                                          </span>
                                        </span>
                                        <div className='flex items-center gap-1'>
                                          <Checkbox
                                            checked={checked}
                                            onCheckedChange={(next) =>
                                              handleUpdateParameterValue(
                                                event.id,
                                                param.id,
                                                next ? 'true' : 'false',
                                              )
                                            }
                                          />
                                          {param.defaultValue != null && (
                                            <span className='text-[0.7rem] italic text-muted-foreground'>
                                              Default: {String(param.defaultValue)}
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                    );
                                  }

                                  return (
                                    <div
                                      key={param.id}
                                      className='flex items-center gap-2 text-xs text-muted-foreground'>
                                      <span className='w-32 truncate'>
                                        {param.label}{' '}
                                        <span className='text-[0.7rem] uppercase'>
                                          ({param.type})
                                        </span>
                                      </span>
                                      <input
                                        className='flex-1 rounded border px-1 py-0.5 text-xs bg-background'
                                        type={param.type === 'number' ? 'number' : 'text'}
                                        value={resolvedValue == null ? '' : String(resolvedValue)}
                                        onChange={(e) =>
                                          handleUpdateParameterValue(
                                            event.id,
                                            param.id,
                                            e.target.value,
                                          )
                                        }
                                      />
                                    </div>
                                  );
                                })}
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
                              onClick={() => handleRemoveEventFromScene(event.id)}
                              title='Remove event from scene'
                              data-testid={`scene-event-remove-${event.id}`}>
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
