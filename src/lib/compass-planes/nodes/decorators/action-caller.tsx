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

  const handleClick = () => {
    if (!action) return;
    fireAction(action.id);
  };

  return (
    <div
      style={style}
      onClick={action ? handleClick : undefined}
      className={action ? 'clickable' : ''}>
      {children}
    </div>
  );
};
