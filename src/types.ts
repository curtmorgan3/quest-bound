type BaseDetails = {
  id: string;
  createdAt: string;
  updatedAt: string;
};

export type User = BaseDetails & {
  username: string;
  avatar: string | null;
  preferences: Record<string, any>;
};

export type Ruleset = BaseDetails & {
  version: string;
  createdBy: string;
  title: string;
  description: string;
  details: Record<string, any>;
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
