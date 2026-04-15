import type { Transaction } from 'dexie';

interface OldRulesetPage {
  id: string;
  rulesetId: string;
  pageId: string;
  createdAt: string;
  updatedAt: string;
}

interface OldPage {
  id: string;
  label: string;
  category?: string;
  assetId?: string;
  assetUrl?: string;
  backgroundOpacity?: number;
  backgroundColor?: string;
  image?: string | null;
  hideFromPlayerView?: boolean;
  moduleId?: string;
  moduleEntityId?: string;
  moduleName?: string;
  createdAt: string;
  updatedAt: string;
}

interface OldRulesetWindow {
  id: string;
  rulesetId: string;
  rulesetPageId?: string | null;
  windowId: string;
  title: string;
  x: number;
  y: number;
  isCollapsed: boolean;
  createdAt: string;
  updatedAt: string;
}

interface OldCharacterPage {
  id: string;
  characterId: string;
  pageId: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Migration task: for every RulesetPage in the DB, find the Page and set Page.rulesetId = RulesetPage.rulesetId.
 * If a page is linked to multiple rulesets (multiple RulesetPage rows), the first wins for the original page
 * and duplicates are created for each additional ruleset.
 * @returns Map from original page id -> (ruleset id -> page id to use), for downstream steps (rulesetWindows, characterPages).
 */
export async function transferRulesetIdFromRulesetPagesToPages(tx: Transaction): Promise<Map<string, Map<string, string>>> {
  const rulesetPagesTable = tx.table('rulesetPages');
  const pagesTable = tx.table('pages');

  const joins = (await rulesetPagesTable.toArray()) as OldRulesetPage[];
  const pageIdByRuleset = new Map<string, Map<string, string>>();
  if (joins.length === 0) {
    return pageIdByRuleset;
  }

  const pageIdToJoins = new Map<string, OldRulesetPage[]>();
  for (const j of joins) {
    const list = pageIdToJoins.get(j.pageId) ?? [];
    list.push(j);
    pageIdToJoins.set(j.pageId, list);
  }

  const now = new Date().toISOString();

  for (const [pageId, list] of pageIdToJoins) {
    const page = (await pagesTable.get(pageId)) as OldPage | undefined;
    if (!page) continue;

    const rulesetToPageId = new Map<string, string>();
    pageIdByRuleset.set(pageId, rulesetToPageId);

    for (let i = 0; i < list.length; i++) {
      const j = list[i]!;
      if (i === 0) {
        await pagesTable.update(pageId, { rulesetId: j.rulesetId });
        rulesetToPageId.set(j.rulesetId, pageId);
      } else {
        const newId = crypto.randomUUID();
        await pagesTable.add({
          ...page,
          id: newId,
          rulesetId: j.rulesetId,
          createdAt: now,
          updatedAt: now,
        });
        rulesetToPageId.set(j.rulesetId, newId);
      }
    }
  }

  return pageIdByRuleset;
}

/** Migrate from RulesetPage join model to Page.rulesetId and CharacterPage embedding. */
export async function migrate41to42(tx: Transaction): Promise<void> {
  const rulesetPagesTable = tx.table('rulesetPages');
  const pagesTable = tx.table('pages');
  const rulesetWindowsTable = tx.table('rulesetWindows');
  const characterPagesTable = tx.table('characterPages');
  const charactersTable = tx.table('characters');

  const joins = (await rulesetPagesTable.toArray()) as OldRulesetPage[];
  if (joins.length === 0) {
    return;
  }

  const pageIdByRuleset = await transferRulesetIdFromRulesetPagesToPages(tx);

  // Update rulesetWindows: set pageId from join
  const rulesetWindows = (await rulesetWindowsTable.toArray()) as OldRulesetWindow[];
  for (const rw of rulesetWindows) {
    if (rw.rulesetPageId) {
      const join = joins.find((j) => j.id === rw.rulesetPageId);
      if (join) {
        const map = pageIdByRuleset.get(join.pageId);
        const pageId = map?.get(join.rulesetId);
        if (pageId) {
          await rulesetWindowsTable.update(rw.id, { pageId });
        }
      }
    }
  }

  // Expand characterPages with page content (including label from Page); set pageId to template (ruleset page) id
  const characterPages = (await characterPagesTable.toArray()) as OldCharacterPage[];
  for (const cp of characterPages) {
    const page = (await pagesTable.get(cp.pageId)) as OldPage | undefined;
    if (!page) continue;
    const character = (await charactersTable.get(cp.characterId)) as { rulesetId: string } | undefined;
    const rulesetId = character?.rulesetId;
    const map = pageIdByRuleset.get(cp.pageId);
    const templatePageId = rulesetId && map?.get(rulesetId) ? map.get(rulesetId)! : cp.pageId;

    const pageContent = {
      rulesetId: (page as { rulesetId?: string }).rulesetId ?? rulesetId ?? '',
      label: page.label,
      category: page.category,
      assetId: page.assetId,
      assetUrl: page.assetUrl,
      backgroundOpacity: page.backgroundOpacity,
      backgroundColor: page.backgroundColor,
      image: page.image,
      hideFromPlayerView: page.hideFromPlayerView,
      moduleId: page.moduleId,
      moduleEntityId: page.moduleEntityId,
      moduleName: page.moduleName,
    };
    await characterPagesTable.update(cp.id, {
      ...pageContent,
      pageId: templatePageId,
    });
  }
}
