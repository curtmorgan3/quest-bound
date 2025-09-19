import type { Ruleset } from '@/types';

export interface RulesetFileManager {
  getRulesets: () => Promise<Ruleset[]>;
}
