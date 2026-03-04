import type { Transaction } from 'dexie';

type RawComponent = {
  id: string;
  rulesetId: string;
  data: string;
  actionId?: string | null;
  childWindowId?: string | null;
  scriptId?: string | null;
};

type RawScript = {
  id: string;
  rulesetId: string;
  name: string;
  sourceCode: string;
  entityType: string;
  entityId: string | null;
  isGlobal: boolean;
  enabled: boolean;
  hidden?: boolean;
  category?: string | null;
  createdAt: string;
  updatedAt: string;
};

type ClickKind = 'openPage' | 'openWindow' | 'fireAction';

function buildClickScriptSource(kind: ClickKind, targetId: string): string {
  const header =
    "// Auto-generated click handler script. Uses stable entity IDs so it keeps working when labels change.\n\n";

  if (kind === 'openPage') {
    return `${header}Owner.navigateToPage('${targetId}')\n`;
  }

  if (kind === 'openWindow') {
    return `${header}Owner.openWindow('${targetId}')\n`;
  }

  return `${header}Owner.Action('${targetId}').activate()\n`;
}

/**
 * v51 → v52 migration:
 * For components that have pageId / childWindowId / actionId but no scriptId,
 * create a hidden gameManager script that performs the corresponding click behavior
 * using the target entity ID, and attach its id to component.scriptId.
 */
export async function migrate51to52(tx: Transaction): Promise<void> {
  const componentsTable = tx.table('components');
  const scriptsTable = tx.table('scripts');

  const components = (await componentsTable.toArray()) as RawComponent[];
  if (!components.length) return;

  const now = new Date().toISOString();

  for (const comp of components) {
    if (comp.scriptId) continue;

    let data: Record<string, unknown>;
    try {
      data = JSON.parse(comp.data) as Record<string, unknown>;
    } catch {
      continue;
    }

    const pageId = (data.pageId as string | undefined) ?? undefined;
    const childWindowId = (comp.childWindowId as string | undefined) ?? undefined;
    const actionId = (comp.actionId as string | undefined) ?? undefined;

    let kind: ClickKind | null = null;
    let targetId: string | null = null;

    if (pageId) {
      kind = 'openPage';
      targetId = pageId;
    } else if (childWindowId) {
      kind = 'openWindow';
      targetId = childWindowId;
    } else if (actionId) {
      kind = 'fireAction';
      targetId = actionId;
    }

    if (!kind || !targetId) continue;

    const scriptId = crypto.randomUUID();
    const sourceCode = buildClickScriptSource(kind, targetId);

    const scriptRow: RawScript = {
      id: scriptId,
      rulesetId: comp.rulesetId,
      name: `component_click_${comp.id}`,
      sourceCode,
      entityType: 'gameManager',
      entityId: null,
      isGlobal: false,
      enabled: true,
      hidden: true,
      category: 'Component Click',
      createdAt: now,
      updatedAt: now,
    };

    await scriptsTable.add(scriptRow);
    await componentsTable.update(comp.id, { scriptId });
  }
}

