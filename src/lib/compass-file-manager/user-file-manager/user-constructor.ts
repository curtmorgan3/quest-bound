import type { User } from '@/types';

export function userConstructor(username: string): User {
  return {
    id: crypto.randomUUID(),
    username,
    preferences: {},
    avatar: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    rulesets: [],
  };
}

export function getUserFilename(username: string) {
  return `${username.trim().replace(/ /g, '-').toLowerCase()}.json`;
}

export function verifyUserData(data: any): data is User {
  return (
    data &&
    typeof data === 'object' &&
    typeof data.id === 'string' &&
    typeof data.username === 'string' &&
    typeof data.preferences === 'object' &&
    (data.avatar === null || typeof data.avatar === 'string') &&
    typeof data.createdAt === 'string' &&
    typeof data.updatedAt === 'string' &&
    Array.isArray(data.rulesets)
  );
}
