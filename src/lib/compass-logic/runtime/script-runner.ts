import type { DB } from '@/stores/db/hooks/types';
import type {
  Action,
  Attribute,
  CampaignEvent,
  CharacterAttribute,
  CharacterPage,
  CharacterWindow,
  Chart,
  ComponentStyle,
  CustomProperty,
  InventoryItem,
  Item,
  Page,
  PromptFn,
  PromptInputFn,
  PromptMultipleFn,
  RollFn,
  RollSplitFn,
  RulesetWindow,
  SceneTurnCallback,
  Script,
  SelectCharacterFn,
  SelectCharactersFn,
  Window,
} from '@/types';
import { filterNotSoftDeleted } from '@/lib/data/soft-delete';
import { buildItemCustomProperties } from '@/utils/custom-property-utils';
import { Evaluator } from '../interpreter/evaluator';
import { Lexer } from '../interpreter/lexer';
import { Parser } from '../interpreter/parser';
import { executeArchetypeEvent } from '../reactive/event-handler-executor';
import {
  CampaignSceneAccessor,
  CharacterAccessor,
  OwnerAccessor,
  RulesetAccessor,
} from './accessors';
import { getSceneTurnOrderCharacters } from './advance-turn-order';
import { executeTurnCallback } from './execute-turn-callback';
import type { ScriptParamsHelper } from './params-helper';
import type { ExecuteActionEventFn } from './proxies';

const INVENTORY_COMPONENT_TYPE = 'inventory';
const CELL_SIZE_PX = 20;

/**
 * Resolve _inventoryRefLabel (component referenceLabel from script) to component.id.
 * If x or y is -1, find the first available slot in the target inventory component.
 * Returns the item with componentId set and _inventoryRefLabel omitted for persistence.
 */
async function resolveInventoryRefLabel(
  db: DB,
  item: InventoryItem & { _inventoryRefLabel?: string },
): Promise<InventoryItem | null> {
  const ref = item._inventoryRefLabel;
  const { _inventoryRefLabel: _, ...rest } = item;
  const out: InventoryItem = { ...rest };

  if (ref == null || ref === '') return out;

  const inventory = await db.inventories.get(item.inventoryId);
  const rulesetId = (inventory as { rulesetId?: string } | undefined)?.rulesetId;
  if (!rulesetId) return out;

  const components = await db.components
    .where('rulesetId')
    .equals(rulesetId)
    .filter((c) => (c as { type?: string }).type === INVENTORY_COMPONENT_TYPE)
    .toArray();

  const match = components.find((c) => {
    const data = JSON.parse((c as { data?: string }).data ?? '{}');
    return data.referenceLabel === ref;
  });

  if (!match) return out;

  const comp = match as { id: string; width: number; height: number; data?: string };
  out.componentId = comp.id;

  const needsSlot = item.x === -1 || item.y === -1;
  if (!needsSlot) return out;

  const compData = JSON.parse(comp.data ?? '{}') as { cellWidth?: number; cellHeight?: number };
  const cellWidthPx = (compData.cellWidth ?? 1) * CELL_SIZE_PX;
  const cellHeightPx = (compData.cellHeight ?? 1) * CELL_SIZE_PX;
  const gridCols = Math.floor((comp.width ?? 0) / cellWidthPx);
  const gridRows = Math.floor((comp.height ?? 0) / cellHeightPx);
  if (gridCols < 1 || gridRows < 1) return out;

  const entity =
    item.type === 'item'
      ? await db.items.get(item.entityId)
      : item.type === 'action'
        ? await db.actions.get(item.entityId)
        : await db.attributes.get(item.entityId);
  const entityData = entity as { inventoryWidth?: number; inventoryHeight?: number } | undefined;
  const itemW = entityData?.inventoryWidth ?? 1;
  const itemH = entityData?.inventoryHeight ?? 1;
  const itemWidthInCells = Math.ceil((itemW * CELL_SIZE_PX) / cellWidthPx);
  const itemHeightInCells = Math.ceil((itemH * CELL_SIZE_PX) / cellHeightPx);

  const existingItems = (
    await db.inventoryItems
      .where('inventoryId')
      .equals(item.inventoryId)
      .filter((i) => (i as { componentId?: string }).componentId === comp.id)
      .toArray()
  ).filter((i) => (i as { deleted?: boolean }).deleted !== true);

  const existingDims = await Promise.all(
    existingItems.map(async (invItem) => {
      const e =
        (invItem as { type: string }).type === 'item'
          ? await db.items.get((invItem as { entityId: string }).entityId)
          : (invItem as { type: string }).type === 'action'
            ? await db.actions.get((invItem as { entityId: string }).entityId)
            : await db.attributes.get((invItem as { entityId: string }).entityId);
      const d = e as { inventoryWidth?: number; inventoryHeight?: number } | undefined;
      const w = d?.inventoryWidth ?? 1;
      const h = d?.inventoryHeight ?? 1;
      return {
        x: (invItem as { x: number }).x,
        y: (invItem as { y: number }).y,
        widthInCells: Math.ceil((w * CELL_SIZE_PX) / cellWidthPx),
        heightInCells: Math.ceil((h * CELL_SIZE_PX) / cellHeightPx),
      };
    }),
  );

  const hasCollision = (x: number, y: number): boolean => {
    for (const other of existingDims) {
      const noOverlap =
        x >= other.x + other.widthInCells ||
        x + itemWidthInCells <= other.x ||
        y >= other.y + other.heightInCells ||
        y + itemHeightInCells <= other.y;
      if (!noOverlap) return true;
    }
    return false;
  };

  for (let y = 0; y <= gridRows - itemHeightInCells; y++) {
    for (let x = 0; x <= gridCols - itemWidthInCells; x++) {
      if (!hasCollision(x, y)) {
        out.x = x;
        out.y = y;
        return out;
      }
    }
  }

  console.warn('Inventory component is full. Skipping item add.');
  return null;
}

/**
 * Context for script execution.
 */
