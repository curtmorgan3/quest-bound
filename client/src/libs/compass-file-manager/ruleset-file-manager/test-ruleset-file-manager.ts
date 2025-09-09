import { RulesetFileManager } from './types';

export class TestRulsetFileManager implements RulesetFileManager {
  getRulesets = async () => {
    return [];
  };

  getModules = async () => {
    return [];
  };
}
