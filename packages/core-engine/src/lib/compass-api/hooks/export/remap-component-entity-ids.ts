import type { ComponentStateEntry } from '@/types';

/** Maps used to rewrite ids inside component `data` / `states` and top-level click/script fields. */
export type ComponentEntityIdMaps = {
  pageIdMap: Map<string, string>;
  attributeIdMap: Map<string, string>;
  actionIdMap: Map<string, string>;
  windowIdMap: Map<string, string>;
  scriptIdMap: Map<string, string>;
  assetIdMap: Map<string, string>;
  itemIdMap: Map<string, string>;
};

export function mapOptionalEntityId(
  value: unknown,
  map: Map<string, string>,
): string | null | undefined {
  if (value == null || value === '') return value as null | undefined;
  if (typeof value !== 'string') return value as string;
  return map.get(value) ?? value;
}

/**
 * Remap ruleset entity ids in a parsed `ComponentData` object (base layer or state diff).
 * Keeps `null` / explicit clears; only string ids are passed through maps.
 */
export function remapComponentDataIds(
  data: Record<string, unknown>,
  m: ComponentEntityIdMaps,
): void {
  if (typeof data.pageId === 'string' && data.pageId) {
    data.pageId = m.pageIdMap.get(data.pageId) ?? data.pageId;
  }

  for (const key of [
    'viewAttributeId',
    'toggleBooleanAttributeId',
    'tooltipAttributeId',
    'conditionalRenderAttributeId',
  ] as const) {
    if (key in data && data[key] != null && data[key] !== '') {
      data[key] = mapOptionalEntityId(data[key], m.attributeIdMap);
    }
  }

  if ('clickActionId' in data) {
    data.clickActionId = mapOptionalEntityId(data.clickActionId, m.actionIdMap);
  }
  if ('clickChildWindowId' in data) {
    data.clickChildWindowId = mapOptionalEntityId(data.clickChildWindowId, m.windowIdMap);
  }
  if ('clickScriptId' in data) {
    data.clickScriptId = mapOptionalEntityId(data.clickScriptId, m.scriptIdMap);
  }

  for (const key of ['assetId'] as const) {
    if (key in data && typeof data[key] === 'string' && data[key]) {
      data[key] = m.assetIdMap.get(data[key] as string) ?? data[key];
    }
  }

  for (const key of ['checkedAssetId', 'uncheckedAssetId'] as const) {
    if (key in data && typeof data[key] === 'string' && data[key]) {
      data[key] = m.assetIdMap.get(data[key] as string) ?? data[key];
    }
  }

  if (typeof data.itemRestrictionRef === 'string' && data.itemRestrictionRef) {
    data.itemRestrictionRef = m.itemIdMap.get(data.itemRestrictionRef) ?? data.itemRestrictionRef;
  }
  if (typeof data.actionRestrictionRef === 'string' && data.actionRestrictionRef) {
    data.actionRestrictionRef =
      m.actionIdMap.get(data.actionRestrictionRef) ?? data.actionRestrictionRef;
  }

  for (const key of ['numeratorAttributeId', 'denominatorAttributeId'] as const) {
    if (key in data && data[key] != null && data[key] !== '') {
      data[key] = mapOptionalEntityId(data[key], m.attributeIdMap);
    }
  }
}

export function remapComponentSerializedDataAndStates(
  dataJson: string,
  statesJson: string | null | undefined,
  m: ComponentEntityIdMaps,
): { data: string; states: string | null | undefined } {
  let data = dataJson;
  try {
    const parsed = JSON.parse(dataJson) as Record<string, unknown>;
    remapComponentDataIds(parsed, m);
    data = JSON.stringify(parsed);
  } catch {
    // leave data unchanged if not valid JSON
  }

  let states = statesJson;
  if (statesJson == null || statesJson === '') {
    return { data, states: statesJson };
  }
  try {
    const entries = JSON.parse(statesJson) as ComponentStateEntry[];
    if (!Array.isArray(entries)) {
      return { data, states };
    }
    for (const entry of entries) {
      if (entry?.data && typeof entry.data === 'string' && entry.data.trim() !== '') {
        try {
          const partial = JSON.parse(entry.data) as Record<string, unknown>;
          remapComponentDataIds(partial, m);
          entry.data = JSON.stringify(partial);
        } catch {
          // keep state data string
        }
      }
    }
    states = JSON.stringify(entries);
  } catch {
    // keep states unchanged
  }

  return { data, states };
}
