import { db } from '@/stores';
import type {
  Character,
  CharacterPage,
  CharacterWindow,
  Page,
  RulesetWindow,
  Window as RulesetWindowDef,
} from '@/types';

/**
 * Ensures a CharacterPage exists for the given ruleset page template (by id or label),
 * creates template windows if new, and updates the character's last viewed page.
 * Returns the CharacterPage row id for URL navigation (?pageId=).
 */
export async function navigateCharacterToTemplatePage(
  characterId: string,
  templatePageIdOrLabel: string,
): Promise<string | null> {
  const now = new Date().toISOString();
  const character = (await db.characters.get(characterId)) as Character | undefined;
  if (!character) return null;

  const characterRulesetId = character.rulesetId ?? '';

  let template = (await db.pages.get(templatePageIdOrLabel)) as Page | undefined;
  if (!template || template.rulesetId !== characterRulesetId) {
    template = (await db.pages
      .where('rulesetId')
      .equals(characterRulesetId)
      .filter((p) => (p as Page).label === templatePageIdOrLabel)
      .first()) as Page | undefined;
  }
  if (!template) return null;

  let characterPage = (await db.characterPages
    .where('[characterId+pageId]')
    .equals([characterId, template.id])
    .first()) as CharacterPage | undefined;

  if (!characterPage) {
    const { id: _id, createdAt: _c, updatedAt: _u, ...pageRest } = template;
    const characterPageId = crypto.randomUUID();
    const newRow: CharacterPage = {
      ...(pageRest as Omit<CharacterPage, 'id' | 'createdAt' | 'updatedAt' | 'characterId'>),
      id: characterPageId,
      characterId,
      pageId: template.id,
      createdAt: now,
      updatedAt: now,
    };
    await db.characterPages.add(newRow);
    characterPage = newRow;

    const rulesetWindows = await db.rulesetWindows.where('pageId').equals(template.id).toArray();
    for (const rw of rulesetWindows) {
      await db.characterWindows.add({
        id: crypto.randomUUID(),
        characterId,
        characterPageId,
        windowId: rw.windowId,
        title: rw.title,
        x: rw.x,
        y: rw.y,
        isCollapsed: rw.isCollapsed,
        displayScale: rw.displayScale,
        layer: rw.layer,
        createdAt: now,
        updatedAt: now,
      });
    }
  }

  await db.characters.update(characterId, {
    lastViewedPageId: characterPage.id,
    updatedAt: now,
  });

  return characterPage.id;
}

/**
 * Opens or toggles a character sheet window on the character's current page (same semantics as
 * ScriptRunner characterWindowOpen).
 */
export async function openCharacterSheetWindow(
  characterId: string,
  windowIdOrTitle: string,
  options?: {
    x?: number;
    y?: number;
    collapseIfOpen?: boolean;
    /**
     * When true and both x and y are finite numbers, a newly created window uses those coordinates
     * instead of the page template slot (component-driven open).
     */
    preferComponentPosition?: boolean;
  },
): Promise<void> {
  const now = new Date().toISOString();
  const {
    x: openX,
    y: openY,
    collapseIfOpen: collapseIfOpenOpt,
    preferComponentPosition,
  } = options ?? {};

  const hasExplicitOpenCoords =
    preferComponentPosition === true &&
    typeof openX === 'number' &&
    typeof openY === 'number' &&
    Number.isFinite(openX) &&
    Number.isFinite(openY);

  const character = (await db.characters.get(characterId)) as Character | undefined;
  if (!character) return;

  const rulesetId = character.rulesetId ?? '';

  let currentPageId =
    (character as { lastViewedPageId?: string | null }).lastViewedPageId ?? null;
  if (!currentPageId) {
    const pages = (await db.characterPages
      .where('characterId')
      .equals(characterId)
      .sortBy('createdAt')) as CharacterPage[];
    currentPageId = pages[0]?.id ?? null;
  }
  if (!currentPageId) return;

  const characterPage = (await db.characterPages.get(currentPageId)) as CharacterPage | undefined;
  if (!characterPage) return;

  let windowDef = (await db.windows.get(windowIdOrTitle)) as RulesetWindowDef | undefined;
  if (!windowDef || windowDef.rulesetId !== rulesetId) {
    windowDef = (await db.windows
      .where('rulesetId')
      .equals(rulesetId)
      .filter((w) => (w as RulesetWindowDef).title === windowIdOrTitle)
      .first()) as RulesetWindowDef | undefined;
  }
  if (!windowDef) return;

  const existing = (await db.characterWindows
    .where('characterId')
    .equals(characterId)
    .filter(
      (cw) =>
        (cw as CharacterWindow).characterPageId === characterPage.id &&
        (cw as CharacterWindow).title === windowDef!.title,
    )
    .first()) as CharacterWindow | undefined;

  if (existing) {
    if (existing.isCollapsed) {
      await db.characterWindows.update(existing.id, {
        isCollapsed: false,
        updatedAt: now,
        x: openX ?? existing.x,
        y: openY ?? existing.y,
      });
    } else if (collapseIfOpenOpt) {
      await db.characterWindows.update(existing.id, {
        isCollapsed: true,
        updatedAt: now,
      });
    }
    return;
  }

  let x = openX ?? 100;
  let y = openY ?? 100;
  let isCollapsed = false;
  let displayScale: number | undefined;
  let layerFromTemplate: number | undefined;

  if (characterPage.pageId) {
    const rulesetWindow = (await db.rulesetWindows
      .where('pageId')
      .equals(characterPage.pageId)
      .filter((rw) => (rw as RulesetWindow).windowId === windowDef.id)
      .first()) as RulesetWindow | undefined;
    if (rulesetWindow) {
      if (!hasExplicitOpenCoords) {
        x = rulesetWindow.x;
        y = rulesetWindow.y;
      }
      isCollapsed = !!rulesetWindow.isCollapsed;
      displayScale = rulesetWindow.displayScale;
      layerFromTemplate = rulesetWindow.layer;
    }
  }

  await db.characterWindows.add({
    id: crypto.randomUUID(),
    characterId,
    characterPageId: currentPageId,
    windowId: windowDef.id,
    title: windowDef.title,
    x,
    y,
    isCollapsed,
    displayScale,
    layer: layerFromTemplate,
    createdAt: now,
    updatedAt: now,
  } as CharacterWindow);
}
