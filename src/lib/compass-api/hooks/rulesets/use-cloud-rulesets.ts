import {
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
  const [cloudRulesets, setCloudRulesets] = useState<CloudRulesetSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [installingRulesetId, setInstallingRulesetId] = useState<string | null>(null);

  useEffect(() => {
    if (!isCloudConfigured || !isAuthenticated) {
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
  }, [isAuthenticated]);

  const installFromCloud = useCallback(async (rulesetId: string) => {
    setInstallingRulesetId(rulesetId);
    try {
      await doInstallFromCloud(rulesetId, db);
    } finally {
      setInstallingRulesetId(null);
    }
  }, []);

  return {
    cloudRulesets,
    loading: loading,
    installFromCloud,
    isInstalling: installingRulesetId !== null,
    installingRulesetId,
  };
}