export interface ScriptExecutionContext {
  /**
   * Character executing the script.
   * Required for character-scoped scripts (attributes, items, actions, archetypes, character loader).
   * May be omitted for some campaign/system scripts that do not have an owning character.
   */
  ownerId?: string;
  rulesetId: string; // Current ruleset
  db: DB; // Database access
  scriptId?: string; // Which script is executing (for error logging)
  triggerType?:
    | 'load'
    | 'attribute_change'
    | 'action_click'
    | 'item_event'
    | 'archetype_event'
    | 'character_load';
  /** When script is attached to an entity (attribute, action, item), the entity type. Enables 'Self'. */
  entityType?: string;
  /** When script is attached to an entity, the entity id. Self = Owner.Attribute/Action/Item as appropriate. */
  entityId?: string;
  /** When script is for an item (entityType 'item'), the inventory item instance id. Self then refers to this instance instead of the first match by name. */
  inventoryItemInstanceId?: string;
  /** When set (e.g. action fired from item context menu), Caller = itemInstanceProxy of this inventory item. When unset, Caller = Owner. */
  callerInventoryItemInstanceId?: string;
  /** Optional roll function for script built-in roll(). When set, used instead of default local roll (e.g. from useDiceState). */
  roll?: RollFn;
  /** Optional rollSplit function for script built-in rollSplit(). When set, used instead of default local roll. */
  rollSplit?: RollSplitFn;
  /** Optional prompt function for script built-in prompt(msg, choices). When set, used to show modal and return selected choice. */
  prompt?: PromptFn;
  /** Optional promptMultiple function for script built-in promptMultiple(msg, choices). When set, used to show multi-select modal and return selected choices. */
  promptMultiple?: PromptMultipleFn;
  /** Optional promptInput function for script built-in promptInput(msg). When set, used to show a text input modal and return the entered string. */
  promptInput?: PromptInputFn;
  /** Optional character picker for selectCharacter(title?, description?). When set, used to show UI and return a single character accessor or null. */
  selectCharacter?: SelectCharacterFn;
  /** Optional character picker for selectCharacters(title?, description?). When set, used to show UI and return an array of character accessors. */
  selectCharacters?: SelectCharactersFn;
  /** When set, Owner.Action('name').activate() / .deactivate() can run action event handlers (e.g. from worker or EventHandlerExecutor). */
  executeActionEvent?: ExecuteActionEventFn;
  /** Optional campaign id for associating script execution with a campaign (logging, context). */
  campaignId?: string;
  /** When set, called after roll/rollSplit with an auto-generated log message for the game log. */
  onRollComplete?: (message: string) => Promise<void>;
  /** When set (e.g. campaign scene events), identifies the CampaignScene whose active characters should be loaded into context. */
  campaignSceneId?: string;
  /** When set (campaign event scripts), the CampaignEvent this script is attached to. */
  campaignEvent?: CampaignEvent;
  /** Optional helper exposed to QBScript as `params` (e.g. params.get('Name')). */
  params?: ScriptParamsHelper;
}

/**
 * Result of script execution.
 */
export interface ScriptExecutionResult {
  value: any;
  announceMessages: string[];
  logMessages: any[][];
  error?: Error;
  /** Attribute IDs (ruleset attribute ids) whose character values were updated. Used to trigger reactive scripts in the worker. */
  modifiedAttributeIds?: string[];
  /** Optional list of character/page pairs that should be navigated to in the UI after execution. */
  navigateTargets?: { characterId: string; pageId: string }[];
  /** Component animations to trigger in the sheet viewer (by referenceLabel). */
  componentAnimations?: Array<{ characterId: string; referenceLabel: string; animation: string }>;
}

/**
 * ScriptRunner handles execution of QBScript code with game entity integration.
 * It pre-loads entity data, executes the script with accessor objects, and flushes changes.
 */
export class ScriptRunner {
  private context: ScriptExecutionContext;
  private evaluator: Evaluator;
  private pendingUpdates: Map<string, any>;

  // Cached data loaded before execution
  private characterAttributesCache: Map<string, CharacterAttribute>;
  private attributesCache: Map<string, Attribute>;
  private actionsCache: Map<string, Action>;
  private chartsCache: Map<string, Chart>;
  private itemsCache: Map<string, Item>;
  private customPropertiesCache: CustomProperty[] = [];
  private ownerCharacterCustomProperties: Record<string, string | number | boolean> = {};
  private ownerInventoryItems: InventoryItem[];
  private ownerCharacterName: string;
  private ownerInventoryId: string;
  private ownerArchetypeNames: Set<string>;
  /** Archetype name -> variant for owner (insertion order = load order for variant getter). */
  private ownerArchetypeVariantByName: Map<string, string | undefined>;
  /** Cached Owner accessor instance (set in setupAccessors). */
  private ownerAccessor: OwnerAccessor | null = null;

  /** Cached character ids that are active in the current campaign scene (for campaign scene contexts). */
  private sceneCharacterIds: Set<string> | null = null;

  /** characterId -> turnOrder for scene characters (populated in loadCache when in campaign scene). */
  private sceneCharacterTurnOrder: Map<string, number> | null = null;

  /** Lazily-created accessors for characters selected via selectCharacter(s). */
  private otherCharacterAccessors: Map<string, CharacterAccessor | OwnerAccessor> = new Map();

  /** Callback for setComponentStyle / animateComponent; set in setupAccessors so getCharacterAccessorById can pass it. */
  private registerComponentUpdate?: (
    characterId: string,
    referenceLabel: string,
    type: 'animation' | 'style',
    data: Record<string, unknown>,
  ) => void;

  /** Scene accessor (set in setupAccessors when in campaign scene context). Used for runAdvanceTurnOrder. */
  private sceneAccessor: CampaignSceneAccessor | null = null;

  /** Map from inventory component referenceLabel to componentId (for removeItem filtering and delete validation). */
  private refLabelToComponentId: Map<string, string> = new Map();

  constructor(context: ScriptExecutionContext) {
    this.context = context;
    const selectCharacterHost =
      context.selectCharacter != null
        ? async (title?: string, description?: string): Promise<any | null> => {
            const id = await context.selectCharacter!(title, description);
            if (!id) return null;
            return this.getCharacterAccessorById(String(id));
          }
        : undefined;

    const selectCharactersHost =
      context.selectCharacters != null
        ? async (title?: string, description?: string): Promise<any[]> => {
            const ids = await context.selectCharacters!(title, description);
            const results: any[] = [];
            for (const rawId of ids ?? []) {
              const acc = await this.getCharacterAccessorById(String(rawId));
              if (acc) results.push(acc);
            }
            return results;
          }
        : undefined;

    this.evaluator = new Evaluator({
      roll: context.roll,
      rollSplit: context.rollSplit,
      prompt: context.prompt,
      promptMultiple: context.promptMultiple,
      promptInput: context.promptInput,
      selectCharacter: selectCharacterHost,
      selectCharacters: selectCharactersHost,
      onRollComplete: context.onRollComplete,
    });
    this.pendingUpdates = new Map();
    this.characterAttributesCache = new Map();
    this.attributesCache = new Map();
    this.actionsCache = new Map();
    this.chartsCache = new Map();
    this.itemsCache = new Map();
    this.ownerInventoryItems = [];
    this.ownerCharacterName = 'Character';
    this.ownerInventoryId = '';
    this.ownerArchetypeNames = new Set();
    this.ownerArchetypeVariantByName = new Map();
  }

