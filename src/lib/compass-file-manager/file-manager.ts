import type { FileSystemAPIDirectoryHandle } from '@/vite-env';
import {
  LocalRulsetFileManager,
  TestRulsetFileManager,
  type RulesetFileManager,
} from './ruleset-file-manager';
import type { IFileManager } from './types';
import {
  LocalUserFileManager,
  TestUserFileManager,
  type UserFileManager,
} from './user-file-manager';
import { getDirectoryHandle, resetRootDirectory } from './utils';

class FileManagerClass implements IFileManager {
  private env: string = 'test';
  public rootDir: FileSystemAPIDirectoryHandle | null = null;
  private userFileManager: UserFileManager;
  private rulesetFileManager: RulesetFileManager;

  constructor(env?: string | null) {
    this.env = env ?? 'test';
    this.userFileManager = new LocalUserFileManager();
    this.rulesetFileManager = new LocalRulsetFileManager();
    this.initializeFileManagers();
  }

  async initializeFileManagers() {
    const rootDir = await getDirectoryHandle('qb.rootDir');

    if (!rootDir) {
      console.error('Root directory not set');
      return;
    }

    this.rootDir = rootDir;

    switch (this.env) {
      case 'test':
        this.userFileManager = new TestUserFileManager();
        this.rulesetFileManager = new TestRulsetFileManager();
        break;
      default:
        this.userFileManager = new LocalUserFileManager(this.rootDir);
        this.rulesetFileManager = new LocalRulsetFileManager();
    }

    window.dispatchEvent(new Event('qb.fileManagerReady'));
  }

  async setRootDirectory() {
    await resetRootDirectory();
    this.initializeFileManagers();
  }

  getRootDir() {
    return this.rootDir;
  }

  hasRootDir() {
    return this.rootDir !== null;
  }

  async getUser(username: string) {
    const user = await this.userFileManager.getUser(username);
    return user;
  }

  async getUsernames() {
    const usernames = await this.userFileManager.getUsernames();
    return usernames;
  }

  async createUser(username: string) {
    const user = await this.userFileManager.createUser(username);
    return user;
  }

  async getRulesets() {
    return this.rulesetFileManager.getRulesets();
  }
}

let fileManagerInstance: FileManagerClass | null = null;

export const getFileManager = () => {
  if (!fileManagerInstance) {
    fileManagerInstance = new FileManagerClass(localStorage.getItem('qb.env'));
  }
  return fileManagerInstance;
};
