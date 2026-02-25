import { useScriptModifiedAttributesStore } from '@/stores/script-modified-attributes-store';
import { useRef } from 'react';

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
  /** Call when you have consumed the change (e.g. started animation). Clears this attribute from the script-modified set so it is only reported once. */
  clearModified: () => void;
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
  const removeModified = useScriptModifiedAttributesStore((state) => state.removeModified);

  const hasValidIds = Boolean(characterId && attributeId);
  const key = hasValidIds ? scriptModifiedKey(characterId, attributeId) : '';
  // Single subscription on a primitive so we only re-render when this attribute is added/removed or generation bumps.
  const trigger = useScriptModifiedAttributesStore((state) =>
    key && state.modifiedKeys.has(key) ? state.generation : 0,
  );
  const isInSet = hasValidIds && trigger !== 0;

  let result: Omit<UseAttributeChangedByScriptResult<T>, 'clearModified'>;

  if (isInSet) {
    const from = previousValRef.current;
    const to = currentVal;
    previousValRef.current = currentVal;
    result = { changedByScript: true, diff: { from, to } };
  } else {
    previousValRef.current = currentVal;
    result = { changedByScript: false, diff: null };
  }

  const clearModifiedRef = useRef(() => {
    if (characterId && attributeId) removeModified(characterId, attributeId);
  });
  clearModifiedRef.current = () => {
    if (characterId && attributeId) removeModified(characterId, attributeId);
  };

  return {
    ...result,
    clearModified: clearModifiedRef.current,
  };
}
