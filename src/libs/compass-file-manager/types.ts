import type { Module, Ruleset, User } from '@/types';

export interface IFileManager {
  getUser: (username: string) => Promise<User | null>;
  getRulesets: () => Promise<Ruleset[]>;
  getModules: () => Promise<Module[]>;
}
