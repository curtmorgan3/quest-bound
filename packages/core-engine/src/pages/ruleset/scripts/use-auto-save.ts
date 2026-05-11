import { useScripts } from '@/lib/compass-api';
import { useScriptValidation } from '@/lib/compass-logic';
import type { Script, ScriptParameterDefinition } from '@/types';
import { useEffect, useRef } from 'react';

const AUTOSAVE_DEBOUNCE_MS = 1500;

interface UseAutoSave {
  sourceCode: string;
  script?: Script | null;
  parameters?: ScriptParameterDefinition[];
  name?: string;
  entityType?: Script['entityType'];
  entityId?: string | null;
  category?: string | null;
}

export const useAutoSave = ({
  sourceCode,
  script,
  parameters,
  name,
  entityType,
  entityId,
  category,
}: UseAutoSave) => {
  const { errors: validationErrors, validate } = useScriptValidation();
  const { updateScript } = useScripts();

  const scriptId = script?.id ?? 'New';

  const autosaveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (autosaveTimeoutRef.current) clearTimeout(autosaveTimeoutRef.current);
    autosaveTimeoutRef.current = setTimeout(() => {
      validate(scriptId, sourceCode);
      if (!script) return;

      const payload: Partial<Script> = { sourceCode };
      if (parameters) payload.parameters = parameters;
      if (name !== undefined) payload.name = name || 'Untitled';
      if (entityType !== undefined) {
        payload.entityType = entityType;
        payload.isGlobal = entityType === 'global';
        if (
          entityType === 'global' ||
          entityType === 'characterLoader' ||
          entityType === 'gameManager'
        ) {
          payload.entityId = null;
        } else if (entityId !== undefined) {
          payload.entityId = entityId;
        }
      } else if (entityId !== undefined) {
        payload.entityId = entityId;
      }
      if (category !== undefined) payload.category = category ?? undefined;

      updateScript(script.id, payload);
    }, AUTOSAVE_DEBOUNCE_MS);
    return () => {
      if (autosaveTimeoutRef.current) clearTimeout(autosaveTimeoutRef.current);
    };
  }, [
    sourceCode,
    script,
    scriptId,
    parameters,
    name,
    entityType,
    entityId,
    category,
    validate,
    updateScript,
  ]);

  return {
    validationErrors,
  };
};
