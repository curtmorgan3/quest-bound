import { get as getKeyval, set as setKeyval } from 'idb-keyval';

const KEY = 'qb.cloud.nonOwnerCloudInstallRulesetIds';

export async function getNonOwnerCloudInstallRulesetIds(): Promise<Set<string>> {
  try {
    const list = await getKeyval<string[]>(KEY);
    return new Set(list ?? []);
  } catch {
    return new Set();
  }
}

export async function addNonOwnerCloudInstallRulesetId(rulesetId: string): Promise<void> {
  const list = [...(await getNonOwnerCloudInstallRulesetIds())];
  if (list.includes(rulesetId)) return;
  list.push(rulesetId);
  await setKeyval(KEY, list);
}

export async function removeNonOwnerCloudInstallRulesetId(rulesetId: string): Promise<void> {
  const list = [...(await getNonOwnerCloudInstallRulesetIds())];
  const next = list.filter((id) => id !== rulesetId);
  if (next.length === list.length) return;
  await setKeyval(KEY, next);
}
