import { describe, expect, it } from 'vitest';
import { fontDataToAbsoluteOrDataUrl } from './use-font-loader';

describe('fontDataToAbsoluteOrDataUrl', () => {
  it('returns null for nullish or bogus string markers', () => {
    expect(fontDataToAbsoluteOrDataUrl(null)).toBeNull();
    expect(fontDataToAbsoluteOrDataUrl(undefined)).toBeNull();
    expect(fontDataToAbsoluteOrDataUrl('')).toBeNull();
    expect(fontDataToAbsoluteOrDataUrl('   ')).toBeNull();
    expect(fontDataToAbsoluteOrDataUrl('null')).toBeNull();
    expect(fontDataToAbsoluteOrDataUrl('undefined')).toBeNull();
  });

  it('accepts data URLs, blob URLs, root paths, and http(s)', () => {
    expect(fontDataToAbsoluteOrDataUrl('data:font/woff2;base64,abcd')).toBe(
      'data:font/woff2;base64,abcd',
    );
    expect(fontDataToAbsoluteOrDataUrl('blob:https://x/uuid')).toBe('blob:https://x/uuid');
    expect(fontDataToAbsoluteOrDataUrl('/assets/x.woff2')).toBe('/assets/x.woff2');
    expect(fontDataToAbsoluteOrDataUrl('https://cdn/x.woff2')).toBe('https://cdn/x.woff2');
    expect(fontDataToAbsoluteOrDataUrl('HTTP://x/y')).toBe('HTTP://x/y');
  });

  it('rejects relative paths that would resolve against the current route', () => {
    expect(fontDataToAbsoluteOrDataUrl('foo.woff2')).toBeNull();
    expect(fontDataToAbsoluteOrDataUrl('./foo.woff2')).toBeNull();
  });
});
