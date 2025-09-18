import type { Module, Ruleset, User } from '@/types';

export interface IFileManager {
  getUser: (username: string) => Promise<User | null>;
  getUsernames: () => Promise<string[]>;
  getRulesets: () => Promise<Ruleset[]>;
  getModules: () => Promise<Module[]>;
}
