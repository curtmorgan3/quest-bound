import {
  fireExternalComponentChangeEvent,
  getComponentData,
  useAttributeChangedByScript,
  useComponentStyles,
  useNodeData,
} from '@/lib/compass-planes/utils';
import { CharacterContext, DiceContext, WindowEditorContext } from '@/stores';
import type { Component, TextComponentData, TextComponentStyle } from '@/types';
import { parseTextForDiceRolls } from '@/utils';
import { useNodeId } from '@xyflow/react';
import { useContext, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { ResizableNode } from '../../decorators';

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
        <ViewTextNode component={component} onDoubleClick={handleDoubleClick} />
      )}
    </ResizableNode>
  );
};

export const ViewTextNode = ({
  component,
  onDoubleClick,
}: {
  component: Component;
  onDoubleClick?: () => void;
}) => {
  const data = useNodeData(component);
  const css = useComponentStyles(component) as TextComponentStyle;
  const characterContext = useContext(CharacterContext);
  const { rollDice } = useContext(DiceContext);
  const characterId = characterContext?.character?.id ?? '';
  const { changedByScript, clearModified } = useAttributeChangedByScript(
    characterId,
    component.attributeId ?? '',
    data.value,
  );

  const [scriptChangeFlash, setScriptChangeFlash] = useState(false);
  const [flashKey, setFlashKey] = useState(0);
  const requestFlashRef = useRef(false);
  if (changedByScript) requestFlashRef.current = true;

  // Run every commit: if we requested a flash during render, apply it and clear the store.
  // Incrementing flashKey remounts the section so the CSS animation runs again (browsers don't re-run when re-adding the same class).
  useLayoutEffect(() => {
    if (requestFlashRef.current) {
      requestFlashRef.current = false;
      clearModified();
      setFlashKey((k) => k + 1);
      setScriptChangeFlash(true);
      const t = setTimeout(() => setScriptChangeFlash(false), 400);
      return () => clearTimeout(t);
    }
  });

  const diceRolls = parseTextForDiceRolls(data?.interpolatedValue?.toString());

  const handleClick = () => {
    if (!diceRolls.length || !!onDoubleClick) return;
    rollDice(diceRolls.join(','));
  };

  return (
    <section
      key={flashKey}
      className={scriptChangeFlash ? 'script-change-flash' : undefined}
      style={{
        height: component.height,
        width: component.width,
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
  );
};
