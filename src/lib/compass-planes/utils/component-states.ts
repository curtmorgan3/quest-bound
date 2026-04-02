import type { Component, ComponentStateEntry } from '@/types';

export const COMPONENT_STATE_HOVER = 'Hover';
export const COMPONENT_STATE_DISABLED = 'Disabled';
export const COMPONENT_STATE_PRESSED = 'Pressed';
export const COMPONENT_STATE_CLEAR_TOKEN = 'default';

const RESERVED_CUSTOM_STATE_NAMES_LOWER = new Set([
  COMPONENT_STATE_CLEAR_TOKEN.toLowerCase(),
  COMPONENT_STATE_HOVER.toLowerCase(),
  COMPONENT_STATE_DISABLED.toLowerCase(),
  COMPONENT_STATE_PRESSED.toLowerCase(),
]);

/** Stored on `Component.editorStateTarget`; unset / null means base (default) layer in the window editor. */
export function getEditorPreviewStateName(
  component: Pick<Component, 'editorStateTarget'>,
): string {
  const t = component.editorStateTarget;
  if (t == null || t === '') return 'base';
  return t;
}

const MAX_STATES = 5;

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === 'object' && !Array.isArray(v);
}

function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (typeof a !== typeof b) return false;
  if (a == null || b == null) return a === b;
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    return a.every((x, i) => deepEqual(x, b[i]));
  }
  if (isPlainObject(a) && isPlainObject(b)) {
    const ak = Object.keys(a);
    const bk = Object.keys(b);
    if (ak.length !== bk.length) return false;
    return ak.every((k) => deepEqual(a[k], b[k]));
  }
  return false;
}

export function deepMergeRecords(
  base: Record<string, unknown>,
  patch: Record<string, unknown>,
): Record<string, unknown> {
  const out = { ...base };
  for (const [k, v] of Object.entries(patch)) {
    if (isPlainObject(v) && isPlainObject(out[k])) {
      out[k] = deepMergeRecords(out[k] as Record<string, unknown>, v);
    } else {
      out[k] = v;
    }
  }
  return out;
}

/** Sparse object: only keys (and nested keys) that differ from `base`. */
export function computeSparseDiff(
  base: Record<string, unknown>,
  full: Record<string, unknown>,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const key of Object.keys(full)) {
    const bv = base[key];
    const fv = full[key];
    if (deepEqual(bv, fv)) continue;
    if (isPlainObject(bv) && isPlainObject(fv)) {
      const inner = computeSparseDiff(bv, fv);
      if (Object.keys(inner).length > 0) out[key] = inner;
    } else {
      out[key] = fv;
    }
  }
  return out;
}

export function parseJsonObject(raw: string | null | undefined): Record<string, unknown> {
  if (raw == null || raw === '') return {};
  try {
    const j = JSON.parse(raw) as unknown;
    return isPlainObject(j) ? j : {};
  } catch {
    return {};
  }
}

export function parseComponentStatesList(raw: string | null | undefined): ComponentStateEntry[] {
  if (raw == null || raw === '') return [];
  try {
    const j = JSON.parse(raw) as unknown;
    if (!Array.isArray(j)) return [];
    const out: ComponentStateEntry[] = [];
    for (const row of j) {
      if (!isPlainObject(row)) continue;
      const name = row.name;
      if (typeof name !== 'string' || name.trim() === '') continue;
      const data = typeof row.data === 'string' ? row.data : '{}';
      const style = typeof row.style === 'string' ? row.style : '{}';
      out.push({ name, data, style });
    }
    return out;
  } catch {
    return [];
  }
}

export function stringifyComponentStatesList(entries: ComponentStateEntry[]): string {
  return JSON.stringify(entries);
}

export function findStateEntryByName(
  entries: ComponentStateEntry[],
  name: string,
): ComponentStateEntry | undefined {
  const lower = name.trim().toLowerCase();
  return entries.find((e) => e.name.toLowerCase() === lower);
}

