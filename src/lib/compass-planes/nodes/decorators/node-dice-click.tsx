import { DiceContext } from '@/stores';
import type { Component } from '@/types';
import { parseTextForDiceRolls } from '@/utils';
import { useContext, type ReactNode } from 'react';
import { useNodeData } from '../../utils';

interface NodeDiceClickProps {
  children: ReactNode;
  component: Component;
}

/**
 * Wraps view nodes that display text. When the node's content contains dice
 * syntax (e.g. 1d6, 2d20+3), clicking the node triggers the DiceContext roll.
 * Does not wrap when the component has a script (script click takes precedence).
 */
export const NodeDiceClick = ({ children, component }: NodeDiceClickProps) => {
  const { rollDice } = useContext(DiceContext);
  const data = useNodeData(component);
  const raw = data?.interpolatedValue;
  const text = raw != null ? String(raw) : '';
  const diceRolls = parseTextForDiceRolls(text);

  if (!diceRolls.length || component.scriptId) {
    return <>{children}</>;
  }

  const handleClick = () => {
    rollDice(diceRolls.join(','));
  };

  return (
    <div
      role='button'
      className='clickable'
      style={{ display: 'block', width: '100%', height: '100%' }}
      onClick={handleClick}>
      {children}
    </div>
  );
};
