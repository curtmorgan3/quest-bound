import type { BaseDetails } from './helper-types';

export type Action = BaseDetails & {
  rulesetId: string;
  title: string;
  description: string;
  category?: string;
  assetId?: string | null;
  image?: string | null;
  inventoryWidth?: number;
  inventoryHeight?: number;
  scriptId?: string | null; // NEW: Associated script
  /** Module origin: ruleset id, source entity id, and module name. */
  moduleId?: string;
  moduleEntityId?: string;
  moduleName?: string;
};

export type Asset = BaseDetails & {
  data: string; // Base64 or URL
  type: string; // MIME type or 'url' for URL-backed assets
  filename: string;
  rulesetId: string | null; // Nullable for user assets
  category?: string;
  /** @deprecated World feature removed; may exist on old data. */
  worldId?: string | null;
  /** @deprecated Removed in v44; only filename is used. Kept for backwards-compat read of old export/metadata. */
  directory?: string;
  /** Module origin: ruleset id, source entity id, and module name. */
  moduleId?: string;
  moduleEntityId?: string;
  moduleName?: string;
};

export type AttributeType = 'string' | 'number' | 'boolean' | 'list';

export type Attribute = BaseDetails & {
  rulesetId: string;
  title: string;
  description: string;
  category?: string;
  type: AttributeType;
  options?: string[];
  defaultValue: string | number | boolean;
  // When options are derived from a chart column
  optionsChartRef?: number;
  optionsChartColumnHeader?: string;
  allowMultiSelect?: boolean;
  min?: number;
  max?: number;
  assetId?: string | null;
  image?: string | null;
  inventoryWidth?: number;
  inventoryHeight?: number;
  scriptId?: string | null;
  /** Module origin: ruleset id, source entity id, and module name. */
  moduleId?: string;
  moduleEntityId?: string;
  moduleName?: string;
};

export type Chart = BaseDetails & {
  rulesetId: string;
  title: string;
  description: string;
  category?: string;
  data: string;
  assetId?: string | null;
  image?: string | null;
  /** Module origin: ruleset id, source entity id, and module name. */
  moduleId?: string;
  moduleEntityId?: string;
  moduleName?: string;
};

export type CustomPropertyType = 'string' | 'number' | 'boolean' | 'color' | 'image';

export type CustomProperty = BaseDetails & {
  rulesetId: string;
  label: string;
  type: CustomPropertyType;
  category?: string;
  /** Optional in UI; when absent, use '', 0, or false by type. */
  defaultValue?: string | number | boolean;
};

export type ArchetypeCustomProperty = BaseDetails & {
  archetypeId: string;
  customPropertyId: string;
  /** Override for CustomProperty.defaultValue when creating characters. */
  defaultValue?: string | number | boolean;
};

export type ItemCustomProperty = BaseDetails & {
  itemId: string;
  customPropertyId: string;
  /** Override for CustomProperty.defaultValue when adding item to inventory. */
  defaultValue?: string | number | boolean;
};

export type Character = BaseDetails & {
  userId: string;
  rulesetId: string;
  inventoryId: string;
  name: string;
  assetId: string | null;
  /** Injected from asset.data when assetId is set; do not persist on entity. */
  image?: string | null;
  isTestCharacter: boolean;
  isNpc?: boolean;
  componentData: Record<string, any>;
  pinnedSidebarDocuments: string[];
  pinnedSidebarCharts: string[];
  pinnedInventoryItemIds?: string[];
  /** Last viewed character page id (sheet viewer). */
  lastViewedPageId?: string | null;
  /** Whether the sheet viewer is locked (windows not draggable). */
  sheetLocked?: boolean;
  /** Module origin: ruleset id, source entity id, and module name. */
  moduleId?: string;
  moduleEntityId?: string;
  moduleName?: string;
  /** Keyed by customPropertyId. Instantiated from first archetype's ArchetypeCustomProperties at creation. */
  customProperties?: Record<string, string | number | boolean>;
  /** Style overrides for sheet components by referenceLabel (from setComponentStyle). Values are partial component style objects. */
  componentStyleOverrides?: Record<string, Record<string, unknown>>;
  /** ISO timestamp of the last time this character was synced with its ruleset attributes. */
  lastSyncedAt?: string | null;
};