export function resolveSetStateTargetName(
  entries: ComponentStateEntry[],
  requested: string,
): string | null {
  const t = requested.trim();
  if (t.toLowerCase() === COMPONENT_STATE_CLEAR_TOKEN) return null;
  const hit = findStateEntryByName(entries, t);
  return hit?.name ?? null;
}

export type MergeComponentStateLayersOptions = {
  /** Active custom state name from `CharacterWindow.componentActiveStates` (canonical stored name). */
  activeCustomStateName?: string | null;
  /** True while the pointing device is logically over the component (sheet viewer: pointer hover only). */
  showHoverLayer?: boolean;
  /** True while the primary pointer is down after targeting this component (until pointer up/cancel). */
  showPressedLayer?: boolean;
  /** After merging base + custom, read `disabled` from data. */
  showDisabledLayer?: boolean;
  /** Ruleset editor: force preview as if this state applies (base | Hover | Disabled | Pressed | custom name). */
  editorPreviewState?: string | null;
};

function parseStateDiff(entry: ComponentStateEntry | undefined): {
  data: Record<string, unknown>;
  style: Record<string, unknown>;
} {
  if (!entry) return { data: {}, style: {} };
  return {
    data: parseJsonObject(entry.data),
    style: parseJsonObject(entry.style),
  };
}

/**
 * Merge base `component.data` / `component.style` with state layers.
 * Order: base → custom → hover → pressed → disabled (later wins). Disabled suppresses hover and pressed.
 */
export function mergeComponentStateLayers(
  component: Component,
  opts: MergeComponentStateLayersOptions,
): { dataStr: string; styleStr: string } {
  const entries = parseComponentStatesList(component.states);
  const baseData = parseJsonObject(component.data);
  const baseStyle = parseJsonObject(component.style);

  if (opts.editorPreviewState != null && opts.editorPreviewState !== '' && opts.editorPreviewState !== 'base') {
    const preview = opts.editorPreviewState.trim();
    const pEntry = findStateEntryByName(entries, preview);
    if (pEntry) {
      const { data: dDiff, style: sDiff } = parseStateDiff(pEntry);
      const dn = deepMergeRecords(baseData, dDiff);
      const sn = deepMergeRecords(baseStyle, sDiff);
      return { dataStr: JSON.stringify(dn), styleStr: JSON.stringify(sn) };
    }
    return { dataStr: JSON.stringify(baseData), styleStr: JSON.stringify(baseStyle) };
  }

  let data = { ...baseData };
  let style = { ...baseStyle };

  const customName = opts.activeCustomStateName?.trim();
  if (customName) {
    const custom = findStateEntryByName(entries, customName);
    const { data: dDiff, style: sDiff } = parseStateDiff(custom);
    data = deepMergeRecords(data, dDiff);
    style = deepMergeRecords(style, sDiff);
  }

  const disabled = Boolean(data.disabled);
  if (!disabled && opts.showHoverLayer) {
    const hover = findStateEntryByName(entries, COMPONENT_STATE_HOVER);
    const { data: dDiff, style: sDiff } = parseStateDiff(hover);
    data = deepMergeRecords(data, dDiff);
    style = deepMergeRecords(style, sDiff);
  }

  if (!disabled && opts.showPressedLayer) {
    const pressed = findStateEntryByName(entries, COMPONENT_STATE_PRESSED);
    const { data: dDiff, style: sDiff } = parseStateDiff(pressed);
    data = deepMergeRecords(data, dDiff);
    style = deepMergeRecords(style, sDiff);
  }

  if (disabled && opts.showDisabledLayer !== false) {
    const dis = findStateEntryByName(entries, COMPONENT_STATE_DISABLED);
    const { data: dDiff, style: sDiff } = parseStateDiff(dis);
    data = deepMergeRecords(data, dDiff);
    style = deepMergeRecords(style, sDiff);
  }

  return { dataStr: JSON.stringify(data), styleStr: JSON.stringify(style) };
}

