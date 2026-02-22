import type { StructuredCloneSafe } from '../structured-clone-safe';

/**
 * Proxy for the character's current tile in campaign context (Owner.Tile).
 * Exposes x and y coordinates from the campaign character's currentTile (TileData).
 * When the character has no current tile, x and y are 0.
 * Implements toStructuredCloneSafe() so the worker can send it to the main thread (e.g. log or return).
 */
export class TileProxy implements StructuredCloneSafe {
  private xCoord: number;
  private yCoord: number;

  constructor(x: number, y: number) {
    this.xCoord = x;
    this.yCoord = y;
  }

  get x(): number {
    return this.xCoord;
  }

  get y(): number {
    return this.yCoord;
  }

  toStructuredCloneSafe(): { __type: 'Tile'; x: number; y: number } {
    return { __type: 'Tile', x: this.xCoord, y: this.yCoord };
  }
}
