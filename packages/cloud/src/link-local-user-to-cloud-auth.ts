import { cloudClient } from '@/lib/cloud/client';
import { ensureRemoteUserRow } from '@/lib/cloud/ensure-remote-user';
import { prepareRemoteForLocal } from '@/lib/cloud/sync/sync-utils';
import { db, useCurrentUser } from '@/stores';
import type { DB } from '@/stores/db/hooks/types';
import type { User } from '@quest-bound/types';
import { migrateOnboardingUserId } from '@/utils/onboarding-storage';

/**
 * Fetches the primary `public.users` row for this auth user (latest `updated_at` when multiple exist).
 */
async function fetchPrimaryCloudUserProfileRow(cloudUid: string): Promise<Record<string, unknown> | null> {
  if (!cloudClient) return null;
  const { data, error } = await cloudClient
    .from('users')
    .select('*')
    .eq('user_id', cloudUid)
    .order('updated_at', { ascending: false })
    .limit(1);
  if (error) {
    console.warn('fetchPrimaryCloudUserProfileRow:', error.message);
    return null;
  }
  const row = data?.[0] as Record<string, unknown> | undefined;
  return row ?? null;
}

function userPatchFromRemoteRow(remoteRow: Record<string, unknown>, cloudUid: string): Partial<User> {
  const base = prepareRemoteForLocal(remoteRow, 'users') as Partial<User>;
  return {
    ...base,
    cloudUserId: cloudUid,
  };
}

/**
 * Associates the active local profile with the current Supabase session.
 * When the cloud profile uses a different app user `id` (e.g. first device), rewrites the local user
 * primary key to match, updates `Character` / `DiceRoll` `userId` references, applies cloud username,
 * and runs bootstrap upsert.
 */
export async function linkLocalUserToCloudAuth(cloudUid: string): Promise<void> {
  const { currentUser } = useCurrentUser.getState();
  if (!currentUser) return;

  const existingUserWithCloud = await db.users.where('cloudUserId').equals(cloudUid).first();
  if (existingUserWithCloud && existingUserWithCloud.id !== currentUser.id) {
    return;
  }

  const remoteRow = await fetchPrimaryCloudUserProfileRow(cloudUid);
  const now = new Date().toISOString();

  if (!remoteRow || typeof remoteRow.id !== 'string' || remoteRow.id.trim() === '') {
    await db.users.update(currentUser.id, { cloudUserId: cloudUid });
    const updated = await db.users.get(currentUser.id);
    if (updated) useCurrentUser.getState().setCurrentUser(updated);
    await ensureRemoteUserRow(db as DB);
    return;
  }

  const cloudProfileId = remoteRow.id as string;
  const patch = userPatchFromRemoteRow(remoteRow, cloudUid);
  const remoteUsername =
    typeof patch.username === 'string' && patch.username.trim() !== ''
      ? patch.username.trim()
      : currentUser.username;

  if (cloudProfileId === currentUser.id) {
    await db.users.update(currentUser.id, {
      cloudUserId: cloudUid,
      username: remoteUsername,
      ...(patch.email !== undefined ? { email: patch.email } : {}),
      ...(patch.assetId !== undefined ? { assetId: patch.assetId } : {}),
      ...(patch.image !== undefined ? { image: patch.image } : {}),
      ...(patch.preferences !== undefined ? { preferences: patch.preferences as User['preferences'] } : {}),
      updatedAt: now,
    });
    const updated = await db.users.get(currentUser.id);
    if (updated) useCurrentUser.getState().setCurrentUser(updated);
    await ensureRemoteUserRow(db as DB);
    return;
  }

  const slotOccupant = await db.users.get(cloudProfileId);
  if (slotOccupant && slotOccupant.id !== currentUser.id) {
    if (slotOccupant.cloudUserId && slotOccupant.cloudUserId !== cloudUid) {
      return;
    }
    if (slotOccupant.cloudUserId) {
      return;
    }
    await db.users.delete(cloudProfileId);
  }

  const localUserIdBeforeTx = currentUser.id;

  await db.transaction('rw', db.users, db.characters, db.diceRolls, async () => {
    await rewriteUserIdOnOwnedEntities(localUserIdBeforeTx, cloudProfileId, now);

    const newUser: User = {
      id: cloudProfileId,
      createdAt: currentUser.createdAt,
      updatedAt: now,
      username: remoteUsername,
      email: patch.email ?? currentUser.email ?? null,
      assetId: patch.assetId ?? currentUser.assetId ?? null,
      image: patch.image ?? currentUser.image ?? null,
      preferences: (patch.preferences as User['preferences']) ?? currentUser.preferences ?? {},
      cloudUserId: cloudUid,
      emailVerified: currentUser.emailVerified,
      cloudEnabled: currentUser.cloudEnabled,
    };

    await db.users.delete(localUserIdBeforeTx);
    await db.users.add(newUser);
  });

  await migrateOnboardingUserId(localUserIdBeforeTx, cloudProfileId);

  const merged = await db.users.get(cloudProfileId);
  if (merged) useCurrentUser.getState().setCurrentUser(merged);
  await ensureRemoteUserRow(db as DB);
}

async function rewriteUserIdOnOwnedEntities(
  oldUserId: string,
  newUserId: string,
  updatedAt: string,
): Promise<void> {
  const chars = await db.characters.where('userId').equals(oldUserId).toArray();
  for (const c of chars) {
    await db.characters.put({ ...c, userId: newUserId, updatedAt });
  }
  const rolls = await db.diceRolls.where('userId').equals(oldUserId).toArray();
  for (const r of rolls) {
    await db.diceRolls.put({ ...r, userId: newUserId, updatedAt });
  }
}