  /**
   * Load all necessary data from the database before script execution.
   * This allows accessor methods to work synchronously.
   */
  async loadCache(): Promise<void> {
    const { db, rulesetId, ownerId } = this.context;

    // Load all attributes for this ruleset
    const attributes = await db.attributes.where({ rulesetId }).toArray();
    for (const attr of attributes) {
      this.attributesCache.set(attr.id, attr);
    }

    // Load all charts for this ruleset
    const charts = await db.charts.where({ rulesetId }).toArray();
    for (const chart of charts) {
      this.chartsCache.set(chart.id, chart);
    }

    // Load all items for this ruleset
    const items = await db.items.where({ rulesetId }).toArray();
    for (const item of items) {
      this.itemsCache.set(item.id, item);
    }

    // Load all actions for this ruleset (for Owner.Action('name'))
    const actions = await db.actions.where({ rulesetId }).toArray();
    for (const action of actions) {
      this.actionsCache.set(action.id, action);
    }

    // Load custom properties for this ruleset (for item/character custom property lookup)
    this.customPropertiesCache = await db.customProperties
      .where('rulesetId')
      .equals(rulesetId)
      .toArray();

    // Build refLabel -> componentId for inventory components (for removeItem referenceLabel filtering)
    const inventoryComponents = await db.components
      .where('rulesetId')
      .equals(rulesetId)
      .filter((c) => (c as { type?: string }).type === INVENTORY_COMPONENT_TYPE)
      .toArray();
    this.refLabelToComponentId.clear();
    for (const comp of inventoryComponents) {
      const data = JSON.parse((comp as { data?: string }).data ?? '{}') as {
        referenceLabel?: string;
      };
      if (data.referenceLabel) {
        this.refLabelToComponentId.set(data.referenceLabel, comp.id);
      }
    }

    // Load owner character and inventory items (when an owner is present)
    if (ownerId) {
      const ownerCharacter = await db.characters.get(ownerId);
      this.ownerCharacterName = ownerCharacter?.name ?? 'Character';
      this.ownerInventoryId = ownerCharacter?.inventoryId ?? '';
      this.ownerCharacterCustomProperties = ownerCharacter?.customProperties ?? {};
      if (ownerCharacter?.inventoryId) {
        this.ownerInventoryItems = filterNotSoftDeleted(
          await db.inventoryItems
            .where('inventoryId')
            .equals(ownerCharacter.inventoryId)
            .toArray(),
        );
      }

      // Load character attributes for owner
      const ownerAttributes = filterNotSoftDeleted(
        await db.characterAttributes.where({ characterId: ownerId }).toArray(),
      );
      for (const charAttr of ownerAttributes) {
        this.characterAttributesCache.set(charAttr.id, charAttr);
      }

      // Load archetype names and variants for owner (CharacterArchetype join Archetype), in load order
      const ownerCharArchetypesRaw = filterNotSoftDeleted(
        await db.characterArchetypes.where('characterId').equals(ownerId).toArray(),
      );
      const ownerCharArchetypes = ownerCharArchetypesRaw.sort((a, b) => a.loadOrder - b.loadOrder);
      for (const ca of ownerCharArchetypes) {
        const archetype = await db.archetypes.get(ca.archetypeId);
        if (archetype?.name) {
          this.ownerArchetypeNames.add(archetype.name);
          this.ownerArchetypeVariantByName.set(archetype.name, ca.variant);
        }
      }
    }

    // Load active characters for the current campaign scene (for campaign scene events).
    // Includes both player characters (isNpc !== true, considered in every scene) and
    // NPCs whose CampaignCharacter.active === true in this scene.
    if (this.context.campaignId && this.context.campaignSceneId) {
      const sceneCampaignCharacters = await getSceneTurnOrderCharacters(
        db,
        this.context.campaignId,
        this.context.campaignSceneId,
      );

      this.sceneCharacterTurnOrder = new Map(
        sceneCampaignCharacters.map((cc) => [cc.characterId, cc.turnOrder ?? 0]),
      );

      const ids = new Set<string>();
      for (const cc of sceneCampaignCharacters) {
        const characterId = cc.characterId;
        ids.add(characterId);
        // Owner is already loaded above; skip here to avoid duplicate accessor creation.
        if (characterId === ownerId) continue;

        // Preload accessor by id so scene characters are available synchronously in scripts.
        // getCharacterAccessorById merges character attributes into shared caches.
        await this.getCharacterAccessorById(characterId);
      }

      this.sceneCharacterIds = ids;
    }
  }

