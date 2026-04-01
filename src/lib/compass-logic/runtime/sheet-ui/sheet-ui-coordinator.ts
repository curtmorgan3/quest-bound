import { cloneComponentSubtreeForWindow } from '@/lib/compass-api/utils/composite-subtree';
import type { DB } from '@/stores/db/hooks/types';
import type { Character, CharacterWindow, Component, Composite } from '@/types';
import { filterNotSoftDeleted } from '@/lib/data/soft-delete';
import { ComponentTypes } from '@/lib/compass-planes/nodes/node-types';
import { parseComponentDataJson } from '@/lib/compass-planes/utils/component-data-json';
import { defaultPartialForComponentType, isComponentTypesValue } from './sheet-component-defaults';
import { SheetComponentAccessor } from './sheet-component-accessor';
import { classifyFlatKey } from './sheet-flat-keys';

type LayoutPatch = Partial<Pick<Component, 'x' | 'y' | 'z' | 'width' | 'height' | 'rotation'>>;

interface CharacterSheetState {
  pageId: string;
  windows: CharacterWindow[];
  /** templateWindowId -> template components */
  templateByRulesetWindowId: Map<string, Component[]>;
  /** CharacterWindow.id -> overlay components (mutated) */
  overlayByCharWindowId: Map<string, Component[]>;
  deletedTemplateIds: Set<string>;
  baseLayoutOverrides: Record<string, LayoutPatch>;
  layoutDelta: Map<string, LayoutPatch>;
  baseDataPatches: Record<string, Record<string, unknown>>;
  dataDelta: Map<string, Record<string, unknown>>;
  /** Snapshot of `character.componentStyleOverrides` at hydrate (read path for get). */
  baseStyleOverrides: Record<string, Record<string, unknown>>;
  /** Deltas applied during this script run (flushed into componentStyleOverrides). */
  stylePatchesByRefLabel: Map<string, Record<string, unknown>>;
}

function collectPreOrder(components: Component[]): Component[] {
  const byParent = new Map<string | null, Component[]>();
  for (const c of components) {
    const p = c.parentComponentId ?? null;
    let list = byParent.get(p);
    if (!list) {
      list = [];
      byParent.set(p, list);
    }
    list.push(c);
  }
  const sortSiblings = (list: Component[]) =>
    [...list].sort((a, b) => a.z - b.z || a.y - b.y || a.x - b.x || a.id.localeCompare(b.id));
  const out: Component[] = [];
  const walk = (parentId: string | null) => {
    const ch = sortSiblings(byParent.get(parentId) ?? []);
    for (const c of ch) {
      out.push(c);
      walk(c.id);
    }
  };
  walk(null);
  return out;
}

function parseRowData(c: Component): Record<string, unknown> {
  try {
    return JSON.parse(c.data ?? '{}') as Record<string, unknown>;
  } catch {
    return {};
  }
}

function parseRowStyle(c: Component): Record<string, unknown> {
  try {
    return JSON.parse(c.style ?? '{}') as Record<string, unknown>;
  } catch {
    return {};
  }
}

function mergedLayoutFor(
  componentId: string,
  baseLayout: Record<string, LayoutPatch>,
  layoutDelta: Map<string, LayoutPatch>,
): LayoutPatch {
  return { ...(baseLayout[componentId] ?? {}), ...(layoutDelta.get(componentId) ?? {}) };
}

function mergedDataFor(
  componentId: string,
  baseData: Record<string, Record<string, unknown>>,
  dataDelta: Map<string, Record<string, unknown>>,
): Record<string, unknown> {
  return { ...(baseData[componentId] ?? {}), ...(dataDelta.get(componentId) ?? {}) };
}

