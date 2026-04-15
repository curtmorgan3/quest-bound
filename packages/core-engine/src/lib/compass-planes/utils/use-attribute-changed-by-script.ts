import { useScriptModifiedAttributesStore } from '@/stores/script-modified-attributes-store';
import { useRef } from 'react';

function scriptModifiedKey(characterId: string, attributeId: string): string {
  return `${characterId}:${attributeId}`;
}

export type UseAttributeChangedByScriptResult = {
  /** True when this attribute was just updated by script (reported once per change). */
  changedByScript: boolean;
  /** Call when you have consumed the change (e.g. started animation). Clears this attribute from the script-modified set so it is only reported once. */
  clearModified: () => void;
};

/**
 * Use in window components bound to an attribute (component.attributeId) to detect
 * when the value was changed by QBScript so you can trigger animation.
 *
 * @param characterId - Current character id (e.g. from CharacterContext).
 * @param attributeId - Ruleset attribute id (e.g. component.attributeId).
 * @param currentVal - Current value (e.g. data.value from useNodeData).
 * @returns { changedByScript, clearModified }.
 */
export function useAttributeChangedByScript(
  characterId: string,
  attributeId: string,
  currentVal: string | number | boolean,
): UseAttributeChangedByScriptResult {
  const removeModified = useScriptModifiedAttributesStore((state) => state.removeModified);

  const hasValidIds = Boolean(characterId && attributeId);
  const key = hasValidIds ? scriptModifiedKey(characterId, attributeId) : '';
  // Single subscription on a primitive so we only re-render when this attribute is added/removed or generation bumps.
  const trigger = useScriptModifiedAttributesStore((state) =>
    key && state.modifiedKeys.has(key) ? state.generation : 0,
  );
  const isInSet = hasValidIds && trigger !== 0;

  const clearModifiedRef = useRef(() => {
    if (characterId && attributeId) removeModified(characterId, attributeId);
  });
  clearModifiedRef.current = () => {
    if (characterId && attributeId) removeModified(characterId, attributeId);
  };

  return {
    changedByScript: isInSet,
    clearModified: clearModifiedRef.current,
  };
}
