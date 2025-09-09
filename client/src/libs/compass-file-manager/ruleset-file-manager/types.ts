import { Module, Ruleset } from '@/types';

export interface RulesetFileManager {
  getRulesets: () => Promise<Ruleset[]>;
  getModules: () => Promise<Module[]>;
}
