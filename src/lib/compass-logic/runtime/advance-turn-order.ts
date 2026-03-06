import type { DB } from '@/stores/db/hooks/types';
import type { CampaignCharacter, Character, CampaignScene, SceneTurnCallback } from '@/types';

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
    .filter(
      (cc: CampaignCharacter) => cc.campaignSceneId === campaignSceneId,
    )
    .toArray()) as CampaignCharacter[];

  if (rows.length === 0) return [];

  const characterIds = [...new Set(rows.map((cc) => cc.characterId))];
  const characters = await Promise.all(
    characterIds.map((id) => db.characters.get(id)),
  );
  const characterById = new Map<string, Character | undefined>(
    characterIds.map((id, i) => [id, characters[i] as Character | undefined]),
  );

  const inTurnOrder = rows.filter((cc) => {
    const character = characterById.get(cc.characterId);
    const isPlayer = character ? !character.isNpc : false;
    return cc.active === true || isPlayer;
  });

  return inTurnOrder.sort((a, b) => (a.turnOrder ?? 0) - (b.turnOrder ?? 0));
}

/**
 * Advance scene turn state by one step (next character). Updates DB.
 * Returns callbacks to run: cycle callbacks (if we just wrapped into a new cycle) then on_turn_advance callbacks.
 * Returns null if scene is not in turn-based mode or has no characters.
 */
export async function advanceSceneTurnState(
  db: DB,
  campaignSceneId: string,
): Promise<AdvanceTurnResult | null> {
  const scene = (await db.campaignScenes.get(campaignSceneId)) as
    | CampaignScene
    | undefined;
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
  }
  if (justWrapped) {
    // Clear turn timestamps for everyone else so only current cycle is reflected.
    for (const cc of characters) {
      if (cc.id !== newCharacter?.id) {
        await db.campaignCharacters.update(cc.id, {
          turnStartTimestamp: undefined,
          turnEndTimestamp: undefined,
          updatedAt: now,
        });
      }
    }
  }

  // Fetch callbacks: cycle callbacks for this cycle (only when we just wrapped), then on_turn_advance
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
  const sorted = [...characters].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );
  let turnOrder = 1;
  for (const cc of sorted) {
    await db.campaignCharacters.update(cc.id, {
      turnOrder: turnOrder++,
      updatedAt: now,
    });
  }
  await db.campaignCharacters.update(sorted[0].id, {
    turnStartTimestamp: nowMs,
    turnEndTimestamp: null,
    updatedAt: now,
  });

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
    .filter(
      (cc: CampaignCharacter) => cc.campaignSceneId === campaignSceneId,
    )
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
