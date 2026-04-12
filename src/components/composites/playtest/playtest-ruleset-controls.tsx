import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { SidebarMenuButton, SidebarMenuItem, useSidebar } from '@/components/ui/sidebar';
import {
  listMyPlaytestEnrollmentsForRuleset,
  type MyPlaytestEnrollment,
  playtestCompleteFeedbackRpc,
  playtestPauseSessionRpc,
  playtestStartSessionRpc,
  replacePlaytestCharacterSnapshot,
} from '@/lib/cloud/playtest/playtest-api';
import { db } from '@/stores/db';
import { usePlaytestRuntimeStore } from '@/stores/playtest-runtime-store';
import type { Character, CharacterAttribute, InventoryItem } from '@/types';
import { CirclePause, CirclePlay, Loader2 } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

async function loadSnapshotCharacterState(
  rulesetId: string,
  options: { playCharacterIdFromRuntime: string | null | undefined; playCharacterIdProp?: string },
): Promise<{
  character: Character | null;
  characterAttributes: CharacterAttribute[];
  inventoryItems: InventoryItem[];
}> {
  let character: Character | null = null;
  let characterAttributes: CharacterAttribute[] = [];
  let inventoryItems: InventoryItem[] = [];

  const preferredId = options.playCharacterIdFromRuntime ?? options.playCharacterIdProp ?? null;
  if (preferredId) {
    const ch = await db.characters.get(preferredId);
    if (ch && ch.rulesetId === rulesetId) {
      character = ch;
      characterAttributes = (
        await db.characterAttributes.where('characterId').equals(ch.id).toArray()
      ).filter((a) => !a.deleted);
      inventoryItems = await db.inventoryItems.where('inventoryId').equals(ch.inventoryId).toArray();
    }
  }

  if (!character) {
    const chars = await db.characters.where('rulesetId').equals(rulesetId).toArray();
    const fallback = chars.find((c) => c.isTestCharacter) ?? chars[0] ?? null;
    if (fallback) {
      character = fallback;
      characterAttributes = (
        await db.characterAttributes.where('characterId').equals(fallback.id).toArray()
      ).filter((a) => !a.deleted);
      inventoryItems = await db.inventoryItems.where('inventoryId').equals(fallback.inventoryId).toArray();
    }
  }

  return { character, characterAttributes, inventoryItems };
}

function visibleEnrollments(rows: MyPlaytestEnrollment[]): MyPlaytestEnrollment[] {
  return rows.filter((e) => {
    if (e.sessionStatus === 'draft') return false;
    if (e.sessionStatus === 'closed' && e.status === 'closed') return false;
    return true;
  });
}

