/**
 * Ensures a `public.users` row exists for the current Supabase session (bootstrap insert).
 * Uses INSERT only: upsert/merge would run ON CONFLICT UPDATE, which RLS denies when cloud_enabled is false.
 */

import { getSession } from '@/lib/cloud/auth';
import { cloudClient } from '@/lib/cloud/client';
import { prepareRecordForRemote } from '@/lib/cloud/sync/sync-utils';
import type { DB } from '@/stores/db/hooks/types';

export async function ensureRemoteUserRow(db: DB): Promise<void> {
  const client = cloudClient;
  const session = await getSession();
  if (!client || !session?.user?.id) return;

  const authUid = session.user.id;
  const local = await db.users.where('cloudUserId').equals(authUid).first();
  if (!local) return;

  const remoteRow = {
    ...prepareRecordForRemote('users', local as Record<string, unknown>),
    user_id: authUid,
  };

  const { error } = await client.from('users').insert(remoteRow);
  if (error?.code === '23505') {
    // Row already exists (unique on user_id, id)
    return;
  }
  if (error) {
    console.warn('ensureRemoteUserRow:', error.message);
  }
}
