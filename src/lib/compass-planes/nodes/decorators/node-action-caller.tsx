import { useActions } from '@/lib/compass-api';
import { useScripts } from '@/lib/compass-api/hooks/scripts/use-scripts';
import { CharacterContext } from '@/stores';
import type { Component, ComponentData } from '@/types';
import { useContext, useMemo, type CSSProperties, type ReactNode } from 'react';
import { getComponentData } from '../../utils';

interface NodeActionCallerProps {
  children: ReactNode;
  component: Component;
  componentData?: ComponentData;
  style?: CSSProperties;
}

function hasNavigatorTargets(component: Component, data: ComponentData): boolean {
  return Boolean(data.pageId || component.childWindowId || data.href);
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

  const action = component.actionId
    ? actions.find((a) => a.id === component.actionId)
    : undefined;
  const hasVisibleClickScript = useMemo(() => {
    if (!component.scriptId) return false;
    const s = scripts.find((x) => x.id === component.scriptId);
    return Boolean(s && !s.hidden);
  }, [component.scriptId, scripts]);
  const blockedByNavigation = hasNavigatorTargets(component, data);

  const shouldHandle = Boolean(action) && !hasVisibleClickScript && !blockedByNavigation;

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
