import { useActiveRuleset } from '@/lib/compass-api';
import { CharacterContext, useCurrentUser } from '@/stores';
import type { Component } from '@/types';
import { useContext, type ReactNode } from 'react';
import { useNodeData, useRegisterAnimation } from '../../utils';

interface NodeAnimationProps {
  children: ReactNode;
  component: Component;
}

export const NodeAnimation = ({ component, children }: NodeAnimationProps) => {
  const { currentUser } = useCurrentUser();
  const { activeRuleset } = useActiveRuleset();
  const sheetAttributeAnimations = currentUser?.preferences?.sheetAttributeAnimations ?? true;
  const context = useContext(CharacterContext);
  const character = context?.character;
  const { value, attributeType } = useNodeData(component);
  const { flashKey, diff, scriptChangeFlash } = useRegisterAnimation(
    character?.id ?? '',
    component.attributeId ?? '',
    attributeType === 'number' ? parseInt(`${value}`) : value,
  );

  const animation = activeRuleset?.details?.animation;
  const animationColor = activeRuleset?.details?.animationColor;

  if (!sheetAttributeAnimations) {
    return <>{children}</>;
  }

  switch (animation) {
    case 'floating-difference':
      return (
        <div key={flashKey}>
          {children}
          {diff ? (
            <span
              key={diff}
              className='floating-difference'
              style={animationColor ? { color: animationColor } : undefined}>
              {diff}
            </span>
          ) : null}
        </div>
      );

    case 'pop':
      return (
        <div key={flashKey} className='sheet-attribute-animation-wrapper'>
          <div
            className={scriptChangeFlash ? 'sheet-attribute-animation-pop' : undefined}
            style={{ display: 'inline-block' }}>
            {children}
          </div>
        </div>
      );

    case 'highlight':
      return (
        <div key={flashKey} className='sheet-attribute-animation-wrapper'>
          {children}
          {scriptChangeFlash ? (
            <div
              className='sheet-attribute-highlight-overlay'
              style={{
                backgroundColor: animationColor ?? 'var(--primary)',
              }}
              aria-hidden
            />
          ) : null}
        </div>
      );

    case 'glow':
      return (
        <div key={flashKey} className='sheet-attribute-animation-wrapper'>
          <div
            className={scriptChangeFlash ? 'sheet-attribute-animation-glow' : undefined}
            style={{
              display: 'inline-block',
              ...(scriptChangeFlash && animationColor
                ? { ['--sheet-animation-color' as string]: animationColor }
                : {}),
            }}>
            {children}
          </div>
        </div>
      );

    case 'shimmer':
      return (
        <div
          key={flashKey}
          className='sheet-attribute-animation-wrapper'
          style={
            scriptChangeFlash && animationColor
              ? { ['--sheet-animation-color' as string]: animationColor }
              : undefined
          }>
          {children}
          {scriptChangeFlash ? (
            <div className='sheet-attribute-shimmer-overlay' aria-hidden />
          ) : null}
        </div>
      );

    case 'fade':
      return (
        <div key={flashKey} className='sheet-attribute-animation-wrapper'>
          <div
            className={scriptChangeFlash ? 'sheet-attribute-animation-fade' : undefined}
            style={{ display: 'inline-block' }}>
            {children}
          </div>
        </div>
      );

    default:
      return <>{children}</>;
  }
};
