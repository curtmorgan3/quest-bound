/* eslint-disable @typescript-eslint/no-unused-vars */
import type { User } from '@/types';
import type { FileSystemAPIDirectoryHandle } from '@/vite-env';
import { getNewFileHandle, readJsonFile, writeFile } from '../utils';
import type { UserFileManager } from './types';
import { getUserFilename, userConstructor, verifyUserData } from './user-constructor';

export class LocalUserFileManager implements UserFileManager {
  private rootDirectoryHandler: FileSystemAPIDirectoryHandle | undefined;
  private usersDirectory: FileSystemAPIDirectoryHandle | undefined;

  constructor(directoryHandle?: FileSystemAPIDirectoryHandle) {
    this.rootDirectoryHandler = directoryHandle;
  }

  getOrInitializeUsersDirectory = async () => {
    if (!this.rootDirectoryHandler) {
      console.error('Root directory not set');
      return null;
    }

    if (this.usersDirectory) {
      return this.usersDirectory;
    }

    const userDirectory = await this.rootDirectoryHandler?.getDirectoryHandle('users', {
      create: true,
    });

    this.usersDirectory = userDirectory;
    return userDirectory;
  };

  getUser = async (username: string) => {
    const usersDir = await this.getOrInitializeUsersDirectory();

    const userFile = await usersDir?.getFileHandle(`${username}.json`, {
      create: false,
    });

    if (!userFile) {
      throw Error(`User file for ${username} not found`);
    }

    const userData = (await readJsonFile(userFile)) as User;
    const isValid = verifyUserData(userData);
    if (!isValid) {
      throw Error(`User data for ${username} is invalid`);
    }

    if (userData.avatar) {
      const assetsDir = await usersDir?.getDirectoryHandle('assets', {
        create: false,
      });

      const avatarFile = await assetsDir?.getFileHandle(userData.avatar, {
        create: false,
      });

      const rawAvatar = await avatarFile?.getFile().then((file) => {
        return new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
            resolve(reader.result as string);
          };
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
      });

      userData.avatar = rawAvatar;
    }

    return userData as User;
  };

  saveUser = async (_user: User) => {};

  getUsernames = async () => {
    if (!this.rootDirectoryHandler) {
      console.error('Root directory not set');
      return [];
    }

    const usernames: string[] = [];

    const userDirectory = await this.getOrInitializeUsersDirectory();

    for await (const entry of userDirectory?.values() ?? []) {
      if (entry.kind === 'directory') continue;
      if (entry.name.endsWith('.json')) {
        const username = entry.name.replace('.json', '');
        usernames.push(username);
      }
    }

    return usernames;
  };

  createUser = async (username: string) => {
    const user = userConstructor(username);
    const fileHandle = await getNewFileHandle(getUserFilename(username));
    await writeFile(fileHandle, JSON.stringify(user, null, 2));
    return user;
  };
}
