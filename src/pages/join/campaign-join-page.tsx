import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Button,
  Command,
  CommandEmpty,
  CommandInput,
  CommandItem,
  CommandList,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
} from '@/components';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { PageWrapper } from '@/components/composites';
import { ensureLocalCampaignJoinStub } from '@/lib/campaign-play/join/ensure-local-campaign-stub';
import {
  createJoinerCampaignCharacter,
  joinerHasPlayableCampaignCharacter,
  listJoinableCharactersForCampaign,
} from '@/lib/campaign-play/join/joiner-campaign-character';
import { parseJoinTokenOrUrl } from '@/lib/campaign-play/join/generate-join-token';
import { resolveCampaignJoinToken } from '@/lib/campaign-play/join/resolve-campaign-join-token';
import { getSession } from '@/lib/cloud/auth';
import { linkLocalUserToCloudAuth } from '@/lib/cloud/link-local-user-to-cloud-auth';
import { isCloudConfigured } from '@/lib/cloud/client';
import { SignInSignUpModal } from '@/pages/signin';
import { db, useCloudAuthStore, useCurrentUser } from '@/stores';
import type { Character } from '@/types';
import { useLiveQuery } from 'dexie-react-hooks';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';

type JoinCharacterPickState = {
  campaignId: string;
  defaultCampaignSceneId: string | null;
  dest: string;
  characters: Character[];
};

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
  const [joinCharacterPick, setJoinCharacterPick] = useState<JoinCharacterPickState | null>(null);
  const [confirmingCharacter, setConfirmingCharacter] = useState(false);
  const [characterSearch, setCharacterSearch] = useState('');

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

      const alreadyLinked = await joinerHasPlayableCampaignCharacter(
        resolved.campaignId,
        currentUser.id,
      );
      if (alreadyLinked) {
        navigate(dest, { replace: true });
        toast.success('Joined campaign');
        return;
      }

      const joinable = await listJoinableCharactersForCampaign(
        resolved.campaignId,
        resolved.rulesetId,
        currentUser.id,
      );
      if (joinable.length === 0) {
        toast.error(
          "No player character for this campaign's ruleset is available to add. Create one that uses the host's ruleset, or re-import the ruleset if ids differ.",
        );
        return;
      }

      setCharacterSearch('');
      setJoinCharacterPick({
        campaignId: resolved.campaignId,
        defaultCampaignSceneId: resolved.defaultCampaignSceneId,
        dest,
        characters: joinable,
      });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Join failed');
    } finally {
      setBusy(false);
    }
  }, [currentUser, effectiveToken, navigate, rulesetMismatchAck, rulesetId]);

  const filteredJoinPickCharacters = useMemo(() => {
    if (!joinCharacterPick) return [];
    const q = characterSearch.toLowerCase().trim();
    if (!q) return joinCharacterPick.characters;
    return joinCharacterPick.characters.filter((c) =>
      (c.name ?? '').toLowerCase().includes(q),
    );
  }, [joinCharacterPick, characterSearch]);

  const completeJoinWithCharacter = useCallback(
    async (characterId: string) => {
      if (!joinCharacterPick) return;
      setConfirmingCharacter(true);
      try {
        await createJoinerCampaignCharacter({
          campaignId: joinCharacterPick.campaignId,
          characterId,
          campaignSceneId: joinCharacterPick.defaultCampaignSceneId,
        });
        navigate(joinCharacterPick.dest, { replace: true });
        toast.success('Joined campaign');
        setJoinCharacterPick(null);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Could not link character');
      } finally {
        setConfirmingCharacter(false);
      }
    },
    [joinCharacterPick, navigate],
  );

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

        <Button
          disabled={busy || !isCloudConfigured || !currentUser || joinCharacterPick !== null}
          onClick={() => void runJoin()}>
          {busy ? 'Joining…' : 'Join campaign'}
        </Button>

        <SignInSignUpModal
          open={signInModalOpen}
          onOpenChange={setSignInModalOpen}
          onSuccess={() => void runJoin()}
          mode='default'
        />

        <Dialog
          open={joinCharacterPick !== null}
          onOpenChange={(open) => {
            if (!open && !confirmingCharacter) {
              setJoinCharacterPick(null);
            }
          }}>
          <DialogContent className='sm:max-w-md' showCloseButton={!confirmingCharacter}>
            <DialogHeader>
              <DialogTitle>Choose your character</DialogTitle>
              <DialogDescription>
                Select which of your characters from this ruleset you are playing in this campaign.
              </DialogDescription>
            </DialogHeader>
            <Command shouldFilter={false} className='rounded-lg border'>
              <CommandInput
                placeholder='Search characters…'
                value={characterSearch}
                onValueChange={setCharacterSearch}
                disabled={confirmingCharacter}
              />
              <CommandList>
                <CommandEmpty>No matching characters.</CommandEmpty>
                {filteredJoinPickCharacters.map((character) => (
                  <CommandItem
                    key={character.id}
                    value={`${character.id} ${character.name ?? ''}`}
                    disabled={confirmingCharacter}
                    onSelect={() => void completeJoinWithCharacter(character.id)}
                    className='flex items-center gap-2'>
                    <Avatar className='size-8 shrink-0 rounded-md'>
                      <AvatarImage src={character.image ?? ''} alt={character.name ?? 'Character'} />
                      <AvatarFallback className='rounded-md text-xs'>
                        {(character.name ?? '?').slice(0, 1).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span>{character.name ?? 'Unnamed'}</span>
                  </CommandItem>
                ))}
              </CommandList>
            </Command>
          </DialogContent>
        </Dialog>
      </div>
    </PageWrapper>
  );
}
