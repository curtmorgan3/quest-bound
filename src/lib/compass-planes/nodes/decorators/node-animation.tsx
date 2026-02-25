import { CharacterContext } from '@/stores';
import type { Component } from '@/types';
import { useContext, type ReactNode } from 'react';
import { useNodeData, useRegisterAnimation } from '../../utils';

interface NodeAnimationProps {
  children: ReactNode;
  component: Component;
}

export const NodeAnimation = ({ component, children }: NodeAnimationProps) => {
  const context = useContext(CharacterContext);
  const character = context?.character;

  const { value } = useNodeData(component);

  const { flashKey, diff } = useRegisterAnimation(
    character?.id,
    component.attributeId ?? '',
    value,
    true,
  );

  return (
    <div key={flashKey} className='node-animator'>
      {children}
      {diff ? (
        <span key={diff} className='script-change-float'>
          {diff}
        </span>
      ) : null}
    </div>
  );
};
