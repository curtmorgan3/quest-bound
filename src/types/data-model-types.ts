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
  scriptId?: string | null;          // NEW: Associated script
};

export type Asset = BaseDetails & {
  data: string; // Base64 or URL
  type: string; // MIME type
  filename: string;
  rulesetId: string | null; // Nullable for user assets
  directory?: string;
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
  scriptId?: string | null;          // NEW: Associated script
};

export type Chart = BaseDetails & {
  rulesetId: string;
  title: string;
  description: string;
  category?: string;
  data: string;
  assetId?: string | null;
  image?: string | null;
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
};

export type CharacterAttribute = Attribute & {
  characterId: string;
  attributeId: string;
  value: string | number | boolean;
  scriptDisabled?: boolean;          // NEW: Player has overridden the computed value
};

export type CharacterPage = BaseDetails & {
  characterId: string;
  label: string;
  assetId?: string;
  assetUrl?: string;
  backgroundOpacity?: number;
  image?: string | null;
};

export type CharacterWindow = BaseDetails & {
  title: string;
  characterId: string;
  characterPageId?: string | null;
  windowId: string;
  x: number;
  y: number;
  isCollapsed: boolean;
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
};

export type Font = BaseDetails & {
  rulesetId: string;
  label: string;
  data: string;
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
  scriptId?: string | null;          // NEW: Associated script
  customProperties?: Record<string, string | number | boolean>; // NEW: Custom properties for scripts
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
};

export type Ruleset = BaseDetails & {
  version: string;
  createdBy: string;
  title: string;
  description: string;
  details: Record<string, any>;
  assetId: string | null;
  image: string | null;
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
};

export type Script = BaseDetails & {
  rulesetId: string;           // Which ruleset this script belongs to
  name: string;                // Script name (e.g., "hit_points", "cast_fireball")
  sourceCode: string;          // Full QBScript source code
  entityType: 'attribute' | 'action' | 'item' | 'global';
  entityId: string | null;     // ID of associated entity (null for global scripts)
  isGlobal: boolean;           // Whether this is a global utility script
  enabled: boolean;            // Allow disabling scripts without deleting
};

export type ScriptError = BaseDetails & {
  rulesetId: string;
  scriptId: string;            // Which script caused the error
  characterId: string | null;  // Which character was executing (null for non-character scripts)
  errorMessage: string;        // Human-readable error message
  lineNumber: number | null;   // Where the error occurred
  stackTrace: string | null;   // Detailed stack trace
  context: string;             // What triggered the script (e.g., "on_load", "attribute_change")
  timestamp: number;           // When the error occurred
};

export type DependencyGraphNode = BaseDetails & {
  rulesetId: string;           // Which ruleset this node belongs to
  scriptId: string;            // Script that this node represents
  entityType: 'attribute' | 'action' | 'item' | 'global';
  entityId: string | null;     // ID of associated entity
  dependencies: string[];      // Array of attribute IDs this script depends on
  dependents: string[];        // Array of script IDs that depend on this script's entity
};
