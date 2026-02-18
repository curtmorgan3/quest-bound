import { useScripts } from '@/lib/compass-api';
import { useScriptValidation } from '@/lib/compass-logic';
import type { Script } from '@/types';
import { useEffect, useRef } from 'react';

const AUTOSAVE_DEBOUNCE_MS = 1500;

interface UseAutoSave {
  sourceCode: string;
  script?: Script | null;
}

export const useAutoSave = ({ sourceCode, script }: UseAutoSave) => {
  const { errors: validationErrors, validate } = useScriptValidation();
  const { updateScript } = useScripts();

  const scriptId = script?.id ?? 'New';

  // Debounced autosave on CodeMirror sourceCode change
  const autosaveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (autosaveTimeoutRef.current) clearTimeout(autosaveTimeoutRef.current);
    autosaveTimeoutRef.current = setTimeout(() => {
      validate(scriptId, sourceCode);
      if (script) {
        updateScript(script.id, { sourceCode });
      }
    }, AUTOSAVE_DEBOUNCE_MS);
    return () => {
      if (autosaveTimeoutRef.current) clearTimeout(autosaveTimeoutRef.current);
    };
  }, [sourceCode]);

  return {
    validationErrors,
  };
};
