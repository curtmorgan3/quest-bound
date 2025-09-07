import { IFileManager } from './types';
import { LocalUserFileManager, TestUserFileManager } from './user-file-manager';
import { UserFileManager } from './user-file-manager/types';

class LocalFileManager implements IFileManager {
  private userFileManager: UserFileManager;

  constructor(env: string) {
    switch (env) {
      case 'test':
        this.userFileManager = new TestUserFileManager();
        break;
      default:
        this.userFileManager = new LocalUserFileManager();
    }
  }

  async getUser(username: string) {
    return this.userFileManager.getUser(username);
  }
}

export const FileManager = new LocalFileManager('test');
