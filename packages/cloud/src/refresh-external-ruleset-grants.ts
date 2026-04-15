import {
  listMyActiveExternalRulesetGrants,
  listOwnCloudRulesetSummaries,
} from '@/lib/cloud/organizations/org-api';
import { useExternalRulesetGrantStore } from '@/stores/external-ruleset-grant-store';

/**
 * Playtester grants (`ruleset_external_grants`) can include rows for rulesets the user also owns
 * (e.g. org-linked owner copies). Owners must stay fully editable — ignore grants for cloud-owned rulesets.
 */
export async function refreshExternalRulesetGrantPermissions(cloudUserId: string): Promise<void> {
  const [grants, owned] = await Promise.all([
    listMyActiveExternalRulesetGrants(),
    listOwnCloudRulesetSummaries(cloudUserId),
  ]);
  const ownedIds = new Set(owned.map((r) => r.id));
  const filtered = grants.filter((g) => !ownedIds.has(g.ruleset_id));
  useExternalRulesetGrantStore.getState().setPermissionsFromRows(filtered);
}
