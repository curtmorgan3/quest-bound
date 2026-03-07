import { persistScriptLogs } from '@/lib/compass-logic/script-logs';
import type { DB } from '@/stores/db/hooks/types';
import type { CampaignCharacter, CampaignScene, Character, SceneTurnCallback } from '@/types';

export interface AdvanceTurnResult {
  /** Callbacks to run for the new cycle (targetCycle === currentTurnCycle), in registration order. */
  cycleCallbacks: SceneTurnCallback[];
  /** Callbacks to run every advance (targetCycle === null), in registration order. */
  advanceCallbacks: SceneTurnCallback[];
}

/**
 * Get campaign characters in the scene that participate in turn order, sorted by turnOrder.
 * Includes: all active campaign characters, plus all player characters (Character.isNpc !== true)
 * in the scene, so that player characters are always in the turn order when turn-based mode is on.
 */
export async function getSceneTurnOrderCharacters(
  db: DB,
  campaignId: string,
  campaignSceneId: string,
): Promise<CampaignCharacter[]> {
  const rows = (await db.campaignCharacters
    .where('campaignId')
    .equals(campaignId)
    .toArray()) as CampaignCharacter[];

  if (rows.length === 0) return [];

  const characterIds = [...new Set(rows.map((cc) => cc.characterId))];
  const characters = await Promise.all(characterIds.map((id) => db.characters.get(id)));
  const characterById = new Map<string, Character | undefined>(
    characterIds.map((id, i) => [id, characters[i] as Character | undefined]),
  );

  const inTurnOrder = rows.filter((cc) => {
    const character = characterById.get(cc.characterId);
    if (!character) return false;

    const isPlayer = !character.isNpc;
    const isNpcActiveInScene =
      character.isNpc === true && cc.campaignSceneId === campaignSceneId && cc.active === true;

    return isPlayer || isNpcActiveInScene;
  });

  return inTurnOrder.sort((a, b) => (a.turnOrder ?? 0) - (b.turnOrder ?? 0));
}

/**
 * Advance scene turn state by one step (next character). Updates DB.
 * Returns callbacks to run: cycle callbacks (if we just wrapped into a new cycle) then onTurnAdvance callbacks.
 * Returns null if scene is not in turn-based mode or has no characters.
 */
export async function advanceSceneTurnState(
  db: DB,
  campaignSceneId: string,
): Promise<AdvanceTurnResult | null> {
  const scene = (await db.campaignScenes.get(campaignSceneId)) as CampaignScene | undefined;
  if (!scene?.turnBasedMode) {
    return null;
  }

  const campaignId = scene.campaignId;
  const characters = await getSceneTurnOrderCharacters(db, campaignId, campaignSceneId);
  const numCharacters = characters.length;
  if (numCharacters === 0) {
    return null;
  }

  let currentTurnCycle = scene.currentTurnCycle ?? 1;
  let currentStepInCycle = scene.currentStepInCycle ?? 0;

  // Normalize step if queue shrunk
  if (currentStepInCycle >= numCharacters) {
    currentStepInCycle = numCharacters - 1;
  }

  // Advance step and cycle
  currentStepInCycle += 1;
  if (currentStepInCycle >= numCharacters) {
    currentStepInCycle = 0;
    currentTurnCycle += 1;
  }

  const justWrapped = currentStepInCycle === 0;
  const now = new Date().toISOString();
  const nowMs = Date.now();

  await db.campaignScenes.update(campaignSceneId, {
    currentTurnCycle,
    currentStepInCycle,
    updatedAt: now,
  });

  // Update turn timestamps on campaign characters (rewritten each advance/cycle for per-turn logs).
  const prevStep = currentStepInCycle === 0 ? numCharacters - 1 : currentStepInCycle - 1;
  const prevCharacter = characters[prevStep];
  const newCharacter = characters[currentStepInCycle];
  if (prevCharacter) {
    await db.campaignCharacters.update(prevCharacter.id, {
      turnEndTimestamp: nowMs,
      updatedAt: now,
    });
  }
  if (newCharacter) {
    await db.campaignCharacters.update(newCharacter.id, {
      turnStartTimestamp: nowMs,
      turnEndTimestamp: null,
      updatedAt: now,
    });
    await persistTurnStartLog(db, campaignId, newCharacter.characterId);
  }

  // Fetch callbacks: cycle callbacks for this cycle (only when we just wrapped), then onTurnAdvance
  const cycleCallbacks: SceneTurnCallback[] = justWrapped
    ? ((await db.sceneTurnCallbacks
        .where('[campaignSceneId+targetCycle]')
        .equals([campaignSceneId, currentTurnCycle])
        .sortBy('createdAt')) as SceneTurnCallback[])
    : [];

  const advanceCallbacks = (await db.sceneTurnCallbacks
    .where('campaignSceneId')
    .equals(campaignSceneId)
    .filter((cb: SceneTurnCallback) => cb.targetCycle === null)
    .sortBy('createdAt')) as SceneTurnCallback[];

  return { cycleCallbacks, advanceCallbacks };
}