  /**
   * Resolve a character accessor by characterId.
   * Reuses Owner or location characters when possible; otherwise lazily creates
   * a new CharacterAccessor wired to this ScriptRunner's caches and pendingUpdates.
   */
  async getCharacterAccessorById(
    characterId: string,
  ): Promise<CharacterAccessor | OwnerAccessor | null> {
    // Owner
    if (characterId === this.context.ownerId && this.ownerAccessor) {
      return this.ownerAccessor;
    }

    // Previously created via selection
    const fromCache = this.otherCharacterAccessors.get(characterId);
    if (fromCache) return fromCache;

    // Fallback: load character data on demand
    const { db } = this.context;
    const character = await db.characters.get(characterId);
    if (!character) return null;

    const characterName = character.name ?? 'Character';
    const inventoryId = character.inventoryId ?? '';

    let inventoryItems: InventoryItem[] = [];
    if (inventoryId) {
      inventoryItems = filterNotSoftDeleted(
        await db.inventoryItems.where('inventoryId').equals(inventoryId).toArray(),
      );
    }

    const charAttrs = filterNotSoftDeleted(
      await db.characterAttributes.where({ characterId }).toArray(),
    );
    for (const charAttr of charAttrs) {
      this.characterAttributesCache.set(charAttr.id, charAttr);
    }

    const archetypeNames = new Set<string>();
    const archetypeVariantByName = new Map<string, string | undefined>();
    const charArchetypesRaw = filterNotSoftDeleted(
      await db.characterArchetypes.where('characterId').equals(characterId).toArray(),
    );
    const charArchetypes = charArchetypesRaw.sort((a, b) => a.loadOrder - b.loadOrder);
    for (const ca of charArchetypes) {
      const archetype = await db.archetypes.get(ca.archetypeId);
      if (archetype?.name) {
        archetypeNames.add(archetype.name);
        archetypeVariantByName.set(archetype.name, ca.variant);
      }
    }

    const turnOrder = this.sceneCharacterTurnOrder?.get(characterId) ?? 0;
    const accessor = new CharacterAccessor(
      characterId,
      characterName,
      inventoryId,
      db,
      this.pendingUpdates,
      this.characterAttributesCache,
      this.attributesCache,
      this.actionsCache,
      this.itemsCache,
      inventoryItems,
      archetypeNames,
      archetypeVariantByName,
      null,
      this.context.executeActionEvent,
      this.customPropertiesCache,
      character.customProperties ?? {},
      turnOrder,
      this.context.campaignId,
      this.context.campaignSceneId,
      this.registerComponentUpdate,
      this.context.roll,
      this.context.rollSplit,
      this.context.onRollComplete,
      this.refLabelToComponentId,
    );

    this.otherCharacterAccessors.set(characterId, accessor);
    return accessor;
  }

  /**
   * Collect component updates (animations + style overrides) for script result and flush.
   * Must be called before flushCache() since flush clears pendingUpdates.
   */
  getComponentUpdates(): {
    animations: Array<{ characterId: string; referenceLabel: string; animation: string }>;
    styleOverrides: Record<string, Partial<ComponentStyle>>;
  } {
    const raw = this.pendingUpdates.get('componentUpdates') as
      | {
          animations: Array<{ characterId: string; referenceLabel: string; animation: string }>;
          styleOverrides: Record<string, Partial<ComponentStyle>>;
        }
      | undefined;
    return raw ?? { animations: [], styleOverrides: {} };
  }

  /**
   * Collect attribute IDs (ruleset attribute ids) that have pending value updates.
   * Must be called before flushCache() since flush clears pendingUpdates.
   */
  getModifiedAttributeIds(): string[] {
    const ids = new Set<string>();
    for (const key of this.pendingUpdates.keys()) {
      const match =
        key.startsWith('characterAttribute:') ||
        key.startsWith('characterAttributeMax:') ||
        key.startsWith('characterAttributeMin:') ||
        key.startsWith('characterAttributeOptions:');
      if (match) {
        const characterAttributeId = key.split(':')[1];
        const charAttr = this.characterAttributesCache.get(characterAttributeId);
        if (charAttr?.attributeId) {
          ids.add(charAttr.attributeId);
        }
      }
    }
    return Array.from(ids);
  }

