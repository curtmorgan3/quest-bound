import { useScripts } from '@/lib/compass-api/hooks/scripts/use-scripts';
import { useReactiveScriptExecution } from '@/lib/compass-logic';
import { getComponentData } from '@/lib/compass-planes/utils';
import { CharacterContext, DiceContext } from '@/stores';
import type { Component, ScriptParamValue } from '@/types';
import { useCallback, useContext, useMemo, type ReactNode } from 'react';

interface NodeScriptCallerProps {
  children: ReactNode;
  component: Component;
}

export const NodeScriptCaller = ({ children, component }: NodeScriptCallerProps) => {
  const characterContext = useContext(CharacterContext);
  const diceContext = useContext(DiceContext);
  const character = characterContext?.character;
  const hasScript = Boolean(component.scriptId);

  const rollFn = useCallback(
    (expression: string, rerollMessage?: string) =>
      diceContext?.rollDice(expression, { rerollMessage }).then((r) => r.total),
    [diceContext],
  );

  const { scripts } = useScripts();
  const script = useMemo(
    () => (hasScript ? scripts.find((s) => s.id === component.scriptId) : undefined),
    [scripts, hasScript, component.scriptId],
  );

  const { execute, isExecuting } = useReactiveScriptExecution();

  const paramsRecord = useMemo(() => {
    if (!script) return undefined;
    const data = getComponentData(component);
    const values: Record<string, ScriptParamValue> = data.scriptParameterValues ?? {};
    const defs = script.parameters ?? [];

    const result: Record<string, ScriptParamValue> = {};

    const coerceNumber = (raw: ScriptParamValue): ScriptParamValue => {
      if (raw == null) return null;
      if (typeof raw === 'number') return Number.isFinite(raw) ? raw : null;
      if (typeof raw === 'boolean') return raw ? 1 : 0;
      const trimmed = String(raw).trim();
      if (!trimmed) return null;
      const num = Number(trimmed);
      return Number.isFinite(num) ? num : null;
    };

    const coerceBoolean = (raw: ScriptParamValue): ScriptParamValue => {
      if (raw == null) return null;
      if (typeof raw === 'boolean') return raw;
      if (typeof raw === 'number') return raw !== 0;
      const trimmed = String(raw).trim().toLowerCase();
      if (!trimmed) return null;
      if (trimmed === 'true' || trimmed === '1' || trimmed === 'yes' || trimmed === 'y') return true;
      if (trimmed === 'false' || trimmed === '0' || trimmed === 'no' || trimmed === 'n') return false;
      return null;
    };

    for (const def of defs) {
      const label = (def.label ?? '').trim();
      if (!label) continue;
      const key = label.toLowerCase();

      const hasOverride = Object.prototype.hasOwnProperty.call(values, def.id);
      const raw: ScriptParamValue =
        hasOverride && values[def.id] !== undefined
          ? values[def.id]!
          : (def.defaultValue as ScriptParamValue | undefined) ?? null;

      let coerced: ScriptParamValue = null;
      if (def.type === 'string') {
        coerced = raw == null ? null : (String(raw) as ScriptParamValue);
      } else if (def.type === 'number') {
        coerced = coerceNumber(raw);
      } else if (def.type === 'boolean') {
        coerced = coerceBoolean(raw);
      } else {
        coerced = raw ?? null;
      }

      result[key] = coerced;
    }

    return result;
  }, [component, script]);

  if (!character || !hasScript || !script) {
    return <>{children}</>;
  }

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isExecuting) return;

    void execute({
      scriptId: script.id,
      sourceCode: script.sourceCode,
      characterId: character.id,
      rulesetId: character.rulesetId,
      triggerType: 'action_click',
      entityType: script.entityType,
      entityId: script.entityId ?? undefined,
      campaignId: characterContext?.campaignId,
      params: paramsRecord,
      roll: diceContext ? rollFn : undefined,
    });
  };

  return (
    <div
      role='button'
      className='clickable'
      onClick={handleClick}
      aria-busy={isExecuting || undefined}>
      {children}
    </div>
  );
};