async function persistTurnStartLog(db: DB, campaignId: string, characterId: string): Promise<void> {
  try {
    const character = (await db.characters.get(characterId)) as Character | undefined;
    if (!character) return;

    const name = (character.name ?? 'Character').trim() || 'Character';
    const baseLabel = ' turn start ';
    const totalLength = 25;
    const maxNameLength = Math.max(0, totalLength - baseLabel.length);
    const trimmedName = name.slice(0, maxNameLength);
    const base = `${trimmedName}${baseLabel}`;
    const equalsCount = Math.max(0, totalLength - base.length);
    const message = base + '='.repeat(equalsCount);

    const rulesetId = (character as any).rulesetId as string | undefined;
    if (!rulesetId) return;

    await persistScriptLogs(db, {
      rulesetId,
      scriptId: '__turn_start__',
      characterId: characterId,
      logMessages: [[message]],
      context: 'turn_start',
      campaignId,
      autoGenerated: true,
    });
  } catch (error) {
    console.warn('[advanceSceneTurnState] Failed to persist turn start log', error);
  }
}

/**
 * Start turn-based mode for a scene (e.g. from UI toggle).
 * Assigns default turn order by creation date to all characters in the turn order
 * (active campaign characters plus all player characters in the scene). No-op when there are none.
 */
export async function startSceneTurnBasedMode(
  db: DB,
  campaignId: string,
  campaignSceneId: string,
): Promise<void> {
  const characters = await getSceneTurnOrderCharacters(db, campaignId, campaignSceneId);
  if (characters.length === 0) return;

  const now = new Date().toISOString();
  const nowMs = Date.now();

  // Preserve any existing explicit turnOrder values; only assign defaults for unset (0/null) rows.
  const existingMax = characters.reduce(
    (max, cc) => Math.max(max, cc.turnOrder ?? 0),
    0,
  );
  let nextTurnOrder = existingMax > 0 ? existingMax + 1 : 1;

  const sorted = [...characters].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );

  for (const cc of sorted) {
    if ((cc.turnOrder ?? 0) === 0) {
      await db.campaignCharacters.update(cc.id, {
        turnOrder: nextTurnOrder++,
        updatedAt: now,
      });
    }
  }

  // Ensure the "first" character in order has a turn start timestamp/log entry.
  const first =
    sorted.find((cc) => (cc.turnOrder ?? 0) > 0) ??
    sorted[0];

  await db.campaignCharacters.update(first.id, {
    turnStartTimestamp: nowMs,
    turnEndTimestamp: null,
    updatedAt: now,
  });

  await persistTurnStartLog(db, campaignId, first.characterId);

  await db.campaignScenes.update(campaignSceneId, {
    turnBasedMode: true,
    currentTurnCycle: 1,
    currentStepInCycle: 0,
    updatedAt: now,
  });
}

/**
 * Stop turn-based mode for a scene (e.g. from UI toggle).
 * Clears callbacks and resets all scene characters' turnOrder to 0.
 */
export async function stopSceneTurnBasedMode(
  db: DB,
  campaignId: string,
  campaignSceneId: string,
): Promise<void> {
  const now = new Date().toISOString();
  const rows = (await db.campaignCharacters
    .where('campaignId')
    .equals(campaignId)
    .filter((cc: CampaignCharacter) => cc.campaignSceneId === campaignSceneId)
    .toArray()) as CampaignCharacter[];

  for (const cc of rows) {
    await db.campaignCharacters.update(cc.id, {
      turnOrder: 0,
      turnStartTimestamp: undefined,
      turnEndTimestamp: undefined,
      updatedAt: now,
    });
  }

  await db.sceneTurnCallbacks.where('campaignSceneId').equals(campaignSceneId).delete();

  await db.campaignScenes.update(campaignSceneId, {
    turnBasedMode: false,
    updatedAt: now,
  });
}
