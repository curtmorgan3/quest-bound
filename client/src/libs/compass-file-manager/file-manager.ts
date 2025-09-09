import {
  LocalRulsetFileManager,
  RulesetFileManager,
  TestRulsetFileManager,
} from './ruleset-file-manager';
import { IFileManager } from './types';
import { LocalUserFileManager, TestUserFileManager, UserFileManager } from './user-file-manager';

class FileManagerClass implements IFileManager {
  private userFileManager: UserFileManager;
  private rulesetFileManager: RulesetFileManager;

  constructor(env: string) {
    switch (env) {
      case 'test':
        this.userFileManager = new TestUserFileManager();
        this.rulesetFileManager = new TestRulsetFileManager();
        break;
      default:
        this.userFileManager = new LocalUserFileManager();
        this.rulesetFileManager = new LocalRulsetFileManager();
    }
  }

  async getUser(username: string) {
    return this.userFileManager.getUser(username);
  }

  async getRulesets() {
    return this.rulesetFileManager.getRulesets();
  }

  async getModules() {
    return this.rulesetFileManager.getModules();
  }
}

export const FileManager = new FileManagerClass('test');
