import { useDddice } from '@/pages';
import { diceRollLogger, LogType, useEventLog } from '@/stores';
import type { DiceResult, DiceRollOpts, IDiceContext, RollResult, SegmentResult } from '@/types';
import { createContext, useRef, useState } from 'react';
import { useUsers } from '@/lib/compass-api';
import { formatSegmentResult, rollDiceExpression } from '../../utils';

interface DiceStateProps {
  canvasRef?: React.RefObject<HTMLCanvasElement | null>;
}

export const useDiceState = ({ canvasRef }: DiceStateProps): IDiceContext => {
  const [dicePanelOpen, setDicePanelOpen] = useState(false);
  const { logEvent } = useEventLog();
  const { currentUser } = useUsers();
  const physicalRolls = currentUser?.preferences?.physicalRolls ?? false;
  const [physicalRollModal, setPhysicalRollModal] = useState<{ notation: string } | null>(null);
  const physicalRollResolveRef = useRef<((result: DiceResult) => void) | null>(null);
  const physicalRollRejectRef = useRef<(() => void) | null>(null);

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

  const submitPhysicalRollResult = async (result: DiceResult) => {
    await diceRollLogger.logRoll(result, {
      source: 'Dice Panel',
    });
    setLastResult(result);
    setPhysicalRollModal(null);
    setIsRolling(false);
    const breakdown = result.segments.map(formatSegmentResult).join('; ');
    logEvent({
      type: LogType.DICE,
      source: 'Dice Panel',
      message: `${breakdown} → Total: ${result.total}`,
    });
    physicalRollResolveRef.current?.(result);
    physicalRollResolveRef.current = null;
    physicalRollRejectRef.current = null;
  };

  const dismissPhysicalRollModal = () => {
    setPhysicalRollModal(null);
    setIsRolling(false);
    physicalRollRejectRef.current?.();
    physicalRollResolveRef.current = null;
    physicalRollRejectRef.current = null;
  };

  const rollDice = async (roll: string, opts?: DiceRollOpts) => {
    if (opts?.openPanel !== false) {
      setDicePanelOpen(true);
    }

    setLastResult(null);

    if (physicalRolls) {
      setIsRolling(true);
      setPhysicalRollModal({ notation: roll.trim() });
      return new Promise<DiceResult>((resolve, reject) => {
        physicalRollResolveRef.current = resolve;
        physicalRollRejectRef.current = reject;
      });
    }

    setIsRolling(true);
    const delay = opts?.delay ?? 2000;

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
    physicalRollModal,
    submitPhysicalRollResult,
    dismissPhysicalRollModal,
    ...dddiceState,
  };
};

export const DiceContext = createContext<IDiceContext>(null!);
export const DiceProvider = DiceContext.Provider;
