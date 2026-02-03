import { createContext, useState } from 'react';
import { LogType, useEventLog } from '../event-log-store';

type DiceContext = {
  dicePanelOpen: boolean;
  setDicePanelOpen: (open: boolean) => void;
  roll: (value: string) => Promise<DiceResult>;
  isRolling: boolean;
  lastResult: DiceResult | null;
  reset: () => void;
};

/** A single dice term (e.g. 2d6) or modifier term (+4, -1) in order */
type DiceToken =
  | { type: 'dice'; count: number; sides: number }
  | { type: 'modifier'; value: number };

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

/** Matches dice (e.g. 2d6) or modifiers (+4, -1) in order */
const DICE_OR_MODIFIER_REGEX = /(\d+)\s*d\s*(\d+)|([+-])\s*(\d+)/gi;

function parseDiceExpression(roll: string): DiceToken[][] {
  const partStrings = roll
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean);
  const allTokens: DiceToken[][] = [];
  for (const part of partStrings) {
    const tokens: DiceToken[] = [];
    let match: RegExpExecArray | null;
    const re = new RegExp(DICE_OR_MODIFIER_REGEX.source, 'gi');
    while ((match = re.exec(part)) !== null) {
      if (match[1] !== undefined) {
        const count = Math.max(0, parseInt(match[1], 10));
        const sides = Math.max(1, parseInt(match[2], 10));
        tokens.push({ type: 'dice', count, sides });
      } else {
        const sign = match[3] === '+' ? 1 : -1;
        tokens.push({ type: 'modifier', value: sign * parseInt(match[4], 10) });
      }
    }
    if (tokens.length) allTokens.push(tokens);
  }
  return allTokens;
}

function rollDie(sides: number): number {
  return Math.floor(Math.random() * sides) + 1;
}

export function formatSegmentResult(s: SegmentResult): string {
  const dicePart = s.rolls.length > 0 ? ` [${s.rolls.join(', ')}]` : '';
  const modPart =
    s.rolls.length > 0 && s.modifier !== 0 ? ` ${s.modifier >= 0 ? '+' : ''}${s.modifier}` : '';
  return `${s.notation}:${dicePart}${modPart} = ${s.segmentTotal}`;
}

/** Matches a full dice expression: NdM optionally followed by +N/-N modifiers */
const DICE_EXPRESSION_IN_TEXT_REGEX = /\d+\s*d\s*\d+(?:\s*[+-]\s*\d+)*/gi;

/**
 * Given a string, returns an array of dice rolls if found.
 *
 * Ex: Restores 1d6+4 of Hit Points and 2d12 of Armor
 * => ["1d6+4", "2d12"]
 */
export function parseTextForDiceRolls(text: string): string[] {
  const matches = [...text.matchAll(DICE_EXPRESSION_IN_TEXT_REGEX)].map((m) =>
    m[0].replace(/\s/g, ''),
  );
  return matches;
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
    const tokenGroups = parseDiceExpression(trimmed);

    setIsRolling(true);
    setLastResult(null);

    const segmentResults: SegmentResult[] = [];
    let total = 0;

    for (const tokens of tokenGroups) {
      let modifierSum = 0;
      const modifierNotationParts: string[] = [];

      for (const token of tokens) {
        if (token.type === 'dice') {
          const notation = `${token.count}d${token.sides}`;
          const rolls: number[] = [];
          for (let i = 0; i < token.count; i++) {
            rolls.push(rollDie(token.sides));
          }
          const segmentTotal = rolls.reduce((a, b) => a + b, 0);
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

  const reset = () => {
    setLastResult(null);
  };

  return {
    dicePanelOpen,
    setDicePanelOpen,
    roll,
    lastResult,
    isRolling,
    reset,
  };
};

export const DiceContext = createContext<DiceContext>(null!);
export const DiceProvider = DiceContext.Provider;
