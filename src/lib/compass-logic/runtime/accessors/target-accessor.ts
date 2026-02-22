import { OwnerAccessor } from './owner-accessor';

/**
 * Accessor for the target character (if any). Same API as Owner; serializes as __type: 'Target'.
 */
export class TargetAccessor extends OwnerAccessor {
  override toStructuredCloneSafe(): unknown {
    // Serialize Tile as x,y only to avoid cycle (Tile.characters can include this character).
    return {
      __type: 'Target',
      name: this.characterName,
      location: this.locationName,
      Tile: { __type: 'Tile' as const, x: this.Tile.x, y: this.Tile.y },
    };
  }
}
