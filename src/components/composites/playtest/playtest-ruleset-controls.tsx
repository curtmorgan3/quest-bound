import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { SidebarMenuButton, SidebarMenuItem } from '@/components/ui/sidebar';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  insertPlaytestCharacterSnapshotIfNeeded,
  listMyPlaytestEnrollmentsForRuleset,
  listPlaytestSurveyQuestions,
  type MyPlaytestEnrollment,
  playtestPauseSessionRpc,
  playtestStartSessionRpc,
  playtestSubmitSurveyRpc,
  type SurveyQuestionCloudRow,
} from '@/lib/cloud/playtest/playtest-api';
import { usePlaytestRuntimeStore } from '@/stores/playtest-runtime-store';
import { db } from '@/stores/db';
import { useLiveQuery } from 'dexie-react-hooks';
import { CirclePause, CirclePlay, Loader2 } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

function visibleEnrollments(rows: MyPlaytestEnrollment[]): MyPlaytestEnrollment[] {
  return rows.filter((e) => {
    if (e.sessionStatus === 'draft') return false;
    if (e.sessionStatus === 'closed' && e.status === 'closed') return false;
    return true;
  });
}

export function PlaytestRulesetControls({ rulesetId }: { rulesetId: string }) {
  const [enrollments, setEnrollments] = useState<MyPlaytestEnrollment[]>([]);
  const [loadingList, setLoadingList] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [busySessionId, setBusySessionId] = useState<string | null>(null);

  const active = usePlaytestRuntimeStore((s) => s.getActive(rulesetId));
  const setActive = usePlaytestRuntimeStore((s) => s.setActive);
  const clearActive = usePlaytestRuntimeStore((s) => s.clearActive);

  const [feedbackFor, setFeedbackFor] = useState<MyPlaytestEnrollment | null>(null);
  const [surveyQs, setSurveyQs] = useState<SurveyQuestionCloudRow[]>([]);
  const [surveyAnswers, setSurveyAnswers] = useState<Record<string, string>>({});
  const [surveyStep, setSurveyStep] = useState(0);
  const [submittingSurvey, setSubmittingSurvey] = useState(false);

  const testCharacter = useLiveQuery(async () => {
    const chars = await db.characters.where('rulesetId').equals(rulesetId).toArray();
    const test = chars.find((c) => c.isTestCharacter);
    return test ?? chars[0] ?? null;
  }, [rulesetId]);

  const charAttrs = useLiveQuery(async () => {
    if (!testCharacter?.id) return [];
    return db.characterAttributes.where('characterId').equals(testCharacter.id).toArray();
  }, [testCharacter?.id]);

  const invItems = useLiveQuery(async () => {
    if (!testCharacter?.inventoryId) return [];
    return db.inventoryItems.where('inventoryId').equals(testCharacter.inventoryId).toArray();
  }, [testCharacter?.inventoryId]);

  const refresh = useCallback(async () => {
    if (!rulesetId) return;
    setLoadingList(true);
    try {
      const list = await listMyPlaytestEnrollmentsForRuleset(rulesetId);
      setEnrollments(list);
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

  useEffect(() => {
    if (!feedbackFor) return;
    let cancelled = false;
    void (async () => {
      try {
        const qs = await listPlaytestSurveyQuestions(feedbackFor.playtestId);
        if (!cancelled) {
          setSurveyQs(qs);
          setSurveyStep(0);
          setSurveyAnswers({});
        }
        try {
          await insertPlaytestCharacterSnapshotIfNeeded({
            playtestSessionId: feedbackFor.sessionId,
            playtesterId: feedbackFor.playtesterId,
            character: testCharacter ?? null,
            characterAttributes: charAttrs ?? [],
            inventoryItems: invItems ?? [],
          });
        } catch (snapErr) {
          console.warn('[playtest] snapshot', snapErr);
        }
      } catch {
        if (!cancelled) setSurveyQs([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [feedbackFor, testCharacter, charAttrs, invItems]);

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
    if (!active) return;
    setBusySessionId(active.playtestSessionId);
    try {
      await playtestPauseSessionRpc(active.playtestSessionId);
      clearActive(rulesetId);
      toast.success('Playtest paused');
      await refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not pause');
    } finally {
      setBusySessionId(null);
    }
  }

  async function submitSurvey() {
    if (!feedbackFor) return;
    for (const q of surveyQs) {
      const v = surveyAnswers[q.id]?.trim() ?? '';
      if (!v) {
        toast.error('Please answer all questions');
        return;
      }
    }
    setSubmittingSurvey(true);
    try {
      await playtestSubmitSurveyRpc(feedbackFor.sessionId, surveyAnswers);
      toast.success('Thanks for your feedback');
      setFeedbackFor(null);
      await refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Submit failed');
    } finally {
      setSubmittingSurvey(false);
    }
  }

  if (!showPlayAffordance) {
    return null;
  }

  const currentQuestion = surveyQs[surveyStep];

  return (
    <>
      <SidebarMenuItem>
        <SidebarMenuButton
          type='button'
          onClick={() => {
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
          <span>Playtest sessions</span>
        </SidebarMenuButton>
      </SidebarMenuItem>
      {active ? (
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
        <DialogContent className='max-w-md'>
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
                      <Button type='button' size='sm' onClick={() => setFeedbackFor(e)}>
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
        <DialogContent className='max-w-lg'>
          <DialogHeader>
            <DialogTitle>Session feedback</DialogTitle>
            <DialogDescription>
              Question {surveyQs.length ? surveyStep + 1 : 0} of {surveyQs.length}
            </DialogDescription>
          </DialogHeader>
          {currentQuestion ? (
            <div className='space-y-3 py-2'>
              <Label className='text-base'>{currentQuestion.question}</Label>
              {currentQuestion.is_freeform ? (
                <Input
                  value={surveyAnswers[currentQuestion.id] ?? ''}
                  onChange={(ev) =>
                    setSurveyAnswers((a) => ({ ...a, [currentQuestion.id]: ev.target.value }))
                  }
                  placeholder='Your answer'
                />
              ) : (
                <RadioGroup
                  value={surveyAnswers[currentQuestion.id] ?? ''}
                  onValueChange={(v) => setSurveyAnswers((a) => ({ ...a, [currentQuestion.id]: v }))}>
                  {(currentQuestion.options ?? []).map((opt) => (
                    <div key={opt} className='flex items-center gap-2'>
                      <RadioGroupItem value={opt} id={`${currentQuestion.id}-${opt}`} />
                      <Label htmlFor={`${currentQuestion.id}-${opt}`} className='font-normal'>
                        {opt}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              )}
            </div>
          ) : (
            <p className='text-muted-foreground text-sm'>No survey questions for this playtest.</p>
          )}
          <DialogFooter className='gap-2 sm:gap-0'>
            {surveyStep > 0 ? (
              <Button type='button' variant='outline' onClick={() => setSurveyStep((s) => s - 1)}>
                Back
              </Button>
            ) : null}
            {surveyQs.length === 0 ? (
              <Button
                type='button'
                disabled={submittingSurvey}
                onClick={() => {
                  if (!feedbackFor) return;
                  setSubmittingSurvey(true);
                  void playtestSubmitSurveyRpc(feedbackFor.sessionId, {})
                    .then(() => {
                      toast.success('Thanks for your feedback');
                      setFeedbackFor(null);
                      void refresh();
                    })
                    .catch((e) => toast.error(e instanceof Error ? e.message : 'Submit failed'))
                    .finally(() => setSubmittingSurvey(false));
                }}>
                {submittingSurvey ? <Loader2 className='size-4 animate-spin' /> : 'Submit'}
              </Button>
            ) : surveyStep < surveyQs.length - 1 ? (
              <Button
                type='button'
                onClick={() => {
                  const q = surveyQs[surveyStep];
                  if (!(surveyAnswers[q.id]?.trim() ?? '')) {
                    toast.error('Please answer before continuing');
                    return;
                  }
                  setSurveyStep((s) => s + 1);
                }}>
                Next
              </Button>
            ) : (
              <Button type='button' disabled={submittingSurvey} onClick={() => void submitSurvey()}>
                {submittingSurvey ? <Loader2 className='size-4 animate-spin' /> : 'Submit'}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
