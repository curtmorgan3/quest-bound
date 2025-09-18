/* eslint-disable @typescript-eslint/no-empty-object-type */
type BaseDetails = {
  id: number;
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

export type Sheet = {};

export type Attribute = {};

export type Item = {};

export type Chart = {};
