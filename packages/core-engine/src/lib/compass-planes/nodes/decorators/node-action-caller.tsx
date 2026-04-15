import { useActions } from '@/lib/compass-api';
import { useScripts } from '@/lib/compass-api/hooks/scripts/use-scripts';
import { CharacterContext } from '@/stores';
import type { Component, ComponentData } from '@/types';
import { useContext, useMemo, type CSSProperties, type ReactNode } from 'react';
import {
  getComponentData,
  resolveEffectiveActionId,
  resolveEffectiveChildWindowId,
  resolveEffectiveScriptId,
} from '../../utils';

interface NodeActionCallerProps {
  children: ReactNode;
  component: Component;
  componentData?: ComponentData;
  style?: CSSProperties;
}

function hasNavigatorTargets(component: Component, data: ComponentData): boolean {
  const childWindowId = resolveEffectiveChildWindowId(component, data);
  return Boolean(
    data.pageId ||
      childWindowId ||
      data.href ||
      data.closeCharacterWindowOnClick,
  );
}

export const NodeActionCaller = ({
  children,
  component,
  componentData,
  style,
}: NodeActionCallerProps) => {
  const { fireAction } = useContext(CharacterContext);
  const { actions } = useActions();
  const { scripts } = useScripts();
  const data = componentData ?? getComponentData(component);

  const effectiveActionId = resolveEffectiveActionId(component, data);
  const action = effectiveActionId ? actions.find((a) => a.id === effectiveActionId) : undefined;
  const effectiveScriptId = resolveEffectiveScriptId(component, data);
  const hasVisibleClickScript = useMemo(() => {
    if (!effectiveScriptId) return false;
    const s = scripts.find((x) => x.id === effectiveScriptId);
    return Boolean(s && !s.hidden);
  }, [effectiveScriptId, scripts]);
  const blockedByNavigation = hasNavigatorTargets(component, data);

  const shouldHandle =
    Boolean(action) && !hasVisibleClickScript && !blockedByNavigation && !data.disabled;

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!action) return;
    fireAction(action.id);
  };

  return (
    <div
      style={style}
      role={shouldHandle ? 'button' : undefined}
      onClick={shouldHandle ? handleClick : undefined}
      className={shouldHandle ? 'clickable' : ''}
      data-action-id={action?.id}
      data-action-title={action?.title}>
      {children}
    </div>
  );
};
