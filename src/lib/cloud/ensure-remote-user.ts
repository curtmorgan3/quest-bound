/**
 * Ensures a `public.users` row exists for the current Supabase session (bootstrap insert).
 * Uses upsert with `ignoreDuplicates` so PostgREST applies ON CONFLICT DO NOTHING on (user_id, id).
 * Plain INSERT fails with 409 when the row already exists (e.g. sign-in modal + join flow both call this).
 * A merge upsert (ON CONFLICT UPDATE) is avoided here so RLS does not block updates when cloud sync is off.
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
  const sessionEmail = session.user.email?.trim();
  const local = await db.users.where('cloudUserId').equals(authUid).first();
  if (!local) return;

  const email =
    (typeof local.email === 'string' && local.email.trim() !== ''
      ? local.email.trim().toLowerCase()
      : null) ??
    (sessionEmail && sessionEmail.length > 0 ? sessionEmail.toLowerCase() : null);
  if (!email) {
    console.warn('ensureRemoteUserRow: missing email, skipping remote profile insert');
    return;
  }

  const remoteRow = {
    ...prepareRecordForRemote('users', { ...(local as Record<string, unknown>), email } as Record<string, unknown>),
    user_id: authUid,
  };

  const { error } = await client.from('users').upsert(remoteRow, {
    onConflict: 'user_id,id',
    ignoreDuplicates: true,
  });
  if (error) {
    console.warn('ensureRemoteUserRow:', error.message);
  }
}
