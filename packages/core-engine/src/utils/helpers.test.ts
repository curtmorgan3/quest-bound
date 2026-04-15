import { describe, it, expect, beforeEach, vi } from 'vitest';
import { generateId, isRunningLocally } from '@/utils/helpers';

describe('generateId', () => {
  it('should return a valid UUID format without context', () => {
    const id = generateId();
    // UUID v4 format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    expect(id).toMatch(uuidRegex);
  });

  it('should return context-uuid format with context', () => {
    const context = 'test';
    const id = generateId(context);
    expect(id).toMatch(/^test-[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
  });

  it('should return different IDs on multiple calls', () => {
    const id1 = generateId();
    const id2 = generateId();
    const id3 = generateId();
    expect(id1).not.toBe(id2);
    expect(id2).not.toBe(id3);
    expect(id1).not.toBe(id3);
  });

  it('should return different IDs with same context', () => {
    const id1 = generateId('context');
    const id2 = generateId('context');
    expect(id1).not.toBe(id2);
    expect(id1.startsWith('context-')).toBe(true);
    expect(id2.startsWith('context-')).toBe(true);
  });

  it('should handle various context strings', () => {
    const contexts = ['user', 'item', 'quest', 'character-123'];
    contexts.forEach((context) => {
      const id = generateId(context);
      expect(id.startsWith(`${context}-`)).toBe(true);
    });
  });

  it('should validate UUID format for multiple generations', () => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    for (let i = 0; i < 10; i++) {
      const id = generateId();
      expect(id).toMatch(uuidRegex);
    }
  });
});

describe('isRunningLocally', () => {
  beforeEach(() => {
    // Reset window.location mock before each test
    vi.stubGlobal('window', {
      location: {
        href: '',
      },
    });
  });

  it('should return true when URL contains localhost', () => {
    vi.stubGlobal('window', {
      location: {
        href: 'http://localhost:5173',
      },
    });
    expect(isRunningLocally()).toBe(true);
  });

  it('should return false when URL does not contain localhost', () => {
    vi.stubGlobal('window', {
      location: {
        href: 'https://app.questbound.com',
      },
    });
    expect(isRunningLocally()).toBe(false);
  });

  it('should return true for localhost with different ports', () => {
    vi.stubGlobal('window', {
      location: {
        href: 'http://localhost:3000',
      },
    });
    expect(isRunningLocally()).toBe(true);
  });

  it('should return true for localhost without port', () => {
    vi.stubGlobal('window', {
      location: {
        href: 'http://localhost',
      },
    });
    expect(isRunningLocally()).toBe(true);
  });

  it('should return false for production URLs', () => {
    const productionUrls = [
      'https://questbound.com',
      'https://app.questbound.com',
      'https://www.questbound.com',
      'https://staging.questbound.com',
    ];
    
    productionUrls.forEach((url) => {
      vi.stubGlobal('window', {
        location: {
          href: url,
        },
      });
      expect(isRunningLocally()).toBe(false);
    });
  });

  it('should return true for localhost with https', () => {
    vi.stubGlobal('window', {
      location: {
        href: 'https://localhost:5173',
      },
    });
    expect(isRunningLocally()).toBe(true);
  });

  it('should return true for localhost with path', () => {
    vi.stubGlobal('window', {
      location: {
        href: 'http://localhost:5173/some/path',
      },
    });
    expect(isRunningLocally()).toBe(true);
  });

  it('should return false for 127.0.0.1', () => {
    vi.stubGlobal('window', {
      location: {
        href: 'http://127.0.0.1:5173',
      },
    });
    expect(isRunningLocally()).toBe(false);
  });
});