  /**
   * Write all pending changes back to the database.
   */
  async flushCache(): Promise<{ navigateTargets: { characterId: string; pageId: string }[] }> {
    const { db, rulesetId } = this.context;
    const now = new Date().toISOString();

    const ensureCharacterPageFromLabel = async (
      characterId: string,
      labelOrId: string,
    ): Promise<CharacterPage | null> => {
      // Resolve character + ruleset for safety (character.rulesetId is the source of truth).
      const character = await db.characters.get(characterId);
      if (!character) return null;
      const characterRulesetId = character.rulesetId ?? rulesetId;

      // Try to resolve the ruleset page template by id first; fall back to label.
      let template = (await db.pages.get(labelOrId)) as Page | undefined;
      if (!template || template.rulesetId !== characterRulesetId) {
        template = (await db.pages
          .where('rulesetId')
          .equals(characterRulesetId)
          .filter((p) => (p as Page).label === labelOrId)
          .first()) as Page | undefined;
      }
      if (!template) return null;

      // Reuse existing CharacterPage if one already exists for this character + template page.
      const existing = (await db.characterPages
        .where('[characterId+pageId]')
        .equals([characterId, template.id])
        .first()) as CharacterPage | undefined;
      if (existing) return existing;

      // Create a new CharacterPage from the template.
      const { id: _id, createdAt: _c, updatedAt: _u, ...pageRest } = template;
      const characterPageId = crypto.randomUUID();
      const newRow: CharacterPage = {
        ...(pageRest as Omit<CharacterPage, 'id' | 'createdAt' | 'updatedAt' | 'characterId'>),
        id: characterPageId,
        characterId,
        pageId: template.id,
        createdAt: now,
        updatedAt: now,
      };

      await db.characterPages.add(newRow);

      // Create CharacterWindows from RulesetWindows bound to this page template.
      const rulesetWindows = await db.rulesetWindows.where('pageId').equals(template.id).toArray();
      for (const rw of rulesetWindows) {
        await db.characterWindows.add({
          id: crypto.randomUUID(),
          characterId,
          characterPageId,
          windowId: rw.windowId,
          title: rw.title,
          x: rw.x,
          y: rw.y,
          isCollapsed: rw.isCollapsed,
          createdAt: now,
          updatedAt: now,
        });
      }

      return newRow;
    };

    const navigateTargets: { characterId: string; pageId: string }[] = [];

    // Process all pending updates
    for (const [key, value] of this.pendingUpdates.entries()) {
      const colonIndex = key.indexOf(':');
      const type = colonIndex === -1 ? key : key.slice(0, colonIndex);
      const id = colonIndex === -1 ? '' : key.slice(colonIndex + 1);

      if (type === 'componentUpdates') {
        const { styleOverrides } = value as {
          animations: unknown[];
          styleOverrides: Record<string, Partial<ComponentStyle>>;
        };
        for (const [comboKey, patch] of Object.entries(styleOverrides ?? {})) {
          const firstColon = comboKey.indexOf(':');
          if (firstColon === -1) continue;
          const characterId = comboKey.slice(0, firstColon);
          const referenceLabel = comboKey.slice(firstColon + 1);
          const character = await db.characters.get(characterId);
          if (!character) continue;
          const existing =
            (character as { componentStyleOverrides?: Record<string, Partial<ComponentStyle>> })
              .componentStyleOverrides ?? {};
          const refOverrides = { ...(existing[referenceLabel] ?? {}), ...patch };
          const next = { ...existing, [referenceLabel]: refOverrides };
          await db.characters.update(characterId, {
            componentStyleOverrides: next,
            updatedAt: now,
          });
        }
        continue;
      }

      if (type === 'characterAttribute') {
        await db.characterAttributes.update(id, { value });
      } else if (type === 'characterUpdate') {
        const patch = value as {
          customProperties?: Record<string, string | number | boolean>;
          image?: string | null;
        };

        const update: Record<string, unknown> = {
          updatedAt: now,
        };

        if (patch.customProperties != null) {
          // Resolve image-tagged custom properties (image::<assetName>) to the asset's data.
          const resolvedCustomProps: Record<string, string | number | boolean> = {};

          for (const [propKey, rawVal] of Object.entries(patch.customProperties)) {
            if (typeof rawVal === 'string' && rawVal.includes('image::')) {
              const marker = 'image::';
              const idx = rawVal.indexOf(marker);
              const assetName = rawVal.slice(idx + marker.length).trim();

              if (assetName) {
                const asset = await db.assets
                  .where('[rulesetId+filename]')
                  .equals([rulesetId, assetName])
                  .first();

                if (asset && typeof (asset as { data?: string }).data === 'string') {
                  resolvedCustomProps[propKey] = (asset as { data: string }).data;
                  continue;
                }
              }
            }

            // Fallback: keep original value when not an image tag or asset not found.
            resolvedCustomProps[propKey] = rawVal;
          }

          update.customProperties = resolvedCustomProps;
        }

        if (patch.image === null) {
          update.assetId = null;
          update.image = null;
        } else if (patch.image !== undefined) {
          const raw = typeof patch.image === 'string' ? patch.image.trim() : '';

          if (!raw) {
            update.assetId = null;
            update.image = null;
          } else if (
            raw.startsWith('http://') ||
            raw.startsWith('https://') ||
            raw.startsWith('data:')
          ) {
            update.assetId = null;
            update.image = raw;
          } else {
            let assetId: string | null = null;
            if (rulesetId) {
              const asset = await db.assets
                .where('[rulesetId+filename]')
                .equals([rulesetId, raw])
                .first();
              if (asset?.id) {
                assetId = asset.id;
              }
            }

            if (assetId) {
              update.assetId = assetId;
              // Let asset-injector middleware provide image from assetId when reading.
            } else {
              update.assetId = null;
              update.image = raw;
            }
          }
        }

        await db.characters.update(id, update);
      } else if (type === 'characterAttributeMax') {
        await db.characterAttributes.update(id, { max: value });
      } else if (type === 'characterAttributeMin') {
        await db.characterAttributes.update(id, { min: value });
      } else if (type === 'characterAttributeOptions') {
        await db.characterAttributes.update(id, { options: value });
      } else if (type === 'inventoryAdd') {
        const items = value as (InventoryItem & { _inventoryRefLabel?: string })[];
        for (const item of items) {
          let itemToAdd = item;
          if (item.type === 'item' && item.entityId) {
            const rulesetItem = await db.items.get(item.entityId);
            const customProperties = await buildItemCustomProperties(db, item.entityId);
            const actionIds = item.actionIds ?? rulesetItem?.actionIds ?? [];
            itemToAdd = { ...item, customProperties, actionIds };
          } else {
            itemToAdd = { ...item, customProperties: item.customProperties ?? {} };
          }
          const resolved = await resolveInventoryRefLabel(db, itemToAdd);
          if (resolved) await db.inventoryItems.add(resolved);
        }
      } else if (type === 'inventoryUpdate') {
        const now = new Date().toISOString();
        await db.inventoryItems.update(id, { ...value, updatedAt: now });
      } else if (type === 'inventoryDelete') {
        const deletePayload = value as true | { referenceLabel: string };
        if (
          typeof deletePayload === 'object' &&
          deletePayload !== null &&
          'referenceLabel' in deletePayload
        ) {
          const inventoryItem = await db.inventoryItems.get(id);
          if (inventoryItem) {
            const componentIdForRef = this.refLabelToComponentId.get(deletePayload.referenceLabel);
            const itemComponentId = (inventoryItem as { componentId?: string }).componentId ?? '';
            if (
              componentIdForRef != null &&
              itemComponentId !== '' &&
              itemComponentId === componentIdForRef
            ) {
              await db.inventoryItems.update(id, {
                deleted: true,
                updatedAt: new Date().toISOString(),
              });
            }
          }
        } else {
          await db.inventoryItems.update(id, {
            deleted: true,
            updatedAt: new Date().toISOString(),
          });
        }
      } else if (type === 'archetypeAdd') {
        const entries = value as { characterId: string; archetypeName: string }[];
        for (const { characterId, archetypeName } of entries) {
          const archetype = await db.archetypes.where({ rulesetId, name: archetypeName }).first();
          if (!archetype) continue;
          const existing = await db.characterArchetypes
            .where('[characterId+archetypeId]')
            .equals([characterId, archetype.id])
            .first();
          const archetypeNow = new Date().toISOString();
          const activeRows = filterNotSoftDeleted(
            await db.characterArchetypes.where('characterId').equals(characterId).sortBy('loadOrder'),
          );
          const maxOrder =
            activeRows.length > 0 ? (activeRows[activeRows.length - 1]!.loadOrder ?? 0) : -1;
          if (existing && existing.deleted !== true) continue;

          let runOnAdd = false;
          if (existing && existing.deleted === true) {
            await db.characterArchetypes.update(existing.id, {
              deleted: false,
              loadOrder: maxOrder + 1,
              updatedAt: archetypeNow,
            });
          } else {
            await db.characterArchetypes.add({
              id: crypto.randomUUID(),
              characterId,
              archetypeId: archetype.id,
              loadOrder: maxOrder + 1,
              createdAt: archetypeNow,
              updatedAt: archetypeNow,
              deleted: false,
            });
            runOnAdd = true;
          }
          if (runOnAdd) {
            const result = await executeArchetypeEvent(
              db,
              archetype.id,
              characterId,
              'on_add',
              this.context.roll,
              this.context.campaignId,
              this.context.rollSplit,
              this.context.campaignSceneId,
            );
            if (result.error) {
              console.warn('Archetype on_add script failed:', result.error);
            }
          }
        }
      } else if (type === 'archetypeRemove') {
        const entries = value as { characterId: string; archetypeName: string }[];
        for (const { characterId, archetypeName } of entries) {
          const archetype = await db.archetypes.where({ rulesetId, name: archetypeName }).first();
          if (!archetype) continue;
          const ca = await db.characterArchetypes
            .where('[characterId+archetypeId]')
            .equals([characterId, archetype.id])
            .first();
          if (!ca) continue;
          const result = await executeArchetypeEvent(
            db,
            archetype.id,
            characterId,
            'on_remove',
            this.context.roll,
            this.context.campaignId,
            this.context.rollSplit,
            this.context.campaignSceneId,
          );
          if (result.error) {
            console.warn('Archetype on_remove script failed:', result.error);
          }
          await db.characterArchetypes.update(ca.id, {
            deleted: true,
            updatedAt: new Date().toISOString(),
          });
        }
      } else if (type === 'characterPageAdd') {
        const entries = value as { characterId: string; label: string }[];
        for (const { characterId, label } of entries) {
          await ensureCharacterPageFromLabel(characterId, label);
        }
      } else if (type === 'characterPageNavigate') {
        const entries = value as { characterId: string; label: string }[];
        for (const { characterId, label } of entries) {
          const characterPage = await ensureCharacterPageFromLabel(characterId, label);
          if (!characterPage) continue;
          await db.characters.update(characterId, {
            lastViewedPageId: characterPage.id,
            updatedAt: now,
          });
          navigateTargets.push({ characterId, pageId: characterPage.id });
        }
      } else if (type === 'characterPageRemove') {
        const entries = value as { characterId: string; label: string }[];
        for (const { characterId, label } of entries) {
          const character = await db.characters.get(characterId);
          if (!character) continue;

          // Prefer matching by template Page for this ruleset, resolving by id first then label.
          const characterRulesetId = character.rulesetId ?? rulesetId;
          let template = (await db.pages.get(label)) as Page | undefined;
          if (!template || template.rulesetId !== characterRulesetId) {
            template = (await db.pages
              .where('rulesetId')
              .equals(characterRulesetId)
              .filter((p) => (p as Page).label === label)
              .first()) as Page | undefined;
          }

          let characterPage: CharacterPage | undefined;
          if (template) {
            characterPage = (await db.characterPages
              .where('[characterId+pageId]')
              .equals([characterId, template.id])
              .first()) as CharacterPage | undefined;
          }

          // Fallback: match by label on CharacterPage when template is missing.
          if (!characterPage) {
            characterPage = (await db.characterPages
              .where('characterId')
              .equals(characterId)
              .filter((cp) => (cp as CharacterPage).label === label)
              .first()) as CharacterPage | undefined;
          }

          if (!characterPage) continue;

          // Remove windows and page.
          await db.characterWindows.where('characterPageId').equals(characterPage.id).delete();
          await db.characterPages.delete(characterPage.id);

          // If this was the last viewed page, move the character to a fallback page.
          if (character.lastViewedPageId === characterPage.id) {
            const remaining = await db.characterPages
              .where('characterId')
              .equals(characterId)
              .sortBy('createdAt');
            const nextId = remaining[0]?.id ?? null;
            await db.characters.update(characterId, {
              lastViewedPageId: nextId,
              updatedAt: now,
            });
          }
        }
      } else if (type === 'characterWindowOpen') {
        const entries = value as {
          characterId: string;
          label: string;
          collapse?: boolean;
          x?: number;
          y?: number;
        }[];
        for (const {
          characterId,
          label,
          collapse: collapseIfOpen,
          x: openX,
          y: openY,
        } of entries) {
          const character = await db.characters.get(characterId);
          if (!character) continue;

          // Determine the current page: prefer lastViewedPageId, fall back to first page.
          let currentPageId =
            (character as { lastViewedPageId?: string | null }).lastViewedPageId ?? null;
          if (!currentPageId) {
            const pages = (await db.characterPages
              .where('characterId')
              .equals(characterId)
              .sortBy('createdAt')) as CharacterPage[];
            currentPageId = pages[0]?.id ?? null;
          }
          if (!currentPageId) continue;

          const characterPage = (await db.characterPages.get(currentPageId)) as
            | CharacterPage
            | undefined;
          if (!characterPage) continue;

          const characterRulesetId = (character as { rulesetId?: string }).rulesetId ?? rulesetId;

          // Try to resolve the window definition by id first; fall back to title.
          let windowDef = (await db.windows.get(label)) as Window | undefined;
          if (!windowDef || windowDef.rulesetId !== characterRulesetId) {
            windowDef = (await db.windows
              .where('rulesetId')
              .equals(characterRulesetId)
              .filter((w) => (w as Window).title === label)
              .first()) as Window | undefined;
          }
          if (!windowDef) continue;

          // Reuse existing CharacterWindow with this title on the current page when present.
          const existing = (await db.characterWindows
            .where('characterId')
            .equals(characterId)
            .filter(
              (cw) =>
                (cw as CharacterWindow).characterPageId === characterPage.id &&
                (cw as CharacterWindow).title === windowDef!.title,
            )
            .first()) as CharacterWindow | undefined;
          if (existing) {
            if (existing.isCollapsed) {
              await db.characterWindows.update(existing.id, {
                isCollapsed: false,
                updatedAt: now,
                x: openX ?? existing.x,
                y: openY ?? existing.y,
              });
            } else {
              if (collapseIfOpen) {
                await db.characterWindows.update(existing.id, {
                  isCollapsed: true,
                  updatedAt: now,
                });
              }
            }
            continue;
          }

          // Default position; caller-provided values take precedence, then RulesetWindow layout, then fallback.
          let x = openX ?? 100;
          let y = openY ?? 100;
          let isCollapsed = false;

          if (characterPage.pageId) {
            const rulesetWindow = (await db.rulesetWindows
              .where('pageId')
              .equals(characterPage.pageId)
              .filter((rw) => (rw as RulesetWindow).windowId === windowDef.id)
              .first()) as RulesetWindow | undefined;
            if (rulesetWindow) {
              x = rulesetWindow.x;
              y = rulesetWindow.y;
              isCollapsed = !!rulesetWindow.isCollapsed;
            }
          }

          await db.characterWindows.add({
            id: crypto.randomUUID(),
            characterId,
            characterPageId: currentPageId,
            windowId: windowDef.id,
            title: windowDef.title,
            x,
            y,
            isCollapsed,
            createdAt: now,
            updatedAt: now,
          } as CharacterWindow);
        }
      } else if (type === 'characterWindowClose') {
        const entries = value as { characterId: string; label: string }[];
        for (const { characterId, label } of entries) {
          const character = await db.characters.get(characterId);
          if (!character) continue;

          // Determine the current page: prefer lastViewedPageId, fall back to first page.
          let currentPageId =
            (character as { lastViewedPageId?: string | null }).lastViewedPageId ?? null;
          if (!currentPageId) {
            const pages = (await db.characterPages
              .where('characterId')
              .equals(characterId)
              .sortBy('createdAt')) as CharacterPage[];
            currentPageId = pages[0]?.id ?? null;
          }
          if (!currentPageId) continue;

          const characterPage = (await db.characterPages.get(currentPageId)) as
            | CharacterPage
            | undefined;
          if (!characterPage) continue;

          const characterRulesetId = (character as { rulesetId?: string }).rulesetId ?? rulesetId;

          // Try to resolve a window definition for id-based lookups.
          let windowDef = (await db.windows.get(label)) as Window | undefined;
          if (!windowDef || windowDef.rulesetId !== characterRulesetId) {
            windowDef = undefined;
          }

          // Prefer matching by the resolved window title when available; fall back to the raw label.
          const targetTitle = windowDef?.title ?? label;

          const existing = (await db.characterWindows
            .where('characterId')
            .equals(characterId)
            .filter(
              (cw) =>
                (cw as CharacterWindow).characterPageId === characterPage.id &&
                (cw as CharacterWindow).title === targetTitle,
            )
            .first()) as CharacterWindow | undefined;

          if (!existing) continue;

          await db.characterWindows.delete(existing.id);
        }
      }
    }

    // Clear pending updates
    this.pendingUpdates.clear();

    return { navigateTargets };
  }

