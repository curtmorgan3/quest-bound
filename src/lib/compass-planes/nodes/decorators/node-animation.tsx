import { useFeatureFlag } from '@/hooks/use-feature-flag';
import { CharacterContext } from '@/stores';
import type { Component } from '@/types';
import { useContext, type ReactNode } from 'react';
import { useNodeData, useRegisterAnimation } from '../../utils';

interface NodeAnimationProps {
  children: ReactNode;
  component: Component;
}

export const NodeAnimation = ({ component, children }: NodeAnimationProps) => {
  const animationEnabled = useFeatureFlag('animation', false);
  const context = useContext(CharacterContext);
  const character = context?.character;
  const { value, attributeType } = useNodeData(component);
  const { flashKey, diff } = useRegisterAnimation(
    character?.id,
    component.attributeId ?? '',
    attributeType === 'number' ? parseInt(`${value}`) : value,
  );

  if (!animationEnabled) {
    return <>{children}</>;
  }

  return (
    <div key={flashKey}>
      {children}
      {diff ? (
        <span key={diff} className='script-change-float'>
          {diff}
        </span>
      ) : null}
    </div>
  );
};