export type CharacterAttribute = Attribute & {
  characterId: string;
  attributeId: string;
  value: string | number | boolean;
  scriptDisabled?: boolean; // NEW: Player has overridden the computed value
};

export type Archetype = BaseDetails & {
  rulesetId: string;
  name: string;
  description: string;
  assetId?: string | null;
  category?: string;
  image?: string | null;
  scriptId?: string | null;
  testCharacterId: string;
  isDefault: boolean;
  loadOrder: number;
  /** When set, variant options are derived from this chart column (for CharacterArchetype.variant). */
  variantsChartRef?: number;
  variantsChartColumnHeader?: string;
  /** Module origin: ruleset id, source entity id, and module name. */
  moduleId?: string;
  moduleEntityId?: string;
  moduleName?: string;
};

/** Injected at read time when variantsChartRef + variantsChartColumnHeader are set. */
export type ArchetypeWithVariantOptions = Archetype & { variantOptions?: string[] };

export type CharacterArchetype = BaseDetails & {
  characterId: string;
  archetypeId: string;
  variant?: string;
  loadOrder: number;
};

export type Page = BaseDetails & {
  rulesetId: string;
  label: string;
  category?: string;
  assetId?: string;
  /** @deprecated Removed in v44; only assetId is persisted. image is injected from asset. */
  assetUrl?: string;
  backgroundOpacity?: number;
  backgroundColor?: string;
  image?: string | null;
  /** When true, this page template is hidden from the player-facing sheet viewer. */
  hideFromPlayerView?: boolean;
  /** Module origin: ruleset id, source entity id, and module name. */
  moduleId?: string;
  moduleEntityId?: string;
  moduleName?: string;
};

/** Character sheet page: full page content plus link to ruleset template. */
export type CharacterPage = Page & {
  characterId: string;
  /** Ruleset template page id this was created from (for "from template" pages). */
  pageId: string;
};

export type CharacterWindow = BaseDetails & {
  title: string;
  characterId: string;
  characterPageId?: string | null;
  windowId: string;
  x: number;
  y: number;
  isCollapsed: boolean;
  /** Module origin: ruleset id, source entity id, and module name. */
  moduleId?: string;
  moduleEntityId?: string;
  moduleName?: string;
};

/** Template window layout for a ruleset page (used as sheet template). */
export type RulesetWindow = BaseDetails & {
  title: string;
  rulesetId: string;
  /** Optional link to a ruleset page; null for windows not bound to a page. */
  pageId?: string | null;
  windowId: string;
  x: number;
  y: number;
  isCollapsed: boolean;
  /** Module origin: ruleset id, source entity id, and module name. */
  moduleId?: string;
  moduleEntityId?: string;
  moduleName?: string;
};

export type Component = BaseDetails & {
  rulesetId: string;
  windowId: string;
  type: string;
  x: number;
  y: number;
  z: number;
  height: number;
  width: number;
  rotation: number;
  data: string;
  style: string;
  locked?: boolean;
  selected?: boolean;
  groupId?: string | null;
  attributeId?: string | null;
  actionId?: string;
  childWindowId?: string;
  /** Optional script attached to this window component (e.g. Game Manager script). */
  scriptId?: string | null;
};

export type DiceRoll = BaseDetails & {
  rulesetId: string;
  userId: string;
  value: string;
  label: string;
  /** Module origin: ruleset id, source entity id, and module name. */
  moduleId?: string;
  moduleEntityId?: string;
  moduleName?: string;
};

export type Document = BaseDetails & {
  /** When set, document belongs to a ruleset (ruleset-scoped). Omitted when document belongs to a campaign. */
  rulesetId?: string;
  /** @deprecated World feature removed; may exist on old data. */
  worldId?: string | null;
  /** @deprecated World/location feature removed; may exist on old data. */
  locationId?: string | null;
  /** When set, document belongs to a campaign. */
  campaignId?: string | null;
  /** Optional scene within the campaign; when set, document is associated with this CampaignScene. */
  campaignSceneId?: string | null;
  title: string;
  description: string;
  category?: string;
  assetId?: string | null;
  image?: string | null;
  pdfAssetId?: string | null;
  pdfData?: string | null;
  /** Raw markdown content when document has no PDF (either PDF or markdown, not both). */
  markdownData?: string | null;
  /** Module origin: ruleset id, source entity id, and module name. */
  moduleId?: string;
  moduleEntityId?: string;
  moduleName?: string;
};

