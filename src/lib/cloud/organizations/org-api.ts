import type { SupabaseClient } from '@supabase/supabase-js';

import { getSession } from '@/lib/cloud/auth';
import { cloudClient } from '@/lib/cloud/client';
import { ASSETS_BUCKET, uploadOrganizationLogoToStorage } from '@/lib/cloud/sync/sync-assets';

import {
  normalizeInviteEmail,
  sanitizeOrgDescription,
  validateOrgName,
  validateOrgSlug,
} from './validation';

export type OrganizationRow = {
  id: string;
  name: string;
  slug: string;
  description: string;
  image_url: string | null;
  admin_user_id: string;
  created_at: string;
  updated_at: string;
};

export type OrganizationMemberRow = {
  user_id: string;
  email: string;
  joined_at: string;
};

export type OrganizationInviteRow = {
  id: string;
  organization_id: string;
  invitee_email_normalized: string;
  invited_by: string;
  status: string;
  created_at: string;
};

export type OrganizationRulesetLinkRow = {
  organization_id: string;
  ruleset_id: string;
  owner_user_id: string;
  created_at: string;
};

function requireClient(): SupabaseClient {
  if (!cloudClient) throw new Error('Cloud is not configured');
  return cloudClient;
}

/** Coalesce concurrent fetches (e.g. React Strict Mode double-mount) into one HTTP request per user. */
const fetchOrganizationAsAdminInflight = new Map<string, Promise<OrganizationRow | null>>();

export async function fetchOrganizationAsAdmin(
  adminUserId: string,
): Promise<OrganizationRow | null> {
  const existing = fetchOrganizationAsAdminInflight.get(adminUserId);
  if (existing) return existing;

  const client = requireClient();
  const promise = (async () => {
    const { data, error } = await client
      .from('organizations')
      .select('*')
      .eq('admin_user_id', adminUserId)
      .maybeSingle();
    if (error) throw error;
    return (data as OrganizationRow | null) ?? null;
  })().finally(() => {
    fetchOrganizationAsAdminInflight.delete(adminUserId);
  });

  fetchOrganizationAsAdminInflight.set(adminUserId, promise);
  return promise;
}

export interface CreateOrganizationInput {
  name: string;
  slug: string;
  description?: string;
  adminUserId: string;
}

export async function createOrganization(input: CreateOrganizationInput): Promise<OrganizationRow> {
  const nameErr = validateOrgName(input.name);
  if (nameErr) throw new Error(nameErr);
  const slugErr = validateOrgSlug(input.slug);
  if (slugErr) throw new Error(slugErr);

  const client = requireClient();
  const description = sanitizeOrgDescription(input.description ?? '');
  const { data, error } = await client
    .from('organizations')
    .insert({
      name: input.name.trim(),
      slug: input.slug.trim().toLowerCase(),
      description,
      admin_user_id: input.adminUserId,
    })
    .select('*')
    .single();
  if (error) throw error;
  return data as OrganizationRow;
}

export interface UpdateOrganizationProfileInput {
  name?: string;
  slug?: string;
  description?: string;
  image_url?: string | null;
}

export async function updateOrganizationProfile(
  organizationId: string,
  patch: UpdateOrganizationProfileInput,
): Promise<void> {
  const client = requireClient();
  const row: Record<string, unknown> = {};
  if (patch.name !== undefined) {
    const err = validateOrgName(patch.name);
    if (err) throw new Error(err);
    row.name = patch.name.trim();
  }
  if (patch.slug !== undefined) {
    const err = validateOrgSlug(patch.slug);
    if (err) throw new Error(err);
    row.slug = patch.slug.trim().toLowerCase();
  }
  if (patch.description !== undefined) {
    row.description = sanitizeOrgDescription(patch.description);
  }
  if (patch.image_url !== undefined) {
    row.image_url = patch.image_url;
  }
  if (Object.keys(row).length === 0) return;
  const { error } = await client.from('organizations').update(row).eq('id', organizationId);
  if (error) throw error;
}

export async function deleteOrganization(organizationId: string): Promise<void> {
  const client = requireClient();
  const { error } = await client.from('organizations').delete().eq('id', organizationId);
  if (error) throw error;
}

export async function getAssetSignedUrl(
  client: SupabaseClient,
  storagePath: string,
  expiresInSec = 3600,
): Promise<string | null> {
  const { data, error } = await client.storage
    .from(ASSETS_BUCKET)
    .createSignedUrl(storagePath, expiresInSec);
  if (error || !data?.signedUrl) return null;
  return data.signedUrl;
}

