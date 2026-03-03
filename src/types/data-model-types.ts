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
  /** Optional world for tracking/exporting worlds. */
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
  scriptId?: string | null; // NEW: Associated script
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

export type CustomPropertyType = 'string' | 'number' | 'boolean' | 'color';

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
  /** Last viewed character page id (sheet viewer). */
  lastViewedPageId?: string | null;
  /** Whether the sheet viewer is locked (windows not draggable). */
  sheetLocked?: boolean;
  /** Module origin: ruleset id, source entity id, and module name. */
  moduleId?: string;
  moduleEntityId?: string;
  moduleName?: string;
  /** Asset IDs for map sprites (stacked by z-index). */
  sprites?: string[];
  /** Keyed by customPropertyId. Instantiated from first archetype's ArchetypeCustomProperties at creation. */
  customProperties?: Record<string, string | number | boolean>;
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
  mapHeight?: number;
  mapWidth?: number;
  /** Asset IDs or URLs for map sprites (e.g. single sprite for campaign map). */
  sprites?: string[];
  /** Module origin: ruleset id, source entity id, and module name. */
  moduleId?: string;
  moduleEntityId?: string;
  moduleName?: string;
};

export type CharacterArchetype = BaseDetails & {
  characterId: string;
  archetypeId: string;
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
  /** When set, document belongs to a ruleset (ruleset-scoped). Omitted when document belongs to a world or campaign. */
  rulesetId?: string;
  /** When set, document belongs to a world (and optionally a location). Mutually exclusive with campaign usage. */
  worldId?: string | null;
  /** When set with worldId, document is scoped to this location within the world. When set with campaignId, document is scoped to this location within the campaign. */
  locationId?: string | null;
  /** When set, document belongs to a campaign (and has locationId; no worldId). */
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
  mapHeight?: number;
  mapWidth?: number;
  /** Asset IDs or urls for map sprites (stacked by z-index). */
  sprites?: string[];
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
  palette: string[];
  /** When true, this ruleset can be added as a module to other rulesets. */
  isModule?: boolean;
  /** Modules that have been added to this ruleset (source id, name, image). */
  modules?: RulesetModuleEntry[];
};

export type User = BaseDetails & {
  username: string;
  assetId?: string | null;
  image?: string | null;
  preferences: Record<string, any>;
  rulesets: string[]; // Array of Ruleset IDs
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
  | 'campaignEvent';

export type Script = BaseDetails & {
  rulesetId: string; // Which ruleset this script belongs to
  name: string; // Script name (e.g., "hit_points", "cast_fireball")
  sourceCode: string; // Full QBScript source code
  entityType: ScriptEntityType;
  entityId: string | null; // ID of associated entity (null for global and characterLoader scripts)
  isGlobal: boolean; // Whether this is a global utility script
  enabled: boolean; // Allow disabling scripts without deleting
  category?: string; // Optional category for grouping scripts
  /** Optional world; when set, script is world-specific and hidden from ruleset-level script list. */
  campaignId?: string;
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

// --- Worlds & Locations (not a DB table; stored inside Location.tiles) ---
export interface TileData {
  id: string;
  /** Optional for placeholder cells (no tileset); used for entity placement and isPassable. */
  tileId?: string;
  x: number;
  y: number;
  /** Layer order; higher values draw on top. Default 0 when omitted. */
  zIndex?: number;
  isPassable: boolean;
  actionId?: string;
}

export type World = BaseDetails & {
  label: string;
  description?: string;
  assetId?: string | null;
  image?: string | null;
  /** @deprecated Legacy: may still exist in DB after migration; do not set on new worlds. Use Campaign for ruleset–world association. */
  rulesetId?: string;
};

export type Tilemap = BaseDetails & {
  label?: string;
  worldId: string;
  assetId: string;
  /** Resolved tilemap image URL (injected at read from DB). */
  image?: string | null;
  tileHeight: number;
  tileWidth: number;
};

export type Tile = BaseDetails & {
  tilemapId?: string;
  tileX?: number;
  tileY?: number;
};

export type Location = BaseDetails & {
  label: string;
  worldId: string;
  nodeX: number;
  nodeY: number;
  nodeWidth: number;
  nodeHeight: number;
  parentLocationId?: string | null;
  gridWidth: number;
  gridHeight: number;
  /** When true, this location has a tile map (grid) and can be opened in the location editor. */
  hasMap?: boolean;
  /** Pixel size (width and height) for rendering each tile in the location editor. */
  tileRenderSize?: number;
  tiles: TileData[];
  /** Stacking order of the node on the canvas; higher values draw on top. */
  nodeZIndex?: number;
  /** Whether to show the label on the node. */
  labelVisible?: boolean;
  /** CSS background color for the node. */
  backgroundColor?: string | null;
  /** Opacity 0–1 for the node fill and for the background image when present. */
  opacity?: number;
  /** Asset id for node background image. */
  backgroundAssetId?: string | null;
  /** Resolved background image URL (injected at read from DB). */
  backgroundImage?: string | null;
  /** CSS background-size: cover, contain, auto, etc. */
  backgroundSize?: string | null;
  /** CSS background-position: center, top, left, etc. */
  backgroundPosition?: string | null;
  /** Optional flat map image asset; when set, location-viewer shows this image instead of the tile grid. */
  mapAssetId?: string | null;
  /** Resolved map image URL (injected at read from DB). */
  mapAsset?: string | null;
  // Large images are scaled down. Tiles selected in the location editor are relative
  // to this size.
  scaledMapHeight?: number;
  scaledMapWidth?: number;
};

// --- Campaign (joins ruleset; world is optional); placement is campaign-scoped ---
export type Campaign = BaseDetails & {
  label?: string;
  rulesetId: string;
  worldId?: string | null;
  pinnedSidebarDocuments?: string[];
  pinnedSidebarCharts?: string[];
  /** Arbitrary key-value options (e.g. showAutoEntries for game log). */
  details?: Record<string, any>;
};

export type CampaignCharacter = BaseDetails & {
  characterId: string;
  campaignId: string;
  campaignSceneId?: string;
  currentLocationId?: string | null;
  currentTileId?: string | null;
  mapHeight?: number;
  mapWidth?: number;
  active?: boolean;
};

export type CampaignScene = BaseDetails & {
  campaignId: string;
  name: string;
  category?: string;
};

export type CampaignItem = BaseDetails & {
  itemId: string;
  campaignId: string;
  sceneId?: string;
  currentLocationId?: string | null;
  currentTileId?: string | null;
  mapHeight?: number;
  mapWidth?: number;
};

export type CampaignEvent = BaseDetails & {
  label: string;
  campaignId: string;
  scriptId?: string | null;
  category?: string;
};

export type CampaignEventScene = BaseDetails & {
  campaignEventId: string;
  campaignSceneId: string;
};

export type CampaignEventLocation = BaseDetails & {
  campaignEventId: string;
  locationId: string;
  tileId?: string | null;
};