  /**
   * Run turn callbacks (cycle + onTurnAdvance) in order. Sets scene's insideCallbackRun so
   * advanceTurnOrder() from within a callback only sets deferred. Flushes after each callback.
   * Merges each callback's announce/log messages into this evaluator so they are included in the script result.
   */
  private async runTurnCallbacks(
    callbacks: SceneTurnCallback[],
    sceneAccessor: CampaignSceneAccessor,
  ): Promise<void> {
    sceneAccessor.setInsideCallbackRun(true);
    for (const cb of callbacks) {
      const result = await executeTurnCallback(
        this.context.db,
        cb,
        sceneAccessor,
        (id: string) => this.getCharacterAccessorById(id),
        this.context.rulesetId,
        this.context.roll,
        this.context.rollSplit,
        this.context.prompt,
        this.context.promptMultiple,
        this.context.promptInput,
        this.context.selectCharacter,
        this.context.selectCharacters,
        this.context.campaignId ?? null,
      );
      this.evaluator.addAnnounceMessages(result.announceMessages);
      this.evaluator.addLogMessages(result.logMessages);
      await this.flushCache();
    }
    sceneAccessor.setInsideCallbackRun(false);
  }

  /**
   * Run the shared advance-turn flow (same as Scene.advanceTurnOrder() from script).
   * Loads cache and sets up accessors, then advances and runs any cycle/onTurnAdvance callbacks.
   * No-op when not in campaign scene context.
   */
  async runAdvanceTurnOrder(): Promise<void> {
    if (!this.context.campaignId || !this.context.campaignSceneId) return;
    await this.loadCache();
    this.setupAccessors();
    await this.sceneAccessor?.advanceTurnOrder();
  }

