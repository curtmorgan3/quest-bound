import { db } from '@/stores';

/**
 * `Character.userId` is the app profile id (`users.id`, i.e. `public.users.id`).
 * Supabase session `user.id` is `public.users.user_id` (stored on `User.cloudUserId` in Dexie).
 */
export async function resolveCharacterOwnerAuthUserId(characterUserId: string): Promise<string | null> {
  const id = characterUserId.trim();
  if (!id) return null;
  const profile = await db.users.get(id);
  const cloud = profile?.cloudUserId?.trim();
  return cloud && cloud.length > 0 ? cloud : null;
}
