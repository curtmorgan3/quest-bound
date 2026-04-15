import { CharacterContext, useCurrentUser } from '@/stores';
import type { Component } from '@/types';
import { useContext, useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import {
  canvasDimensionToCss,
  useComponentCanvasDimensions,
} from '@/lib/compass-planes/canvas/editor-item-layout-context';
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
  const { widthStyle: cw, heightStyle: ch } = useComponentCanvasDimensions(component);

  const numericCurrent =
    attributeType === 'number'
      ? (() => {
          const n = Number(value);
          return Number.isFinite(n) ? n : null;
        })()
      : null;

  const prevNumericRef = useRef<number | null>(numericCurrent);
  const [ticRange, setTicRange] = useState<{ from: number; to: number } | null>(null);

  useEffect(() => {
    const prevNumeric = prevNumericRef.current;
    if (
      prevNumeric !== null &&
      numericCurrent !== null &&
      Number.isFinite(prevNumeric) &&
      Number.isFinite(numericCurrent) &&
      prevNumeric !== numericCurrent
    ) {
      setTicRange({ from: prevNumeric, to: numericCurrent });
    }
    prevNumericRef.current = numericCurrent;
  }, [numericCurrent]);

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
        if (
          !ticRange ||
          ticRange.from === ticRange.to ||
          !Number.isFinite(ticRange.from) ||
          !Number.isFinite(ticRange.to)
        ) {
          content = <>{children}</>;
          break;
        }

        content = (
          <div key={flashKey} className='sheet-attribute-animation-wrapper'>
            <TicOverlay
              key={`tic-${flashKey}-${ticRange.from}-${ticRange.to}`}
              style={{
                ...style,
                height: canvasDimensionToCss(ch),
                width: canvasDimensionToCss(cw),
              }}
              from={ticRange.from}
              to={ticRange.to}
              showSign={Boolean(data.showSign)}
            />
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

/** Match `use-node-data` sign formatting for TEXT number attributes with `showSign`. */
function formatValueWithSign(n: number, showSign: boolean): string {
  if (!showSign) return String(n);
  if (n > 0) return `+${n}`;
  return String(n);
}

interface TicOverlayProps {
  from: number;
  to: number;
  style: CSSProperties;
  showSign?: boolean;
}

const MAX_TIC_STEPS = 1000;
const TIC_ANIMATION_DURATION_MS = 1000;

/** Cubic ease-in-out: slow at start and end, faster in the middle. */
function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

const TicOverlay = ({ from, to, style, showSign = false }: TicOverlayProps) => {
  const [displayValue, setDisplayValue] = useState<number>(from);

  useEffect(() => {
    if (!Number.isFinite(from) || !Number.isFinite(to) || from === to) {
      setDisplayValue(to);
      return;
    }

    const delta = to - from;
    const absDelta = Math.abs(delta);

    if (absDelta > MAX_TIC_STEPS) {
      setDisplayValue(to);
      return;
    }

    const startTime = performance.now();

    const tick = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / TIC_ANIMATION_DURATION_MS, 1);
      const easedProgress = easeInOutCubic(progress);
      const value = Math.round(from + delta * easedProgress);
      const clampedValue = delta > 0 ? Math.min(value, to) : Math.max(value, to);
      setDisplayValue(clampedValue);

      if (progress < 1) {
        frameId = window.requestAnimationFrame(tick);
      } else {
        setDisplayValue(to);
      }
    };

    let frameId = window.requestAnimationFrame(tick);

    return () => {
      window.cancelAnimationFrame(frameId);
    };
  }, [from, to]);

  return (
    <span
      style={{
        ...style,
        display: 'flex',
        alignItems: style.verticalAlign as string,
        justifyContent: style.textAlign,
      }}
      aria-hidden>
      {formatValueWithSign(displayValue, showSign)}
    </span>
  );
};
