/* eslint-disable @typescript-eslint/no-unused-vars */
import type { User } from '@/types';
import type { UserFileManager } from './types';

export class LocalUserFileManager implements UserFileManager {
  getUser = async (_username: string) => {
    return null;
  };

  saveUser = async (_user: User) => {};
}
