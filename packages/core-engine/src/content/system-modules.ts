/**
 * Built-in framework modules offered when creating a ruleset.
 * Keys are stable ids (e.g. ruleset ids or slugs); values describe the card UI.
 */
export type SystemModuleEntry = {
  title: string;
  slug: string;
  description?: string;
  image?: string | null;
};

const dndModule: SystemModuleEntry = {
  title: 'D&D 5e System Module',
  slug: 'dnd-module',
  description: `
### Dungeons & Dragons System Reference Document

*By Wizards of the Coast*

Adds content from the 5th edition SRD v5.2.1

- Full SRD PDF split into several documents
- 50 charts extracted from tables
- Over 100 items
- Over 300 fully scripted spells
- Minimal character sheet to get started
  `,
  image: 'https://www.tribality.com/wp-content/uploads/2014/10/cover-dnd-e1501645849868.jpg',
};

export const systemModules: Record<string, SystemModuleEntry> = {
  dndModule,
};

/** Same entries as {@link systemModules}, as an array for grids and installers. */
export const SYSTEM_MODULE_INSTALL_CARDS: ReadonlyArray<
  SystemModuleEntry & { readonly id: string }
> = (Object.entries(systemModules) as [string, SystemModuleEntry][]).map(([id, entry]) => ({
  id,
  ...entry,
}));
