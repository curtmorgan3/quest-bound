import type { DiceResult, DiceToken, RollResult, SegmentResult } from '@/types';

/** Matches dice (e.g. 2d6) or modifiers (+4, -1) in order */
export const DICE_OR_MODIFIER_REGEX = /(\d+)\s*d\s*(\d+)|([+-])\s*(\d+)/gi;

export function parseDiceExpression(roll: string): DiceToken[][] {
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

export function rollDie(sides: number): number {
  return Math.floor(Math.random() * sides) + 1;
}

export function formatSegmentResult(s: SegmentResult): string {
  const dicePart = s.rolls.length > 0 ? ` [${s.rolls.map((r) => r.value).join(', ')}]` : '';
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
export function parseTextForDiceRolls(text?: string): string[] {
  if (!text) return [];
  const matches = [...text.matchAll(DICE_EXPRESSION_IN_TEXT_REGEX)].map((m) =>
    m[0].replace(/\s/g, ''),
  );
  return matches;
}

export function rollDiceExpression(roll: string) {
  const trimmed = roll.trim();
  const tokenGroups = parseDiceExpression(trimmed);
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

  return {
    segmentResults,
    total,
  };
}

export function defaultScriptDiceRoller(roll: string, _rerollMessage?: string): number {
  return rollDiceExpression(roll).total;
}

/** Returns array of each die value in dice syntax order (modifiers are not included). */
export function defaultScriptDiceRollerSplit(roll: string, _rerollMessage?: string): number[] {
  const { segmentResults } = rollDiceExpression(roll);
  return segmentResults.flatMap((s) => s.rolls.map((r) => r.value));
}

export type PhysicalRollSlot = {
  label: string;
};

export type PhysicalRollSegmentInfo =
  | { notation: string; rollCount: number }
  | { notation: string; modifier: number };

/**
 * Returns one slot per die to be filled for physical roll input, plus segment metadata
 * to reconstruct DiceResult from the entered values.
 */
export function getPhysicalRollSlots(notation: string): {
  slots: PhysicalRollSlot[];
  segmentInfos: PhysicalRollSegmentInfo[];
} {
  const tokenGroups = parseDiceExpression(notation.trim());
  const slots: PhysicalRollSlot[] = [];
  const segmentInfos: PhysicalRollSegmentInfo[] = [];

  for (const tokens of tokenGroups) {
    for (const token of tokens) {
      if (token.type === 'dice') {
        const label = `d${token.sides}`;
        for (let i = 0; i < token.count; i++) {
          slots.push({ label });
        }
        segmentInfos.push({ notation: `${token.count}d${token.sides}`, rollCount: token.count });
      } else {
        const notation =
          token.value >= 0 ? `+${token.value}` : `${token.value}`;
        segmentInfos.push({ notation, modifier: token.value });
      }
    }
  }

  return { slots, segmentInfos };
}

/**
 * Builds a DiceResult from notation and the values entered for each die (in slot order).
 */
export function buildDiceResultFromPhysicalRolls(
  notation: string,
  values: number[],
): DiceResult {
  const { segmentInfos } = getPhysicalRollSlots(notation);
  const segments: SegmentResult[] = [];
  let total = 0;
  let valueIndex = 0;

  for (const info of segmentInfos) {
    if ('rollCount' in info) {
      const rolls: RollResult[] = [];
      let segmentTotal = 0;
      const type = info.notation.includes('d') ? info.notation.replace(/^\d+/, '') : 'd6';
      for (let i = 0; i < info.rollCount; i++) {
        const value = values[valueIndex++] ?? 0;
        rolls.push({ type, value });
        segmentTotal += value;
      }
      total += segmentTotal;
      segments.push({
        notation: info.notation,
        rolls,
        modifier: 0,
        segmentTotal,
      });
    } else {
      total += info.modifier;
      segments.push({
        notation: info.notation,
        rolls: [],
        modifier: info.modifier,
        segmentTotal: info.modifier,
      });
    }
  }

  return { total, notation: notation.trim(), segments };
}
