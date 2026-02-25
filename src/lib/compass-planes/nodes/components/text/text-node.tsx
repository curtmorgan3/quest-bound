import {
  fireExternalComponentChangeEvent,
  getComponentData,
  useComponentStyles,
  useNodeData,
  useRegisterAnimation,
} from '@/lib/compass-planes/utils';
import { CharacterContext, DiceContext, WindowEditorContext } from '@/stores';
import type { Component, TextComponentData, TextComponentStyle } from '@/types';
import { parseTextForDiceRolls } from '@/utils';
import { useNodeId } from '@xyflow/react';
import { useContext, useEffect, useRef, useState } from 'react';
import { ResizableNode } from '../../decorators';

function formatScriptChangeDisplay(from: number, to: number): string {
  const delta = to - from;
  if (delta > 0) return `+${delta}`;
  if (delta < 0) return `${delta}`;
  return '0';
}

export const EditTextNode = () => {
  const { getComponent, updateComponent } = useContext(WindowEditorContext);
  const id = useNodeId();
  const [isEditing, setIsEditing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input when entering edit mode
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  if (!id) return null;
  const component = getComponent(id);
  if (!component) return null;

  const data = getComponentData(component) as TextComponentData;
  const css = useComponentStyles(component) as TextComponentStyle;

  const handleDoubleClick = () => {
    if (!component.locked) {
      updateComponent(id, {
        locked: true,
      });
      fireExternalComponentChangeEvent({
        updates: [{ id, locked: true }],
      });
      setIsEditing(true);
    }
  };

  const handleUpdate = (value: string) => {
    const update = {
      id,
      data: JSON.stringify({
        ...data,
        value,
      }),
    };

    updateComponent(id, update);
    fireExternalComponentChangeEvent({
      updates: [update],
    });
  };

  const handleBlur = () => {
    setIsEditing(false);
    updateComponent(id, {
      locked: false,
    });
    fireExternalComponentChangeEvent({
      updates: [{ id, locked: false }],
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      const value = e.currentTarget.value;
      handleUpdate(value);
      setIsEditing(false);
      updateComponent(id, {
        locked: false,
      });
      fireExternalComponentChangeEvent({
        updates: [{ id, locked: false }],
      });
    }
  };

  return (
    <ResizableNode component={component}>
      {isEditing ? (
        <section
          style={{
            height: component.height,
            width: component.width,
            display: 'flex',
            justifyContent: css.textAlign ?? 'start',
            alignItems: css.verticalAlign ?? 'start',
          }}>
          <input
            ref={inputRef}
            type='text'
            defaultValue={data.value?.toString()}
            onKeyDown={handleKeyDown}
            onBlur={handleBlur}
            style={{
              ...css,
              background: 'transparent',
              border: 'none',
              outline: 'none',
              padding: 0,
              margin: 0,
              width: '100%',
              height: '100%',
            }}
          />
        </section>
      ) : (
        <ViewTextNode
          component={component}
          onDoubleClick={handleDoubleClick}
          shouldAnimate={false}
        />
      )}
    </ResizableNode>
  );
};

export const ViewTextNode = ({
  component,
  onDoubleClick,
  shouldAnimate = true,
}: {
  component: Component;
  onDoubleClick?: () => void;
  shouldAnimate?: boolean;
}) => {
  const data = useNodeData(component);
  const css = useComponentStyles(component) as TextComponentStyle;
  const characterContext = useContext(CharacterContext);
  const { rollDice } = useContext(DiceContext);
  const characterId = characterContext?.character?.id ?? '';
  const { flashKey, scriptChangeFlash, diff } = useRegisterAnimation(
    characterId,
    component.attributeId ?? '',
    data.value,
    shouldAnimate,
  );

  const diceRolls = parseTextForDiceRolls(data?.interpolatedValue?.toString());

  const handleClick = () => {
    if (!diceRolls.length || !!onDoubleClick) return;
    rollDice(diceRolls.join(','));
  };

  return (
    <div
      key={flashKey}
      style={{
        position: 'relative',
        height: component.height,
        width: component.width,
        overflow: 'visible',
      }}>
      {diff && shouldAnimate ? (
        <span key={diff} className='script-change-float'>
          {diff}
        </span>
      ) : null}
      <section
        className={scriptChangeFlash ? 'script-change-flash' : undefined}
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          justifyContent: css.textAlign ?? 'start',
          alignItems: css.verticalAlign ?? 'start',
          backgroundColor: css.backgroundColor,
          borderRadius: css.borderRadius,
          outline: css.outline,
          outlineColor: css.outlineColor,
          outlineWidth: css.outlineWidth,
          overflow: 'hidden',
        }}>
        <span
          onDoubleClick={onDoubleClick}
          onClick={handleClick}
          className={diceRolls.length ? 'clickable' : undefined}
          style={{
            ...css,
            outline: 'none',
            outlineColor: 'unset',
            outlineWidth: 'unset',
          }}>
          {data?.interpolatedValue}
        </span>
      </section>
    </div>
  );
};