  /**
   * Set up accessor objects in the interpreter environment.
   */
  private setupAccessors(): void {
    const { ownerId, rulesetId, db } = this.context;

    // Script id for turn callback registration (Scene.inTurns / Scene.onTurnAdvance).
    this.evaluator.globalEnv.define('__scriptId', this.context.scriptId ?? '');

    // Inject generic params helper (when provided) as `params` in the script environment.
    if (this.context.params) {
      this.evaluator.globalEnv.define('params', this.context.params);
    }

    // Create Ruleset accessor (available in both owner and ownerless contexts)
    const ruleset = new RulesetAccessor(
      rulesetId,
      this.attributesCache,
      this.chartsCache,
      this.itemsCache,
    );

    const dbTyped = db as DB;

    // When running in a campaign scene, build a shared Scene accessor that can be injected
    // into both ownerless and owner contexts.
    const deferredAdvanceRef = { current: false };
    if (this.context.campaignId && this.context.campaignSceneId) {
      this.sceneAccessor = new CampaignSceneAccessor(
        dbTyped,
        this.context.campaignId,
        this.context.campaignSceneId,
        rulesetId,
        (id: string) => this.getCharacterAccessorById(id),
        this.sceneCharacterIds ? Array.from(this.sceneCharacterIds) : undefined,
        (id: string) => {
          if (!this.sceneCharacterIds) {
            this.sceneCharacterIds = new Set();
          }
          this.sceneCharacterIds.add(id);
        },
        this.context.roll,
        deferredAdvanceRef,
        (callbacks: SceneTurnCallback[]) => this.runTurnCallbacks(callbacks, this.sceneAccessor!),
      );
    } else {
      this.sceneAccessor = null;
    }
    const sceneAccessor = this.sceneAccessor;

    // When there is no owner (e.g. some campaign/system scripts), only Ruleset is injected,
    // plus Scene when running in a campaign scene context.
    if (!ownerId) {
      this.evaluator.globalEnv.define('Ruleset', ruleset);
      this.evaluator.globalEnv.define('Scene', sceneAccessor ?? null);
      return;
    }

    const ownerTurnOrder = this.sceneCharacterTurnOrder?.get(ownerId) ?? 0;
    const owner = new OwnerAccessor(
      ownerId,
      this.ownerCharacterName,
      this.ownerInventoryId,
      db,
      this.pendingUpdates,
      this.characterAttributesCache,
      this.attributesCache,
      this.actionsCache,
      this.itemsCache,
      this.ownerInventoryItems,
      this.ownerArchetypeNames,
      this.ownerArchetypeVariantByName,
      null,
      this.context.executeActionEvent,
      this.customPropertiesCache,
      this.ownerCharacterCustomProperties,
      ownerTurnOrder,
      this.context.campaignId,
      this.context.campaignSceneId,
      this.registerComponentUpdate,
      this.context.roll,
      this.context.rollSplit,
      this.context.onRollComplete,
      this.refLabelToComponentId,
    );

    this.ownerAccessor = owner;

    // Caller: entity that fired the action. When action fired from item context menu, Caller = that item instance; else Caller = Owner.
    const caller =
      this.context.callerInventoryItemInstanceId != null
        ? owner.getItemByInstanceId(this.context.callerInventoryItemInstanceId)
        : owner;
    this.evaluator.globalEnv.define('Caller', caller ?? owner);

    // Inject into interpreter environment
    this.evaluator.globalEnv.define('Owner', owner);
    this.evaluator.globalEnv.define('Ruleset', ruleset);
    this.evaluator.globalEnv.define('Scene', sceneAccessor ?? null);

    // 'Self' refers to the entity this script is attached to (attribute, action, item, or campaignEvent).
    if (this.context.entityType === 'attribute' && this.context.entityId) {
      const attribute = this.attributesCache.get(this.context.entityId);
      if (attribute) {
        const attrRef = owner.Attribute(attribute.title);
        if (attrRef !== null) {
          this.evaluator.globalEnv.define('Self', attrRef);
        }
      }
    } else if (this.context.entityType === 'action' && this.context.entityId) {
      const action = this.actionsCache.get(this.context.entityId);
      if (action) {
        this.evaluator.globalEnv.define('Self', owner.Action(action.title));
      }
    } else if (this.context.entityType === 'item' && this.context.entityId) {
      const item = this.itemsCache.get(this.context.entityId);
      if (item) {
        const itemRef = this.context.inventoryItemInstanceId
          ? owner.getItemByInstanceId(this.context.inventoryItemInstanceId)
          : owner.Item(item.title);
        this.evaluator.globalEnv.define('Self', itemRef ?? null);
      }
    }
    // entityType 'location' | 'tile' | 'archetype' | 'global' | 'characterLoader' | 'gameManager' (or unknown): no Self
  }

