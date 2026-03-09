import { CharacterContext, useCurrentUser } from '@/stores';
import type { Component } from '@/types';
import { useContext, type ReactNode } from 'react';
import {
  getComponentData,
  useComponentAnimationTrigger,
  useNodeData,
  useRegisterAnimation,
} from '../../utils';

interface NodeAnimationProps {
  children: ReactNode;
  component: Component;
}

export const NodeAnimation = ({ component, children }: NodeAnimationProps) => {
  const { currentUser } = useCurrentUser();
  const sheetAttributeAnimations = currentUser?.preferences?.sheetAttributeAnimations ?? true;
  const context = useContext(CharacterContext);
  const character = context?.character;
  const { value, attributeType } = useNodeData(component);
  const { flashKey, diff, scriptChangeFlash } = useRegisterAnimation(
    character?.id ?? '',
    component.attributeId ?? '',
    attributeType === 'number' ? parseInt(`${value}`) : value,
  );

  const data = getComponentData(component);
  const animation = data.animation;
  const animationColor = data.animationColor;

  const scriptTriggeredAnimation = useComponentAnimationTrigger(
    character?.id ?? '',
    data.referenceLabel ?? '',
  );

  const effectiveScriptAnimation =
    character?.id && data.referenceLabel ? scriptTriggeredAnimation : null;

  if (!sheetAttributeAnimations && !effectiveScriptAnimation) {
    return <>{children}</>;
  }

  let content: ReactNode;
  if (!sheetAttributeAnimations) {
    content = children;
  } else
    switch (animation) {
      case 'floating-difference':
        content = (
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
        break;
      case 'pop':
        content = (
          <div key={flashKey} className='sheet-attribute-animation-wrapper'>
            <div
              className={scriptChangeFlash ? 'sheet-attribute-animation-pop' : undefined}
              style={{ display: 'inline-block' }}>
              {children}
            </div>
          </div>
        );
        break;
      case 'highlight':
        content = (
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
        break;
      case 'glow':
        content = (
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
        break;
      case 'shimmer':
        content = (
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
        break;
      case 'fade':
        content = (
          <div key={flashKey} className='sheet-attribute-animation-wrapper'>
            <div
              className={scriptChangeFlash ? 'sheet-attribute-animation-fade' : undefined}
              style={{ display: 'inline-block' }}>
              {children}
            </div>
          </div>
        );
        break;
      case 'shake':
        content = (
          <div key={flashKey} className='sheet-attribute-animation-wrapper'>
            <div
              className={scriptChangeFlash ? 'sheet-attribute-animation-shake' : undefined}
              style={{ display: 'inline-block' }}>
              {children}
            </div>
          </div>
        );
        break;
      default:
        content = <>{children}</>;
    }

  if (effectiveScriptAnimation) {
    content = (
      <div
        key={`script-${effectiveScriptAnimation}`}
        className={`sheet-attribute-animation-${effectiveScriptAnimation}`}
        style={{ display: 'inline-block' }}>
        {content}
      </div>
    );
  }

  return content;
};
