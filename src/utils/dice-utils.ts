import type { DiceToken, SegmentResult } from '@/types';

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