export async function uploadOrgLogoAndSetUrl(
  organizationId: string,
  dataUrl: string,
): Promise<string> {
  const client = requireClient();
  const path = await uploadOrganizationLogoToStorage(client, organizationId, dataUrl);
  const { error } = await client
    .from('organizations')
    .update({ image_url: path })
    .eq('id', organizationId);
  if (error) throw error;
  return path;
}

export async function clearOrgLogo(organizationId: string): Promise<void> {
  const client = requireClient();
  const { error } = await client
    .from('organizations')
    .update({ image_url: null })
    .eq('id', organizationId);
  if (error) throw error;
}

export async function organizationAdminListMembers(
  organizationId: string,
): Promise<OrganizationMemberRow[]> {
  const client = requireClient();
  const { data, error } = await client.rpc('organization_admin_list_members', {
    p_organization_id: organizationId,
  });
  if (error) throw error;
  const rows = (data ?? []) as { user_id: string; email: string; joined_at: string }[];
  return rows.map((r) => ({
    user_id: r.user_id,
    email: r.email,
    joined_at: r.joined_at,
  }));
}

export async function removeOrganizationMember(
  organizationId: string,
  memberUserId: string,
): Promise<void> {
  const client = requireClient();
  const { error } = await client
    .from('organization_members')
    .delete()
    .eq('organization_id', organizationId)
    .eq('user_id', memberUserId);
  if (error) throw error;
}

export async function listOrganizationInvites(
  organizationId: string,
): Promise<OrganizationInviteRow[]> {
  const client = requireClient();
  const { data, error } = await client
    .from('organization_invites')
    .select('*')
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as OrganizationInviteRow[];
}

export async function countOrganizationSeats(organizationId: string): Promise<{
  memberCount: number;
  pendingInviteCount: number;
}> {
  const client = requireClient();
  const [mRes, iRes] = await Promise.all([
    client
      .from('organization_members')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', organizationId),
    client
      .from('organization_invites')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', organizationId)
      .eq('status', 'pending'),
  ]);
  if (mRes.error) throw mRes.error;
  if (iRes.error) throw iRes.error;
  return {
    memberCount: mRes.count ?? 0,
    pendingInviteCount: iRes.count ?? 0,
  };
}

const SEAT_CAP_NON_ADMIN = 4;

export function isOrganizationSeatFull(memberCount: number, pendingInviteCount: number): boolean {
  return memberCount + pendingInviteCount >= SEAT_CAP_NON_ADMIN;
}

export async function inviteUserToOrganization(
  organizationId: string,
  emailRaw: string,
  adminUserId: string,
): Promise<void> {
  const normalized = normalizeInviteEmail(emailRaw);
  if (!normalized || !normalized.includes('@')) {
    throw new Error('Enter a valid email address.');
  }

  const client = requireClient();

  const { data: inviteeId, error: rpcError } = await client.rpc(
    'find_auth_user_id_by_email_for_org_invite',
    {
      p_organization_id: organizationId,
      p_email: normalized,
    },
  );
  if (rpcError) throw rpcError;
  if (!inviteeId) {
    throw new Error('No Quest Bound account exists for that email. The person must sign up first.');
  }
  if (inviteeId === adminUserId) {
    throw new Error('You cannot invite yourself.');
  }

  const { data: alreadyMember } = await client
    .from('organization_members')
    .select('user_id')
    .eq('organization_id', organizationId)
    .eq('user_id', inviteeId)
    .maybeSingle();
  if (alreadyMember) {
    throw new Error('That user is already a member.');
  }

  const { error } = await client.from('organization_invites').insert({
    organization_id: organizationId,
    invitee_email_normalized: normalized,
    invited_by: adminUserId,
    status: 'pending',
  });
  if (error) {
    if (error.code === '23505') {
      throw new Error('A pending invite already exists for that email.');
    }
    if (error.message?.includes('seat limit')) {
      throw new Error('Organization is full (admin plus up to four members or pending invites).');
    }
    throw error;
  }
}

export async function revokeOrganizationInvite(inviteId: string): Promise<void> {
  const client = requireClient();
  const { error } = await client
    .from('organization_invites')
    .update({ status: 'revoked' })
    .eq('id', inviteId)
    .eq('status', 'pending');
  if (error) throw error;
}

export async function listOrganizationRulesetLinks(
  organizationId: string,
): Promise<OrganizationRulesetLinkRow[]> {
  const client = requireClient();
  const { data, error } = await client
    .from('organization_rulesets')
    .select('*')
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as OrganizationRulesetLinkRow[];
}

