import { useDddice } from '@/pages';
import { diceRollLogger, LogType, useEventLog } from '@/stores';
import type { DiceResult, DiceRollOpts, IDiceContext, RollResult, SegmentResult } from '@/types';
import { createContext, useState } from 'react';
import { formatSegmentResult, rollDiceExpression } from '../../utils';

interface DiceStateProps {
  canvasRef?: React.RefObject<HTMLCanvasElement | null>;
}

export const useDiceState = ({ canvasRef }: DiceStateProps): IDiceContext => {
  const [dicePanelOpen, setDicePanelOpen] = useState(false);
  const { logEvent } = useEventLog();
  const [lastResult, setLastResult] = useState<{
    total: number;
    segments: SegmentResult[];
    notation: string;
  } | null>(null);
  const [isRolling, setIsRolling] = useState(false);
  const [dddiceRolling, setDddiceRolling] = useState<boolean>(false);

  const rolling = isRolling || dddiceRolling;

  const dddiceState = useDddice({
    canvasRef,
  });

  const rollDice = async (roll: string, opts?: DiceRollOpts) => {
    setIsRolling(true);
    if (opts?.openPanel !== false) {
      setDicePanelOpen(true);
    }

    const delay = opts?.delay ?? 2000;

    setLastResult(null);

    const { total, segmentResults } = rollDiceExpression(roll);

    const result: DiceResult = { total, segments: segmentResults, notation: roll.trim() };

    // Log the dice roll to IndexedDB
    await diceRollLogger.logRoll(result, {
      source: 'Dice Panel',
    });

    if (dddiceState.username) {
      setDddiceRolling(true);
      const diceRollSegments = result.segments.filter((segment) => segment.notation.includes('d'));
      const diceRolls: RollResult[] = diceRollSegments.flatMap((segment) => segment.rolls);
      await dddiceState.rollThreeDDice(diceRolls);

      // We need to await a promise so the script evaluator can delay its execution
      // Separetly, setState does better in a timeout. These don't need to sync. Prefer to delay
      // result text for 3D dice result for a better UX.
      setTimeout(() => {
        setLastResult(result);
        setIsRolling(false);
        setDddiceRolling(false);
      }, 3000);

      await new Promise((res) => setTimeout(res, 2000));
    } else {
      setTimeout(() => {
        setLastResult(result);
        setIsRolling(false);
      }, delay);
      await new Promise((res) => setTimeout(res, 2000));
    }

    const breakdown = segmentResults.map(formatSegmentResult).join('; ');
    logEvent({
      type: LogType.DICE,
      source: 'Dice Panel',
      message: `${breakdown} → Total: ${total}`,
    });

    return result;
  };

  const reset = () => {
    setLastResult(null);
  };

  return {
    dicePanelOpen,
    setDicePanelOpen,
    rollDice,
    lastResult,
    setLastResult,
    isRolling: rolling,
    reset,
    ...dddiceState,
  };
};

export const DiceContext = createContext<IDiceContext>(null!);
export const DiceProvider = DiceContext.Provider;
