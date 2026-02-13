import type { DB } from '@/stores/db/hooks/types';
import type { InventoryItem } from '@/types';

/**
 * Snapshot of character state for transaction rollback.
 * Only includes data that was modified during execution.
 */
export interface CharacterSnapshot {
  characterId: string;
  timestamp: number;
  attributes: Map<string, any>; // characterAttributeId -> original value
  inventory: Map<string, InventoryItem>; // inventoryItemId -> original item data
}

/**
 * TransactionManager handles creating snapshots of character state
 * and rolling back changes if script execution fails.
 */
export class TransactionManager {
  private db: DB;
  private snapshots: Map<string, CharacterSnapshot>; // executionId -> snapshot

  constructor(db: DB) {
    this.db = db;
    this.snapshots = new Map();
  }

  /**
   * Create a snapshot before starting script execution.
   * Only snapshots the specific attributes and inventory items that will be modified.
   * @param executionId - Unique ID for this execution
   * @param characterId - ID of the character
   * @param attributeIds - IDs of attributes that might be modified
   * @param inventoryItemIds - IDs of inventory items that might be modified
   * @returns Promise that resolves when snapshot is created
   */
  async createSnapshot(
    executionId: string,
    characterId: string,
    attributeIds: Set<string> = new Set(),
    inventoryItemIds: Set<string> = new Set(),
  ): Promise<void> {
    const snapshot: CharacterSnapshot = {
      characterId,
      timestamp: Date.now(),
      attributes: new Map(),
      inventory: new Map(),
    };

    // Snapshot specific attributes
    if (attributeIds.size > 0) {
      const attributes = await this.db.characterAttributes
        .where('id')
        .anyOf(Array.from(attributeIds))
        .toArray();

      for (const attr of attributes) {
        if (attr.characterId === characterId) {
          snapshot.attributes.set(attr.id, attr.value);
        }
      }
    }

    // Snapshot specific inventory items
    if (inventoryItemIds.size > 0) {
      const items = await this.db.inventoryItems
        .where('id')
        .anyOf(Array.from(inventoryItemIds))
        .toArray();

      for (const item of items) {
        if (item.characterId === characterId) {
          // Deep clone the item
          snapshot.inventory.set(item.id, JSON.parse(JSON.stringify(item)));
        }
      }
    }

    this.snapshots.set(executionId, snapshot);
  }

  /**
   * Create a full snapshot of all character data.
   * Use this when you don't know which attributes will be modified.
   * @param executionId - Unique ID for this execution
   * @param characterId - ID of the character
   * @returns Promise that resolves when snapshot is created
   */
  async createFullSnapshot(executionId: string, characterId: string): Promise<void> {
    const snapshot: CharacterSnapshot = {
      characterId,
      timestamp: Date.now(),
      attributes: new Map(),
      inventory: new Map(),
    };

    // Snapshot all attributes
    const attributes = await this.db.characterAttributes.where({ characterId }).toArray();

    for (const attr of attributes) {
      snapshot.attributes.set(attr.id, attr.value);
    }

    // Snapshot all inventory items
    const items = await this.db.inventoryItems.where({ characterId }).toArray();

    for (const item of items) {
      snapshot.inventory.set(item.id, JSON.parse(JSON.stringify(item)));
    }

    this.snapshots.set(executionId, snapshot);
  }

  /**
   * Roll back changes to the snapshotted state.
   * @param executionId - ID of the execution to roll back
   * @returns Promise that resolves when rollback is complete
   */
  async rollback(executionId: string): Promise<void> {
    const snapshot = this.snapshots.get(executionId);
    if (!snapshot) {
      throw new Error(`No snapshot found for execution ${executionId}`);
    }

    const updates: Promise<any>[] = [];

    // Restore attribute values
    for (const [attrId, value] of snapshot.attributes.entries()) {
      updates.push(this.db.characterAttributes.update(attrId, { value }));
    }

    // Restore inventory items
    for (const [itemId, item] of snapshot.inventory.entries()) {
      updates.push(this.db.inventoryItems.update(itemId, item));
    }

    await Promise.all(updates);
  }

  /**
   * Commit the transaction and clean up the snapshot.
   * @param executionId - ID of the execution to commit
   */
  commit(executionId: string): void {
    this.snapshots.delete(executionId);
  }

  /**
   * Get a snapshot for inspection.
   * @param executionId - ID of the execution
   * @returns Snapshot or undefined
   */
  getSnapshot(executionId: string): CharacterSnapshot | undefined {
    return this.snapshots.get(executionId);
  }

  /**
   * Check if a snapshot exists.
   * @param executionId - ID of the execution
   * @returns True if snapshot exists
   */
  hasSnapshot(executionId: string): boolean {
    return this.snapshots.has(executionId);
  }

  /**
   * Clear all snapshots (emergency cleanup).
   */
  clearAll(): void {
    this.snapshots.clear();
  }
}

/**
 * Helper to track which attributes and inventory items are being modified
 * during script execution, so we can create targeted snapshots.
 */
export class ModificationTracker {
  private modifiedAttributes: Set<string>;
  private modifiedInventoryItems: Set<string>;

  constructor() {
    this.modifiedAttributes = new Set();
    this.modifiedInventoryItems = new Set();
  }

  /**
   * Track that an attribute is being modified.
   * @param attributeId - ID of the character attribute
   */
  trackAttribute(attributeId: string): void {
    this.modifiedAttributes.add(attributeId);
  }

  /**
   * Track that an inventory item is being modified.
   * @param itemId - ID of the inventory item
   */
  trackInventoryItem(itemId: string): void {
    this.modifiedInventoryItems.add(itemId);
  }

  /**
   * Get all tracked attribute IDs.
   */
  getAttributes(): Set<string> {
    return new Set(this.modifiedAttributes);
  }

  /**
   * Get all tracked inventory item IDs.
   */
  getInventoryItems(): Set<string> {
    return new Set(this.modifiedInventoryItems);
  }

  /**
   * Clear all tracked modifications.
   */
  clear(): void {
    this.modifiedAttributes.clear();
    this.modifiedInventoryItems.clear();
  }

  /**
   * Check if any modifications have been tracked.
   */
  hasModifications(): boolean {
    return this.modifiedAttributes.size > 0 || this.modifiedInventoryItems.size > 0;
  }
}
