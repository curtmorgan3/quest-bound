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
  type: string; // MIME type
  filename: string;
  rulesetId: string | null; // Nullable for user assets
  /** Optional world for tracking/exporting worlds. */
  worldId?: string | null;
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

export type Character = BaseDetails & {
  userId: string;
  rulesetId: string;
  inventoryId: string;
  name: string;
  assetId: string | null;
  image: string | null;
  isTestCharacter: boolean;
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
  label: string;
  category?: string;
  assetId?: string;
  assetUrl?: string;
  backgroundOpacity?: number;
  backgroundColor?: string;
  image?: string | null;
  /** Module origin: ruleset id, source entity id, and module name. */
  moduleId?: string;
  moduleEntityId?: string;
  moduleName?: string;
};

export type RulesetPage = BaseDetails & {
  rulesetId: string;
  pageId: string;
};

/** Join table: character ↔ page. */
export type CharacterPage = BaseDetails & {
  characterId: string;
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
  /** Optional link to a specific ruleset-page join; null for windows not bound to a page. */
  rulesetPageId?: string | null;
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
  rulesetId: string;
  title: string;
  description: string;
  category?: string;
  assetId?: string | null;
  image?: string | null;
  pdfAssetId?: string | null;
  pdfData?: string | null;
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
  customProperties?: Record<string, string | number | boolean>;
  mapHeight?: number;
  mapWidth?: number;
  /** Asset IDs or urls for map sprites (stacked by z-index). */
  sprites?: string[];
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
  value?: string | number | boolean;
  isEquipped?: boolean;
  /** Per-instance overrides for item definition custom properties (e.g. armor_value). */
  customProperties?: Record<string, string | number | boolean>;
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
  image: string | null;
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
  /** Module origin: ruleset id, source entity id, and module name. */
  moduleId?: string;
  moduleEntityId?: string;
  moduleName?: string;
};

export type Script = BaseDetails & {
  rulesetId: string; // Which ruleset this script belongs to
  name: string; // Script name (e.g., "hit_points", "cast_fireball")
  sourceCode: string; // Full QBScript source code
  entityType: 'attribute' | 'action' | 'item' | 'archetype' | 'location' | 'tile' | 'global';
  entityId: string | null; // ID of associated entity (null for global scripts)
  isGlobal: boolean; // Whether this is a global utility script
  enabled: boolean; // Allow disabling scripts without deleting
  category?: string; // Optional category for grouping scripts
  /** Optional world; when set, script is world-specific and hidden from ruleset-level script list. */
  worldId?: string;
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
  scriptId: string;
  characterId: string | null;
  argsJson: string; // JSON.stringify of the log arguments array (any[])
  timestamp: number;
  context?: string; // e.g. "load" | "attribute_change" | "action_click" | "item_event"
};

export type DependencyGraphNode = BaseDetails & {
  rulesetId: string; // Which ruleset this node belongs to
  scriptId: string; // Script that this node represents
  entityType: 'attribute' | 'action' | 'item' | 'archetype' | 'location' | 'tile' | 'global';
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
};

// --- Campaign (joins ruleset + world); placement is campaign-scoped ---
export type Campaign = BaseDetails & {
  label?: string;
  rulesetId: string;
  worldId: string;
};

export type CampaignCharacter = BaseDetails & {
  characterId: string;
  campaignId: string;
  currentLocationId?: string | null;
  currentTileId?: string | null;
  mapHeight?: number;
  mapWidth?: number;
};

export type CampaignItem = BaseDetails & {
  itemId: string;
  campaignId: string;
  currentLocationId?: string | null;
  currentTileId?: string | null;
  mapHeight?: number;
  mapWidth?: number;
};

export type CampaignEventType = 'on_enter' | 'on_leave' | 'on_activate';

export type CampaignEvent = BaseDetails & {
  label: string;
  campaignId: string;
  type: CampaignEventType;
  scriptId?: string | null;
};

export type CampaignEventLocation = BaseDetails & {
  campaignEventId: string;
  locationId: string;
  tileId?: string | null;
};