export type Font = BaseDetails & {
  rulesetId: string;
  label: string;
  data: string;
  /** Module origin: ruleset id, source entity id, and module name. */
  moduleId?: string;
  moduleEntityId?: string;
  moduleName?: string;
};

export type Item = BaseDetails & {
  rulesetId: string;
  title: string;
  description: string;
  category?: string;
  weight: number;
  defaultQuantity: number;
  stackSize: number;
  isContainer: boolean;
  isStorable: boolean;
  isEquippable: boolean;
  isConsumable: boolean;
  inventoryWidth: number;
  inventoryHeight: number;
  assetId?: string | null;
  image?: string | null;
  scriptId?: string | null;
  /** Action IDs from the same ruleset. When an item is added to inventory, these are copied to the inventory item. */
  actionIds?: string[];
  /** Module origin: ruleset id, source entity id, and module name. */
  moduleId?: string;
  moduleEntityId?: string;
  moduleName?: string;
};

export type Inventory = BaseDetails & {
  items: Item[];
  characterId?: string;
};

export type InventoryItem = BaseDetails & {
  id: string;
  type: 'item' | 'action' | 'attribute';
  entityId: string; // ref to ruleset item, action, or attribute
  inventoryId: string;
  componentId: string;
  quantity: number;
  x: number;
  y: number;
  label?: string; // User provided custom name
  description?: string; // User provided description override for item instance
  value?: string | number | boolean;
  isEquipped?: boolean;
  /** Per-instance values keyed by customPropertyId. Instantiated from item's ItemCustomProperties when added to inventory. */
  customProperties?: Record<string, string | number | boolean>;
  /** Action IDs copied from the item when created. Enables per-instance override in the future. */
  actionIds?: string[];
};

/** Entry for a module added to this ruleset (id, name, image of the source module). */
export type RulesetModuleEntry = {
  id: string;
  name: string;
  image: string | null;
};

export type Ruleset = BaseDetails & {
  version: string;
  createdBy: string;
  title: string;
  description: string;
  details: Record<string, any>;
  assetId: string | null;
  /** Injected from asset.data when assetId is set; do not persist on entity. */
  image?: string | null;
  /** Asset ID for the Characters CTA card image on the ruleset landing page. */
  charactersCtaAssetId?: string | null;
  /** Asset ID for the Campaigns CTA card image on the ruleset landing page. */
  campaignsCtaAssetId?: string | null;
  /** Title for the Characters CTA card on the ruleset landing page. */
  characterCtaTitle?: string | null;
  /** Description for the Characters CTA card on the ruleset landing page. */
  characterCtaDescription?: string | null;
  /** Title for the Campaigns CTA card on the ruleset landing page. */
  campaignsCtaTitle?: string | null;
  /** Description for the Campaigns CTA card on the ruleset landing page. */
  campaignCtaDescription?: string | null;
  /** Injected from asset.data when charactersCtaAssetId is set; do not persist on entity. */
  charactersCtaImage?: string | null;
  /** Injected from asset.data when campaignsCtaAssetId is set; do not persist on entity. */
  campaignsCtaImage?: string | null;
  palette: string[];
  /** When true, this ruleset can be added as a module to other rulesets. */
  isModule?: boolean;
  /** Modules that have been added to this ruleset (source id, name, image). */
  modules?: RulesetModuleEntry[];
};

export type User = BaseDetails & {
  username: string;
  email?: string | null;
  assetId?: string | null;
  image?: string | null;
  preferences: Record<string, any>;
  /** Links to cloud auth (e.g. Supabase auth.uid()). When set, rulesets are scoped by cloud identity. */
  cloudUserId?: string | null;
};

