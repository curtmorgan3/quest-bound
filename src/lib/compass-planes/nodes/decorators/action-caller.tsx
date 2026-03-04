import { useActions } from '@/lib/compass-api';
import { CharacterContext } from '@/stores';
import type { Component } from '@/types';
import { useContext, type CSSProperties, type ReactNode } from 'react';

interface NodeActionCaller {
  children: ReactNode;
  component: Component;
  style?: CSSProperties;
}

export const NodeActionCaller = ({ children, component, style }: NodeActionCaller) => {
  const { fireAction } = useContext(CharacterContext);
  const { actions } = useActions();

  const action = actions.find((action) => action.id === component.actionId);
  const hasScript = Boolean(component.scriptId);

  const handleClick = () => {
    if (!action) return;
    fireAction(action.id);
  };

  return (
    <div
      style={style}
      role={action && !hasScript ? 'button' : undefined}
      onClick={action && !hasScript ? handleClick : undefined}
      className={action && !hasScript ? 'clickable' : ''}
      data-action-id={action?.id}
      data-action-title={action?.title}>
      {children}
    </div>
  );
};
