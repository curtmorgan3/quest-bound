import type { ComponentUpdate } from '@/lib/compass-api';
import type { Component, ComponentLayoutKey, ComponentStateEntry } from '@/types';

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

/**
 * Layout fields that may appear on `ComponentStateEntry` in stored JSON.
 * At merge time, `x` and `y` always come from the base component; other keys may be overridden per state.
 */
export const COMPONENT_LAYOUT_KEYS: readonly ComponentLayoutKey[] = [
  'x',
  'y',
  'z',
  'width',
  'height',
  'rotation',
];

export type MergedLayerGeometry = Pick<Component, 'x' | 'y' | 'z' | 'width' | 'height' | 'rotation'>;

function parseOptionalLayoutField(v: unknown): number | string | undefined {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string' && v !== '') return v;
  return undefined;
}

function getBaseLayout(component: Component): Record<ComponentLayoutKey, number | string> {
  return {
    x: component.x,
    y: component.y,
    z: component.z,
    width: component.width,
    height: component.height,
    rotation: component.rotation,
  };
}

function applyLayoutPatch(
  layout: Record<ComponentLayoutKey, number | string>,
  entry: ComponentStateEntry | undefined,
): Record<ComponentLayoutKey, number | string> {
  if (!entry) return layout;
  const out = { ...layout };
  for (const k of COMPONENT_LAYOUT_KEYS) {
    if (k === 'x' || k === 'y') continue;
    const v = entry[k];
    if (v === undefined || v === null) continue;
    if (typeof v === 'number' && Number.isFinite(v)) out[k] = v;
    else if (typeof v === 'string') out[k] = v;
  }
  return out;
}

function toMergedGeometry(layout: Record<ComponentLayoutKey, number | string>): MergedLayerGeometry {
  return {
    x: layout.x as number,
    y: layout.y as number,
    z: layout.z as number,
    width: layout.width as number,
    height: layout.height as number,
    rotation: layout.rotation as number,
  };
}

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
      const entry: ComponentStateEntry = { name, data, style };
      for (const k of COMPONENT_LAYOUT_KEYS) {
        const pv = parseOptionalLayoutField((row as Record<string, unknown>)[k]);
        if (pv !== undefined) entry[k] = pv;
      }
      out.push(entry);
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
 * Merge base `component.data` / `component.style` / layout with state layers.
 * Order: base → custom → hover → pressed → disabled (later wins). Disabled suppresses hover and pressed.
 */
export function mergeComponentStateLayers(
  component: Component,
  opts: MergeComponentStateLayersOptions,
): { dataStr: string; styleStr: string } & MergedLayerGeometry {
  const entries = parseComponentStatesList(component.states);
  const baseData = parseJsonObject(component.data);
  const baseStyle = parseJsonObject(component.style);
  const baseLayout = getBaseLayout(component);

  if (opts.editorPreviewState != null && opts.editorPreviewState !== '' && opts.editorPreviewState !== 'base') {
    const preview = opts.editorPreviewState.trim();
    const pEntry = findStateEntryByName(entries, preview);
    if (pEntry) {
      const { data: dDiff, style: sDiff } = parseStateDiff(pEntry);
      const dn = deepMergeRecords(baseData, dDiff);
      const sn = deepMergeRecords(baseStyle, sDiff);
      const layout = applyLayoutPatch(baseLayout, pEntry);
      return { dataStr: JSON.stringify(dn), styleStr: JSON.stringify(sn), ...toMergedGeometry(layout) };
    }
    return {
      dataStr: JSON.stringify(baseData),
      styleStr: JSON.stringify(baseStyle),
      ...toMergedGeometry(baseLayout),
    };
  }

  let data = { ...baseData };
  let style = { ...baseStyle };
  let layout = { ...baseLayout };

  const customName = opts.activeCustomStateName?.trim();
  if (customName) {
    const custom = findStateEntryByName(entries, customName);
    const { data: dDiff, style: sDiff } = parseStateDiff(custom);
    data = deepMergeRecords(data, dDiff);
    style = deepMergeRecords(style, sDiff);
    layout = applyLayoutPatch(layout, custom);
  }

  const disabled = Boolean(data.disabled);
  if (!disabled && opts.showHoverLayer) {
    const hover = findStateEntryByName(entries, COMPONENT_STATE_HOVER);
    const { data: dDiff, style: sDiff } = parseStateDiff(hover);
    data = deepMergeRecords(data, dDiff);
    style = deepMergeRecords(style, sDiff);
    layout = applyLayoutPatch(layout, hover);
  }

  if (!disabled && opts.showPressedLayer) {
    const pressed = findStateEntryByName(entries, COMPONENT_STATE_PRESSED);
    const { data: dDiff, style: sDiff } = parseStateDiff(pressed);
    data = deepMergeRecords(data, dDiff);
    style = deepMergeRecords(style, sDiff);
    layout = applyLayoutPatch(layout, pressed);
  }

  if (disabled && opts.showDisabledLayer !== false) {
    const dis = findStateEntryByName(entries, COMPONENT_STATE_DISABLED);
    const { data: dDiff, style: sDiff } = parseStateDiff(dis);
    data = deepMergeRecords(data, dDiff);
    style = deepMergeRecords(style, sDiff);
    layout = applyLayoutPatch(layout, dis);
  }

  return { dataStr: JSON.stringify(data), styleStr: JSON.stringify(style), ...toMergedGeometry(layout) };
}

