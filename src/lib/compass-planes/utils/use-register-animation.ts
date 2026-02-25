import { useAttributeChangedByScript } from './use-attribute-changed-by-script';
import { useLayoutEffect, useRef, useState } from 'react';

const FLASH_DURATION_MS = 400;

export type UseRegisterAnimationResult = {
  /** Use as key on the animated element so it remounts and the CSS animation runs again each time. */
  flashKey: number;
  /** True while the flash is active. Apply className "script-change-flash" when true. */
  scriptChangeFlash: boolean;
};

/**
 * Registers the component for script-change animation. Calls useAttributeChangedByScript,
 * holds the effect that triggers the flash, and returns flashKey + scriptChangeFlash
 * so the component can re-render and run the CSS animation each time a script changes the value.
 */
export function useRegisterAnimation(
  characterId: string,
  attributeId: string,
  currentVal: string | number | boolean,
): UseRegisterAnimationResult {
  const { changedByScript, clearModified } = useAttributeChangedByScript(
    characterId,
    attributeId,
    currentVal,
  );

  const [scriptChangeFlash, setScriptChangeFlash] = useState(false);
  const [flashKey, setFlashKey] = useState(0);
  const requestFlashRef = useRef(false);
  if (changedByScript) requestFlashRef.current = true;

  useLayoutEffect(() => {
    if (requestFlashRef.current) {
      requestFlashRef.current = false;
      clearModified();
      setFlashKey((k) => k + 1);
      setScriptChangeFlash(true);
      const t = setTimeout(() => setScriptChangeFlash(false), FLASH_DURATION_MS);
      return () => clearTimeout(t);
    }
  });

  return { flashKey, scriptChangeFlash };
}
