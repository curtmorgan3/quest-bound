import { RulesetFileManager } from './types';

export class LocalRulsetFileManager implements RulesetFileManager {
  getRulesets = async () => {
    return [];
  };

  getModules = async () => {
    return [];
  };
}
