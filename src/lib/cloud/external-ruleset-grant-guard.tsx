import { useExternalRulesetGrantStore } from '@/stores/external-ruleset-grant-store';
import type { ReactElement } from 'react';
import { Navigate } from 'react-router-dom';

/** Redirect ruleset editor routes when the active cloud access is read-only external grant. */
export function useReadOnlyExternalGrantRedirect(
  rulesetId: string | undefined,
): ReactElement | null {
  const perm = useExternalRulesetGrantStore((s) =>
    rulesetId ? s.permissionByRulesetId[rulesetId] : undefined,
  );
  if (!rulesetId || perm !== 'read_only') return null;
  return <Navigate to={`/landing/${rulesetId}`} replace />;
}
