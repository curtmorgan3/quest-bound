import type { Script } from '@/types';

const UNCATEGORIZED = 'Uncategorized';

type EntityTypeFilter = (typeof ENTITY_TYPE_OPTIONS)[number]['value'];

export const ENTITY_TYPE_OPTIONS = [
  { value: 'all', label: 'All types' },
  { value: 'attribute', label: 'Attribute' },
  { value: 'action', label: 'Action' },
  { value: 'item', label: 'Item' },
  { value: 'archetype', label: 'Archetype' },
  { value: 'global', label: 'Global' },
  { value: 'characterLoader', label: 'Character Loader' },
] as const;

const VALID_TYPES = new Set(ENTITY_TYPE_OPTIONS.map((o) => o.value));

export function groupScriptsByCategory(
  scripts: Script[],
): { category: string; scripts: Script[] }[] {
  const byCategory = new Map<string, Script[]>();
  for (const script of scripts) {
    const category = script.category?.trim() || UNCATEGORIZED;
    const list = byCategory.get(category) ?? [];
    list.push(script);
    byCategory.set(category, list);
  }
  for (const list of byCategory.values()) {
    list.sort((a, b) =>
      (a.name ?? '').localeCompare(b.name ?? '', undefined, { sensitivity: 'base' }),
    );
  }
  const categories = Array.from(byCategory.entries());
  categories.sort(([a], [b]) => {
    if (a === UNCATEGORIZED) return 1;
    if (b === UNCATEGORIZED) return -1;
    return a.localeCompare(b, undefined, { sensitivity: 'base' });
  });
  return categories.map(([category, scripts]) => ({ category, scripts }));
}

export function typeFromParams(searchParams: URLSearchParams): EntityTypeFilter {
  const type = searchParams.get('type') ?? 'all';
  return VALID_TYPES.has(type as EntityTypeFilter) ? (type as EntityTypeFilter) : 'all';
}

export function nameFromParams(searchParams: URLSearchParams): string {
  return searchParams.get('q') ?? '';
}
