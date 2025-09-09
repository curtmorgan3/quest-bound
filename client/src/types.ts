import { TreeItem } from '@/libs/compass-core-composites';

export type RulesetEntity =
  | 'sheet-templates'
  | 'page-templates'
  | 'charts'
  | 'attributes'
  | 'archetypes'
  | 'documents'
  | 'items';

export type PageTreeItem = Omit<TreeItem, 'children'> & {
  parentId: string | null;
  sortIndex: number;
  children: PageTreeItem[];
};

type BaseDetails = {
  id: string;
  createdAt: string;
  updatedAt: string;
};

export type User = BaseDetails & {
  email: string;
  username: string;
  avatarSrc?: string | null;
  onboarded: boolean;
  preferences: Record<string, any>;
  sheets: Array<Sheet>;
  rulesets: Array<Ruleset>;
};

export type Sheet = {};

export type Attribute = {};

export type Item = {};

export type Chart = {};

interface ModuleContent {
  sheets: Array<Sheet>;
  attributes: Array<Attribute>;
  items: Array<Item>;
  charts: Array<Chart>;
}

export type ModuleDetails = BaseDetails & {
  version: string;
  createdBy: string;
  title: string;
  description: string;
  details: string;
};

export type Module = ModuleDetails &
  ModuleContent & {
    rulesetId?: string;
  };

export type Ruleset = ModuleDetails & ModuleContent;
