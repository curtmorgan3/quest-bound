import type { DB } from '@/stores/db/hooks/types';
import type { CampaignCharacter, CampaignScene, SceneTurnCallback } from '@/types';

export interface AdvanceTurnResult {
  /** Callbacks to run for the new cycle (targetCycle === currentTurnCycle), in registration order. */
  cycleCallbacks: SceneTurnCallback[];
  /** Callbacks to run every advance (targetCycle === null), in registration order. */
  advanceCallbacks: SceneTurnCallback[];
}

/**
 * Get active campaign characters in the scene sorted by turnOrder (for turn-based flow).
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
      (cc: CampaignCharacter) =>
        cc.campaignSceneId === campaignSceneId && cc.active === true,
    )
    .toArray()) as CampaignCharacter[];

  return rows.sort((a, b) => (a.turnOrder ?? 0) - (b.turnOrder ?? 0));
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
  await db.campaignScenes.update(campaignSceneId, {
    currentTurnCycle,
    currentStepInCycle,
    updatedAt: now,
  });

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