export type Window = BaseDetails & {
  rulesetId: string;
  title: string;
  category?: string;
  description?: string;
  /** When true, this window is hidden from the player-facing sheet viewer. */
  hideFromPlayerView?: boolean;
  /** Module origin: ruleset id, source entity id, and module name. */
  moduleId?: string;
  moduleEntityId?: string;
  moduleName?: string;
};

export type ScriptEntityType =
  | 'attribute'
  | 'action'
  | 'item'
  | 'archetype'
  | 'global'
  | 'characterLoader'
  | 'gameManager';

export type ScriptParamType = 'string' | 'number' | 'boolean';

export type ScriptParamValue = string | number | boolean | null;

export type ScriptParameterDefinition = {
  id: string;
  /** Human-friendly label for this parameter (e.g. \"Difficulty\", \"Target Name\"). */
  label: string;
  type: ScriptParamType;
  /** Optional default value used when the caller does not supply an explicit value. */
  defaultValue?: ScriptParamValue;
};

export type Script = BaseDetails & {
  rulesetId: string; // Which ruleset this script belongs to
  name: string; // Script name (e.g., "hit_points", "cast_fireball")
  sourceCode: string; // Full QBScript source code
  entityType: ScriptEntityType;
  entityId: string | null; // ID of associated entity (null for global and characterLoader scripts)
  isGlobal: boolean; // Whether this is a global utility script
  enabled: boolean; // Allow disabling scripts without deleting
  category?: string; // Optional category for grouping scripts
  hidden?: boolean; // If the script is visible in the script editor. Hidden scripts are used under the hood
  /** Optional campaign; when set, script is campaign-specific. */
  campaignId?: string;
  /** Optional parameter definitions used by the UI to collect values for params.get(). */
  parameters?: ScriptParameterDefinition[];
  /** Module origin: ruleset id, source entity id, and module name. */
  moduleId?: string;
  moduleEntityId?: string;
  moduleName?: string;
};

export type ScriptError = BaseDetails & {
  rulesetId: string;
  scriptId: string; // Which script caused the error
  characterId: string | null; // Which character was executing (null for non-character scripts)
  errorMessage: string; // Human-readable error message
  lineNumber: number | null; // Where the error occurred
  stackTrace: string | null; // Detailed stack trace
  context: string; // What triggered the script (e.g., "on_load", "attribute_change")
  timestamp: number; // When the error occurred
};

export type ScriptLog = BaseDetails & {
  rulesetId: string;
  /** When set, this log was produced in campaign context (campaign play, campaign character sheet). */
  campaignId: string | null;
  scriptId: string;
  characterId: string | null;
  argsJson: string; // JSON.stringify of the log arguments array (any[])
  timestamp: number;
  context?: string; // e.g. "load" | "attribute_change" | "action_click" | "item_event"
  /** When true, this entry was auto-generated by the system (e.g. "Script ran") rather than from script log() calls. */
  autoGenerated?: boolean;
};

export type DependencyGraphNode = BaseDetails & {
  rulesetId: string; // Which ruleset this node belongs to
  scriptId: string; // Script that this node represents
  entityType: ScriptEntityType;
  entityId: string | null; // ID of associated entity
  dependencies: string[]; // Array of attribute IDs this script depends on
  dependents: string[]; // Array of script IDs that depend on this script's entity
};

// --- Campaign (joins ruleset); placement is campaign-scoped ---
export type Campaign = BaseDetails & {
  label?: string;
  rulesetId: string;
  /** @deprecated World feature removed; may exist on old data. */
  worldId?: string | null;
  /** Optional cover/avatar image asset. */
  assetId?: string | null;
  /** Injected from asset.data when assetId is set; do not persist on entity. */
  image?: string | null;
  /** Optional campaign description. */
  description?: string;
  pinnedSidebarDocuments?: string[];
  pinnedSidebarCharts?: string[];
  /** Arbitrary key-value options (e.g. showAutoEntries for game log). */
  details?: Record<string, any>;
};

