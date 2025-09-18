import type { FileSystemAPIDirectoryHandle } from '@/vite-env';
import { get, set } from 'idb-keyval';
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

class FileManagerClass implements IFileManager {
  private env: string = 'test';
  public rootDir: FileSystemAPIDirectoryHandle | null = null;
  private userFileManager: UserFileManager;
  private rulesetFileManager: RulesetFileManager;

  constructor(env?: string | null) {
    this.env = env ?? 'test';
    this.userFileManager = new LocalUserFileManager();
    this.rulesetFileManager = new LocalRulsetFileManager();
    get('qb.rootDir').then((dir: FileSystemAPIDirectoryHandle | undefined) => {
      if (dir) {
        this.rootDir = dir;
        this.initializeFileManagers();
      } else {
        window.dispatchEvent(new Event('qb.fileManagerReady'));
      }
    });
  }

  initializeFileManagers() {
    if (!this.rootDir) {
      throw Error('Root directory not set');
    }

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

  getRootDir() {
    return this.rootDir;
  }

  hasRootDir() {
    return this.rootDir !== null;
  }

  async setRootDirectory() {
    const dirHandle: FileSystemAPIDirectoryHandle | undefined = await window.showDirectoryPicker({
      mode: 'readwrite',
    });
    if (dirHandle) {
      await set('qb.rootDir', dirHandle);
      this.rootDir = dirHandle;
      this.initializeFileManagers();
    }
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
    return this.userFileManager.createUser(username);
  }

  async getRulesets() {
    return this.rulesetFileManager.getRulesets();
  }

  async getModules() {
    return this.rulesetFileManager.getModules();
  }
}

export const FileManager = new FileManagerClass(localStorage.getItem('qb.env'));
