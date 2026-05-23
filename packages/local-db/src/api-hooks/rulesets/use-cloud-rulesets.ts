import {
  deleteRulesetBackup,
  downloadRulesetBackup,
  listRulesetBackups,
} from '@/lib/cloud/backup/cloud-backup-service';
import { isCloudConfigured } from '@/lib/cloud/client';
import { useCloudAuthStore } from '@/stores/cloud-auth-store';
import { useCallback, useEffect, useState } from 'react';
import { useImportRuleset } from '../export/use-import-ruleset';

export interface CloudRulesetSummary {
  id: string;
  title: string;
  version: string;
  image?: string | null;
  isModule?: boolean;
  ownedByCurrentUser: boolean;
  linkedToAdministeredOrganization: boolean;
}

export function useCloudRulesets() {
  const isAuthenticated = useCloudAuthStore((s) => s.isAuthenticated);
  const cloudSyncEnabled = useCloudAuthStore((s) => s.cloudSyncEnabled);
  const cloudSyncEligibilityLoading = useCloudAuthStore((s) => s.isCloudSyncEligibilityLoading);
  const [cloudRulesets, setCloudRulesets] = useState<CloudRulesetSummary[]>([]);
  const [cloudRulesetListFetchOk, setCloudRulesetListFetchOk] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);
  const [installingRulesetId, setInstallingRulesetId] = useState<string | null>(null);
  const [deletingRulesetId, setDeletingRulesetId] = useState<string | null>(null);

  const { importRuleset } = useImportRuleset();

  const fetchBackups = useCallback(async () => {
    setLoading(true);
    setCloudRulesetListFetchOk(null);
    try {
      const backups = await listRulesetBackups();
      setCloudRulesets(
        backups.map((b) => ({
          id: b.rulesetId,
          title: b.title,
          version: b.version,
          isModule: b.isModule,
          image: null,
          ownedByCurrentUser: true,
          linkedToAdministeredOrganization: false,
        })),
      );
      setCloudRulesetListFetchOk(true);
    } catch {
      setCloudRulesets([]);
      setCloudRulesetListFetchOk(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isCloudConfigured || !isAuthenticated || !cloudSyncEnabled || cloudSyncEligibilityLoading) {
      setCloudRulesets([]);
      setCloudRulesetListFetchOk(null);
      return;
    }
    void fetchBackups();
  }, [isAuthenticated, cloudSyncEnabled, cloudSyncEligibilityLoading, fetchBackups]);

  const installFromCloud = useCallback(
    async (rulesetId: string) => {
      setInstallingRulesetId(rulesetId);
      try {
        const { blob, error } = await downloadRulesetBackup(rulesetId);
        if (error || !blob) return { error: error ?? 'No backup found' };
        const file = new File([blob], 'cloud-backup.zip', { type: 'application/zip' });
        const result = await importRuleset(file);
        if (!result.success) return { error: result.message };
        return {};
      } finally {
        setInstallingRulesetId(null);
      }
    },
    [importRuleset],
  );

  const deleteFromCloud = useCallback(
    async (rulesetId: string) => {
      setDeletingRulesetId(rulesetId);
      try {
        const result = await deleteRulesetBackup(rulesetId);
        if (result.error) return result;
        await fetchBackups();
        return {};
      } finally {
        setDeletingRulesetId(null);
      }
    },
    [fetchBackups],
  );

  return {
    cloudRulesets,
    cloudRulesetListFetchOk,
    loading,
    installFromCloud,
    deleteFromCloud,
    isInstalling: installingRulesetId !== null,
    installingRulesetId,
    isDeletingCloud: deletingRulesetId !== null,
    deletingCloudRulesetId: deletingRulesetId,
  };
}
