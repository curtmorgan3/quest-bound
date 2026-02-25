import { useScriptModifiedAttributesStore } from '@/stores/script-modified-attributes-store';
import { useEffect, useRef } from 'react';

function scriptModifiedKey(characterId: string, attributeId: string): string {
  return `${characterId}:${attributeId}`;
}

export type AttributeChangeDiff<T = string | number | boolean> = {
  from: T | undefined;
  to: T;
};

export type UseAttributeChangedByScriptResult<T = string | number | boolean> = {
  /** True when this attribute was just updated by script (reported once per change). */
  changedByScript: boolean;
  /** When changedByScript is true, the previous and new value for animation. */
  diff: AttributeChangeDiff<T> | null;
};

/**
 * Use in window components bound to an attribute (component.attributeId) to detect
 * when the value was changed by QBScript and get a from/to diff for animation.
 *
 * @param characterId - Current character id (e.g. from CharacterContext).
 * @param attributeId - Ruleset attribute id (e.g. component.attributeId).
 * @param currentVal - Current value (e.g. data.value from useNodeData).
 * @returns { changedByScript, diff }. Only reports diff when the value actually changed (from !== to).
 */
export function useAttributeChangedByScript<T = string | number | boolean>(
  characterId: string,
  attributeId: string,
  currentVal: T,
): UseAttributeChangedByScriptResult<T> {
  const previousValRef = useRef<T | undefined>(undefined);
  const modifiedKeys = useScriptModifiedAttributesStore((state) => state.modifiedKeys);
  const removeModified = useScriptModifiedAttributesStore((state) => state.removeModified);
  const pendingRemoveRef = useRef(false);

  const hasValidIds = Boolean(characterId && attributeId);
  const key = hasValidIds ? scriptModifiedKey(characterId, attributeId) : '';
  const isInSet = hasValidIds && modifiedKeys.has(key);

  let result: UseAttributeChangedByScriptResult<T>;

  if (isInSet) {
    const from = previousValRef.current;
    const to = currentVal;
    const valueChanged = from !== to;
    if (valueChanged) {
      previousValRef.current = currentVal;
      pendingRemoveRef.current = true;
      result = { changedByScript: true, diff: { from, to } };
    } else {
      previousValRef.current = currentVal;
      result = { changedByScript: false, diff: null };
    }
  } else {
    previousValRef.current = currentVal;
    result = { changedByScript: false, diff: null };
  }

  useEffect(() => {
    if (pendingRemoveRef.current && characterId && attributeId) {
      pendingRemoveRef.current = false;
      removeModified(characterId, attributeId);
    }
  }, [characterId, attributeId, removeModified]);

  return result;
}
