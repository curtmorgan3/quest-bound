import { OwnerAccessor } from './owner-accessor';

/**
 * Accessor for the target character (if any). Same API as Owner; serializes as __type: 'Target'.
 */
export class TargetAccessor extends OwnerAccessor {
  override toStructuredCloneSafe(): unknown {
    return {
      __type: 'Target',
      name: this.characterName,
      location: this.locationName,
      Tile: this.Tile.toStructuredCloneSafe(),
    };
  }
}
