import type { DB } from '@/stores/db/hooks/types';
import type {
  Archetype,
  CampaignCharacter,
  Character,
  CharacterAttribute,
  CustomProperty,
  RollFn,
} from '@/types';
import type Dexie from 'dexie';
import {
  executeArchetypeEvent,
  executeCharacterLoader,
} from '../../reactive/event-handler-executor';
import type { CharacterAccessor } from './character-accessor';
import type { OwnerAccessor } from './owner-accessor';

type AnyCharacterAccessor = CharacterAccessor | OwnerAccessor;

interface SpawnCharacterOptions {
  archetypeName: string;
}

type GetCharacterAccessorByIdFn = (characterId: string) => Promise<AnyCharacterAccessor | null>;

type RegisterSceneCharacterIdFn = (characterId: string) => void;

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

  constructor(
    db: Dexie,
    campaignId: string,
    campaignSceneId: string,
    rulesetId: string,
    getCharacterAccessorById: GetCharacterAccessorByIdFn,
    initialCharacterIds?: string[],
    registerSceneCharacterId?: RegisterSceneCharacterIdFn,
    roll?: RollFn,
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
  }

  /**
   * Return all active characters in this scene as character accessors.
   * Includes both player characters and NPCs whose CampaignCharacter.active === true.
   */
  async characters(): Promise<AnyCharacterAccessor[]> {
    if (this.cachedAccessors) {
      return this.cachedAccessors;
    }

    let characterIds: string[] = [];

    if (this.cachedCharacterIds && this.cachedCharacterIds.size > 0) {
      characterIds = Array.from(this.cachedCharacterIds);
    } else {
      const rows = (await this.db.campaignCharacters
        .where('campaignId')
        .equals(this.campaignId)
        .filter(
          (cc: CampaignCharacter) =>
            cc.campaignSceneId === this.campaignSceneId && cc.active === true,
        )
        .toArray()) as CampaignCharacter[];

      characterIds = rows.map((cc) => cc.characterId);
      this.cachedCharacterIds = new Set(characterIds);
    }

    const accessors: AnyCharacterAccessor[] = [];
    for (const id of characterIds) {
      const acc = await this.getCharacterAccessorById(id);
      if (acc) accessors.push(acc);
    }

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

    const characterAttributes: CharacterAttribute[] = rulesetAttributes.map(
      (attr: any) =>
        ({
          ...attr,
          id: crypto.randomUUID(),
          characterId,
          attributeId: attr.id,
          value: attr.defaultValue,
          createdAt: now,
          updatedAt: now,
        }) as CharacterAttribute,
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

    // Run Character Loader script (if present) for this character.
    try {
      const loaderResult = await executeCharacterLoader(
        this.db,
        characterId,
        this.rulesetId,
        this.roll,
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
        this.roll,
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
      createdAt: now,
      updatedAt: now,
    };

    await this.db.campaignCharacters.add(campaignCharacter as any);

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
