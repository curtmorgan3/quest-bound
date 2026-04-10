import { getSession } from '@/lib/cloud/auth';
import { cloudClient } from '@/lib/cloud/client';
import { usePlaytestRuntimeStore } from '@/stores/playtest-runtime-store';
import { db } from '@/stores/db';
import type { Character, CharacterAttribute, InventoryItem } from '@/types';

function requireClient() {
  if (!cloudClient) throw new Error('Cloud is not configured');
  return cloudClient;
}

export type MyPlaytestEnrollment = {
  playtesterId: string;
  status: string;
  sessionId: string;
  sessionName: string;
  sessionInstructions: string;
  sessionStatus: 'draft' | 'open' | 'closed';
  playtestId: string;
  rulesetId: string;
};

type PlaytestSessionEmbed = {
  id: string;
  name: string;
  instructions: string;
  status: string;
  playtest_id: string;
  playtests: { id: string; ruleset_id: string; name: string } | { id: string; ruleset_id: string; name: string }[];
};

type PlaytesterJoinRow = {
  id: string;
  status: string;
  playtest_session_id: string;
  playtest_sessions: PlaytestSessionEmbed | PlaytestSessionEmbed[] | null;
};

function firstEmbed<T>(v: T | T[] | null | undefined): T | null {
  if (v == null) return null;
  return Array.isArray(v) ? (v[0] ?? null) : v;
}

function firstPlaytest(
  v: PlaytestSessionEmbed['playtests'],
): { id: string; ruleset_id: string; name: string } | null {
  if (v == null) return null;
  return Array.isArray(v) ? (v[0] ?? null) : v;
}

export async function listMyPlaytestEnrollmentsForRuleset(
  rulesetId: string,
): Promise<MyPlaytestEnrollment[]> {
  const client = requireClient();
  const session = await getSession();
  const uid = session?.user?.id;
  if (!uid) return [];

  const { data, error } = await client
    .from('playtesters')
    .select(
      `
      id,
      status,
      playtest_session_id,
      playtest_sessions (
        id,
        name,
        instructions,
        status,
        playtest_id,
        playtests ( id, ruleset_id, name )
      )
    `,
    )
    .eq('user_id', uid);

  if (error) throw error;

  const rows = (data ?? []) as unknown as PlaytesterJoinRow[];
  const out: MyPlaytestEnrollment[] = [];

  for (const row of rows) {
    const ps = firstEmbed(row.playtest_sessions);
    const pt = ps ? firstPlaytest(ps.playtests) : null;
    if (!ps || !pt) continue;
    if (pt.ruleset_id !== rulesetId) continue;
    out.push({
      playtesterId: row.id,
      status: row.status,
      sessionId: ps.id,
      sessionName: ps.name,
      sessionInstructions: ps.instructions,
      sessionStatus: ps.status as MyPlaytestEnrollment['sessionStatus'],
      playtestId: ps.playtest_id,
      rulesetId: pt.ruleset_id,
    });
  }
  return out;
}

export async function playtestStartSessionRpc(playtestSessionId: string): Promise<void> {
  const client = requireClient();
  const { error } = await client.rpc('playtest_start_session', {
    p_playtest_session_id: playtestSessionId,
  });
  if (error) throw error;
}

export async function playtestPauseSessionRpc(playtestSessionId: string): Promise<void> {
  const client = requireClient();
  const { error } = await client.rpc('playtest_pause_session', {
    p_playtest_session_id: playtestSessionId,
  });
  if (error) throw error;
}

export async function playtestSubmitSurveyRpc(
  playtestSessionId: string,
  response: Record<string, string>,
): Promise<void> {
  const client = requireClient();
  const { error } = await client.rpc('playtest_submit_survey', {
    p_playtest_session_id: playtestSessionId,
    p_response: response,
  });
  if (error) throw error;
}

export type SurveyQuestionCloudRow = {
  id: string;
  playtest_id: string;
  question: string;
  is_freeform: boolean;
  options: string[] | null;
  sort_order: number;
};

export async function listPlaytestSurveyQuestions(playtestId: string): Promise<SurveyQuestionCloudRow[]> {
  const client = requireClient();
  const { data, error } = await client
    .from('survey_questions')
    .select('*')
    .eq('playtest_id', playtestId)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true });
  if (error) throw error;
  return ((data ?? []) as SurveyQuestionCloudRow[]).map((r) => ({
    ...r,
    options: Array.isArray(r.options) ? (r.options as string[]) : null,
  }));
}

export async function reportPlaytestActionFired(rulesetId: string, actionId: string): Promise<void> {
  const rt = usePlaytestRuntimeStore.getState().getActive(rulesetId);
  if (!rt) return;
  const client = cloudClient;
  if (!client) return;

  const action = await db.actions.get(actionId);
  const actionName = action?.title ?? actionId;

  const { error } = await client.from('action_reports').insert({
    playtest_session_id: rt.playtestSessionId,
    playtester_id: rt.playtesterId,
    action_id: actionId,
    action_name: actionName,
  });
  if (error) console.warn('[playtest] action report failed', error);
}

export async function reportPlaytestScriptError(
  rulesetId: string,
  scriptId: string,
  errorMessage: string,
): Promise<void> {
  const rt = usePlaytestRuntimeStore.getState().getActive(rulesetId);
  if (!rt) return;
  const client = cloudClient;
  if (!client) return;

  const script = await db.scripts.get(scriptId);
  const scriptName = script?.name ?? scriptId;

  const { error } = await client.from('script_error_reports').insert({
    playtest_session_id: rt.playtestSessionId,
    playtester_id: rt.playtesterId,
    error: errorMessage,
    script_name: scriptName,
  });
  if (error) console.warn('[playtest] script error report failed', error);
}

export async function insertPlaytestCharacterSnapshotIfNeeded(input: {
  playtestSessionId: string;
  playtesterId: string;
  character: Character | null;
  characterAttributes: CharacterAttribute[];
  inventoryItems: InventoryItem[];
}): Promise<void> {
  const client = requireClient();
  const { count, error: cErr } = await client
    .from('character_snapshots')
    .select('*', { count: 'exact', head: true })
    .eq('playtester_id', input.playtesterId);
  if (cErr) throw cErr;
  if ((count ?? 0) > 0) return;

  const properties = input.character
    ? JSON.stringify({
        id: input.character.id,
        name: input.character.name,
        rulesetId: input.character.rulesetId,
      })
    : '{}';
  const attributeSnapshot = JSON.stringify(input.characterAttributes);
  const inventorySnapshot = JSON.stringify(input.inventoryItems);

  const { error } = await client.from('character_snapshots').insert({
    playtest_session_id: input.playtestSessionId,
    playtester_id: input.playtesterId,
    properties,
    attribute_snapshot: attributeSnapshot,
    inventory_snapshot: inventorySnapshot,
  });
  if (error) throw error;
}
