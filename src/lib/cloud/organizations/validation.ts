import DOMPurify from 'dompurify';

/** Mirrors DB check: organizations_slug_format_chk */
export const ORG_SLUG_PATTERN = /^[a-z0-9-]{3,30}$/;

const EMOJI_RE = /\p{Extended_Pictographic}/u;
const ORG_NAME_CHARS_RE = /^[\p{Script=Latin}0-9\s\-_'.,()&]+$/u;

const DESCRIPTION_ALLOWED_TAGS = [
  'p',
  'br',
  'strong',
  'em',
  'b',
  'i',
  'a',
  'ul',
  'ol',
  'li',
  'code',
  'pre',
  'h1',
  'h2',
  'h3',
];
const DESCRIPTION_ALLOWED_ATTR = ['href', 'target', 'rel'];

export function normalizeInviteEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function validateOrgSlug(slug: string): string | null {
  const s = slug.trim().toLowerCase();
  if (!ORG_SLUG_PATTERN.test(s)) {
    return 'Slug must be 3–30 characters: lowercase letters, digits, and hyphens only.';
  }
  return null;
}

export function validateOrgName(name: string): string | null {
  const t = name.trim();
  if (!t) return 'Organization name is required.';
  if (EMOJI_RE.test(t)) return 'Organization name cannot include emoji.';
  if (!ORG_NAME_CHARS_RE.test(t)) {
    return 'Use Latin letters, numbers, spaces, and basic punctuation only.';
  }
  return null;
}

export function sanitizeOrgDescription(raw: string): string {
  return DOMPurify.sanitize(raw, {
    ALLOWED_TAGS: DESCRIPTION_ALLOWED_TAGS,
    ALLOWED_ATTR: DESCRIPTION_ALLOWED_ATTR,
  });
}

export function previewSanitizedOrgDescription(raw: string): string {
  return sanitizeOrgDescription(raw);
}
