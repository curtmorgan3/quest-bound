import { cloneComponentSubtreeForWindow } from '@/lib/compass-api/utils/composite-subtree';
import { ComponentTypes } from '@/lib/compass-planes/nodes/node-types';
import { parseComponentDataJson } from '@/lib/compass-planes/utils/component-data-json';
import {
  parseComponentActiveStatesMap,
  parseComponentStatesList,
  pruneComponentActiveStatesMap,
  resolveSetStateTargetName,
  stringifyComponentActiveStatesMap,
} from '@/lib/compass-planes/utils/component-states';
import { filterNotSoftDeleted } from '@/lib/data/soft-delete';
import type { DB } from '@/stores/db/hooks/types';
import type { Attribute, Character, CharacterWindow, Component, Composite } from '@/types';
import { SheetComponentAccessor } from './sheet-component-accessor';
import { defaultPartialForComponentType, isComponentTypesValue } from './sheet-component-defaults';
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
  /** CharacterWindow.id -> active custom state name per template/overlay component id. */
  activeStatesByCharWindowId: Map<string, Record<string, string>>;
  /** Snapshot of `character.componentAttributeIdOverrides` at hydrate. */
  baseAttributeIdOverrides: Record<string, string | null>;
  /** Deltas for template `Component.attributeId` (overlay rows mutate in place). */
  attributeIdDelta: Map<string, string | null>;
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

function effectiveAttributeIdForTemplate(base: Component, state: CharacterSheetState): string | null {
  let v: string | null | undefined = base.attributeId;
  if (Object.hasOwn(state.baseAttributeIdOverrides, base.id)) {
    v = state.baseAttributeIdOverrides[base.id] ?? null;
  }
  if (state.attributeIdDelta.has(base.id)) {
    v = state.attributeIdDelta.get(base.id) ?? null;
  }
  return v ?? null;
}

function mergeVirtualTemplateRow(base: Component, state: CharacterSheetState): Component {
  const lp = mergedLayoutFor(base.id, state.baseLayoutOverrides, state.layoutDelta);
  let row = Object.keys(lp).length > 0 ? { ...base, ...lp } : { ...base };
  const dp = mergedDataFor(base.id, state.baseDataPatches, state.dataDelta);
  if (Object.keys(dp).length > 0) {
    const data = { ...parseRowData(row), ...dp };
    row = { ...row, data: JSON.stringify(data) };
  }
  return { ...row, attributeId: effectiveAttributeIdForTemplate(base, state) };
}

/** Same instance-selection rule as SheetViewer when multiple CharacterWindows share a ruleset window id. */
function pickCharacterWindowsForSheetPreview(
  allWindows: CharacterWindow[],
  sheetPreviewRulesetWindowId: string,
): CharacterWindow[] {
  const previewMatches = allWindows.filter((w) => w.windowId === sheetPreviewRulesetWindowId);
  if (previewMatches.length <= 1) return previewMatches;
  return [
    [...previewMatches].sort((a, b) => {
      const t = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      if (t !== 0) return t;
      return a.id.localeCompare(b.id);
    })[0]!,
  ];
}

export class SheetUiCoordinator {
  private readonly db: DB;
  private readonly rulesetId: string;
  /** Ruleset window id when hydrating sheet UI for window-editor preview (see ScriptExecutionContext). */
  private readonly sheetPreviewRulesetWindowId?: string;
  private readonly charState = new Map<string, CharacterSheetState>();
  private readonly touched = new Set<string>();

  constructor(db: DB, rulesetId: string, sheetPreviewRulesetWindowId?: string | null) {
    this.db = db;
    this.rulesetId = rulesetId;
    this.sheetPreviewRulesetWindowId = sheetPreviewRulesetWindowId ?? undefined;
  }

  private markTouched(characterId: string) {
    this.touched.add(characterId);
  }

