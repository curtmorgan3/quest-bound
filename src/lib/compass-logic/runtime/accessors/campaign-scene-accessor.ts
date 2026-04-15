import type { DB } from '@/stores/db/hooks/types';
import type {
  Archetype,
  Attribute,
  CampaignCharacter,
  CampaignScene,
  Character,
  CharacterAttribute,
  CustomProperty,
  RollFn,
  SceneTurnCallback,
} from '@/types';
import { filterNotSoftDeleted } from '@/lib/data/soft-delete';
import { seedCharacterAttributeFromRulesetAttribute } from '@/utils/character-attribute-from-ruleset-attribute';
import type Dexie from 'dexie';
import {
  executeArchetypeEvent,
  executeCharacterLoader,
} from '../../reactive/event-handler-executor';
import { advanceSceneTurnState, getSceneTurnOrderCharacters } from '../advance-turn-order';
import type { CharacterAccessor } from './character-accessor';
import type { OwnerAccessor } from './owner-accessor';

type AnyCharacterAccessor = CharacterAccessor | OwnerAccessor;

interface SpawnCharacterOptions {
  archetypeName: string;
}

type GetCharacterAccessorByIdFn = (characterId: string) => Promise<AnyCharacterAccessor | null>;

type RegisterSceneCharacterIdFn = (characterId: string) => void;

/** Report roster changes to the ScriptRunner (main thread broadcasts over campaign realtime). */
export type CampaignRosterChangedFn = (payload: {
  campaignId: string;
  characterId: string;
  campaignCharacterId: string;
}) => void;

export type ExecuteTurnCallbacksFn = (callbacks: SceneTurnCallback[]) => Promise<void>;

/**
 * Accessor for a campaign scene in campaign-aware scripts.
 *
 * Exposed to QBScript as the top-level `Scene` accessor when a campaignId
 * and campaignSceneId are present in the ScriptExecutionContext.
 *
 * Provides:
 * - .characters(): active characters in the scene as character accessors
 * - .spawnCharacter('Archetype Name'): create an active NPC in the scene
 */
export class CampaignSceneAccessor {
  private db: DB;
  private campaignId: string;
  private campaignSceneId: string;
  private rulesetId: string;
  private getCharacterAccessorById: GetCharacterAccessorByIdFn;
  private registerSceneCharacterId: RegisterSceneCharacterIdFn | undefined;
  private cachedCharacterIds: Set<string> | null;
  private cachedAccessors: AnyCharacterAccessor[] | null;
  private roll?: RollFn;
  /** When set, spawned/loaded characters use rolls tagged to their id (worker delegated UI). */
  private createRollForCharacter?: (characterId: string) => RollFn;
  private deferredAdvanceRef?: { current: boolean };
  private executeTurnCallbacks?: ExecuteTurnCallbacksFn;
  private onCampaignRosterChanged?: CampaignRosterChangedFn;
  private insideCallbackRun = false;

  constructor(
    db: Dexie,
    campaignId: string,
    campaignSceneId: string,
    rulesetId: string,
    getCharacterAccessorById: GetCharacterAccessorByIdFn,
    initialCharacterIds?: string[],
    registerSceneCharacterId?: RegisterSceneCharacterIdFn,
    roll?: RollFn,
    deferredAdvanceRef?: { current: boolean },
    executeTurnCallbacks?: ExecuteTurnCallbacksFn,
    onCampaignRosterChanged?: CampaignRosterChangedFn,
    createRollForCharacter?: (characterId: string) => RollFn,
  ) {
    this.db = db as DB;
    this.campaignId = campaignId;
    this.campaignSceneId = campaignSceneId;
    this.rulesetId = rulesetId;
    this.getCharacterAccessorById = getCharacterAccessorById;
    this.registerSceneCharacterId = registerSceneCharacterId;
    this.cachedCharacterIds = initialCharacterIds ? new Set(initialCharacterIds) : null;
    this.cachedAccessors = null;
    this.roll = roll;
    this.createRollForCharacter = createRollForCharacter;
    this.deferredAdvanceRef = deferredAdvanceRef;
    this.executeTurnCallbacks = executeTurnCallbacks;
    this.onCampaignRosterChanged = onCampaignRosterChanged;
  }

