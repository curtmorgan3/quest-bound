import { ensureRemoteUserRow } from '@/lib/cloud/ensure-remote-user';
import { db, useCurrentUser } from '@/stores';
import type { DB } from '@/stores/db/hooks/types';

/**
 * Associates the active local profile with the current Supabase session (sets `cloudUserId`).
 * Used after cloud sign-in so Layout treats the user as cloud-linked (e.g. campaign join).
 */
export async function linkLocalUserToCloudAuth(cloudUid: string): Promise<void> {
  const { currentUser } = useCurrentUser.getState();
  if (!currentUser) return;

  const existingUserWithCloud = await db.users.where('cloudUserId').equals(cloudUid).first();
  if (existingUserWithCloud && existingUserWithCloud.id !== currentUser.id) {
    return;
  }

  await db.users.update(currentUser.id, { cloudUserId: cloudUid });
  const updated = await db.users.get(currentUser.id);
  if (updated) useCurrentUser.getState().setCurrentUser(updated);
  await ensureRemoteUserRow(db as DB);
}