export async function listOwnCloudRulesetSummaries(
  ownerUserId: string,
): Promise<{ id: string; title: string }[]> {
  const client = requireClient();
  const { data, error } = await client
    .from('rulesets')
    .select('id, title')
    .eq('user_id', ownerUserId)
    .order('title');
  if (error) throw error;
  return (data ?? []) as { id: string; title: string }[];
}

export async function listAllLinkedRulesetIds(): Promise<string[]> {
  const client = requireClient();
  const { data, error } = await client.from('organization_rulesets').select('ruleset_id');
  if (error) throw error;
  return (data ?? []).map((r) => (r as { ruleset_id: string }).ruleset_id);
}

export async function linkRulesetToOrganization(
  organizationId: string,
  rulesetId: string,
  ownerUserId: string,
): Promise<void> {
  const client = requireClient();
  const { error } = await client.from('organization_rulesets').insert({
    organization_id: organizationId,
    ruleset_id: rulesetId,
    owner_user_id: ownerUserId,
  });
  if (error) throw error;
}

export async function unlinkRulesetFromOrganization(
  organizationId: string,
  rulesetId: string,
): Promise<void> {
  const client = requireClient();
  const { error } = await client
    .from('organization_rulesets')
    .delete()
    .eq('organization_id', organizationId)
    .eq('ruleset_id', rulesetId);
  if (error) throw error;
}

export type OrganizationSummary = Pick<OrganizationRow, 'id' | 'name' | 'slug' | 'admin_user_id'>;

export type PendingInviteForUserRow = OrganizationInviteRow & {
  organizations: OrganizationSummary | null;
};

export type MyOrganizationMembershipRow = {
  organization_id: string;
  joined_at: string;
  organizations: OrganizationSummary | null;
};

/**
 * Pending invites addressed to the signed-in user's email (also filters client-side so org admins
 * only see their own pending invites in this list, not every invite they can read via RLS).
 */
export async function listPendingInvitesForCurrentUser(): Promise<PendingInviteForUserRow[]> {
  const client = requireClient();
  const session = await getSession();
  const emailNorm = normalizeInviteEmail(session?.user?.email ?? '');
  if (!emailNorm) return [];

  const { data, error } = await client
    .from('organization_invites')
    .select(
      'id, organization_id, invitee_email_normalized, invited_by, status, created_at, organizations(id, name, slug, admin_user_id)',
    )
    .eq('status', 'pending');
  if (error) throw error;
  const rows = (data ?? []) as unknown as PendingInviteForUserRow[];
  return rows.filter((r) => r.invitee_email_normalized === emailNorm);
}

export async function listMyOrganizationMemberships(): Promise<MyOrganizationMembershipRow[]> {
  const client = requireClient();
  const session = await getSession();
  const uid = session?.user?.id;
  if (!uid) return [];

  const { data, error } = await client
    .from('organization_members')
    .select('organization_id, created_at, organizations(id, name, slug, admin_user_id)')
    .eq('user_id', uid);
  if (error) throw error;
  return (
    (data ?? []) as unknown as {
      organization_id: string;
      created_at: string;
      organizations: OrganizationSummary | null;
    }[]
  ).map((r) => ({
    organization_id: r.organization_id,
    joined_at: r.created_at,
    organizations: r.organizations,
  }));
}

export async function acceptOrganizationInvite(inviteId: string): Promise<void> {
  const client = requireClient();
  const { error } = await client.rpc('accept_organization_invite', { p_invite_id: inviteId });
  if (error) throw error;
}

export async function dismissOrganizationInvite(inviteId: string): Promise<void> {
  const client = requireClient();
  const { error } = await client
    .from('organization_invites')
    .update({ status: 'dismissed' })
    .eq('id', inviteId)
    .eq('status', 'pending');
  if (error) throw error;
}

/** Removes the current user from an organization. Fails via RLS if they are the org admin. */
export async function leaveOrganization(organizationId: string): Promise<void> {
  const client = requireClient();
  const session = await getSession();
  const uid = session?.user?.id;
  if (!uid) throw new Error('Not signed in');

  const { error } = await client
    .from('organization_members')
    .delete()
    .eq('organization_id', organizationId)
    .eq('user_id', uid);
  if (error) throw error;
}

export function isUniqueViolation(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    (err as { code: string }).code === '23505'
  );
}

export function formatOrgSaveError(err: unknown): string {
  if (isUniqueViolation(err)) {
    return 'That name or slug is already taken. Try another.';
  }
  if (err instanceof Error) return err.message;
  if (err && typeof err === 'object' && 'message' in err) {
    return String((err as { message: string }).message);
  }
  return 'Something went wrong.';
}
