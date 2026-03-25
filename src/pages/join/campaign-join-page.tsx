import { Button, Input, Label } from '@/components';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { PageWrapper } from '@/components/composites';
import { ensureLocalCampaignJoinStub } from '@/lib/campaign-play/join/ensure-local-campaign-stub';
import { parseJoinTokenOrUrl } from '@/lib/campaign-play/join/generate-join-token';
import { resolveCampaignJoinToken } from '@/lib/campaign-play/join/resolve-campaign-join-token';
import { getSession } from '@/lib/cloud/auth';
import { linkLocalUserToCloudAuth } from '@/lib/cloud/link-local-user-to-cloud-auth';
import { isCloudConfigured } from '@/lib/cloud/client';
import { SignInSignUpModal } from '@/pages/signin';
import { db, useCloudAuthStore, useCurrentUser } from '@/stores';
import { useLiveQuery } from 'dexie-react-hooks';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';

export function CampaignJoinPage() {
  const { rulesetId: rulesetIdParam } = useParams<{ rulesetId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const currentUser = useCurrentUser((s) => s.currentUser);
  const isAuthenticated = useCloudAuthStore((s) => s.isAuthenticated);
  const authLoading = useCloudAuthStore((s) => s.isLoading);

  const tokenFromQuery = searchParams.get('token')?.trim() ?? '';
  const [pastedToken, setPastedToken] = useState('');
  const [busy, setBusy] = useState(false);
  const [rulesetMismatchAck, setRulesetMismatchAck] = useState(false);
  const [signInModalOpen, setSignInModalOpen] = useState(false);

  const rulesetId = rulesetIdParam ? decodeURIComponent(rulesetIdParam) : '';

  const effectiveToken = useMemo(() => {
    const raw = tokenFromQuery || pastedToken;
    return parseJoinTokenOrUrl(raw);
  }, [tokenFromQuery, pastedToken]);

  useEffect(() => {
    if (isAuthenticated) {
      setSignInModalOpen(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (authLoading || !isCloudConfigured || isAuthenticated) return;
    if (tokenFromQuery) {
      setSignInModalOpen(true);
    }
  }, [authLoading, isAuthenticated, tokenFromQuery]);

  const runJoin = useCallback(async () => {
    if (!rulesetId) {
      toast.error('Missing ruleset in link');
      return;
    }
    if (!currentUser) {
      toast.error('Create or select a local profile first, then open this link again.');
      return;
    }
    if (!isCloudConfigured) {
      toast.error('Cloud is not configured');
      return;
    }
    if (!effectiveToken) {
      toast.error('Paste the full join link or token');
      return;
    }

    setBusy(true);
    try {
      const session = await getSession();
      if (!session) {
        setSignInModalOpen(true);
        toast.info('Sign in to join this campaign.');
        return;
      }

      await linkLocalUserToCloudAuth(session.user.id);

      const resolved = await resolveCampaignJoinToken(effectiveToken);
      if ('error' in resolved) {
        toast.error(resolved.error);
        return;
      }

      if (resolved.rulesetId !== rulesetId) {
        toast.error('This link does not match the ruleset in the URL.');
        return;
      }

      const localRuleset = await db.rulesets.get(resolved.rulesetId);
      if (!localRuleset) {
        toast.error('Import this ruleset locally before joining (Rulesets).');
        return;
      }

      const playable = await db.characters.filter((c) => !c.isNpc).toArray();
      const compatible = playable.filter((c) => c.rulesetId === resolved.rulesetId).length;
      const otherRuleset = playable.filter((c) => c.rulesetId !== resolved.rulesetId).length;

      if (compatible === 0 && otherRuleset === 0) {
        toast.error('Create a character for this ruleset before joining.');
        return;
      }

      if (compatible === 0 && otherRuleset > 0 && !rulesetMismatchAck) {
        toast.error('Confirm the ruleset notice below, then join again.');
        return;
      }

      await ensureLocalCampaignJoinStub({
        campaignId: resolved.campaignId,
        rulesetId: resolved.rulesetId,
        label: resolved.campaignLabel,
        defaultCampaignSceneId: resolved.defaultCampaignSceneId,
      });

      const dest = resolved.defaultCampaignSceneId
        ? `/campaigns/${resolved.campaignId}/scenes/${resolved.defaultCampaignSceneId}?campaignPlayRole=client`
        : `/campaigns/${resolved.campaignId}/scenes?campaignPlayRole=client`;

      navigate(dest, { replace: true });
      toast.success('Joined campaign');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Join failed');
    } finally {
      setBusy(false);
    }
  }, [currentUser, effectiveToken, navigate, rulesetMismatchAck, rulesetId]);

  const playableRulesetCounts = useLiveQuery(
    async () => {
      if (!rulesetId) return { compatible: 0, other: 0 };
      const chars = await db.characters.filter((c) => !c.isNpc).toArray();
      return {
        compatible: chars.filter((c) => c.rulesetId === rulesetId).length,
        other: chars.filter((c) => c.rulesetId !== rulesetId).length,
      };
    },
    [rulesetId],
  );

  const showMismatchAck =
    (playableRulesetCounts?.compatible ?? 0) === 0 && (playableRulesetCounts?.other ?? 0) > 0;

  return (
    <PageWrapper title='Join campaign'>
      <div className='mx-auto flex max-w-md flex-col gap-4 p-4'>
        {!isCloudConfigured && (
          <Alert>
            <AlertDescription>Cloud is not configured for this build.</AlertDescription>
          </Alert>
        )}

        {!currentUser && (
          <Alert>
            <AlertDescription>
              Open Quest Bound once and select a profile, then return to this join page.
            </AlertDescription>
          </Alert>
        )}

        <p className='text-muted-foreground text-sm'>
          Join a hosted campaign using the link the host shared. You must be signed in with a Quest Bound
          account. You can paste the token if the app did not open the link automatically.
        </p>

        {!tokenFromQuery && (
          <div className='flex flex-col gap-2'>
            <Label htmlFor='join-token'>Join token or full URL</Label>
            <Input
              id='join-token'
              value={pastedToken}
              onChange={(e) => setPastedToken(e.target.value)}
              placeholder='Paste token or https://…?token=…'
              autoComplete='off'
            />
          </div>
        )}

        {showMismatchAck && (
          <label className='flex items-start gap-2 text-sm'>
            <Checkbox
              checked={rulesetMismatchAck}
              onCheckedChange={(v) => setRulesetMismatchAck(v === true)}
            />
            <span>
              My characters use a different ruleset id than this campaign. I understand the host&apos;s
              rules are authoritative and my sheet may not match.
            </span>
          </label>
        )}

        <Button disabled={busy || !isCloudConfigured || !currentUser} onClick={() => void runJoin()}>
          {busy ? 'Joining…' : 'Join campaign'}
        </Button>

        <SignInSignUpModal
          open={signInModalOpen}
          onOpenChange={setSignInModalOpen}
          onSuccess={() => void runJoin()}
          mode='default'
        />
      </div>
    </PageWrapper>
  );
}