export function withMergedStateLayers(component: Component, opts: MergeComponentStateLayersOptions): Component {
  const { dataStr, styleStr } = mergeComponentStateLayers(component, opts);
  return {
    ...component,
    data: dataStr,
    style: styleStr,
    sheetHoverLayerActive: Boolean(opts.showHoverLayer),
    sheetPressedLayerActive: Boolean(opts.showPressedLayer),
  };
}

export function parseComponentActiveStatesMap(raw: string | null | undefined): Record<string, string> {
  const o = parseJsonObject(raw);
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(o)) {
    if (typeof v === 'string' && v.trim() !== '') out[k] = v;
  }
  return out;
}

export function stringifyComponentActiveStatesMap(map: Record<string, string>): string {
  return JSON.stringify(map);
}

export function pruneComponentActiveStatesMap(
  map: Record<string, string>,
  validComponentIds: Set<string>,
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [id, name] of Object.entries(map)) {
    if (validComponentIds.has(id)) out[id] = name;
  }
  return out;
}

export function defaultStatesJson(): string {
  return '[]';
}

export function validateNewCustomStateName(name: string): string | null {
  const t = name.trim();
  if (t === '') return 'Name is required';
  if (RESERVED_CUSTOM_STATE_NAMES_LOWER.has(t.toLowerCase())) {
    if (t.toLowerCase() === COMPONENT_STATE_CLEAR_TOKEN.toLowerCase()) {
      return `"${COMPONENT_STATE_CLEAR_TOKEN}" is reserved`;
    }
    return 'This name is reserved for a built-in state';
  }
  if (!/^[a-zA-Z0-9]+$/.test(t)) return 'Use letters and numbers only';
  return null;
}

export function canAddState(entries: ComponentStateEntry[]): boolean {
  return entries.length < MAX_STATES;
}

export function assertUniqueStateName(
  entries: ComponentStateEntry[],
  name: string,
  exceptIndex?: number,
): string | null {
  const lower = name.trim().toLowerCase();
  for (let i = 0; i < entries.length; i++) {
    if (exceptIndex != null && i === exceptIndex) continue;
    if (entries[i]!.name.toLowerCase() === lower) return 'A state with this name already exists';
  }
  return null;
}

export function upsertStateEntry(
  statesJson: string | null | undefined,
  entry: ComponentStateEntry,
): string {
  const list = parseComponentStatesList(statesJson);
  const idx = list.findIndex((e) => e.name.toLowerCase() === entry.name.toLowerCase());
  if (idx === -1) {
    list.push(entry);
  } else {
    list[idx] = entry;
  }
  return stringifyComponentStatesList(list);
}

export function removeStateEntry(statesJson: string | null | undefined, name: string): string {
  const list = parseComponentStatesList(statesJson).filter(
    (e) => e.name.toLowerCase() !== name.trim().toLowerCase(),
  );
  return stringifyComponentStatesList(list);
}

export function updateStateEntryStyleAndData(
  statesJson: string | null | undefined,
  stateName: string,
  next: { data: string; style: string },
): string {
  const list = parseComponentStatesList(statesJson);
  const idx = list.findIndex((e) => e.name.toLowerCase() === stateName.toLowerCase());
  if (idx === -1) return statesJson ?? defaultStatesJson();
  list[idx] = { ...list[idx]!, data: next.data, style: next.style };
  return stringifyComponentStatesList(list);
}

export function updateStateEntryPartial(
  statesJson: string | null | undefined,
  stateName: string,
  partial: Partial<Pick<ComponentStateEntry, 'data' | 'style'>>,
): string {
  const list = parseComponentStatesList(statesJson);
  const idx = list.findIndex((e) => e.name.toLowerCase() === stateName.toLowerCase());
  if (idx === -1) return statesJson ?? defaultStatesJson();
  list[idx] = { ...list[idx]!, ...partial };
  return stringifyComponentStatesList(list);
}