function mergeVirtualTemplateRow(base: Component, state: CharacterSheetState): Component {
  const lp = mergedLayoutFor(base.id, state.baseLayoutOverrides, state.layoutDelta);
  let row = Object.keys(lp).length > 0 ? { ...base, ...lp } : { ...base };
  const dp = mergedDataFor(base.id, state.baseDataPatches, state.dataDelta);
  if (Object.keys(dp).length > 0) {
    const data = { ...parseRowData(row), ...dp };
    row = { ...row, data: JSON.stringify(data) };
  }
  return row;
}

export class SheetUiCoordinator {
  private readonly db: DB;
  private readonly rulesetId: string;
  private readonly charState = new Map<string, CharacterSheetState>();
  private readonly touched = new Set<string>();

  constructor(db: DB, rulesetId: string) {
    this.db = db;
    this.rulesetId = rulesetId;
  }

  private markTouched(characterId: string) {
    this.touched.add(characterId);
  }

  private async hydrateCharacter(characterId: string): Promise<CharacterSheetState | null> {
    const existing = this.charState.get(characterId);
    if (existing) return existing;

    const character = await this.db.characters.get(characterId);
    if (!character) return null;

    const pageId = await this.resolveCurrentPageId(characterId, character as Character);
    if (!pageId) return null;

    const allWindows = filterNotSoftDeleted(
      await this.db.characterWindows.where('characterId').equals(characterId).toArray(),
    ) as CharacterWindow[];
    const windows = allWindows
      .filter((w) => w.characterPageId === pageId)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));

    const templateByRulesetWindowId = new Map<string, Component[]>();
    const seenTw = new Set<string>();
    for (const w of windows) {
      if (seenTw.has(w.windowId)) continue;
      seenTw.add(w.windowId);
      const comps = await this.db.components.where('windowId').equals(w.windowId).toArray();
      templateByRulesetWindowId.set(w.windowId, comps as Component[]);
    }

    const overlayByCharWindowId = new Map<string, Component[]>();
    for (const w of windows) {
      const raw = w.scriptOverlayComponents;
      let parsed: Component[] = [];
      if (raw) {
        try {
          const j = JSON.parse(raw) as unknown;
          if (Array.isArray(j)) parsed = j as Component[];
        } catch {
          parsed = [];
        }
      }
      overlayByCharWindowId.set(w.id, parsed.map((c) => ({ ...c })));
    }

    const ch = character as Character;
    const baseStyle: Record<string, Record<string, unknown>> = {};
    for (const [k, v] of Object.entries(ch.componentStyleOverrides ?? {})) {
      baseStyle[k] = { ...(v as Record<string, unknown>) };
    }

    const baseLayout: Record<string, LayoutPatch> = {};
    for (const [k, v] of Object.entries(ch.componentLayoutOverrides ?? {})) {
      baseLayout[k] = { ...(v as LayoutPatch) };
    }
    const baseData: Record<string, Record<string, unknown>> = {};
    for (const [k, v] of Object.entries(ch.componentScriptDataPatches ?? {})) {
      baseData[k] = { ...(v as Record<string, unknown>) };
    }

    const state: CharacterSheetState = {
      pageId,
      windows,
      templateByRulesetWindowId,
      overlayByCharWindowId,
      deletedTemplateIds: new Set(ch.sheetHiddenComponentIds ?? []),
      baseLayoutOverrides: baseLayout,
      layoutDelta: new Map(),
      baseDataPatches: baseData,
      dataDelta: new Map(),
      baseStyleOverrides: baseStyle,
      stylePatchesByRefLabel: new Map(),
    };
    this.charState.set(characterId, state);
    return state;
  }

  private async resolveCurrentPageId(characterId: string, character: Character): Promise<string | null> {
    let currentPageId = character.lastViewedPageId ?? null;
    if (!currentPageId) {
      const pages = (await this.db.characterPages
        .where('characterId')
        .equals(characterId)
        .sortBy('createdAt')) as { id: string }[];
      currentPageId = pages[0]?.id ?? null;
    }
    return currentPageId;
  }

  /** Merged components for one character window instance (shadow + templates). */
  private mergedForWindow(state: CharacterSheetState, cw: CharacterWindow): Component[] {
    const template = state.templateByRulesetWindowId.get(cw.windowId) ?? [];
    const hidden = state.deletedTemplateIds;
    const overlay = state.overlayByCharWindowId.get(cw.id) ?? [];
    const templateVisible = template.filter((c) => !hidden.has(c.id));
    const mergedTemplate = templateVisible.map((c) => mergeVirtualTemplateRow(c, state));
    return [...mergedTemplate, ...overlay];
  }

  private mergedPreOrderForWindow(state: CharacterSheetState, cw: CharacterWindow): Component[] {
    return collectPreOrder(this.mergedForWindow(state, cw));
  }

  async createComponent(
    characterId: string,
    typeOrName: string,
    props: Record<string, unknown>,
  ): Promise<SheetComponentAccessor | null> {
    const state = await this.hydrateCharacter(characterId);
    if (!state) return null;

    const windowTitle = props.window;
    if (typeof windowTitle !== 'string' || windowTitle.trim() === '') {
      throw new Error('createComponent: props.window (string) is required');
    }

    const cw = state.windows.find((w) => w.title === windowTitle);
    if (!cw) {
      throw new Error(`createComponent: no character window with title "${windowTitle}" on the current page`);
    }

    const character = (await this.db.characters.get(characterId)) as Character | undefined;
    const rulesetId = character?.rulesetId ?? this.rulesetId;

    const { window: _w, ...restProps } = props;

    let rows: Component[] = [];

    if (isComponentTypesValue(typeOrName)) {
      rows = [this.buildPrimitiveRow(typeOrName, restProps, rulesetId, cw.windowId)];
    } else {
      const composite = (await this.db.composites
        .where('rulesetId')
        .equals(rulesetId)
        .filter((c) => (c as Composite).name === typeOrName)
        .first()) as Composite | undefined;
      if (!composite) {
        throw new Error(`createComponent: unknown component type or composite "${typeOrName}"`);
      }
      const templateRoot = await this.db.components.get(composite.rootComponentId);
      if (!templateRoot) {
        throw new Error(`createComponent: composite "${typeOrName}" has no template root`);
      }
      const windowComps = await this.db.components
        .where('windowId')
        .equals(templateRoot.windowId)
        .toArray();
      const rootDefault = defaultPartialForComponentType(ComponentTypes.GROUP);
      const rx = Number(restProps.x ?? templateRoot.x ?? rootDefault.x ?? 0);
      const ry = Number(restProps.y ?? templateRoot.y ?? rootDefault.y ?? 0);
      rows = cloneComponentSubtreeForWindow({
        sourceRootId: composite.rootComponentId,
        windowComponents: windowComps as Component[],
        targetWindowId: cw.windowId,
        rulesetId,
        rootWorldX: rx,
        rootWorldY: ry,
      });
      if (rows.length === 0) {
        throw new Error(`createComponent: failed to clone composite "${typeOrName}"`);
      }
      const groupRoot = rows.find((r) => r.parentComponentId == null) ?? rows[0];
      this.applyFlatPropsToRow(groupRoot, restProps, true /* skip x/y; clone already positioned */);
    }

    const overlay = state.overlayByCharWindowId.get(cw.id) ?? [];
    for (const r of rows) {
      overlay.push(r);
    }
    state.overlayByCharWindowId.set(cw.id, overlay);
    this.markTouched(characterId);

    const root = rows.find((r) => r.parentComponentId == null) ?? rows[0];
    return new SheetComponentAccessor(this, characterId, root.id, cw.id);
  }

  private buildPrimitiveRow(
    type: ComponentTypes,
    props: Record<string, unknown>,
    rulesetId: string,
    templateWindowId: string,
  ): Component {
    const def = defaultPartialForComponentType(type);
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const base: Component = {
      ...(def as Component),
      id,
      rulesetId,
      windowId: templateWindowId,
      type,
      parentComponentId: null,
      createdAt: now,
      updatedAt: now,
    };
    this.applyFlatPropsToRow(base, props, false);
    return base;
  }

  /** When `skipXY`, x/y already set (e.g. composite clone); still apply z, width, height, rotation. */
  private applyFlatPropsToRow(row: Component, props: Record<string, unknown>, skipXY: boolean) {
    for (const [k, v] of Object.entries(props)) {
      if (k === 'window') continue;
      if (skipXY && (k === 'x' || k === 'y')) continue;
      this.applyOneFlatKeyToRow(row, k, v);
    }
  }

  private applyOneFlatKeyToRow(row: Component, key: string, value: unknown) {
    const t = classifyFlatKey(key, row);
    if (t === 'ignore') return;
    if (t === 'layout') {
      (row as unknown as Record<string, unknown>)[key] = value;
      return;
    }
    if (t === 'style') {
      const st = parseRowStyle(row);
      st[key] = value;
      row.style = JSON.stringify(st);
      return;
    }
    const data = parseRowData(row);
    data[key] = value;
    row.data = JSON.stringify(data);
  }

  async getComponent(
    characterId: string,
    referenceLabel: string,
  ): Promise<SheetComponentAccessor | null> {
    const state = await this.hydrateCharacter(characterId);
    if (!state) return null;
    for (const cw of state.windows) {
      const ordered = this.mergedPreOrderForWindow(state, cw);
      for (const c of ordered) {
        const ref = parseComponentDataJson(c).referenceLabel;
        if (ref === referenceLabel) {
          return new SheetComponentAccessor(this, characterId, c.id, cw.id);
        }
      }
    }
    return null;
  }

  async getComponents(
    characterId: string,
    referenceLabel: string,
  ): Promise<SheetComponentAccessor[]> {
    const state = await this.hydrateCharacter(characterId);
    if (!state) return [];
    const out: SheetComponentAccessor[] = [];
    for (const cw of state.windows) {
      const ordered = this.mergedPreOrderForWindow(state, cw);
      for (const c of ordered) {
        const ref = parseComponentDataJson(c).referenceLabel;
        if (ref === referenceLabel) {
          out.push(new SheetComponentAccessor(this, characterId, c.id, cw.id));
        }
      }
    }
    return out;
  }

  private findStateRow(
    state: CharacterSheetState,
    componentId: string,
    hintCharWindowId: string,
  ): { row: Component; cw: CharacterWindow; source: 'overlay' | 'template' } | null {
    if (state.deletedTemplateIds.has(componentId)) return null;

    for (const cw of state.windows) {
      const overlay = state.overlayByCharWindowId.get(cw.id) ?? [];
      const hit = overlay.find((c) => c.id === componentId);
      if (hit) return { row: hit, cw, source: 'overlay' };
    }

    const hint = state.windows.find((w) => w.id === hintCharWindowId);
    const searchWindows = hint ? [hint, ...state.windows.filter((w) => w.id !== hint.id)] : state.windows;
    for (const cw of searchWindows) {
      const template = state.templateByRulesetWindowId.get(cw.windowId) ?? [];
      const base = template.find((c) => c.id === componentId);
      if (base) {
        return {
          row: mergeVirtualTemplateRow(base, state),
          cw,
          source: 'template',
        };
      }
    }
    return null;
  }

  deleteComponent(characterId: string, componentId: string, hintCharWindowId: string): void {
    const state = this.charState.get(characterId);
    if (!state) return;

    if (state.deletedTemplateIds.has(componentId)) return;

    for (const cw of state.windows) {
      const overlay = state.overlayByCharWindowId.get(cw.id) ?? [];
      const idx = overlay.findIndex((c) => c.id === componentId);
      if (idx !== -1) {
        const target = overlay[idx]!;
        const subtree = this.collectOverlaySubtreeIds(overlay, target.id);
        const next = overlay.filter((c) => !subtree.has(c.id));
        state.overlayByCharWindowId.set(cw.id, next);
        this.markTouched(characterId);
        return;
      }
    }

    for (const template of state.templateByRulesetWindowId.values()) {
      if (template.some((c) => c.id === componentId)) {
        state.deletedTemplateIds.add(componentId);
        this.markTouched(characterId);
        return;
      }
    }
  }

  private collectOverlaySubtreeIds(overlay: Component[], rootId: string): Set<string> {
    const byParent = new Map<string | null, string[]>();
    for (const c of overlay) {
      const p = c.parentComponentId ?? null;
      if (!byParent.has(p)) byParent.set(p, []);
      byParent.get(p)!.push(c.id);
    }
    const out = new Set<string>();
    const walk = (id: string) => {
      if (out.has(id)) return;
      out.add(id);
      const ch = byParent.get(id);
      if (ch) for (const x of ch) walk(x);
    };
    walk(rootId);
    return out;
  }

  setOnComponent(
    characterId: string,
    componentId: string,
    hintCharWindowId: string,
    key: string,
    value: unknown,
  ): void {
    const state = this.charState.get(characterId);
    if (!state) return;

    const found = this.findStateRow(state, componentId, hintCharWindowId);
    if (!found) return;

    const { row, source, cw } = found;
    const t = classifyFlatKey(key, row);
    if (t === 'ignore') return;

    if (source === 'overlay') {
      const overlay = state.overlayByCharWindowId.get(cw.id) ?? [];
      const idx = overlay.findIndex((c) => c.id === componentId);
      if (idx === -1) return;
      const live = { ...overlay[idx]! };
      this.applyOneFlatKeyToRow(live, key, value);
      overlay[idx] = live;
      state.overlayByCharWindowId.set(cw.id, overlay);
      this.markTouched(characterId);
      return;
    }

    if (t === 'layout') {
      const cur = state.layoutDelta.get(componentId) ?? {};
      state.layoutDelta.set(componentId, { ...cur, [key]: value } as LayoutPatch);
      this.markTouched(characterId);
      return;
    }
    if (t === 'style') {
      const ref = parseComponentDataJson(row).referenceLabel;
      if (ref == null || ref === '') return;
      const cur = state.stylePatchesByRefLabel.get(ref) ?? {};
      state.stylePatchesByRefLabel.set(ref, { ...cur, [key]: value });
      this.markTouched(characterId);
      return;
    }
    const cur = state.dataDelta.get(componentId) ?? {};
    state.dataDelta.set(componentId, { ...cur, [key]: value });
    this.markTouched(characterId);
  }

  getOnComponent(
    characterId: string,
    componentId: string,
    hintCharWindowId: string,
    key: string,
  ): unknown {
    const state = this.charState.get(characterId);
    if (!state) return null;

    const found = this.findStateRow(state, componentId, hintCharWindowId);
    if (!found) return null;

    const { row } = found;
    const t = classifyFlatKey(key, row);
    if (t === 'ignore') return null;

    if (t === 'layout') {
      const lp = mergedLayoutFor(componentId, state.baseLayoutOverrides, state.layoutDelta);
      const v = lp[key as keyof LayoutPatch];
      if (v !== undefined) return v;
      return (row as unknown as Record<string, unknown>)[key];
    }
    if (t === 'style') {
      const ref = parseComponentDataJson(row).referenceLabel;
      const refStr = ref != null && ref !== '' ? String(ref) : '';
      const st = parseRowStyle(row);
      const base = refStr ? (state.baseStyleOverrides[refStr] ?? {}) : {};
      const sp = refStr ? (state.stylePatchesByRefLabel.get(refStr) ?? {}) : {};
      const merged = { ...st, ...base, ...sp };
      return merged[key] ?? null;
    }
    if (key === 'type' && row.type !== ComponentTypes.INPUT) return null;
    const data = parseRowData(row);
    return data[key] ?? null;
  }

  addChild(characterId: string, parentId: string, childId: string): void {
    const state = this.charState.get(characterId);
    if (!state) return;

    const parentFound = this.findStateRow(state, parentId, state.windows[0]?.id ?? '');
    if (!parentFound || parentFound.row.type !== ComponentTypes.GROUP) return;

    const childFound = this.findStateRow(state, childId, parentFound.cw.id);
    if (!childFound) return;

    const parentCw = parentFound.cw;

    for (const cw of state.windows) {
      const overlay = state.overlayByCharWindowId.get(cw.id) ?? [];
      const idx = overlay.findIndex((c) => c.id === childId);
      if (idx !== -1) {
        overlay.splice(idx, 1);
        state.overlayByCharWindowId.set(cw.id, overlay);
      }
    }

    let childRow: Component = {
      ...childFound.row,
      parentComponentId: parentId,
      windowId: parentCw.windowId,
    };

    if (childFound.source === 'template') {
      const base = state.templateByRulesetWindowId
        .get(childFound.cw.windowId)
        ?.find((c) => c.id === childId);
      if (!base) return;
      state.deletedTemplateIds.add(childId);
      childRow = mergeVirtualTemplateRow(base, state);
      childRow = {
        ...childRow,
        parentComponentId: parentId,
        windowId: parentCw.windowId,
      };
    }

    const targetOverlay = state.overlayByCharWindowId.get(parentCw.id) ?? [];
    targetOverlay.push(childRow);
    state.overlayByCharWindowId.set(parentCw.id, targetOverlay);
    this.markTouched(characterId);
  }

  async flushAll(now: string): Promise<void> {
    for (const characterId of this.touched) {
      const state = this.charState.get(characterId);
      if (!state) continue;

      const character = (await this.db.characters.get(characterId)) as Character | undefined;
      if (!character) continue;

      const hiddenMerged = [...state.deletedTemplateIds];

      const layoutMerged = { ...(character.componentLayoutOverrides ?? {}) };
      for (const [id, patch] of state.layoutDelta) {
        layoutMerged[id] = { ...(layoutMerged[id] ?? {}), ...patch };
      }

      const dataMerged = { ...(character.componentScriptDataPatches ?? {}) };
      for (const [id, patch] of state.dataDelta) {
        dataMerged[id] = { ...(dataMerged[id] ?? {}), ...patch };
      }

      let styleOut: Record<string, Record<string, unknown>> | undefined;
      if (state.stylePatchesByRefLabel.size > 0) {
        styleOut = { ...(character.componentStyleOverrides ?? {}) };
        for (const [ref, patch] of state.stylePatchesByRefLabel) {
          styleOut[ref] = { ...(styleOut[ref] ?? {}), ...patch };
        }
      }

      await this.db.characters.update(characterId, {
        sheetHiddenComponentIds: hiddenMerged,
        componentLayoutOverrides: layoutMerged,
        componentScriptDataPatches: dataMerged,
        ...(styleOut ? { componentStyleOverrides: styleOut } : {}),
        updatedAt: now,
      } as Partial<Character>);

      for (const cw of state.windows) {
        const overlay = state.overlayByCharWindowId.get(cw.id) ?? [];
        const persisted = (await this.db.characterWindows.get(cw.id)) as CharacterWindow | undefined;
        const prevJson = persisted?.scriptOverlayComponents ?? null;
        const nextJson = JSON.stringify(overlay);
        if (prevJson !== nextJson) {
          await this.db.characterWindows.update(cw.id, {
            scriptOverlayComponents: nextJson,
            updatedAt: now,
          } as Partial<CharacterWindow>);
        }
      }
    }

    this.charState.clear();
    this.touched.clear();
  }
}
