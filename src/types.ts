type BaseDetails = {
  id: string;
  createdAt: string;
  updatedAt: string;
};

export type Asset = BaseDetails & {
  data: string; // Base64 or URL
  type: string; // MIME type
  filename: string;
  rulesetId: string | null; // Nullable for user assets
  directory?: string;
};

export type User = BaseDetails & {
  username: string;
  assetId: string | null;
  image: string | null;
  preferences: Record<string, any>;
  rulesets: string[]; // Array of Ruleset IDs
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

export type Attribute = BaseDetails & {
  rulesetId: string;
  title: string;
  description: string;
  category?: string;
  type: 'string' | 'number' | 'boolean' | 'enum';
  options?: string[];
  defaultValue: string | number | boolean;
  // When options are derived from a chart column
  optionsChartRef?: number;
  optionsChartColumnHeader?: string;
  min?: number;
  max?: number;
};

export type Action = BaseDetails & {
  rulesetId: string;
  title: string;
  description: string;
  category?: string;
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
};

export type Chart = BaseDetails & {
  rulesetId: string;
  title: string;
  description: string;
  category?: string;
  data: string;
};

export type Component = BaseDetails & {
  windowId?: string;
  type: string;
  x: number;
  y: number;
  z: number;
  height: number;
  width: number;
  rotation: number;
  color: string;
  opacity: number;
  borderRadiusTopLeft: number;
  borderRadiusTopRight: number;
  borderRadiusBottomLeft: number;
  borderRadiusBottomRight: number;
  compositeId?: string;
  locked?: boolean;
  selected?: boolean;
  assetId?: string;
  image?: string;
  groupId?: string | null;
  attributeId?: string;
  actionId?: string;
};

export type Composite = BaseDetails & {
  rulesetId: string;
  title: string;
  category?: string;
};

export type Window = BaseDetails & {
  rulesetId: string;
  title: string;
  category?: string;
};
