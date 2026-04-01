import type { Component, ComponentData } from '@/types';

const cache = new Map<string, ComponentData>();

/**
 * Parses `component.data` JSON with the same caching semantics as `getComponentData` in
 * `node-conversion.ts`, but without importing React, router, or stores — safe for the QBScript worker.
 */
export function parseComponentDataJson(component: Component): ComponentData {
  const key = component.data;
  const hit = cache.get(key);
  if (hit) return hit;
  const parsed = JSON.parse(key) as ComponentData;
  cache.set(key, parsed);
  return parsed;
}