  private async hydrateCharacter(characterId: string): Promise<CharacterSheetState | null> {
    const existing = this.charState.get(characterId);
    if (existing) return existing;

    const character = await this.db.characters.get(characterId);
    if (!character) return null;

    const allWindows = filterNotSoftDeleted(
      await this.db.characterWindows.where('characterId').equals(characterId).toArray(),
    ) as CharacterWindow[];

    const resolvedPageId = await this.resolveCurrentPageId(characterId, character as Character);

    let pageId: string;
    let windows: CharacterWindow[];

    if (resolvedPageId) {
      pageId = resolvedPageId;
      windows = allWindows
        .filter((w) => w.characterPageId === pageId)
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt));

      if (this.sheetPreviewRulesetWindowId) {
        const picked = pickCharacterWindowsForSheetPreview(
          allWindows,
          this.sheetPreviewRulesetWindowId,
        );
        const onPageIds = new Set(windows.map((w) => w.id));
        for (const cw of picked) {
          if (!onPageIds.has(cw.id)) {
            windows.push(cw);
            onPageIds.add(cw.id);
          }
        }
        windows.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
      }
    } else if (this.sheetPreviewRulesetWindowId) {
      const picked = pickCharacterWindowsForSheetPreview(
        allWindows,
        this.sheetPreviewRulesetWindowId,
      );
      if (picked.length === 0) return null;
      windows = [...picked].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
      pageId = picked[0]!.characterPageId ?? '';
    } else {
      return null;
    }

    const templateByRulesetWindowId = new Map<string, Component[]>();
    const seenTw = new Set<string>();
    for (const w of windows) {
      if (seenTw.has(w.windowId)) continue;
      seenTw.add(w.windowId);
      const comps = await this.db.components.where('windowId').equals(w.windowId).toArray();
      templateByRulesetWindowId.set(w.windowId, comps as Component[]);
    }

    const activeStatesByCharWindowId = new Map<string, Record<string, string>>();
    for (const w of windows) {
      activeStatesByCharWindowId.set(w.id, parseComponentActiveStatesMap(w.componentActiveStates));
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
      overlayByCharWindowId.set(
        w.id,
        parsed.map((c) => ({ ...c })),
      );
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

    const baseAttrId: Record<string, string | null> = {};
    for (const [k, v] of Object.entries(ch.componentAttributeIdOverrides ?? {})) {
      baseAttrId[k] = v;
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
      activeStatesByCharWindowId,
      baseAttributeIdOverrides: baseAttrId,
      attributeIdDelta: new Map(),
    };
    this.charState.set(characterId, state);
    return state;
  }

  private async resolveCurrentPageId(
    characterId: string,
    character: Character,
  ): Promise<string | null> {
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
      throw new Error(
        `createComponent: no character window with title "${windowTitle}" on the current page`,
      );
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

  /**
   * All sheet components in preorder for the first character window on the current page whose `title`
   * equals `windowTitle` (same matching as `createComponent`’s `props.window`).
   */
  async getComponentsByWindow(
    characterId: string,
    windowTitle: string,
  ): Promise<SheetComponentAccessor[]> {
    const state = await this.hydrateCharacter(characterId);
    if (!state) return [];
    const cw = state.windows.find((w) => w.title === windowTitle);
    if (!cw) return [];
    const ordered = this.mergedPreOrderForWindow(state, cw);
    return ordered.map((c) => new SheetComponentAccessor(this, characterId, c.id, cw.id));
  }

  /** Ids of all nested children of `ancestorId` within the merged component tree for one window. */
  private collectDescendantIds(merged: Component[], ancestorId: string): Set<string> {
    const byParent = new Map<string | null, string[]>();
    for (const c of merged) {
      const p = c.parentComponentId ?? null;
      if (!byParent.has(p)) byParent.set(p, []);
      byParent.get(p)!.push(c.id);
    }
    const out = new Set<string>();
    const walk = (id: string) => {
      for (const childId of byParent.get(id) ?? []) {
        out.add(childId);
        walk(childId);
      }
    };
    walk(ancestorId);
    return out;
  }

  /**
   * Like `getComponent`, but only matches components that are strict descendants of `ancestorComponentId`
   * in the same character window instance (preorder: first match wins).
   */
  async getDescendantComponent(
    characterId: string,
    ancestorComponentId: string,
    characterWindowInstanceId: string,
    referenceLabel: string,
  ): Promise<SheetComponentAccessor | null> {
    const state = await this.hydrateCharacter(characterId);
    if (!state) return null;
    const cw = state.windows.find((w) => w.id === characterWindowInstanceId);
    if (!cw) return null;
    const merged = this.mergedForWindow(state, cw);
    const descendants = this.collectDescendantIds(merged, ancestorComponentId);
    const ordered = this.mergedPreOrderForWindow(state, cw);
    for (const c of ordered) {
      if (!descendants.has(c.id)) continue;
      const ref = parseComponentDataJson(c).referenceLabel;
      if (ref === referenceLabel) {
        return new SheetComponentAccessor(this, characterId, c.id, cw.id);
      }
    }
    return null;
  }

  /**
   * Like `getComponents`, but only matches components that are strict descendants of `ancestorComponentId`
   * in the same character window instance (preorder order).
   */
  async getDescendantComponents(
    characterId: string,
    ancestorComponentId: string,
    characterWindowInstanceId: string,
    referenceLabel: string,
  ): Promise<SheetComponentAccessor[]> {
    const state = await this.hydrateCharacter(characterId);
    if (!state) return [];
    const cw = state.windows.find((w) => w.id === characterWindowInstanceId);
    if (!cw) return [];
    const merged = this.mergedForWindow(state, cw);
    const descendants = this.collectDescendantIds(merged, ancestorComponentId);
    const ordered = this.mergedPreOrderForWindow(state, cw);
    const out: SheetComponentAccessor[] = [];
    for (const c of ordered) {
      if (!descendants.has(c.id)) continue;
      const ref = parseComponentDataJson(c).referenceLabel;
      if (ref === referenceLabel) {
        out.push(new SheetComponentAccessor(this, characterId, c.id, cw.id));
      }
    }
    return out;
  }

  /**
   * Ruleset attribute title for this component’s `attributeId`, or null when none / missing ruleset row.
   */
  async getAssociatedAttributeName(
    characterId: string,
    componentId: string,
    hintCharWindowId: string,
  ): Promise<string | null> {
    const state = await this.hydrateCharacter(characterId);
    if (!state) return null;
    const found = this.findStateRow(state, componentId, hintCharWindowId);
    if (!found) return null;
    const id = found.row.attributeId;
    if (id == null || id === '') return null;
    const attr = (await this.db.attributes.get(id)) as Attribute | undefined;
    return attr?.title ?? null;
  }

  /**
   * Bind this component to the ruleset attribute with the given title (trimmed equality).
   * Pass `null` or `''` to clear. Throws when the sheet is not loaded, the component is missing,
   * or the name is non-empty and no attribute matches.
   */
  async setAttributeByName(
    characterId: string,
    componentId: string,
    hintCharWindowId: string,
    attributeName: string | null,
  ): Promise<void> {
    const state = this.charState.get(characterId);
    if (!state) {
      throw new Error('setAttribute: character sheet is not loaded');
    }
    const found = this.findStateRow(state, componentId, hintCharWindowId);
    if (!found) {
      throw new Error('setAttribute: component not found on this sheet');
    }

    const character = (await this.db.characters.get(characterId)) as Character | undefined;
    const rulesetId = character?.rulesetId ?? this.rulesetId;

    const trimmed = attributeName?.trim() ?? '';
    let nextId: string | null = null;
    if (trimmed !== '') {
      const attrs = (await this.db.attributes
        .where('rulesetId')
        .equals(rulesetId)
        .toArray()) as Attribute[];
      const hit = attrs.find((a) => a.title.trim() === trimmed);
      if (!hit) {
        throw new Error(`setAttribute: Attribute '${attributeName}' not found`);
      }
      nextId = hit.id;
    }

    if (found.source === 'overlay') {
      const overlay = state.overlayByCharWindowId.get(found.cw.id) ?? [];
      const idx = overlay.findIndex((c) => c.id === componentId);
      if (idx === -1) return;
      const live = { ...overlay[idx]!, attributeId: nextId };
      overlay[idx] = live;
      state.overlayByCharWindowId.set(found.cw.id, overlay);
    } else {
      state.attributeIdDelta.set(componentId, nextId);
    }
    this.markTouched(characterId);
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
    const searchWindows = hint
      ? [hint, ...state.windows.filter((w) => w.id !== hint.id)]
      : state.windows;
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

  /**
   * Set or clear the persisted custom visual state for a component (`component.setState` from QBScript).
   * Use `'default'` (case-insensitive) to clear. Throws if the component is missing or the name does not match any state.
   */
  setComponentState(
    characterId: string,
    componentId: string,
    hintCharWindowId: string,
    requestedName: string,
  ): void {
    const sheet = this.charState.get(characterId);
    if (!sheet) {
      throw new Error('setState: character sheet is not loaded');
    }

    const found = this.findStateRow(sheet, componentId, hintCharWindowId);
    if (!found) {
      throw new Error(`setState: component "${componentId}" not found on this sheet`);
    }

    const normalized = requestedName.trim();
    if (normalized.toLowerCase() === 'default') {
      const map = { ...(sheet.activeStatesByCharWindowId.get(found.cw.id) ?? {}) };
      delete map[componentId];
      sheet.activeStatesByCharWindowId.set(found.cw.id, map);
      this.markTouched(characterId);
      return;
    }

    const entries = parseComponentStatesList(found.row.states);
    const canonical = resolveSetStateTargetName(entries, normalized);
    if (canonical == null) {
      throw new Error(`setState: no state named "${requestedName}"`);
    }

    const map = { ...(sheet.activeStatesByCharWindowId.get(found.cw.id) ?? {}) };
    map[componentId] = canonical;
    sheet.activeStatesByCharWindowId.set(found.cw.id, map);
    this.markTouched(characterId);
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

      let attributeIdOut: Record<string, string | null> | undefined;
      if (state.attributeIdDelta.size > 0) {
        attributeIdOut = { ...(character.componentAttributeIdOverrides ?? {}) };
        for (const [id, v] of state.attributeIdDelta) {
          attributeIdOut[id] = v;
        }
      }

      await this.db.characters.update(characterId, {
        sheetHiddenComponentIds: hiddenMerged,
        componentLayoutOverrides: layoutMerged,
        componentScriptDataPatches: dataMerged,
        ...(styleOut ? { componentStyleOverrides: styleOut } : {}),
        ...(attributeIdOut ? { componentAttributeIdOverrides: attributeIdOut } : {}),
        updatedAt: now,
      } as Partial<Character>);

      for (const cw of state.windows) {
        const overlay = state.overlayByCharWindowId.get(cw.id) ?? [];
        const persisted = (await this.db.characterWindows.get(cw.id)) as
          | CharacterWindow
          | undefined;
        const prevJson = persisted?.scriptOverlayComponents ?? null;
        const nextJson = JSON.stringify(overlay);

        const merged = this.mergedPreOrderForWindow(state, cw);
        const validIds = new Set(merged.map((c) => c.id));
        const curMap = state.activeStatesByCharWindowId.get(cw.id) ?? {};
        const pruned = pruneComponentActiveStatesMap(curMap, validIds);
        state.activeStatesByCharWindowId.set(cw.id, pruned);
        const nextActiveJson = stringifyComponentActiveStatesMap(pruned);
        const prevActive = persisted?.componentActiveStates ?? null;

        if (prevJson !== nextJson || prevActive !== nextActiveJson) {
          await this.db.characterWindows.update(cw.id, {
            ...(prevJson !== nextJson ? { scriptOverlayComponents: nextJson } : {}),
            ...(prevActive !== nextActiveJson ? { componentActiveStates: nextActiveJson } : {}),
            updatedAt: now,
          } as Partial<CharacterWindow>);
        }
      }
    }

    this.charState.clear();
    this.touched.clear();
  }
}
