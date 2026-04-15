import { describe, expect, it } from 'vitest';
import {
  createParamsHelperFromRecord,
} from '@/lib/compass-logic/runtime/params-helper';

describe('createParamsHelperFromRecord', () => {
  it('returns null for missing names', () => {
    const helper = createParamsHelperFromRecord({ foo: 1 });
    expect(helper.get('bar')).toBeNull();
    expect(helper.get('')).toBeNull();
  });

  it('looks up keys case-insensitively and trims whitespace', () => {
    const helper = createParamsHelperFromRecord({
      '  Name  ': 'Alice',
      Count: 3,
    });

    expect(helper.get('name')).toBe('Alice');
    expect(helper.get(' NAME ')).toBe('Alice');
    expect(helper.get('count')).toBe(3);
    expect(helper.get(' CoUnT ')).toBe(3);
  });

  it('treats undefined and missing entries as null', () => {
    const helper = createParamsHelperFromRecord({ foo: undefined });
    expect(helper.get('foo')).toBeNull();
  });

  it('handles null or undefined records gracefully', () => {
    const h1 = createParamsHelperFromRecord(null as any);
    const h2 = createParamsHelperFromRecord(undefined as any);

    expect(h1.get('anything')).toBeNull();
    expect(h2.get('anything')).toBeNull();
  });
});

