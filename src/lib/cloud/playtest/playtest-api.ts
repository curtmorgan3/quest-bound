import { parseComponentDataJson } from '@/lib/compass-planes/utils/component-data-json';
import { getSession } from '@/lib/cloud/auth';
import { cloudClient } from '@/lib/cloud/client';
import { usePlaytestRuntimeStore } from '@/stores/playtest-runtime-store';
import { db } from '@/stores/db';
import type { Character, CharacterAttribute, Component, InventoryItem } from '@/types';

function requireClient() {
  if (!cloudClient) throw new Error('Cloud is not configured');
  return cloudClient;
}

export type MyPlaytestEnrollment = {
  playtesterId: string;
  status: string;
  sessionId: string;
  sessionName: string;
  /**
   * Markdown from `playtests.instructions` (playtest definition). Session rows no longer store
   * instructions after playtest_sessions.instructions was dropped.
   */
  sessionInstructions: string;
  sessionStatus: 'draft' | 'open' | 'closed';
  playtestId: string;
  rulesetId: string;
  /** External feedback form URL from publisher dashboard, if set. */
  surveyUrl: string | null;
};

type PlaytestSessionEmbed = {
  id: string;
  name: string;
  status: string;
  playtest_id: string;
  playtests: PlaytestEmbedRow | PlaytestEmbedRow[] | null;
};

type PlaytestEmbedRow = {
  id: string;
  ruleset_id: string;
  name: string;
  survey_url: string | null;
  /** May be omitted by PostgREST if not selected; usually non-null string. */
  instructions?: string | null;
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

function firstPlaytest(v: PlaytestSessionEmbed['playtests']): PlaytestEmbedRow | null {
  if (v == null) return null;
  return Array.isArray(v) ? (v[0] ?? null) : v;
}

/** Read `instructions` from embedded `playtests` row (snake_case keys from PostgREST). */
function instructionsFromPlaytestEmbed(pt: PlaytestEmbedRow | null): string {
  if (pt == null) return '';
  const raw = pt.instructions;
  if (raw == null) return '';
  return typeof raw === 'string' ? raw : String(raw);
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
        status,
        playtest_id,
        playtests ( id, ruleset_id, name, survey_url, instructions )
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
      sessionInstructions: instructionsFromPlaytestEmbed(pt),
      sessionStatus: ps.status as MyPlaytestEnrollment['sessionStatus'],
      playtestId: ps.playtest_id,
      rulesetId: pt.ruleset_id,
      surveyUrl: pt.survey_url?.trim() ? pt.survey_url.trim() : null,
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

export async function playtestCompleteFeedbackRpc(playtestSessionId: string): Promise<void> {
  const client = requireClient();
  const { error } = await client.rpc('playtest_complete_feedback', {
    p_playtest_session_id: playtestSessionId,
  });
  if (error) throw error;
}

export async function reportPlaytestActionFired(rulesetId: string, actionId: string): Promise<void> {
  const rt = usePlaytestRuntimeStore.getState().getActive(rulesetId);
  if (!rt?.isSessionLive) return;
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
  if (!rt?.isSessionLive) return;
  const client = cloudClient;
  if (!client) return;

  const script = await db.scripts.get(scriptId);
  const scriptName = script?.name ?? scriptId;

  let errorBody = errorMessage;
  if (rt.playCharacterId) {
    const ch = await db.characters.get(rt.playCharacterId);
    if (ch?.rulesetId === rulesetId && ch.name?.trim()) {
      errorBody = `${errorMessage}\n\n— Playtest sheet: ${ch.name.trim()}`;
    }
  }

  const { error } = await client.from('script_error_reports').insert({
    playtest_session_id: rt.playtestSessionId,
    playtester_id: rt.playtesterId,
    error: errorBody,
    script_name: scriptName,
  });
  if (error) console.warn('[playtest] script error report failed', error);
}

/** Queue a script_error_reports row when a live playtest matches `rulesetId` (fire-and-forget). */
export function queuePlaytestScriptErrorReport(detail: {
  rulesetId?: string;
  scriptId?: string;
  message: string;
  line?: number;
  column?: number;
}): void {
  const rulesetId = detail.rulesetId?.trim();
  if (!rulesetId) return;
  const scriptId = detail.scriptId?.trim() ? detail.scriptId.trim() : 'unknown';
  let errorMessage = detail.message;
  const pos: string[] = [];
  if (detail.line != null) pos.push(`line: ${detail.line}`);
  if (detail.column != null) pos.push(`column: ${detail.column}`);
  if (pos.length > 0) {
    errorMessage = `${errorMessage}\n\n${pos.join(', ')}`;
  }
  void reportPlaytestScriptError(rulesetId, scriptId, errorMessage);
}

function inventoryComponentTitle(comp: Component): string {
  try {
    const data = parseComponentDataJson(comp);
    const ref = data.referenceLabel;
    if (typeof ref === 'string' && ref.trim()) return ref.trim();
  } catch {
    /* ignore malformed component.data */
  }
  const t = comp.type?.trim() ?? '';
  // Inventory grid cells default to type `inventory`; without referenceLabel that is not a human title.
  if (t.toLowerCase() === 'inventory') return '';
  return t;
}

/** Ruleset entity title for the snapshot row (Item / Action / Attribute `title`). Instance display name stays in `InventoryItem.label`. */
async function resolveInventorySnapshotEntityTitle(item: InventoryItem): Promise<string> {
  const { type, entityId } = item;
  if (!entityId?.trim()) return '';
  try {
    if (type === 'item') {
      const row = await db.items.get(entityId);
      if (row?.title?.trim()) return row.title.trim();
    } else if (type === 'action') {
      const row = await db.actions.get(entityId);
      if (row?.title?.trim()) return row.title.trim();
    } else if (type === 'attribute') {
      const row = await db.attributes.get(entityId);
      if (row?.title?.trim()) return row.title.trim();
    }
  } catch {
    /* ignore missing / corrupt reads */
  }
  return '';
}

async function serializeInventorySnapshotWithTitles(items: InventoryItem[]): Promise<string> {
  const rows: Array<InventoryItem & { title: string }> = [];
  for (const item of items) {
    if (item.deleted) continue;
    let title = await resolveInventorySnapshotEntityTitle(item);
    if (!title) {
      const comp = await db.components.get(item.componentId);
      if (comp) {
        title = inventoryComponentTitle(comp);
      }
    }
    rows.push({ ...item, title });
  }
  return JSON.stringify(rows);
}

export async function replacePlaytestCharacterSnapshot(input: {
  playtestSessionId: string;
  playtesterId: string;
  character: Character | null;
  characterAttributes: CharacterAttribute[];
  inventoryItems: InventoryItem[];
}): Promise<void> {
  const client = requireClient();
  const { error: delErr } = await client
    .from('character_snapshots')
    .delete()
    .eq('playtester_id', input.playtesterId);
  if (delErr) throw delErr;

  const properties = input.character
    ? JSON.stringify({
        id: input.character.id,
        name: input.character.name,
        rulesetId: input.character.rulesetId,
      })
    : '{}';
  const attributeSnapshot = JSON.stringify(input.characterAttributes);
  const inventorySnapshot = await serializeInventorySnapshotWithTitles(input.inventoryItems);

  const { error } = await client.from('character_snapshots').insert({
    playtest_session_id: input.playtestSessionId,
    playtester_id: input.playtesterId,
    properties,
    attribute_snapshot: attributeSnapshot,
    inventory_snapshot: inventorySnapshot,
  });
  if (error) throw error;
}