export function withMergedStateLayers(component: Component, opts: MergeComponentStateLayersOptions): Component {
  const merged = mergeComponentStateLayers(component, opts);
  return {
    ...component,
    data: merged.dataStr,
    style: merged.styleStr,
    x: merged.x,
    y: merged.y,
    z: merged.z,
    width: merged.width,
    height: merged.height,
    rotation: merged.rotation,
    sheetHoverLayerActive: Boolean(opts.showHoverLayer),
    sheetPressedLayerActive: Boolean(opts.showPressedLayer),
  } as Component;
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

/**
 * Set or clear per-state layout overrides. Pass `null` for a key to remove that override (inherit base).
 */
export function mergeStateEntryLayout(
  statesJson: string | null | undefined,
  stateName: string,
  changes: Partial<Record<ComponentLayoutKey, number | string | null>>,
): string {
  const list = parseComponentStatesList(statesJson);
  const idx = list.findIndex((e) => e.name.toLowerCase() === stateName.toLowerCase());
  if (idx === -1) return statesJson ?? defaultStatesJson();
  const next: ComponentStateEntry = { ...list[idx]! };
  for (const k of COMPONENT_LAYOUT_KEYS) {
    if (!(k in changes)) continue;
    const v = changes[k];
    if (v === undefined) continue;
    if (v === null) delete next[k];
    else next[k] = v;
  }
  list[idx] = next;
  return stringifyComponentStatesList(list);
}

/** Layout keys stored on the component row only; state entries never override these. */
const SHARED_ACROSS_STATES_LAYOUT_KEYS = ['x', 'y'] as const satisfies readonly ComponentLayoutKey[];

const PER_STATE_LAYOUT_KEYS = COMPONENT_LAYOUT_KEYS.filter(
  (k) => k !== 'x' && k !== 'y',
) as ComponentLayoutKey[];

/**
 * Remove layout overrides for `keys` from every state entry so they inherit from the base component.
 */
export function stripLayoutKeysFromAllStateEntries(
  statesJson: string | null | undefined,
  keys: readonly ComponentLayoutKey[],
): { json: string; didStrip: boolean } {
  const list = parseComponentStatesList(statesJson);
  let didStrip = false;
  const nextList = list.map((entry) => {
    const copy = { ...entry };
    let entryChanged = false;
    for (const k of keys) {
      if (k in copy && copy[k] !== undefined) {
        delete copy[k];
        entryChanged = true;
      }
    }
    if (entryChanged) didStrip = true;
    return entryChanged ? copy : entry;
  });
  return {
    json: stringifyComponentStatesList(nextList),
    didStrip,
  };
}

/**
 * When the window editor targets a named state, map top-level layout `ComponentUpdate` fields into
 * `states` JSON instead of mutating the base row.
 * `x` and `y` always update the base component and are never stored per state.
 */
export function remapGeometryUpdatesForEditorState(
  updates: ComponentUpdate[],
  getRow: (id: string) => Component | undefined,
): ComponentUpdate[] {
  return updates.map((u) => {
    const real = getRow(u.id);
    if (!real) return u;

    const hasSharedLayoutChange = SHARED_ACROSS_STATES_LAYOUT_KEYS.some(
      (k) => k in u && u[k] !== undefined,
    );
    const target = getEditorPreviewStateName(real);

    if (target === 'base') {
      if (!hasSharedLayoutChange) return u;
      const { json, didStrip } = stripLayoutKeysFromAllStateEntries(
        real.states,
        SHARED_ACROSS_STATES_LAYOUT_KEYS,
      );
      if (!didStrip) return u;
      return { ...u, states: json };
    }

    const layoutChanges: Partial<Record<ComponentLayoutKey, number | string | null>> = {};
    let touchedPerState = false;
    for (const k of PER_STATE_LAYOUT_KEYS) {
      if (!(k in u) || u[k] === undefined) continue;
      touchedPerState = true;
      const newVal = u[k] as number | string;
      const baseVal = real[k];
      layoutChanges[k] = newVal === baseVal ? null : newVal;
    }

    let statesWorking = real.states;
    if (touchedPerState) {
      statesWorking = mergeStateEntryLayout(real.states, target, layoutChanges);
    }

    let statesJson = statesWorking;
    let statesTouched = touchedPerState;
    if (hasSharedLayoutChange) {
      const { json, didStrip } = stripLayoutKeysFromAllStateEntries(
        statesWorking,
        SHARED_ACROSS_STATES_LAYOUT_KEYS,
      );
      statesJson = json;
      statesTouched = statesTouched || didStrip;
    }

    const hasAnyLayoutInU = COMPONENT_LAYOUT_KEYS.some((k) => k in u && u[k] !== undefined);
    if (!hasAnyLayoutInU) return u;

    const next: ComponentUpdate = { id: u.id };
    for (const key of Object.keys(u) as (keyof ComponentUpdate)[]) {
      if (key === 'id') continue;
      if (COMPONENT_LAYOUT_KEYS.includes(key as ComponentLayoutKey)) {
        if (key === 'x' || key === 'y') {
          const v = u[key];
          if (v !== undefined) (next as Record<string, unknown>)[key] = v;
        }
        continue;
      }
      const v = u[key as keyof ComponentUpdate];
      if (v !== undefined) (next as Record<string, unknown>)[key as string] = v;
    }
    if (statesTouched) {
      next.states = statesJson;
    }
    return next;
  });
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
