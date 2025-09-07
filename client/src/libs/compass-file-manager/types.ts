import { User } from '@types';

export interface IFileManager {
  getUser: (username: string) => Promise<User | null>;
}