  /** Set by the runner when running turn callbacks; when true, advanceTurnOrder() only sets deferred. */
  setInsideCallbackRun(inside: boolean): void {
    this.insideCallbackRun = inside;
  }

  /** Current turn cycle (1-based). Returns 0 when not in turn-based mode. */
  async currentTurnCycle(): Promise<number> {
    const scene = (await this.db.campaignScenes.get(this.campaignSceneId)) as
      | CampaignScene
      | undefined;
    if (!scene?.turnBasedMode) return 0;
    return scene.currentTurnCycle ?? 1;
  }

  /** 0-based index in sorted turn order. Returns 0 when not in turn-based mode. */
  async currentStepInCycle(): Promise<number> {
    const scene = (await this.db.campaignScenes.get(this.campaignSceneId)) as
      | CampaignScene
      | undefined;
    if (!scene?.turnBasedMode) return 0;
    return scene.currentStepInCycle ?? 0;
  }

  /**
   * Advance to the next character in turn order. Runs cycle callbacks (if we just wrapped) then onTurnAdvance callbacks.
   * No-op when not in turn-based mode. If called from inside a callback, sets deferred and returns.
   */
  async advanceTurnOrder(): Promise<void> {
    if (this.insideCallbackRun && this.deferredAdvanceRef) {
      this.deferredAdvanceRef.current = true;
      return;
    }

    const result = await advanceSceneTurnState(this.db, this.campaignSceneId);
    if (!result) return;

    const run = this.executeTurnCallbacks;
    if (!run) return;

    // Order: end-of-prev-turn → start-of-new-turn → new cycle callbacks → every-advance callbacks
    const all = result.turnEndCallbacks.concat(
      result.turnStartCallbacks,
      result.cycleCallbacks,
      result.advanceCallbacks,
    );
    await run(all);

    if (this.deferredAdvanceRef?.current) {
      this.deferredAdvanceRef.current = false;
      await this.advanceTurnOrder();
    }
  }

  /**
   * Start turn-based mode: set turn state and assign default turn order by creation date.
   * Includes all active campaign characters plus all player characters in the scene.
   * No-op when there are no characters in the turn order.
   */
  async startTurnBasedMode(): Promise<void> {
    const characters = await getSceneTurnOrderCharacters(
      this.db,
      this.campaignId,
      this.campaignSceneId,
    );
    if (characters.length === 0) {
      return;
    }

    const now = new Date().toISOString();
    // Preserve any existing explicit turnOrder values; only assign defaults for unset (0/null) rows.
    const existingMax = characters.reduce((max, cc) => Math.max(max, cc.turnOrder ?? 0), 0);
    let nextTurnOrder = existingMax > 0 ? existingMax + 1 : 1;

    const sorted = [...characters].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    );

    for (const cc of sorted) {
      if ((cc.turnOrder ?? 0) === 0) {
        await this.db.campaignCharacters.update(cc.id, {
          turnOrder: nextTurnOrder++,
          updatedAt: now,
        });
      }
    }

    await this.db.campaignScenes.update(this.campaignSceneId, {
      turnBasedMode: true,
      currentTurnCycle: 1,
      currentStepInCycle: 0,
      updatedAt: now,
    });

