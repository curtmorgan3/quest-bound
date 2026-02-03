import { createContext, useState } from 'react';
import { LogType, useEventLog } from '../event-log-store';

type DiceContext = {
  dicePanelOpen: boolean;
  setDicePanelOpen: (open: boolean) => void;
  roll: (value: string) => Promise<DiceResult>;
  isRolling: boolean;
  lastResult: DiceResult | null;
};

/** Parsed segment of dice notation, e.g. 2d6+3 → { count: 2, sides: 6, modifier: 3 } */
type DiceSegment = { count: number; sides: number; modifier: number };

/** Result of rolling one segment, with individual die values and total for that segment */
type SegmentResult = {
  notation: string;
  rolls: number[];
  modifier: number;
  segmentTotal: number;
};

type DiceResult = {
  total: number;
  notation: string;
  segments: SegmentResult[];
};

const DICE_NOTATION_REGEX = /(\d+)\s*d\s*(\d+)\s*([+-]\s*\d+)?/gi;

function parseDiceNotation(roll: string): DiceSegment[] {
  const segments: DiceSegment[] = [];
  const parts = roll
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean);
  for (const part of parts) {
    const match = part.matchAll(DICE_NOTATION_REGEX).next().value;
    if (!match) continue;
    const count = Math.max(0, parseInt(match[1], 10));
    const sides = Math.max(1, parseInt(match[2], 10));
    let modifier = 0;
    if (match[3]) {
      const modStr = match[3].replace(/\s/g, '');
      modifier = parseInt(modStr, 10);
    }
    segments.push({ count, sides, modifier });
  }
  return segments;
}

function rollDie(sides: number): number {
  return Math.floor(Math.random() * sides) + 1;
}

export function formatSegmentResult(s: SegmentResult): string {
  const dicePart = s.rolls.join(', ');
  const modPart = s.modifier !== 0 ? ` ${s.modifier >= 0 ? '+' : ''}${s.modifier}` : '';
  return `${s.notation}: [${dicePart}]${modPart} = ${s.segmentTotal}`;
}

export const useDiceState = (): DiceContext => {
  const [dicePanelOpen, setDicePanelOpen] = useState(false);
  const { logEvent } = useEventLog();
  const [lastResult, setLastResult] = useState<{
    total: number;
    segments: SegmentResult[];
    notation: string;
  } | null>(null);
  const [isRolling, setIsRolling] = useState(false);

  const roll = async (roll: string) => {
    const trimmed = roll.trim();
    const segments = parseDiceNotation(trimmed);

    setIsRolling(true);
    setLastResult(null);

    // Collate into list of dice and sides; generate random numbers for each
    const segmentResults: SegmentResult[] = [];
    let total = 0;
    for (const seg of segments) {
      const modStr =
        seg.modifier !== 0 ? (seg.modifier >= 0 ? `+${seg.modifier}` : `${seg.modifier}`) : '';
      const notation = `${seg.count}d${seg.sides}${modStr}`;
      const rolls: number[] = [];
      for (let i = 0; i < seg.count; i++) {
        rolls.push(rollDie(seg.sides));
      }
      const sum = rolls.reduce((a, b) => a + b, 0) + seg.modifier;
      segmentResults.push({
        notation,
        rolls,
        modifier: seg.modifier,
        segmentTotal: sum,
      });
      total += sum;
    }

    // Wait 2 seconds
    await new Promise((resolve) => setTimeout(resolve, 2000));

    setIsRolling(false);
    const result: DiceResult = { total, segments: segmentResults, notation: trimmed };
    setLastResult(result);

    // Display: log total and breakdown
    const breakdown = segmentResults.map(formatSegmentResult).join('; ');
    logEvent({
      type: LogType.DICE,
      source: 'Dice Panel',
      message: `${breakdown} → Total: ${total}`,
    });

    return result;
  };

  return {
    dicePanelOpen,
    setDicePanelOpen,
    roll,
    lastResult,
    isRolling,
  };
};

export const DiceContext = createContext<DiceContext>(null!);
export const DiceProvider = DiceContext.Provider;
