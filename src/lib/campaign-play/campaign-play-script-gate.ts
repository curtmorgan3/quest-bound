/**
 * Pure campaign play script gate — safe to import from the QBScript web worker (no Zustand / window).
 */

export type CampaignPlayScriptWorkerPolicy = {
  featureEnabled: boolean;
  role: 'host' | 'client' | null;
  sessionCampaignId: string | null;
};

/**
 * When the realtime play flag is on, the user is a session **client** (joiner), and the script run
 * is tied to the same campaign as the session, the worker must not execute VM script paths.
 */
export function shouldBlockClientCampaignScript(
  policy: CampaignPlayScriptWorkerPolicy,
  effectiveCampaignId: string | undefined,
): boolean {
  if (!policy.featureEnabled || policy.role !== 'client' || !policy.sessionCampaignId) {
    return false;
  }
  if (effectiveCampaignId == null || effectiveCampaignId === '') {
    return false;
  }
  return effectiveCampaignId === policy.sessionCampaignId;
}
