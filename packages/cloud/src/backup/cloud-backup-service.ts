import { cloudClient } from '../client';

const BACKUP_BUCKET = 'ruleset-cloud-backups';

function backupStoragePath(userId: string, rulesetId: string): string {
  return `${userId}/${rulesetId}/latest.zip`;
}

export async function uploadRulesetBackup(
  rulesetId: string,
  zipBlob: Blob,
): Promise<{ error?: string }> {
  if (!cloudClient) return { error: 'Cloud not configured' };

  const { data: userData, error: authError } = await cloudClient.auth.getUser();
  if (authError || !userData.user) return { error: 'Not authenticated' };

  const path = backupStoragePath(userData.user.id, rulesetId);

  const { error: uploadError } = await cloudClient.storage
    .from(BACKUP_BUCKET)
    .upload(path, zipBlob, { upsert: true, contentType: 'application/zip' });

  if (uploadError) return { error: uploadError.message };

  const { error: metaError } = await cloudClient
    .from('cloud_ruleset_backups')
    .upsert(
      { user_id: userData.user.id, ruleset_id: rulesetId, uploaded_at: new Date().toISOString() },
      { onConflict: 'user_id,ruleset_id' },
    );

  if (metaError) return { error: metaError.message };
  return {};
}

export async function downloadRulesetBackup(
  rulesetId: string,
): Promise<{ blob?: Blob; error?: string }> {
  if (!cloudClient) return { error: 'Cloud not configured' };

  const { data: userData, error: authError } = await cloudClient.auth.getUser();
  if (authError || !userData.user) return { error: 'Not authenticated' };

  const path = backupStoragePath(userData.user.id, rulesetId);

  const { data, error } = await cloudClient.storage.from(BACKUP_BUCKET).download(path);

  if (error) return { error: error.message };
  if (!data) return { error: 'No backup found' };
  return { blob: data };
}

export async function hasRulesetBackup(rulesetId: string): Promise<boolean> {
  if (!cloudClient) return false;

  const { data } = await cloudClient
    .from('cloud_ruleset_backups')
    .select('ruleset_id')
    .eq('ruleset_id', rulesetId)
    .maybeSingle();

  return !!data;
}

export async function deleteRulesetBackup(rulesetId: string): Promise<{ error?: string }> {
  if (!cloudClient) return { error: 'Cloud not configured' };

  const { data: userData, error: authError } = await cloudClient.auth.getUser();
  if (authError || !userData.user) return { error: 'Not authenticated' };

  const path = backupStoragePath(userData.user.id, rulesetId);

  const { error: storageError } = await cloudClient.storage
    .from(BACKUP_BUCKET)
    .remove([path]);

  if (storageError) return { error: storageError.message };

  await cloudClient
    .from('cloud_ruleset_backups')
    .delete()
    .eq('ruleset_id', rulesetId)
    .eq('user_id', userData.user.id);

  return {};
}
