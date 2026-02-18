import { OwnerAccessor } from './owner-accessor';

/**
 * Accessor object representing the target character (if any).
 * Extends OwnerAccessor with the same functionality for a different character.
 */
export class TargetAccessor extends OwnerAccessor {
  // Inherits all methods from OwnerAccessor
  // The only difference is the characterId used in the constructor
}