export type CampaignCharacter = BaseDetails & {
  characterId: string;
  campaignId: string;
  campaignSceneId?: string;
  active?: boolean;
  /** Position in turn order for this scene (0 = unset). Sort by turnOrder for order; gaps allowed. */
  turnOrder?: number;
  /** Unix ms when this character's turn started (current cycle). Rewritten on each advance. */
  turnStartTimestamp?: number;
  /** Unix ms when this character's turn ended (null = currently their turn). Rewritten on each advance. */
  turnEndTimestamp?: number | null;
  /** Character attribute ids to show pinned at top of turn-order attributes list (this campaign character only). */
  pinnedTurnOrderAttributeIds?: string[];
};

export type CampaignScene = BaseDetails & {
  campaignId: string;
  name: string;
  category?: string;
  /** Whether the scene is in turn-based mode. */
  turnBasedMode?: boolean;
  /** Current cycle number (1-based). Meaningful when turnBasedMode is true. */
  currentTurnCycle?: number;
  /** 0-based index in sorted turn order (which character's turn it is). */
  currentStepInCycle?: number;
};

/** Callback registered via Scene.inTurns(n) or Scene.onTurnAdvance(); runs when a cycle is entered or on every advance. */
export type SceneTurnCallback = BaseDetails & {
  campaignSceneId: string;
  /** Cycle when to run; null = run every advance (onTurnAdvance) or character-turn callbacks. */
  targetCycle: number | null;
  /** Scene's currentTurnCycle when the callback was registered. */
  createdAtCycle: number;
  /** Character id for Owner context; null when no owner (e.g. Game Manager). */
  ownerId: string | null;
  rulesetId: string;
  scriptId: string;
  /** Source code of the block to execute (re-parsed when the callback fires). */
  blockSource: string;
  /**
   * Character accessor variables captured from the outer script scope at registration time.
   * Maps variable name → character id so they can be re-fetched and re-injected when the callback executes.
   * E.g. { targ: "uuid" } lets `targ` refer to the same character inside the deferred block.
   */
  capturedCharacterIds?: Record<string, string>;
  /**
   * Primitive values (string, number, boolean, null) captured from the outer script scope.
   * E.g. { name: "Goblin", damage: 12 } lets `name` and `damage` resolve inside the deferred block.
   */
  capturedValues?: Record<string, string | number | boolean | null>;
  /**
   * For atStartOfNextTurn / atEndOfNextTurn callbacks: the character whose turn triggers this callback.
   * Null for cycle (inTurns) and advance (onTurnAdvance) callbacks.
   */
  targetCharacterId?: string | null;
  /**
   * For character-turn callbacks: whether to fire at the start or end of the target character's turn.
   * Null for cycle and advance callbacks.
   */
  triggerOn?: 'turn_start' | 'turn_end' | null;
  /**
   * When true, the next turn_end occurrence for this character is skipped and this flag is cleared.
   * Set when atEndOfNextTurn() is called during the target character's own active turn, so the
   * callback doesn't fire at the end of the current turn but fires at the end of the next one.
   */
  skipNextTurnEnd?: boolean;
  /**
   * For atStartOfTurn(n) / atEndOfTurn(n): number of remaining character-turns before the callback fires.
   * Decremented each time the target character's turn start/end is reached. Fires and is deleted when it reaches 1.
   * Undefined for atStartOfNextTurn / atEndOfNextTurn (always fires on the very next turn).
   */
  turnsRemaining?: number;
};

export type CampaignEventParamType = 'string' | 'number' | 'boolean';

export type CampaignEventParamValue = string | number | boolean | null;

export type CampaignEventParameterDefinition = {
  id: string;
  name: string;
  type: CampaignEventParamType;
  required?: boolean;
  defaultValue?: CampaignEventParamValue;
  description?: string;
};

export type CampaignEvent = BaseDetails & {
  label: string;
  campaignId: string;
  /** Scene this event belongs to (one scene per event). */
  sceneId: string;
  /** Game Manager script to run for this event. */
  scriptId?: string | null;
  category?: string;
  /** Per-event values for Script.parameters, keyed by ScriptParameterDefinition.id. */
  parameterValues?: Record<string, ScriptParamValue>;
};
