export type User = {
  id: string;
  email: string;
  username: string;
  avatarSrc?: string | null;
  storageAllotment: number;
  onboarded: boolean;
  preferences: Record<string, any>;
  sheets: Array<Sheet>;
  rulesets: Array<Ruleset>;
};

export type Sheet = {};

export type Ruleset = {};
