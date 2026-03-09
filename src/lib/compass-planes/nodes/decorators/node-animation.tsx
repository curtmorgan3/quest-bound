import { CharacterContext, useCurrentUser } from '@/stores';
import type { Component } from '@/types';
import { useContext, useEffect, useState, type CSSProperties, type ReactNode } from 'react';
import {
  getComponentData,
  useComponentAnimationTrigger,
  useComponentStyles,
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
  const style = useComponentStyles(component);

  const numericCurrent =
    attributeType === 'number'
      ? (() => {
          const n = Number(value);
          return Number.isFinite(n) ? n : null;
        })()
      : null;
  const { flashKey, diff, scriptChangeFlash } = useRegisterAnimation(
    character?.id ?? '',
    component.attributeId ?? '',
    numericCurrent ?? (value as string | number | boolean),
  );

  const data = getComponentData(component);
  const animation = data.animation;
  const animationColor = data.animationColor;

  const scriptTriggeredAnimation = useComponentAnimationTrigger(
    character?.id ?? '',
    data.referenceLabel ?? '',
  );

  const effectiveScriptAnimation =
    character?.id && data.referenceLabel && scriptTriggeredAnimation
      ? scriptTriggeredAnimation
      : null;

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
      case 'tic': {
        if (numericCurrent === null || !diff) {
          content = <>{children}</>;
          break;
        }

        const delta = parseNumericDiff(diff);
        const canAnimate = delta !== null && delta !== 0 && Number.isFinite(numericCurrent);

        if (!canAnimate) {
          content = <>{children}</>;
          break;
        }

        content = (
          <div key={flashKey} className='sheet-attribute-animation-wrapper'>
            {scriptChangeFlash ? (
              <TicOverlay
                key={`tic-${flashKey}`}
                style={{
                  ...style,
                  height: `${component.height}px`,
                  width: `${component.width}px`,
                }}
                currentValue={numericCurrent}
                diff={diff}
              />
            ) : (
              children
            )}
          </div>
        );
        break;
      }
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
        key={`script-${effectiveScriptAnimation.generation}`}
        className={`sheet-attribute-animation-${effectiveScriptAnimation.animation.toLowerCase()}`}
        style={{ display: 'inline-block' }}>
        {content}
      </div>
    );
  }

  return content;
};

export function parseNumericDiff(diff: string): number | null {
  const trimmed = diff.trim();
  if (!trimmed) return null;
  const num = Number(trimmed);
  if (!Number.isFinite(num)) return null;
  return num;
}

interface TicOverlayProps {
  currentValue: number;
  diff: string;
  style: CSSProperties;
}

const MAX_TIC_STEPS = 1000;
const FLASH_DURATION_MS = 800;

const TicOverlay = ({ currentValue, diff, style }: TicOverlayProps) => {
  const [displayValue, setDisplayValue] = useState<number | null>(null);

  useEffect(() => {
    const delta = parseNumericDiff(diff);
    if (delta === null || delta === 0) {
      setDisplayValue(null);
      return;
    }

    const prevValue = currentValue - delta;

    if (!Number.isFinite(prevValue) || !Number.isFinite(currentValue)) {
      setDisplayValue(null);
      return;
    }

    const absDelta = Math.abs(delta);

    // Only render if both the prev and new values are numbers and the change is small enough to animate.
    if (absDelta > MAX_TIC_STEPS) {
      setDisplayValue(null);
      return;
    }

    let value = prevValue;
    const step = delta > 0 ? 1 : -1;

    setDisplayValue(value);

    const intervalMs = Math.max(16, Math.floor(FLASH_DURATION_MS / absDelta));

    const intervalId = window.setInterval(() => {
      value += step;

      if ((step > 0 && value >= currentValue) || (step < 0 && value <= currentValue)) {
        setDisplayValue(currentValue);
        window.clearInterval(intervalId);
        return;
      }

      setDisplayValue(value);
    }, intervalMs);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [currentValue, diff]);

  if (displayValue === null) return null;

  return (
    <span style={{ ...style, display: 'inline-block' }} aria-hidden>
      {displayValue}
    </span>
  );
};
