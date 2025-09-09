import type { User } from '@/types';

export interface UserFileManager {
  getUser: (username: string) => Promise<User | null>;
  saveUser: (user: User) => Promise<void>;
}
