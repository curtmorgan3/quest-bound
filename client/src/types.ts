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

export type User = {
  id: string;
  email: string;
  username: string;
  avatarSrc?: string | null;
  onboarded: boolean;
  preferences: Record<string, any>;
  sheets: Array<Sheet>;
  rulesets: Array<Ruleset>;
};

export type Sheet = {};

export type Ruleset = {};