    this.cachedAccessors = null;
  }

  /**
   * Stop turn-based mode: clear callback queue and reset all scene characters' turnOrder to 0.
   */
  async stopTurnBasedMode(): Promise<void> {
    const now = new Date().toISOString();
    const rows = filterNotSoftDeleted(
      (await this.db.campaignCharacters
        .where('campaignId')
        .equals(this.campaignId)
        .filter((cc: CampaignCharacter) => cc.campaignSceneId === this.campaignSceneId)
        .toArray()) as CampaignCharacter[],
    );

    for (const cc of rows) {
      await this.db.campaignCharacters.update(cc.id, {
        turnOrder: 0,
        updatedAt: now,
      });
    }

    await this.db.sceneTurnCallbacks.where('campaignSceneId').equals(this.campaignSceneId).delete();

    await this.db.campaignScenes.update(this.campaignSceneId, {
      turnBasedMode: false,
      updatedAt: now,
    });

    this.cachedAccessors = null;
  }

  /**
   * Register a callback to run in n cycles (Scene.inTurns(n): block).
   * No-op if n is not a positive integer. Uses current turn cycle to compute targetCycle.
   */
  async registerInTurns(
    n: number,
    blockSource: string,
    ownerId: string | null,
    scriptId: string,
    capturedCharacterIds?: Record<string, string>,
    capturedValues?: Record<string, string | number | boolean | null>,
  ): Promise<void> {
    if (typeof n !== 'number' || n < 1 || !Number.isInteger(n)) {
      return;
    }
    const cycle = await this.currentTurnCycle();
    if (cycle === 0) return;
    const targetCycle = cycle + n;
    const now = new Date().toISOString();
    await this.db.sceneTurnCallbacks.add({
      id: crypto.randomUUID(),
      campaignSceneId: this.campaignSceneId,
      targetCycle,
      createdAtCycle: cycle,
      ownerId,
      rulesetId: this.rulesetId,
      scriptId,
      blockSource,
      capturedCharacterIds:
        capturedCharacterIds && Object.keys(capturedCharacterIds).length > 0
          ? capturedCharacterIds
          : undefined,
      capturedValues:
        capturedValues && Object.keys(capturedValues).length > 0 ? capturedValues : undefined,
      createdAt: now,
      updatedAt: now,
    } as any);
  }

  /**
   * Register a callback to run on every advance (Scene.onTurnAdvance(): block).
   */
  async registerOnTurnAdvance(
    blockSource: string,
    ownerId: string | null,
    scriptId: string,
    capturedCharacterIds?: Record<string, string>,
    capturedValues?: Record<string, string | number | boolean | null>,
  ): Promise<void> {
    const cycle = await this.currentTurnCycle();
    const now = new Date().toISOString();
    await this.db.sceneTurnCallbacks.add({
      id: crypto.randomUUID(),
      campaignSceneId: this.campaignSceneId,
      targetCycle: null,
      createdAtCycle: cycle,
      ownerId,
      rulesetId: this.rulesetId,
      scriptId,
      blockSource,
      capturedCharacterIds:
        capturedCharacterIds && Object.keys(capturedCharacterIds).length > 0
          ? capturedCharacterIds
          : undefined,
      capturedValues:
        capturedValues && Object.keys(capturedValues).length > 0 ? capturedValues : undefined,
      createdAt: now,
      updatedAt: now,
    } as any);
  }

  /**
   * Register a one-shot callback that fires at the start or end of the target character's next turn.
   * Used by character.atStartOfNextTurn() and character.atEndOfNextTurn() in QBScript.
   * The callback is deleted from the DB as soon as it is fetched (one-shot, never re-fires).
   *
   * For turn_end: if the target character is currently the active turn character, the first
   * turn-end (the end of the current turn) is skipped so the callback fires at the end of their
   * *next* turn. The skipNextTurnEnd flag is cleared after the skip.
   */
  async registerCharacterTurnCallback(
    targetCharacterId: string,
    triggerOn: 'turn_start' | 'turn_end',
    blockSource: string,
    ownerId: string | null,
    scriptId: string,
    capturedCharacterIds?: Record<string, string>,
    capturedValues?: Record<string, string | number | boolean | null>,
    turnsRemaining?: number,
  ): Promise<void> {
    if (!targetCharacterId) return;
    const cycle = await this.currentTurnCycle();
    const now = new Date().toISOString();

    // For turn_end, check whether the target character is currently the active turn character.
    // If so, the upcoming turn-end is the *current* turn ending — skip it and wait for the next.
    // Only applies when turnsRemaining is undefined (i.e. atEndOfNextTurn, not atEndOfTurn(n)).
    let skipNextTurnEnd = false;
    if (triggerOn === 'turn_end' && turnsRemaining === undefined) {
      const scene = (await this.db.campaignScenes.get(this.campaignSceneId)) as
        | CampaignScene
        | undefined;
      if (scene?.turnBasedMode) {
        const characters = await getSceneTurnOrderCharacters(
          this.db,
          this.campaignId,
          this.campaignSceneId,
        );
        const activeCharacter = characters[scene.currentStepInCycle ?? 0];
        if (activeCharacter?.characterId === targetCharacterId) {
          skipNextTurnEnd = true;
        }
      }
    }

    await this.db.sceneTurnCallbacks.add({
      id: crypto.randomUUID(),
      campaignSceneId: this.campaignSceneId,
      targetCycle: null,
      createdAtCycle: cycle,
      ownerId,
      rulesetId: this.rulesetId,
      scriptId,
      blockSource,
      targetCharacterId,
      triggerOn,
      skipNextTurnEnd: skipNextTurnEnd || undefined,
      turnsRemaining: turnsRemaining !== undefined ? turnsRemaining : undefined,
      capturedCharacterIds:
        capturedCharacterIds && Object.keys(capturedCharacterIds).length > 0
          ? capturedCharacterIds
          : undefined,
      capturedValues:
        capturedValues && Object.keys(capturedValues).length > 0 ? capturedValues : undefined,
      createdAt: now,
      updatedAt: now,
    } as any);
  }

  /**
   * Return all active characters in this scene as character accessors.
   * Includes both player characters and NPCs whose CampaignCharacter.active === true.
   * Each accessor has isActiveTurn set to true when that character's turn order is the active turn.
   */
  async characters(): Promise<AnyCharacterAccessor[]> {
    const scene = (await this.db.campaignScenes.get(this.campaignSceneId)) as
      | CampaignScene
      | undefined;
    const turnBasedMode = scene?.turnBasedMode === true;
    const currentStepInCycle = turnBasedMode ? (scene?.currentStepInCycle ?? 0) : -1;

    const applyActiveTurn = (accessors: AnyCharacterAccessor[]): void => {
      for (let i = 0; i < accessors.length; i++) {
        accessors[i].isActiveTurn = turnBasedMode && i === currentStepInCycle;
      }
    };

    if (this.cachedAccessors) {
      applyActiveTurn(this.cachedAccessors);
      return this.cachedAccessors;
    }

    let characterIds: string[] = [];

    if (this.cachedCharacterIds && this.cachedCharacterIds.size > 0) {
      characterIds = Array.from(this.cachedCharacterIds);
    } else {
      const rows = await getSceneTurnOrderCharacters(
        this.db,
        this.campaignId,
        this.campaignSceneId,
      );
      characterIds = rows.map((cc) => cc.characterId);
      this.cachedCharacterIds = new Set(characterIds);
    }

    const accessors: AnyCharacterAccessor[] = [];
    for (const id of characterIds) {
      const acc = await this.getCharacterAccessorById(id);
      if (acc) accessors.push(acc);
    }
    applyActiveTurn(accessors);

    this.cachedAccessors = accessors;
    return accessors;
  }

  /**
   * Create a new NPC character from the given archetype and attach it
   * as an active CampaignCharacter in this scene.
   *
   * Returns a character accessor for the spawned NPC.
   *
   * This helper fully initializes the character by running the Character Loader
   * and the archetype's on_add event (when present) before resolving.
   */
  async spawnCharacter(archetypeName: string): Promise<AnyCharacterAccessor> {
    const options: SpawnCharacterOptions = { archetypeName: archetypeName.trim() };
    if (!options.archetypeName) {
      throw new Error('spawnCharacter requires a non-empty archetype name');
    }

    const archetype = (await this.db.archetypes
      .where('[rulesetId+name]')
      .equals([this.rulesetId, options.archetypeName])
      .first()) as Archetype | undefined;

    if (!archetype) {
      throw new Error(`Archetype '${options.archetypeName}' not found in this ruleset`);
    }

    const now = new Date().toISOString();

    // Create inventory first so character can reference it.
    const characterId = crypto.randomUUID();
    const inventoryId = crypto.randomUUID();

    await this.db.inventories.add({
      id: inventoryId,
      characterId,
      rulesetId: this.rulesetId,
      title: `${archetype.name}'s Inventory`,
      category: null,
      type: null,
      items: [],
      createdAt: now,
      updatedAt: now,
    } as any);

    // Minimal NPC character row.
    const character: Character = {
      id: characterId,
      userId: '', // NPCs spawned from scripts are not owned by a specific user
      rulesetId: this.rulesetId,
      inventoryId,
      name: archetype.name,
      assetId: archetype.assetId ?? null,
      image: archetype.image ?? null,
      isTestCharacter: false,
      isNpc: true,
      componentData: {},
      pinnedSidebarDocuments: [],
      pinnedSidebarCharts: [],
      createdAt: now,
      updatedAt: now,
      lastViewedPageId: null,
      sheetLocked: false,
      moduleId: archetype.moduleId,
      moduleEntityId: archetype.moduleEntityId,
      moduleName: archetype.moduleName,
    };

    await this.db.characters.add(character as any);

    // Instantiate character attributes from ruleset defaults.
    const rulesetAttributes = (await this.db.attributes
      .where('rulesetId')
      .equals(this.rulesetId)
      .toArray()) as any[];

    const characterAttributes: CharacterAttribute[] = rulesetAttributes.map((attr: Attribute) =>
      seedCharacterAttributeFromRulesetAttribute(attr, characterId, now),
    );

    if (characterAttributes.length > 0) {
      await this.db.characterAttributes.bulkAdd(characterAttributes as any);
    }

    // Instantiate characterPages and characterWindows from the archetype's test character (when available).
    if (archetype.testCharacterId) {
      try {
        const templatePages = await this.db.characterPages
          .where('characterId')
          .equals(archetype.testCharacterId)
          .toArray();

        const pageIdMap = new Map<string, string>();

        if (templatePages.length > 0) {
          for (const cp of templatePages as any[]) {
            const newJoinId = crypto.randomUUID();
            pageIdMap.set((cp as any).id, newJoinId);

            await this.db.characterPages.add({
              id: newJoinId,
              characterId,
              pageId: (cp as any).pageId,
              label: (cp as any).label,
              createdAt: now,
              updatedAt: now,
            } as any);
          }
        }

        // Copy characterWindows, remapping characterPageId to the new join ids.
        const templateWindows = await this.db.characterWindows
          .where('characterId')
          .equals(archetype.testCharacterId)
          .toArray();

        for (const cw of templateWindows as any[]) {
          const originalPageId = (cw as any).characterPageId as string | undefined | null;
          const mappedPageId =
            originalPageId != null
              ? (pageIdMap.get(originalPageId) ?? originalPageId)
              : originalPageId;

          await this.db.characterWindows.add({
            id: crypto.randomUUID(),
            characterId,
            characterPageId: mappedPageId,
            windowId: (cw as any).windowId,
            title: (cw as any).title,
            x: (cw as any).x,
            y: (cw as any).y,
            isCollapsed: (cw as any).isCollapsed,
            displayScale: (cw as any).displayScale,
            layer: (cw as any).layer,
            createdAt: now,
            updatedAt: now,
          } as any);
        }
      } catch (err) {
        console.warn(
          'Failed to copy characterPages/characterWindows for spawned NPC from archetype test character:',
          err,
        );
      }
    }

    // Instantiate customProperties from archetype's ArchetypeCustomProperties.
    const archetypeCustomProps = (await this.db.archetypeCustomProperties
      .where('archetypeId')
      .equals(archetype.id)
      .toArray()) as any[];

    const customPropertiesById: Record<string, string | number | boolean> = {};

    for (const acp of archetypeCustomProps) {
      const cp = (await this.db.customProperties.get(acp.customPropertyId)) as
        | CustomProperty
        | undefined;
      if (!cp) continue;

      const defaultValue =
        acp.defaultValue !== undefined
          ? acp.defaultValue
          : cp.defaultValue !== undefined
            ? cp.defaultValue
            : cp.type === 'number'
              ? 0
              : cp.type === 'boolean'
                ? false
                : '';

      customPropertiesById[cp.id] = defaultValue;
    }

    await this.db.characters.update(characterId, {
      customProperties: customPropertiesById,
      updatedAt: new Date().toISOString(),
    });

    // Attach archetype to character.
    const characterArchetypeId = crypto.randomUUID();
    await this.db.characterArchetypes.add({
      id: characterArchetypeId,
      characterId,
      archetypeId: archetype.id,
      loadOrder: 0,
      createdAt: now,
      updatedAt: now,
    } as any);

    const rollForSpawn = this.createRollForCharacter?.(characterId) ?? this.roll;

    // Run Character Loader script (if present) for this character.
    try {
      const loaderResult = await executeCharacterLoader(
        this.db,
        characterId,
        this.rulesetId,
        rollForSpawn,
      );
      if (loaderResult.error) {
        console.warn('Character Loader script failed for spawned NPC:', loaderResult.error);
      }
    } catch (err) {
      console.warn('Character Loader execution threw for spawned NPC:', err);
    }

    // Run archetype on_add script for this archetype (if present).
    try {
      const archetypeResult = await executeArchetypeEvent(
        this.db,
        archetype.id,
        characterId,
        'on_add',
        rollForSpawn,
        this.campaignId,
        undefined,
        this.campaignSceneId,
      );
      if (archetypeResult.error) {
        console.warn('Archetype on_add script failed for spawned NPC:', archetypeResult.error);
      }
    } catch (err) {
      console.warn('Archetype on_add execution threw for spawned NPC:', err);
    }

    // Create CampaignCharacter linking this NPC into the current scene.
    const campaignCharacter: CampaignCharacter = {
      id: crypto.randomUUID(),
      characterId,
      campaignId: this.campaignId,
      campaignSceneId: this.campaignSceneId,
      active: true,
      turnOrder: 0,
      createdAt: now,
      updatedAt: now,
    };

    await this.db.campaignCharacters.add(campaignCharacter as any);

    this.onCampaignRosterChanged?.({
      campaignId: this.campaignId,
      characterId,
      campaignCharacterId: campaignCharacter.id,
    });

    // Update local caches so .characters() includes this NPC.
    if (!this.cachedCharacterIds) {
      this.cachedCharacterIds = new Set();
    }
    this.cachedCharacterIds.add(characterId);
    this.cachedAccessors = null;

    if (this.registerSceneCharacterId) {
      this.registerSceneCharacterId(characterId);
    }

    const accessor = await this.getCharacterAccessorById(characterId);
    if (!accessor) {
      throw new Error('Failed to create character accessor for spawned NPC');
    }

    return accessor;
  }

  toStructuredCloneSafe(): { __type: 'CampaignScene'; id: string } {
    return {
      __type: 'CampaignScene',
      id: this.campaignSceneId,
    };
  }
}
