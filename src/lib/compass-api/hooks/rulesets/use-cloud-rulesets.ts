import {
  deleteRulesetFromCloud,
  installFromCloud as doInstallFromCloud,
  listCloudRulesets,
  type CloudRulesetSummary,
} from '@/lib/cloud/sync/sync-service';
import { isCloudConfigured } from '@/lib/cloud/client';
import { db } from '@/stores';
import { useCloudAuthStore } from '@/stores/cloud-auth-store';
import { useCallback, useEffect, useState } from 'react';

export type { CloudRulesetSummary };

export function useCloudRulesets() {
  const isAuthenticated = useCloudAuthStore((s) => s.isAuthenticated);
  const cloudSyncEnabled = useCloudAuthStore((s) => s.cloudSyncEnabled);
  const cloudSyncEligibilityLoading = useCloudAuthStore((s) => s.isCloudSyncEligibilityLoading);
  const cloudRulesetListEpoch = useCloudAuthStore((s) => s.cloudRulesetListEpoch);
  const [cloudRulesets, setCloudRulesets] = useState<CloudRulesetSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [installingRulesetId, setInstallingRulesetId] = useState<string | null>(null);
  const [deletingRulesetId, setDeletingRulesetId] = useState<string | null>(null);

  useEffect(() => {
    if (!isCloudConfigured || !isAuthenticated || !cloudSyncEnabled || cloudSyncEligibilityLoading) {
      setCloudRulesets([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    listCloudRulesets()
      .then((list) => {
        if (!cancelled) setCloudRulesets(list);
      })
      .catch(() => {
        if (!cancelled) setCloudRulesets([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, cloudSyncEnabled, cloudSyncEligibilityLoading, cloudRulesetListEpoch]);

  const installFromCloud = useCallback(async (rulesetId: string) => {
    setInstallingRulesetId(rulesetId);
    try {
      await doInstallFromCloud(rulesetId, db);
    } finally {
      setInstallingRulesetId(null);
    }
  }, []);

  const deleteFromCloud = useCallback(async (rulesetId: string) => {
    setDeletingRulesetId(rulesetId);
    try {
      const result = await deleteRulesetFromCloud(rulesetId);
      if (result.error) return result;
      const list = await listCloudRulesets();
      setCloudRulesets(list);
      return {};
    } finally {
      setDeletingRulesetId(null);
    }
  }, []);

  return {
    cloudRulesets,
    loading: loading,
    installFromCloud,
    deleteFromCloud,
    isInstalling: installingRulesetId !== null,
    installingRulesetId,
    isDeletingCloud: deletingRulesetId !== null,
    deletingCloudRulesetId: deletingRulesetId,
  };
}
