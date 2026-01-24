type BaseDetails = {
  id: string;
  createdAt: string;
  updatedAt: string;
};

export type Coordinates = {
  x: number;
  y: number;
};

export type Dimensions = {
  height: number;
  width: number;
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

export type Font = BaseDetails & {
  rulesetId: string;
  label: string;
  data: string;
};

export type AttributeType = 'string' | 'number' | 'boolean' | 'enum';

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

type BaseComponentStyle = {
  backgroundColor: string;
  opacity: number;
  outline?: string;
  borderRadius?: string;
  borderRadiusTopLeft: number;
  borderRadiusTopRight: number;
  borderRadiusBottomLeft: number;
  borderRadiusBottomRight: number;
  outlineWidth: number;
  outlineColor: string;
};

export type TextComponentStyle = BaseComponentStyle & {
  color?: string;
  fontSize?: number;
  fontFamily?: string;
  fontWeight?: string;
  fontStyle?: string;
  textDecoration?: string;
  textAlign?: 'start' | 'center' | 'end';
  verticalAlign?: 'start' | 'center' | 'end';
  lineHeight?: number;
};

export type ComponentStyle = BaseComponentStyle & TextComponentStyle;

// Component data types should only include optional properties.
export type ShapeComponentData = {
  sides?: number;
};

export type TextComponentData = {
  value?: string | number | boolean;
};

export type ImageComponentData = {
  assetId?: string;
  assetUrl?: string;
};

export type InputComponentData = {
  placeholder?: string;
};

export type CheckboxComponentData = {
  label?: string;
  checkedAssetId?: string;
  checkedAssetUrl?: string;
  uncheckedAssetId?: string;
  uncheckedAssetUrl?: string;
};

export type ComponentData = ShapeComponentData &
  TextComponentData &
  ImageComponentData &
  InputComponentData &
  CheckboxComponentData & {
    conditionalRenderAttributeId?: string;
    conditionalRenderInverse?: boolean;
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
};

export type Window = BaseDetails & {
  rulesetId: string;
  title: string;
  category?: string;
};

export type Character = BaseDetails & {
  userId: string;
  rulesetId: string;
  name: string;
  assetId: string | null;
  image: string | null;
  isTestCharacter: boolean;
};

export type CharacterAttribute = Attribute & {
  characterId: string;
  attributeId: string;
  value: string | number | boolean;
};

export type CharacterWindow = BaseDetails & {
  title: string;
  characterId: string;
  windowId: string;
  x: number;
  y: number;
  isCollapsed: boolean;
};

export type CharacterInventory = BaseDetails & {
  characterId: string;
  inventoryId: string;
};

export type Inventory = BaseDetails & {
  rulesetId: string;
  title: string;
  category?: string;
  type: 'item' | 'action';
};

export type InventoryItem = BaseDetails & {
  inventoryId: string;
  itemId: string;
  quantity: number;
};

export type InventoryAction = BaseDetails & {
  inventoryId: string;
  actionId: string;
};
