import type { StructuredCloneSafe } from '../structured-clone-safe';

/** Character-like value for Tile.character / Tile.characters (avoids circular dependency on CharacterAccessor). */
export type TileCharacterRef = { toStructuredCloneSafe?: () => unknown };

/**
 * Proxy for a tile in campaign context (Owner.Tile, Self.Tile).
 * Exposes x, y and optionally the character on this tile and all characters in the location.
 * Implements toStructuredCloneSafe() so the worker can send it to the main thread (e.g. log or return).
 */
export class TileProxy implements StructuredCloneSafe {
  private xCoord: number;
  private yCoord: number;
  private characterRef: TileCharacterRef | undefined;
  private charactersRef: TileCharacterRef[];

  constructor(
    x: number,
    y: number,
    character?: TileCharacterRef | undefined,
    characters?: TileCharacterRef[],
  ) {
    this.xCoord = x;
    this.yCoord = y;
    this.characterRef = character;
    this.charactersRef = characters ?? [];
  }

  get x(): number {
    return this.xCoord;
  }

  get y(): number {
    return this.yCoord;
  }

  /** Character on this tile (first in location order when multiple). Undefined when none. */
  get character(): TileCharacterRef | undefined {
    return this.characterRef;
  }

  /** All characters in this tile's location (DB order). */
  get characters(): TileCharacterRef[] {
    return this.charactersRef;
  }

  toStructuredCloneSafe(): {
    __type: 'Tile';
    x: number;
    y: number;
    character?: unknown;
    characters?: unknown[];
  } {
    const out: {
      __type: 'Tile';
      x: number;
      y: number;
      character?: unknown;
      characters?: unknown[];
    } = { __type: 'Tile', x: this.xCoord, y: this.yCoord };
    if (this.characterRef?.toStructuredCloneSafe) {
      out.character = this.characterRef.toStructuredCloneSafe();
    }
    if (this.charactersRef.length) {
      out.characters = this.charactersRef
        .map((c) => c.toStructuredCloneSafe?.())
        .filter((v): v is unknown => v !== undefined);
    }
    return out;
  }
}
