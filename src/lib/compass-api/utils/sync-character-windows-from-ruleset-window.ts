import { db } from '@/stores';

/**
 * After a ruleset page template `RulesetWindow` row changes, copy `x`, `y`, `displayScale`, `layer`,
 * `isCollapsed`, and `title` to every `CharacterWindow` that was instantiated from that template
 * slot (same ruleset page template + window definition).
 */
export async function syncCharacterWindowsFromRulesetWindowRow(
  rulesetWindowRowId: string,
): Promise<void> {
  const rw = await db.rulesetWindows.get(rulesetWindowRowId);
  if (!rw?.pageId) return;

  const now = new Date().toISOString();
  const characterPages = await db.characterPages.where('pageId').equals(rw.pageId).toArray();

  for (const cp of characterPages) {
    const rows = await db.characterWindows.where('characterPageId').equals(cp.id).toArray();
    for (const cw of rows) {
      if (cw.windowId !== rw.windowId) continue;
      await db.characterWindows.update(cw.id, {
        x: rw.x,
        y: rw.y,
        title: rw.title,
        isCollapsed: rw.isCollapsed,
        displayScale: rw.displayScale,
        layer: rw.layer,
        updatedAt: now,
      });
    }
  }
}
