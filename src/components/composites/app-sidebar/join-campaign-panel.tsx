import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { filterNotSoftDeleted, softDeletePatch } from '@/lib/data/soft-delete';
import { ensureLocalCampaignJoinStub } from '@/lib/campaign-play/join/ensure-local-campaign-stub';
import { parseJoinTokenOrUrl } from '@/lib/campaign-play/join/generate-join-token';
import {
  createJoinerCampaignCharacter,
  joinerHasPlayableCampaignCharacter,
} from '@/lib/campaign-play/join/joiner-campaign-character';
import { resolveCampaignJoinToken } from '@/lib/campaign-play/join/resolve-campaign-join-token';
import { tryBroadcastCampaignRosterFromDexie } from '@/lib/campaign-play/realtime/broadcast-campaign-roster-update';
import { getSession } from '@/lib/cloud/auth';
import { isCloudConfigured } from '@/lib/cloud/client';
import { linkLocalUserToCloudAuth } from '@/lib/cloud/link-local-user-to-cloud-auth';
import { SignInSignUpModal } from '@/pages/signin';
import { db, useCurrentUser } from '@/stores';
import type { Character } from '@/types';
import { useLiveQuery } from 'dexie-react-hooks';
import { Globe } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';

type CharacterCampaignLink = {
  campaignCharacterId: string;
  campaignId: string;
  title: string;
};

export interface JoinCampaignPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  character: Character;
}