  /**
   * Load and execute all enabled global scripts for the ruleset so their
   * functions and variables are available in the environment for the main script.
   * Excludes the script with context.scriptId when it is a global (avoids running it twice).
   */
  private async loadAndRunGlobalScripts(): Promise<void> {
    const { db, rulesetId, scriptId } = this.context;

    const globalScripts = (await db.scripts
      .where({ rulesetId })
      // Dexie can't use booleans in a query key
      .filter((script) => script.enabled && script.isGlobal)
      .toArray()) as Script[];

    // Exclude the current script if it's a global (we'll run it as the main script)
    const toRun = scriptId ? globalScripts.filter((s) => s.id !== scriptId) : globalScripts;

    // Deterministic order so global scripts can depend on earlier ones by name
    toRun.sort((a, b) => a.name.localeCompare(b.name, 'en'));

    for (const script of toRun) {
      const tokens = new Lexer(script.sourceCode).tokenize();
      const ast = new Parser(tokens).parse();
      await this.evaluator.eval(ast);
    }
  }

  /**
   * Execute a script with full game entity integration.
   * Global scripts are run first so their functions and variables are in scope.
   * @param sourceCode - The QBScript source code to execute
   * @returns ScriptExecutionResult with the result value, messages, and any error
   */
  async run(sourceCode: string): Promise<ScriptExecutionResult> {
    try {
      // Set up component-update callback before loadCache so getCharacterAccessorById (e.g. during
      // scene preload or from Scene.characters()) and Owner always receive it. Required for
      // setComponentStyle/animateComponent in both owner and ownerless (e.g. game manager) scripts.
      this.registerComponentUpdate = (
        characterId: string,
        referenceLabel: string,
        type: 'animation' | 'style',
        data: Record<string, unknown>,
      ) => {
        const key = 'componentUpdates';
        const current = this.pendingUpdates.get(key) as
          | {
              animations: Array<{ characterId: string; referenceLabel: string; animation: string }>;
              styleOverrides: Record<string, Partial<ComponentStyle>>;
            }
          | undefined;
        const base = current ?? { animations: [], styleOverrides: {} };
        if (type === 'animation') {
          const animation = data.animation as string;
          if (animation != null) {
            base.animations.push({ characterId, referenceLabel, animation });
          }
        } else {
          const styleKey = `${characterId}:${referenceLabel}`;
          base.styleOverrides[styleKey] = {
            ...(base.styleOverrides[styleKey] ?? {}),
            ...(data as Partial<ComponentStyle>),
          };
        }
        this.pendingUpdates.set(key, base);
      };

      // Pre-initialize so the callback always mutates the same object
      this.pendingUpdates.set('componentUpdates', { animations: [], styleOverrides: {} });

      // Load all data first
      await this.loadCache();

      // Set up accessor objects
      this.setupAccessors();

      // Run global scripts so their definitions are in the environment
      await this.loadAndRunGlobalScripts();

      // Re-inject Owner, Ruleset, Scene, Caller, Self so the main script always sees the correct
      // accessors (globals can overwrite them; e.g. Owner.animateComponent must use our Owner).
      this.setupAccessors();

      // Parse and execute the main script
      const tokens = new Lexer(sourceCode).tokenize();
      const ast = new Parser(tokens).parse();
      const value = await this.evaluator.eval(ast);

      // Collect modified attribute IDs and component updates before flush (flush clears pendingUpdates)
      const modifiedAttributeIds = this.getModifiedAttributeIds();
      const componentUpdates = this.getComponentUpdates();

      // Flush changes to database and capture any navigation targets
      const { navigateTargets } = await this.flushCache();

      return {
        value,
        announceMessages: this.evaluator.getAnnounceMessages(),
        logMessages: this.evaluator.getLogMessages(),
        modifiedAttributeIds,
        navigateTargets,
        componentAnimations: componentUpdates.animations ?? [],
      };
    } catch (error) {
      return {
        value: null,
        announceMessages: this.evaluator.getAnnounceMessages(),
        logMessages: this.evaluator.getLogMessages(),
        error: error instanceof Error ? error : new Error(String(error)),
        componentAnimations: [],
      };
    }
  }
}
