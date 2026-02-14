import { useDddice } from '@/pages';
import { diceRollLogger, LogType, useEventLog } from '@/stores';
import type { DiceResult, DiceRollOpts, IDiceContext, RollResult, SegmentResult } from '@/types';
import { createContext, useState } from 'react';
import { formatSegmentResult, parseDiceExpression, rollDie } from '../../utils';

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

    const trimmed = roll.trim();
    const tokenGroups = parseDiceExpression(trimmed);

    setLastResult(null);

    const segmentResults: SegmentResult[] = [];
    let total = 0;

    for (const tokens of tokenGroups) {
      let modifierSum = 0;
      const modifierNotationParts: string[] = [];

      for (const token of tokens) {
        if (token.type === 'dice') {
          const notation = `${token.count}d${token.sides}`;
          const type = `d${token.sides}`;
          const rolls: RollResult[] = [];
          for (let i = 0; i < token.count; i++) {
            rolls.push({
              type,
              value: rollDie(token.sides),
            });
          }
          const segmentTotal = rolls.map((r) => r.value).reduce((a, b) => a + b, 0);
          segmentResults.push({
            notation,
            rolls,
            modifier: 0,
            segmentTotal,
          });
          total += segmentTotal;
        } else {
          modifierSum += token.value;
          modifierNotationParts.push(token.value >= 0 ? `+${token.value}` : `${token.value}`);
        }
      }

      if (modifierNotationParts.length > 0) {
        const notation = modifierNotationParts.join('');
        segmentResults.push({
          notation,
          rolls: [],
          modifier: modifierSum,
          segmentTotal: modifierSum,
        });
        total += modifierSum;
      }
    }

    const result: DiceResult = { total, segments: segmentResults, notation: trimmed };

    // Log the dice roll to IndexedDB
    await diceRollLogger.logRoll(result, {
      source: 'Dice Panel',
    });

    if (dddiceState.username) {
      setDddiceRolling(true);
      const diceRollSegments = result.segments.filter((segment) => segment.notation.includes('d'));
      const diceRolls: RollResult[] = diceRollSegments.flatMap((segment) => segment.rolls);
      await dddiceState.rollThreeDDice(diceRolls);

      await new Promise((res) => {
        const resolve = () => {
          setLastResult(result);
          setIsRolling(false);
          setDddiceRolling(false);
          return res;
        };

        setTimeout(resolve(), 2000);
      });
    } else {
      await new Promise((res) => {
        const resolve = () => {
          setLastResult(result);
          setIsRolling(false);
          return res;
        };

        setTimeout(resolve(), delay);
      });
    }

    // Display: log total and breakdown
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
