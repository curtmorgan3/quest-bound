import { Button } from '@/components';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  CAMPAIGN_PLAY_MAX_JOINERS,
  countCampaignPlayJoinerSlots,
} from '@/lib/campaign-play/campaign-play-joiner-cap';
import {
  fetchCampaignPlayInvite,
  upsertCampaignPlayInvite,
} from '@/lib/campaign-play/join/campaign-play-invite-api';
import { useCloudAuthStore } from '@/stores';
import type { CampaignCharacter, Character } from '@/types';
import { Copy, Globe, RefreshCw } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';

interface CampaignPlayInvitePanelProps {
  campaignId: string;
  rulesetId: string;
  campaignLabel?: string | null;
  campaignCharacters: CampaignCharacter[];
  charactersById: Map<string, Character>;
  hostCloudUserId: string | null;
  /** Omit card chrome and title row when embedded in a sheet header. */
  variant?: 'card' | 'plain';
}

export function CampaignPlayInvitePanel({
  campaignId,
  rulesetId,
  campaignLabel,
  campaignCharacters,
  charactersById,
  hostCloudUserId,
  variant = 'card',
}: CampaignPlayInvitePanelProps) {
  const cloudSyncEnabled = useCloudAuthStore((s) => s.cloudSyncEnabled);
  const [joinToken, setJoinToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);

  const joinerSlots = hostCloudUserId
    ? countCampaignPlayJoinerSlots(campaignCharacters, charactersById, hostCloudUserId)
    : 0;
  const atJoinerCap = joinerSlots >= CAMPAIGN_PLAY_MAX_JOINERS;

  const refreshToken = useCallback(async () => {
    setLoading(true);
    try {
      const result = await upsertCampaignPlayInvite({
        campaignId,
        rulesetId,
        campaignLabel,
      });
      if ('error' in result) {
        toast.error(result.error);
        return;
      }
      setJoinToken(result.row.join_token);
      toast.success('New join token generated (old tokens no longer work).');
    } finally {
      setLoading(false);
    }
  }, [campaignId, campaignLabel, rulesetId]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setFetching(true);
      try {
        const row = await fetchCampaignPlayInvite(campaignId);
        if (cancelled) return;
        setJoinToken(row?.join_token ?? null);
      } finally {
        if (!cancelled) setFetching(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [campaignId]);

  const copyToken = async () => {
    if (!joinToken) return;
    try {
      await navigator.clipboard.writeText(joinToken);
      toast.success('Join token copied');
    } catch {
      toast.error('Could not copy to clipboard');
    }
  };

  if (!cloudSyncEnabled) {
    return (
      <Alert className='border-muted'>
        <AlertDescription>
          Cloud sync must be enabled for your account to create campaign join tokens.
        </AlertDescription>
      </Alert>
    );
  }

  const body = (
    <>
      {variant === 'card' && (
        <div className='flex items-center gap-2 font-medium text-foreground'>
          <Globe className='size-4' aria-hidden />
          Host this Campaign
        </div>
      )}
      <p className='text-muted-foreground'>
        Share this token so signed-in players can join as guests. Up to{' '}
        {CAMPAIGN_PLAY_MAX_JOINERS} guest characters are recommended in this phase ({joinerSlots}{' '}
        now).
      </p>
      {atJoinerCap && (
        <Alert>
          <AlertDescription>
            You already have {CAMPAIGN_PLAY_MAX_JOINERS} or more guest character slots in this
            campaign. Remove a guest character before inviting more players.
          </AlertDescription>
        </Alert>
      )}
      <div className='flex flex-wrap items-center gap-2'>
        <Button
          type='button'
          variant='secondary'
          size='sm'
          disabled={fetching || loading || !joinToken}
          onClick={() => void copyToken()}>
          <Copy className='mr-1 size-3.5' />
          Copy token
        </Button>
        <Button
          type='button'
          variant='outline'
          size='sm'
          disabled={loading}
          onClick={() => void refreshToken()}>
          <RefreshCw className='mr-1 size-3.5' />
          {joinToken ? 'Rotate token' : 'Create token'}
        </Button>
      </div>
      {joinToken && (
        <p className='break-all rounded bg-background/80 px-2 py-1 font-mono text-xs text-muted-foreground'>
          {joinToken}
        </p>
      )}
    </>
  );

  if (variant === 'plain') {
    return <div className='flex flex-col gap-3 text-sm'>{body}</div>;
  }

  return (
    <div className='flex flex-col gap-2 rounded-md border border-border bg-muted/20 p-3 text-sm'>
      {body}
    </div>
  );
}
