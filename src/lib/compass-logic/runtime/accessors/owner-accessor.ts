import type { Attribute, CharacterAttribute } from '@/types';
import type Dexie from 'dexie';
import { AttributeProxy } from '../proxies';

/**
 * Accessor object representing the character executing the script (Owner).
 * Provides access to the character's attributes and other properties.
 */
export class OwnerAccessor {
  protected characterId: string;
  protected db: Dexie;
  protected pendingUpdates: Map<string, any>;
  
  // Cached data
  protected characterAttributesCache: Map<string, CharacterAttribute>;
  protected attributesCache: Map<string, Attribute>;

  constructor(
    characterId: string,
    db: Dexie,
    pendingUpdates: Map<string, any>,
    characterAttributesCache: Map<string, CharacterAttribute>,
    attributesCache: Map<string, Attribute>,
  ) {
    this.characterId = characterId;
    this.db = db;
    this.pendingUpdates = pendingUpdates;
    this.characterAttributesCache = characterAttributesCache;
    this.attributesCache = attributesCache;
  }

  /**
   * Get an attribute proxy for the specified attribute.
   * @param name - The title/name of the attribute
   * @returns AttributeProxy for the attribute
   * @throws Error if attribute not found
   */
  Attribute(name: string): AttributeProxy {
    // Find the attribute definition by title
    const attribute = Array.from(this.attributesCache.values()).find(
      (attr) => attr.title === name,
    );

    if (!attribute) {
      throw new Error(`Attribute '${name}' not found`);
    }

    // Find the character's instance of this attribute
    const characterAttribute = Array.from(this.characterAttributesCache.values()).find(
      (charAttr) => charAttr.attributeId === attribute.id && charAttr.characterId === this.characterId,
    );

    if (!characterAttribute) {
      throw new Error(`Character attribute '${name}' not found for this character`);
    }

    return new AttributeProxy(characterAttribute, attribute, this.pendingUpdates);
  }

  /**
   * Get the character's name/title.
   */
  get title(): string {
    // This will be implemented when we add character data to the cache
    // For now, return a placeholder
    return 'Character';
  }
}
