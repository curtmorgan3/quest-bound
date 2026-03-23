import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
  Button,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  DescriptionEditor,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components';
import { cloudClient } from '@/lib/cloud/client';
import {
  acceptOrganizationInvite,
  clearOrgLogo,
  countOrganizationSeats,
  createOrganization,
  deleteOrganization,
  dismissOrganizationInvite,
  fetchOrganizationAsAdmin,
  formatOrgSaveError,
  getAssetSignedUrl,
  inviteUserToOrganization,
  isOrganizationSeatFull,
  leaveOrganization,
  linkRulesetToOrganization,
  listAllLinkedRulesetIds,
  listMyOrganizationMemberships,
  listOrganizationInvites,
  listOrganizationRulesetLinks,
  listOwnCloudRulesetSummaries,
  listPendingInvitesForCurrentUser,
  organizationAdminListMembers,
  type MyOrganizationMembershipRow,
  type OrganizationInviteRow,
  type OrganizationMemberRow,
  type OrganizationRow,
  type OrganizationRulesetLinkRow,
  type PendingInviteForUserRow,
  removeOrganizationMember,
  revokeOrganizationInvite,
  unlinkRulesetFromOrganization,
  updateOrganizationProfile,
  uploadOrgLogoAndSetUrl,
} from '@/lib/cloud/organizations/org-api';
import { assertNotSvgOrganizationLogo } from '@/lib/cloud/sync/sync-assets';
import { cn } from '@/lib/utils';
import { useCloudAuthStore } from '@/stores/cloud-auth-store';
import { FileText, Library, Loader2, Users } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export function OrganizationSettings() {
  const cloudUser = useCloudAuthStore((s) => s.cloudUser);
  const touchCloudRulesetList = useCloudAuthStore((s) => s.touchCloudRulesetList);
  const userId = cloudUser?.id ?? null;

  const [loading, setLoading] = useState(true);
  const [org, setOrg] = useState<OrganizationRow | null>(null);
  const [members, setMembers] = useState<OrganizationMemberRow[]>([]);
  const [invites, setInvites] = useState<OrganizationInviteRow[]>([]);
  const [seatMemberCount, setSeatMemberCount] = useState(0);
  const [seatPendingCount, setSeatPendingCount] = useState(0);
  const [linkedRulesets, setLinkedRulesets] = useState<OrganizationRulesetLinkRow[]>([]);
  const [ownedCloudRulesets, setOwnedCloudRulesets] = useState<{ id: string; title: string }[]>([]);
  const [globallyLinkedRulesetIds, setGloballyLinkedRulesetIds] = useState<string[]>([]);
  const [logoDisplayUrl, setLogoDisplayUrl] = useState<string | null>(null);

  const [createName, setCreateName] = useState('');
  const [createSlug, setCreateSlug] = useState('');
  const [createDesc, setCreateDesc] = useState('');
  const [pendingLogoDataUrl, setPendingLogoDataUrl] = useState<string | null>(null);

  const [editName, setEditName] = useState('');
  const [editSlug, setEditSlug] = useState('');
  const [editDesc, setEditDesc] = useState('');

  const [inviteEmail, setInviteEmail] = useState('');
  const [linkRulesetId, setLinkRulesetId] = useState<string>('');

  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  const [removeMember, setRemoveMember] = useState<OrganizationMemberRow | null>(null);
  const [deleteOrgOpen, setDeleteOrgOpen] = useState(false);
  const [pendingForMe, setPendingForMe] = useState<PendingInviteForUserRow[]>([]);
  const [myMemberships, setMyMemberships] = useState<MyOrganizationMembershipRow[]>([]);
  const [leaveOrgId, setLeaveOrgId] = useState<string | null>(null);

  const refreshOrgDetails = useCallback(
    async (row: OrganizationRow, uid: string) => {
      if (!cloudClient) return;
      const [mem, inv, seats, links, owned, globalLinked] = await Promise.all([
        organizationAdminListMembers(row.id),
        listOrganizationInvites(row.id),
        countOrganizationSeats(row.id),
        listOrganizationRulesetLinks(row.id),
        listOwnCloudRulesetSummaries(uid),
        listAllLinkedRulesetIds(),
      ]);
      setMembers(mem);
      setInvites(inv);
      setSeatMemberCount(seats.memberCount);
      setSeatPendingCount(seats.pendingInviteCount);
      setLinkedRulesets(links);
      setOwnedCloudRulesets(owned);
      setGloballyLinkedRulesetIds(globalLinked);

      let display: string | null = null;
      if (row.image_url) {
        if (/^https?:\/\//i.test(row.image_url)) {
          display = row.image_url;
        } else {
          display = await getAssetSignedUrl(cloudClient, row.image_url);
        }
      }
      setLogoDisplayUrl(display);
    },
    [],
  );

  const load = useCallback(
    async (opts?: { isCancelled?: () => boolean }) => {
      const drop = () => opts?.isCancelled?.() ?? false;
      if (!userId || !cloudClient) {
        if (!drop()) {
          setLoading(false);
          setOrg(null);
          setPendingForMe([]);
          setMyMemberships([]);
        }
        return;
      }
      if (!drop()) {
        setLoading(true);
        setMessage(null);
      }
      try {
        const [o, pending, memberships] = await Promise.all([
          fetchOrganizationAsAdmin(userId),
          listPendingInvitesForCurrentUser(),
          listMyOrganizationMemberships(),
        ]);
        if (drop()) return;
        setPendingForMe(pending);
        setMyMemberships(memberships);
        setOrg(o);
        if (o) {
          setEditName(o.name);
          setEditSlug(o.slug);
          setEditDesc(o.description);
          await refreshOrgDetails(o, userId);
          if (drop()) return;
        } else {
          setMembers([]);
          setInvites([]);
          setLinkedRulesets([]);
          setOwnedCloudRulesets([]);
          setGloballyLinkedRulesetIds([]);
          setLogoDisplayUrl(null);
        }
      } catch (e) {
        if (!drop()) setMessage({ type: 'err', text: formatOrgSaveError(e) });
      } finally {
        if (!drop()) setLoading(false);
      }
    },
    [userId, refreshOrgDetails],
  );

  useEffect(() => {
    let cancelled = false;
    void load({ isCancelled: () => cancelled });
    return () => {
      cancelled = true;
    };
  }, [load]);

  const pendingInvites = invites.filter((i) => i.status === 'pending');
  const seatFull = isOrganizationSeatFull(seatMemberCount, seatPendingCount);

  const linkableRulesets = ownedCloudRulesets.filter((r) => !globallyLinkedRulesetIds.includes(r.id));

  const handleCreate = async () => {
    if (!userId) return;
    setBusy(true);
    setMessage(null);
    try {
      const created = await createOrganization({
        name: createName,
        slug: createSlug,
        description: createDesc,
        adminUserId: userId,
      });
      if (pendingLogoDataUrl) {
        await uploadOrgLogoAndSetUrl(created.id, pendingLogoDataUrl);
        setPendingLogoDataUrl(null);
      }
      setCreateName('');
      setCreateSlug('');
      setCreateDesc('');
      await load();
      setMessage({ type: 'ok', text: 'Organization created.' });
    } catch (e) {
      setMessage({ type: 'err', text: formatOrgSaveError(e) });
    } finally {
      setBusy(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!org) return;
    setBusy(true);
    setMessage(null);
    try {
      await updateOrganizationProfile(org.id, {
        name: editName,
        slug: editSlug,
        description: editDesc,
      });
      const next = { ...org, name: editName.trim(), slug: editSlug.trim().toLowerCase(), description: editDesc };
      setOrg({ ...org, ...next });
      setMessage({ type: 'ok', text: 'Organization profile saved.' });
    } catch (e) {
      setMessage({ type: 'err', text: formatOrgSaveError(e) });
    } finally {
      setBusy(false);
    }
  };

  const handleLogoFile = async (file: File | null) => {
    if (!file || !org) return;
    setBusy(true);
    setMessage(null);
    try {
      const dataUrl = await readFileAsDataUrl(file);
      assertNotSvgOrganizationLogo(dataUrl);
      await uploadOrgLogoAndSetUrl(org.id, dataUrl);
      const updated = await fetchOrganizationAsAdmin(userId!);
      if (updated) {
        setOrg(updated);
        await refreshOrgDetails(updated, userId!);
      }
      setMessage({ type: 'ok', text: 'Logo updated.' });
    } catch (e) {
      setMessage({
        type: 'err',
        text: e instanceof Error ? e.message : 'Could not upload logo.',
      });
    } finally {
      setBusy(false);
    }
  };

  const handleCreateLogoPick = async (file: File | null) => {
    if (!file) return;
    setMessage(null);
    try {
      const dataUrl = await readFileAsDataUrl(file);
      assertNotSvgOrganizationLogo(dataUrl);
      setPendingLogoDataUrl(dataUrl);
      setLogoDisplayUrl(dataUrl);
    } catch (e) {
      setMessage({
        type: 'err',
        text: e instanceof Error ? e.message : 'Invalid image.',
      });
    }
  };

  const handleClearLogo = async () => {
    if (!org) {
      setPendingLogoDataUrl(null);
      setLogoDisplayUrl(null);
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      await clearOrgLogo(org.id);
      const updated = { ...org, image_url: null };
      setOrg(updated);
      setLogoDisplayUrl(null);
      setPendingLogoDataUrl(null);
    } catch (e) {
      setMessage({ type: 'err', text: formatOrgSaveError(e) });
    } finally {
      setBusy(false);
    }
  };

  const handleInvite = async () => {
    if (!org || !userId) return;
    setBusy(true);
    setMessage(null);
    try {
      await inviteUserToOrganization(org.id, inviteEmail, userId);
      setInviteEmail('');
      setMessage({ type: 'ok', text: 'Invite sent.' });
      const seats = await countOrganizationSeats(org.id);
      setSeatMemberCount(seats.memberCount);
      setSeatPendingCount(seats.pendingInviteCount);
      setInvites(await listOrganizationInvites(org.id));
    } catch (e) {
      setMessage({
        type: 'err',
        text: e instanceof Error ? e.message : 'Invite failed.',
      });
    } finally {
      setBusy(false);
    }
  };

  const handleRevokeInvite = async (inviteId: string) => {
    setBusy(true);
    setMessage(null);
    try {
      await revokeOrganizationInvite(inviteId);
      if (org) {
        const seats = await countOrganizationSeats(org.id);
        setSeatMemberCount(seats.memberCount);
        setSeatPendingCount(seats.pendingInviteCount);
        setInvites(await listOrganizationInvites(org.id));
      }
      setMessage({ type: 'ok', text: 'Invite revoked.' });
    } catch (e) {
      setMessage({ type: 'err', text: formatOrgSaveError(e) });
    } finally {
      setBusy(false);
    }
  };

  const confirmRemoveMember = async () => {
    if (!org || !removeMember) return;
    setBusy(true);
    setMessage(null);
    try {
      await removeOrganizationMember(org.id, removeMember.user_id);
      setRemoveMember(null);
      const seats = await countOrganizationSeats(org.id);
      setSeatMemberCount(seats.memberCount);
      setSeatPendingCount(seats.pendingInviteCount);
      setMembers(await organizationAdminListMembers(org.id));
      setMessage({ type: 'ok', text: 'Member removed.' });
    } catch (e) {
      setMessage({ type: 'err', text: formatOrgSaveError(e) });
    } finally {
      setBusy(false);
    }
  };

  const handleLinkRuleset = async () => {
    if (!org || !userId || !linkRulesetId) return;
    setBusy(true);
    setMessage(null);
    try {
      await linkRulesetToOrganization(org.id, linkRulesetId, userId);
      setLinkRulesetId('');
      setLinkedRulesets(await listOrganizationRulesetLinks(org.id));
      setGloballyLinkedRulesetIds(await listAllLinkedRulesetIds());
      setMessage({ type: 'ok', text: 'Ruleset linked to the organization.' });
    } catch (e) {
      setMessage({
        type: 'err',
        text: e instanceof Error ? e.message : 'Could not link ruleset.',
      });
    } finally {
      setBusy(false);
    }
  };

  const handleUnlinkRuleset = async (rulesetId: string) => {
    if (!org) return;
    setBusy(true);
    setMessage(null);
    try {
      await unlinkRulesetFromOrganization(org.id, rulesetId);
      setLinkedRulesets(await listOrganizationRulesetLinks(org.id));
      setGloballyLinkedRulesetIds(await listAllLinkedRulesetIds());
      setMessage({ type: 'ok', text: 'Ruleset unlinked.' });
    } catch (e) {
      setMessage({ type: 'err', text: formatOrgSaveError(e) });
    } finally {
      setBusy(false);
    }
  };

  const handleDeleteOrg = async () => {
    if (!org) return;
    setBusy(true);
    setMessage(null);
    try {
      await deleteOrganization(org.id);
      setDeleteOrgOpen(false);
      setOrg(null);
      setMembers([]);
      setInvites([]);
      setLinkedRulesets([]);
      setLogoDisplayUrl(null);
      setCreateName('');
      setCreateSlug('');
      setCreateDesc('');
      const [p, m] = await Promise.all([
        listPendingInvitesForCurrentUser(),
        listMyOrganizationMemberships(),
      ]);
      setPendingForMe(p);
      setMyMemberships(m);
      touchCloudRulesetList();
      setMessage({ type: 'ok', text: 'Organization deleted.' });
    } catch (e) {
      setMessage({ type: 'err', text: formatOrgSaveError(e) });
    } finally {
      setBusy(false);
    }
  };

  const handleAcceptInvite = async (inviteId: string) => {
    setBusy(true);
    setMessage(null);
    try {
      await acceptOrganizationInvite(inviteId);
      setPendingForMe(await listPendingInvitesForCurrentUser());
      setMyMemberships(await listMyOrganizationMemberships());
      touchCloudRulesetList();
      setMessage({ type: 'ok', text: 'You joined the organization. Shared cloud rulesets appear in your cloud list when you open it.' });
    } catch (e) {
      setMessage({ type: 'err', text: formatOrgSaveError(e) });
    } finally {
      setBusy(false);
    }
  };

  const handleDismissInvite = async (inviteId: string) => {
    setBusy(true);
    setMessage(null);
    try {
      await dismissOrganizationInvite(inviteId);
      setPendingForMe(await listPendingInvitesForCurrentUser());
      setMessage({ type: 'ok', text: 'Invite dismissed.' });
    } catch (e) {
      setMessage({ type: 'err', text: formatOrgSaveError(e) });
    } finally {
      setBusy(false);
    }
  };

  const confirmLeaveOrganization = async () => {
    if (!leaveOrgId) return;
    setBusy(true);
    setMessage(null);
    try {
      await leaveOrganization(leaveOrgId);
      setLeaveOrgId(null);
      setMyMemberships(await listMyOrganizationMemberships());
      touchCloudRulesetList();
      setMessage({ type: 'ok', text: 'You left the organization.' });
    } catch (e) {
      setMessage({ type: 'err', text: formatOrgSaveError(e) });
    } finally {
      setBusy(false);
    }
  };

  const otherMemberships = org
    ? myMemberships.filter((m) => m.organization_id !== org.id)
    : myMemberships;

  const membershipCanLeave = (m: MyOrganizationMembershipRow) =>
    m.organizations != null && m.organizations.admin_user_id !== userId;

  if (!cloudClient || !userId) {
    return (
      <p className='text-sm text-muted-foreground'>
        Sign in to Quest Bound Cloud to manage an organization.
      </p>
    );
  }

  if (loading) {
    return (
      <div className='flex items-center gap-2 text-sm text-muted-foreground'>
        <Loader2 className='size-4 animate-spin' />
        Loading organization…
      </div>
    );
  }

  return (
    <div className='flex max-w-2xl flex-col gap-6'>
      {message && (
        <div
          role='status'
          className={cn(
            'rounded-md border px-3 py-2 text-sm',
            message.type === 'ok'
              ? 'border-border bg-muted/40 text-foreground'
              : 'border-destructive/40 bg-destructive/10 text-destructive',
          )}>
          {message.text}
        </div>
      )}

      {pendingForMe.length > 0 ? (
        <div className='flex flex-col gap-3 rounded-lg border p-4'>
          <h4 className='text-sm font-medium'>Pending invitations</h4>
          <p className='text-sm text-muted-foreground'>
            Accept to join and sync shared cloud rulesets with that organization. Dismiss if you are not
            interested.
          </p>
          <ul className='divide-y rounded-md border text-sm'>
            {pendingForMe.map((inv) => (
              <li
                key={inv.id}
                className='flex flex-col gap-3 px-3 py-3 sm:flex-row sm:items-center sm:justify-between'>
                <div>
                  <div className='font-medium'>{inv.organizations?.name ?? 'Organization'}</div>
                  {inv.organizations?.slug ? (
                    <div className='text-muted-foreground text-xs'>Slug: {inv.organizations.slug}</div>
                  ) : null}
                </div>
                <div className='flex shrink-0 flex-wrap gap-2'>
                  <Button type='button' disabled={busy} onClick={() => void handleAcceptInvite(inv.id)}>
                    Accept
                  </Button>
                  <Button
                    type='button'
                    variant='outline'
                    disabled={busy}
                    onClick={() => void handleDismissInvite(inv.id)}>
                    Dismiss
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {!org ? (
        <div className='flex flex-col gap-8'>
          {myMemberships.length > 0 ? (
            <div className='flex flex-col gap-3'>
              <h3 className='text-lg font-medium'>Organizations you’re in</h3>
              <p className='text-sm text-muted-foreground'>
                Leave an organization to stop syncing its linked cloud rulesets on this account.
              </p>
              <ul className='divide-y rounded-md border text-sm'>
                {myMemberships.map((m) => (
                  <li
                    key={m.organization_id}
                    className='flex flex-col gap-2 px-3 py-3 sm:flex-row sm:items-center sm:justify-between'>
                    <div>
                      <div className='font-medium'>{m.organizations?.name ?? m.organization_id}</div>
                      {m.organizations?.slug ? (
                        <div className='text-muted-foreground text-xs'>{m.organizations.slug}</div>
                      ) : null}
                    </div>
                    {membershipCanLeave(m) ? (
                      <Button
                        type='button'
                        variant='outline'
                        size='sm'
                        className='w-fit shrink-0'
                        onClick={() => setLeaveOrgId(m.organization_id)}>
                        Leave
                      </Button>
                    ) : (
                      <p className='text-muted-foreground w-fit text-xs sm:text-right'>You administer this organization.</p>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <div className='flex flex-col gap-4'>
            <div>
              <h3 className='text-lg font-medium'>Create an organization</h3>
              <p className='text-sm text-muted-foreground'>
                You can administer one organization. Members get full sync access to linked cloud
                rulesets.
              </p>
            </div>
          <div className='grid gap-2'>
            <Label htmlFor='org-create-name'>Name</Label>
            <Input
              id='org-create-name'
              value={createName}
              onChange={(e) => setCreateName(e.target.value)}
              autoComplete='organization'
            />
          </div>
          <div className='grid gap-2'>
            <Label htmlFor='org-create-slug'>Slug (internal)</Label>
            <Input
              id='org-create-slug'
              value={createSlug}
              onChange={(e) => setCreateSlug(e.target.value.toLowerCase())}
              placeholder='my-group'
            />
          </div>
          <DescriptionEditor
            id='org-create-desc'
            label='Description (optional)'
            value={createDesc}
            onChange={setCreateDesc}
            disabled={busy}
            placeholder='No description yet.'
          />
          <div className='grid gap-2'>
            <Label htmlFor='org-create-logo'>Logo (optional, no SVG)</Label>
            <Input
              id='org-create-logo'
              type='file'
              accept='image/*'
              onChange={(e) => void handleCreateLogoPick(e.target.files?.[0] ?? null)}
            />
            {logoDisplayUrl && !org ? (
              <div className='flex items-center gap-2'>
                <img src={logoDisplayUrl} alt='' className='size-16 rounded-md border object-cover' />
                <Button type='button' variant='outline' size='sm' onClick={handleClearLogo}>
                  Remove
                </Button>
              </div>
            ) : null}
          </div>
          <Button type='button' disabled={busy} onClick={() => void handleCreate()}>
            {busy ? (
              <>
                <Loader2 className='mr-2 size-4 animate-spin' />
                Creating…
              </>
            ) : (
              'Create organization'
            )}
          </Button>
          </div>
        </div>
      ) : (
        <>
          <div>
            <h3 className='text-lg font-medium'>{org.name}</h3>
            <p className='text-sm text-muted-foreground'>You are the organization admin.</p>
          </div>

          <Tabs defaultValue='details' className='w-full'>
            <TabsList className='grid w-full max-w-2xl grid-cols-3'>
              <TabsTrigger value='details' className='gap-1.5 px-2 sm:gap-2 sm:px-3'>
                <FileText className='size-4 shrink-0' />
                <span className='truncate'>Details</span>
              </TabsTrigger>
              <TabsTrigger value='members' className='gap-1.5 px-2 sm:gap-2 sm:px-3'>
                <Users className='size-4 shrink-0' />
                <span className='truncate'>Members</span>
              </TabsTrigger>
              <TabsTrigger value='content' className='gap-1.5 px-2 sm:gap-2 sm:px-3'>
                <Library className='size-4 shrink-0' />
                <span className='truncate'>Content</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value='details' className='mt-4 flex flex-col gap-6'>
              <div className='flex flex-col gap-4'>
                <h4 className='text-sm font-medium'>Profile</h4>
                <div className='grid gap-2'>
                  <Label htmlFor='org-edit-name'>Name</Label>
                  <Input id='org-edit-name' value={editName} onChange={(e) => setEditName(e.target.value)} />
                </div>
                <div className='grid gap-2'>
                  <Label htmlFor='org-edit-slug'>Slug</Label>
                  <Input
                    id='org-edit-slug'
                    value={editSlug}
                    onChange={(e) => setEditSlug(e.target.value.toLowerCase())}
                  />
                </div>
                <DescriptionEditor
                  id='org-edit-desc'
                  value={editDesc}
                  onChange={setEditDesc}
                  disabled={busy}
                  placeholder='No description yet.'
                />
                <div className='grid gap-2'>
                  <Label htmlFor='org-edit-logo'>Logo (no SVG)</Label>
                  <Input
                    id='org-edit-logo'
                    type='file'
                    accept='image/*'
                    onChange={(e) => void handleLogoFile(e.target.files?.[0] ?? null)}
                  />
                  {logoDisplayUrl ? (
                    <div className='flex items-center gap-2'>
                      <img src={logoDisplayUrl} alt='' className='size-16 rounded-md border object-cover' />
                      <Button type='button' variant='outline' size='sm' onClick={() => void handleClearLogo()}>
                        Remove logo
                      </Button>
                    </div>
                  ) : null}
                </div>
                <Button type='button' variant='secondary' disabled={busy} onClick={() => void handleSaveProfile()}>
                  Save profile
                </Button>
              </div>

              <div className='flex flex-col gap-3'>
                <h4 className='text-sm font-medium text-destructive'>Danger zone</h4>
                <p className='text-sm text-muted-foreground'>
                  Deleting the organization removes all members and invites and unlinks all rulesets.
                  Local copies of rulesets stay on each device.
                </p>
                <AlertDialog open={deleteOrgOpen} onOpenChange={setDeleteOrgOpen}>
                  <AlertDialogTrigger asChild>
                    <Button type='button' variant='destructive' disabled={busy} className='w-fit'>
                      Delete organization
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete this organization?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This cannot be undone. Members lose cloud access to linked rulesets; pending invites
                        are removed.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <Button
                        type='button'
                        variant='destructive'
                        disabled={busy}
                        onClick={() => void handleDeleteOrg()}>
                        {busy ? 'Deleting…' : 'Delete organization'}
                      </Button>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </TabsContent>

            <TabsContent value='content' className='mt-4 flex flex-col gap-3'>
              <h4 className='text-sm font-medium'>Linked cloud rulesets</h4>
              <p className='text-sm text-muted-foreground'>
                Only rulesets you own in the cloud can be linked. Each ruleset can belong to at most one
                organization.
              </p>
              {linkedRulesets.length ? (
                <ul className='divide-y rounded-md border text-sm'>
                  {linkedRulesets.map((l) => {
                    const title = ownedCloudRulesets.find((r) => r.id === l.ruleset_id)?.title;
                    return (
                      <li key={l.ruleset_id} className='flex items-center justify-between gap-2 px-3 py-2'>
                        <span className='truncate'>
                          {title ?? l.ruleset_id}
                          <span className='ml-2 text-muted-foreground font-mono text-xs'>{l.ruleset_id}</span>
                        </span>
                        <Button
                          type='button'
                          variant='outline'
                          size='sm'
                          disabled={busy}
                          onClick={() => void handleUnlinkRuleset(l.ruleset_id)}>
                          Unlink
                        </Button>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className='text-sm text-muted-foreground'>No linked rulesets.</p>
              )}
              {linkableRulesets.length ? (
                <div className='flex flex-wrap items-end gap-2'>
                  <div className='grid gap-2 min-w-[220px]'>
                    <Label>Link ruleset</Label>
                    <Select value={linkRulesetId || undefined} onValueChange={setLinkRulesetId}>
                      <SelectTrigger className='w-full min-w-[220px]'>
                        <SelectValue placeholder='Choose a ruleset…' />
                      </SelectTrigger>
                      <SelectContent>
                        {linkableRulesets.map((r) => (
                          <SelectItem key={r.id} value={r.id}>
                            {r.title || r.id}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button
                    type='button'
                    disabled={busy || !linkRulesetId}
                    onClick={() => void handleLinkRuleset()}>
                    Link
                  </Button>
                </div>
              ) : (
                <p className='text-sm text-muted-foreground'>
                  No eligible cloud rulesets to link (all owned rulesets may already be linked
                  elsewhere).
                </p>
              )}
            </TabsContent>

            <TabsContent value='members' className='mt-4 flex flex-col gap-8'>
              <div className='flex flex-col gap-3'>
                <h4 className='text-sm font-medium'>Invites</h4>
                <p className='text-sm text-muted-foreground'>
                  Seats in use: {seatMemberCount + seatPendingCount} of 4 (plus you as admin). Pending
                  invites count toward the cap. No email is sent — share the invite in your own channel.
                </p>
                <div className='flex flex-wrap items-end gap-2'>
                  <div className='grid flex-1 gap-2 min-w-[200px]'>
                    <Label htmlFor='org-invite-email'>Email</Label>
                    <Input
                      id='org-invite-email'
                      type='email'
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      placeholder='player@example.com'
                      disabled={seatFull}
                    />
                  </div>
                  <Button type='button' disabled={busy || seatFull || !inviteEmail.trim()} onClick={() => void handleInvite()}>
                    Invite
                  </Button>
                </div>
                {seatFull ? (
                  <p className='text-sm text-amber-600 dark:text-amber-500'>
                    Seat limit reached. Revoke a pending invite or remove a member to invite someone new.
                  </p>
                ) : null}
                {pendingInvites.length ? (
                  <ul className='divide-y rounded-md border text-sm'>
                    {pendingInvites.map((inv) => (
                      <li key={inv.id} className='flex items-center justify-between gap-2 px-3 py-2'>
                        <span className='truncate'>{inv.invitee_email_normalized}</span>
                        <Button
                          type='button'
                          variant='outline'
                          size='sm'
                          disabled={busy}
                          onClick={() => void handleRevokeInvite(inv.id)}>
                          Revoke
                        </Button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className='text-sm text-muted-foreground'>No pending invites.</p>
                )}
              </div>

              <div className='flex flex-col gap-3'>
                <h4 className='text-sm font-medium'>Members</h4>
                {members.length ? (
                  <ul className='divide-y rounded-md border text-sm'>
                    {members.map((m) => (
                      <li key={m.user_id} className='flex items-center justify-between gap-2 px-3 py-2'>
                        <span className='truncate'>{m.email}</span>
                        <Button type='button' variant='outline' size='sm' onClick={() => setRemoveMember(m)}>
                          Remove
                        </Button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className='text-sm text-muted-foreground'>No members yet besides you.</p>
                )}
              </div>
            </TabsContent>
          </Tabs>

          {otherMemberships.length > 0 ? (
            <div className='flex flex-col gap-3'>
              <h4 className='text-sm font-medium'>Other organizations</h4>
              <p className='text-sm text-muted-foreground'>
                Groups where you are a member (not the one you administer above).
              </p>
              <ul className='divide-y rounded-md border text-sm'>
                {otherMemberships.map((m) => (
                  <li
                    key={m.organization_id}
                    className='flex flex-col gap-2 px-3 py-3 sm:flex-row sm:items-center sm:justify-between'>
                    <div>
                      <div className='font-medium'>{m.organizations?.name ?? m.organization_id}</div>
                      {m.organizations?.slug ? (
                        <div className='text-muted-foreground text-xs'>{m.organizations.slug}</div>
                      ) : null}
                    </div>
                    {membershipCanLeave(m) ? (
                      <Button
                        type='button'
                        variant='outline'
                        size='sm'
                        className='w-fit shrink-0'
                        onClick={() => setLeaveOrgId(m.organization_id)}>
                        Leave
                      </Button>
                    ) : null}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </>
      )}

      <AlertDialog open={!!removeMember} onOpenChange={(o) => !o && setRemoveMember(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove member?</AlertDialogTitle>
            <AlertDialogDescription>
              {removeMember
                ? `${removeMember.email} will lose access to this organization’s linked rulesets in the cloud.`
                : ''}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <Button type='button' variant='destructive' disabled={busy} onClick={() => void confirmRemoveMember()}>
              {busy ? 'Removing…' : 'Remove'}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!leaveOrgId} onOpenChange={(o) => !o && setLeaveOrgId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Leave this organization?</AlertDialogTitle>
            <AlertDialogDescription>
              You will lose cloud access to rulesets linked to this organization. Local copies stay on
              your devices.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <Button type='button' variant='destructive' disabled={busy} onClick={() => void confirmLeaveOrganization()}>
              {busy ? 'Leaving…' : 'Leave organization'}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