export function PlaytestRulesetControls({
  rulesetId,
  playCharacterId: playCharacterIdProp,
}: {
  rulesetId: string;
  /** When set (e.g. character sidebar), snapshots use this sheet instead of the ruleset test character. */
  playCharacterId?: string;
}) {
  const [enrollments, setEnrollments] = useState<MyPlaytestEnrollment[]>([]);
  const [loadingList, setLoadingList] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [busySessionId, setBusySessionId] = useState<string | null>(null);

  const { isMobile, setOpenMobile } = useSidebar();
  const active = usePlaytestRuntimeStore((s) => s.getActive(rulesetId));
  const activeRuntime = usePlaytestRuntimeStore((s) => s.activeByRulesetId[rulesetId]);
  const setActive = usePlaytestRuntimeStore((s) => s.setActive);
  const clearActive = usePlaytestRuntimeStore((s) => s.clearActive);

  const closeMobileSidebarIfNeeded = useCallback(() => {
    if (isMobile) setOpenMobile(false);
  }, [isMobile, setOpenMobile]);

  const [feedbackFor, setFeedbackFor] = useState<MyPlaytestEnrollment | null>(null);
  const [completingFeedback, setCompletingFeedback] = useState(false);

  useEffect(() => {
    if (playCharacterIdProp === undefined || !activeRuntime) return;
    if (activeRuntime.playCharacterId === playCharacterIdProp) return;
    setActive(rulesetId, { ...activeRuntime, playCharacterId: playCharacterIdProp });
  }, [playCharacterIdProp, activeRuntime, rulesetId, setActive]);

  const refresh = useCallback(async () => {
    if (!rulesetId) return;
    setLoadingList(true);
    try {
      const list = await listMyPlaytestEnrollmentsForRuleset(rulesetId);
      setEnrollments(list);

      const rt = usePlaytestRuntimeStore.getState().getActive(rulesetId);
      if (rt?.isSessionLive) {
        const mine = list.find(
          (e) => e.sessionId === rt.playtestSessionId && e.playtesterId === rt.playtesterId,
        );
        if (!mine || mine.sessionStatus !== 'open' || mine.status !== 'active') {
          usePlaytestRuntimeStore.getState().setActive(rulesetId, { ...rt, isSessionLive: false });
        }
      }
    } catch (e) {
      console.warn('[playtest] list enrollments', e);
      setEnrollments([]);
    } finally {
      setLoadingList(false);
    }
  }, [rulesetId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    const t = window.setInterval(() => void refresh(), 25000);
    return () => window.clearInterval(t);
  }, [refresh]);

  useEffect(() => {
    const onFocus = () => void refresh();
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [refresh]);

  const shown = useMemo(() => visibleEnrollments(enrollments), [enrollments]);
  const showPlayAffordance = shown.length > 0 || active !== null;

  async function handlePlay(enrollment: MyPlaytestEnrollment) {
    if (enrollment.sessionStatus !== 'open') return;
    setBusySessionId(enrollment.sessionId);
    try {
      await playtestStartSessionRpc(enrollment.sessionId);
      setActive(rulesetId, {
        playtestSessionId: enrollment.sessionId,
        playtesterId: enrollment.playtesterId,
        playtestId: enrollment.playtestId,
        sessionName: enrollment.sessionName,
        sessionInstructions: enrollment.sessionInstructions,
        playCharacterId: playCharacterIdProp ?? null,
        isSessionLive: true,
      });
      setPickerOpen(false);
      toast.success('Playtest started');
      await refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not start playtest');
    } finally {
      setBusySessionId(null);
    }
  }

  async function handlePause() {
    const rt = usePlaytestRuntimeStore.getState().getActive(rulesetId);
    if (!rt?.isSessionLive) return;
    setBusySessionId(rt.playtestSessionId);
    try {
      await playtestPauseSessionRpc(rt.playtestSessionId);
      try {
        const payload = await loadSnapshotCharacterState(rulesetId, {
          playCharacterIdFromRuntime: rt.playCharacterId,
          playCharacterIdProp,
        });
        await replacePlaytestCharacterSnapshot({
          playtestSessionId: rt.playtestSessionId,
          playtesterId: rt.playtesterId,
          ...payload,
        });
      } catch (snapErr) {
        console.warn('[playtest] snapshot on pause', snapErr);
      }
      setActive(rulesetId, { ...rt, isSessionLive: false });
      toast.success('Playtest paused');
      await refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not pause');
    } finally {
      setBusySessionId(null);
    }
  }

  async function handleCompleteFeedback() {
    if (!feedbackFor) return;
    setCompletingFeedback(true);
    try {
      await playtestCompleteFeedbackRpc(feedbackFor.sessionId);
      toast.success('Thanks for your feedback');
      setFeedbackFor(null);
      clearActive(rulesetId);
      await refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not complete feedback');
    } finally {
      setCompletingFeedback(false);
    }
  }

  if (!showPlayAffordance) {
    return null;
  }

  return (
    <>
      {!active || !active.isSessionLive ? (
        <SidebarMenuItem>
          <SidebarMenuButton
            type='button'
            onClick={() => {
              closeMobileSidebarIfNeeded();
              setPickerOpen(true);
              void refresh();
            }}
            disabled={loadingList}
            data-testid='nav-playtest-sessions'>
            {loadingList ? (
              <Loader2 className='h-4 w-4 shrink-0 animate-spin' />
            ) : (
              <CirclePlay className='h-4 w-4 shrink-0' />
            )}
            <span>Start Playtest</span>
          </SidebarMenuButton>
        </SidebarMenuItem>
      ) : null}
      {active?.isSessionLive ? (
        <SidebarMenuItem>
          <SidebarMenuButton
            type='button'
            onClick={() => void handlePause()}
            disabled={busySessionId !== null}
            data-testid='nav-playtest-pause'>
            {busySessionId === active.playtestSessionId ? (
              <Loader2 className='h-4 w-4 shrink-0 animate-spin' />
            ) : (
              <CirclePause className='h-4 w-4 shrink-0' />
            )}
            <span>Pause playtest</span>
          </SidebarMenuButton>
        </SidebarMenuItem>
      ) : null}

      <Dialog open={pickerOpen} onOpenChange={setPickerOpen}>
        <DialogContent className='z-[60] max-w-md' overlayClassName='z-[60]'>
          <DialogHeader>
            <DialogTitle>Playtest sessions</DialogTitle>
            <DialogDescription>
              Open sessions can be played. Closed sessions may need feedback.
            </DialogDescription>
          </DialogHeader>
          <ul className='max-h-72 space-y-2 overflow-y-auto'>
            {shown.length === 0 ? (
              <li className='text-muted-foreground text-sm'>No sessions available.</li>
            ) : (
              shown.map((e) => (
                <li
                  key={e.playtesterId}
                  className='flex items-center justify-between gap-2 rounded-md border border-border p-2'>
                  <div className='min-w-0'>
                    <p className='truncate text-sm font-medium'>{e.sessionName || 'Session'}</p>
                    <p className='text-muted-foreground text-xs'>
                      {e.sessionStatus} · {e.status}
                    </p>
                  </div>
                  <div className='flex shrink-0 gap-1'>
                    {e.sessionStatus === 'open' && e.status !== 'active' ? (
                      <Button
                        type='button'
                        size='sm'
                        variant='secondary'
                        disabled={busySessionId === e.sessionId}
                        onClick={() => void handlePlay(e)}>
                        {busySessionId === e.sessionId ? (
                          <Loader2 className='size-4 animate-spin' />
                        ) : (
                          <CirclePlay className='size-4' />
                        )}
                      </Button>
                    ) : null}
                    {e.sessionStatus === 'closed' && e.status === 'feedback' ? (
                      <Button
                        type='button'
                        size='sm'
                        onClick={() => {
                          closeMobileSidebarIfNeeded();
                          setFeedbackFor(e);
                        }}>
                        Feedback
                      </Button>
                    ) : null}
                  </div>
                </li>
              ))
            )}
          </ul>
        </DialogContent>
      </Dialog>

      <Dialog open={feedbackFor !== null} onOpenChange={(o) => !o && setFeedbackFor(null)}>
        <DialogContent className='z-[60] max-w-lg' overlayClassName='z-[60]'>
          <DialogHeader>
            <DialogTitle>Session feedback</DialogTitle>
            <DialogDescription>
              Complete the publisher&apos;s survey if one is linked, then mark your feedback as done here.
            </DialogDescription>
          </DialogHeader>
          <div className='space-y-3 py-2 text-sm'>
            {feedbackFor?.surveyUrl ? (
              <>
                <p className='text-muted-foreground'>
                  Open the survey in your browser, submit it there, then return and tap the button below.
                </p>
                <a
                  href={feedbackFor.surveyUrl}
                  target='_blank'
                  rel='noopener noreferrer'
                  className='font-medium text-primary underline-offset-4 hover:underline'>
                  Open feedback survey
                </a>
                <p className='break-all text-xs text-muted-foreground'>{feedbackFor.surveyUrl}</p>
              </>
            ) : (
              <p className='text-muted-foreground'>
                This playtest does not have a survey link yet. You can still mark feedback complete when you are
                finished.
              </p>
            )}
          </div>
          <DialogFooter>
            <Button type='button' disabled={completingFeedback} onClick={() => void handleCompleteFeedback()}>
              {completingFeedback ? <Loader2 className='size-4 animate-spin' /> : 'Mark feedback complete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
