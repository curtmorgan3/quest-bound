import { User } from '@/types';
import { UserFileManager } from './types';

export class LocalUserFileManager implements UserFileManager {
  getUser = async (username: string) => {
    return null;
  };

  saveUser = async (user: User) => {};
}
