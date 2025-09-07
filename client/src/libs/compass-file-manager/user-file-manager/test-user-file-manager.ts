import { User } from '@/types';
import { testUser } from '../test-values';
import { UserFileManager } from './types';

let inMemoryUser: User | null = null;

export class TestUserFileManager implements UserFileManager {
  getUser = async (_username: string) => {
    if (!inMemoryUser) {
      inMemoryUser = testUser;
    }
    return inMemoryUser;
  };

  saveUser = async (user: User) => {
    inMemoryUser = user;
  };
}