export function JoinCampaignPanel({ open, onOpenChange, character }: JoinCampaignPanelProps) {
  const currentUser = useCurrentUser((s) => s.currentUser);
  const [tokenInput, setTokenInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [leavingCampaignCharacterId, setLeavingCampaignCharacterId] = useState<string | null>(null);
  const [signInModalOpen, setSignInModalOpen] = useState(false);

  const campaignLinks = useLiveQuery(
    async (): Promise<CharacterCampaignLink[]> => {
      const rows = filterNotSoftDeleted(
        await db.campaignCharacters.where('characterId').equals(character.id).toArray(),
      );
      if (rows.length === 0) return [];
      const campaigns = await db.campaigns.bulkGet(rows.map((r) => r.campaignId));
      return rows.map((cc, i) => {
        const camp = campaigns[i];
        const label = camp?.label?.trim();
        return {
          campaignCharacterId: cc.id,
          campaignId: cc.campaignId,
          title: label && label.length > 0 ? label : 'Unnamed campaign',
        };
      });
    },
    [character.id],
  );

  useEffect(() => {
    if (!open) {
      setTokenInput('');
      setSignInModalOpen(false);
    }
  }, [open]);

  const runJoin = useCallback(async () => {
    if (!currentUser) {
      toast.error('Select a local profile first.');
      return;
    }
    if (!isCloudConfigured) {
      toast.error('Cloud is not configured');
      return;
    }
    const effectiveToken = parseJoinTokenOrUrl(tokenInput);
    if (!effectiveToken) {
      toast.error('Paste the join token from the host');
      return;
    }
    if (character.isNpc === true || character.isTestCharacter) {
      toast.error('Only player characters can join a campaign.');
      return;
    }
    if (character.userId !== currentUser.id) {
      toast.error('This character does not belong to your profile.');
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

      if (resolved.rulesetId !== character.rulesetId) {
        toast.error('This invite is for a different ruleset than this character.');
        return;
      }

      const localRuleset = await db.rulesets.get(resolved.rulesetId);
      if (!localRuleset) {
        toast.error('Import this ruleset locally before joining (Rulesets).');
        return;
      }

      await ensureLocalCampaignJoinStub({
        campaignId: resolved.campaignId,
        rulesetId: resolved.rulesetId,
        label: resolved.campaignLabel,
        defaultCampaignSceneId: resolved.defaultCampaignSceneId,
      });

      const alreadyLinked = await joinerHasPlayableCampaignCharacter(
        resolved.campaignId,
        currentUser.id,
      );
      if (alreadyLinked) {
        onOpenChange(false);
        toast.success('Already linked to this campaign');
        return;
      }

      const existingCc = await db.campaignCharacters
        .where('[campaignId+characterId]')
        .equals([resolved.campaignId, character.id])
        .first();
      if (existingCc && existingCc.deleted !== true) {
        onOpenChange(false);
        toast.success('Already in this campaign');
        return;
      }

      await createJoinerCampaignCharacter({
        campaignId: resolved.campaignId,
        characterId: character.id,
        campaignSceneId: resolved.defaultCampaignSceneId,
      });
      onOpenChange(false);
      toast.success('Joined campaign');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Join failed');
    } finally {
      setBusy(false);
    }
  }, [character, currentUser, onOpenChange, tokenInput]);

  const handleLeaveCampaign = useCallback(
    async (campaignCharacterId: string, campaignId: string) => {
      setLeavingCampaignCharacterId(campaignCharacterId);
      try {
        await db.campaignCharacters.update(campaignCharacterId, softDeletePatch());
        void tryBroadcastCampaignRosterFromDexie({
          campaignId,
          characterIds: [],
          campaignCharacterIds: [campaignCharacterId],
        }).catch(() => {});
        toast.success('Left campaign');
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Could not leave campaign');
      } finally {
        setLeavingCampaignCharacterId(null);
      }
    },
    [],
  );

  const links = campaignLinks ?? [];
  const hasLinks = links.length > 0;
  const shouldShowJoinForm = campaignLinks === undefined || links.length === 0;

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side='right'
          className='flex w-full flex-col gap-0 border-l p-0 sm:max-w-md [&>button]:absolute [&>button]:right-4 [&>button]:top-4'>
          <SheetHeader className='shrink-0 border-b px-6 py-4'>
            <SheetTitle className='flex items-center gap-2 pr-8'>
              <Globe className='size-5 shrink-0' aria-hidden />
              Join campaign
            </SheetTitle>
            <SheetDescription>
              {!shouldShowJoinForm
                ? 'This character is on one or more campaign rosters. Leave a campaign to remove it from the roster.'
                : `Paste the join token from the host. This character (${character.name || 'Unnamed'}) will be added to the campaign roster.`}
            </SheetDescription>
          </SheetHeader>
          <div className='flex min-h-0 flex-1 flex-col gap-4 overflow-auto p-6'>
            {!isCloudConfigured && (
              <Alert>
                <AlertDescription>Cloud is not configured for this build.</AlertDescription>
              </Alert>
            )}
            {!currentUser && (
              <Alert>
                <AlertDescription>Select a profile from the app menu first.</AlertDescription>
              </Alert>
            )}
            {hasLinks && (
              <div className='flex flex-col gap-3'>
                {links.map((link) => (
                  <div
                    key={link.campaignCharacterId}
                    className='flex flex-col gap-2 rounded-md border border-border bg-muted/20 p-3'>
                    <p className='text-sm text-muted-foreground'>
                      Linked to{' '}
                      <span className='font-medium text-foreground'>{link.title}</span>
                    </p>
                    <Button
                      type='button'
                      variant='outline'
                      size='sm'
                      className='self-start'
                      disabled={
                        leavingCampaignCharacterId !== null ||
                        busy ||
                        !isCloudConfigured ||
                        !currentUser
                      }
                      onClick={() => void handleLeaveCampaign(link.campaignCharacterId, link.campaignId)}
                      data-testid={`sidebar-leave-campaign-${link.campaignId}`}>
                      {leavingCampaignCharacterId === link.campaignCharacterId
                        ? 'Leaving…'
                        : 'Leave campaign'}
                    </Button>
                  </div>
                ))}
              </div>
            )}
            {shouldShowJoinForm && (
              <>
                <div className='flex flex-col gap-2'>
                  <Label htmlFor='sidebar-join-token'>Join token</Label>
                  <Input
                    id='sidebar-join-token'
                    value={tokenInput}
                    onChange={(e) => setTokenInput(e.target.value)}
                    placeholder='Paste the token from the host'
                    autoComplete='off'
                    disabled={busy || leavingCampaignCharacterId !== null}
                  />
                </div>
                <Button
                  type='button'
                  disabled={
                    busy ||
                    leavingCampaignCharacterId !== null ||
                    !isCloudConfigured ||
                    !currentUser
                  }
                  onClick={() => void runJoin()}
                  data-testid='sidebar-join-campaign-submit'>
                  {busy ? 'Joining…' : 'Join campaign'}
                </Button>
              </>
            )}
          </div>
        </SheetContent>
      </Sheet>
      <SignInSignUpModal
        open={signInModalOpen}
        onOpenChange={setSignInModalOpen}
        onSuccess={() => void runJoin()}
        mode='default'
      />
    </>
  );
}
