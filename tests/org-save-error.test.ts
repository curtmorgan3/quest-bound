import { describe, expect, it } from 'vitest';

import { formatOrgSaveError } from '@/lib/cloud/organizations/org-api';

describe('formatOrgSaveError', () => {
  it('maps one-admin-per-user unique violation', () => {
    expect(
      formatOrgSaveError({
        code: '23505',
        message: 'duplicate key value violates unique constraint "organizations_one_admin_per_user"',
      }),
    ).toBe('You already administer an organization. Delete it before creating another.');
  });

  it('maps duplicate name index', () => {
    expect(
      formatOrgSaveError({
        code: '23505',
        message: 'duplicate key value violates unique constraint "organizations_name_lower_uidx"',
      }),
    ).toBe('That organization name is already taken.');
  });

  it('maps duplicate slug index', () => {
    expect(
      formatOrgSaveError({
        code: '23505',
        message: 'duplicate key value violates unique constraint "organizations_slug_lower_uidx"',
      }),
    ).toBe('That slug is already taken.');
  });

  it('falls back for unknown unique violation', () => {
    expect(
      formatOrgSaveError({
        code: '23505',
        message: 'duplicate key value violates unique constraint "other"',
      }),
    ).toBe('That name or slug is already taken. Try another.');
  });
});
