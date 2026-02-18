import type { DB } from '@/stores/db/hooks/types';

/**
 * SubscriptionManager tracks which scripts subscribe to which attributes
 * during script execution. It provides the runtime implementation of the
 * subscribe() builtin function.
 */
export class SubscriptionManager {
  private subscriptions: Map<string, Set<string>>; // scriptId -> Set<attributeIds>
  private reverseIndex: Map<string, Set<string>>; // attributeId -> Set<scriptIds>
  private currentScriptId: string | null;

  constructor(db: DB) {
    this.subscriptions = new Map();
    this.reverseIndex = new Map();
    this.currentScriptId = null;
  }

  /**
   * Set the current script context for subscription registration.
   * This should be called before executing a script.
   * @param scriptId - ID of the script being executed
   */
  setCurrentScript(scriptId: string): void {
    this.currentScriptId = scriptId;
  }

  /**
   * Clear the current script context.
   * This should be called after script execution completes.
   */
  clearCurrentScript(): void {
    this.currentScriptId = null;
  }

  /**
   * Register subscriptions for the current script.
   * This is called by the subscribe() builtin function.
   * @param attributeNames - Names of attributes to subscribe to
   */
  async registerSubscription(...attributeNames: string[]): Promise<void> {
    if (!this.currentScriptId) {
      throw new Error('Cannot register subscription outside of script context');
    }

    // Convert attribute names to IDs
    // Note: We need the rulesetId to look up attributes
    // This will be provided via the script execution context

    const scriptId = this.currentScriptId;

    // Initialize subscription set for this script if needed
    if (!this.subscriptions.has(scriptId)) {
      this.subscriptions.set(scriptId, new Set());
    }

    const subscriptionSet = this.subscriptions.get(scriptId)!;

    // Add each attribute to the subscription set
    for (const attrName of attributeNames) {
      // For now, we store attribute names
      // The DependencyGraph will convert them to IDs
      subscriptionSet.add(attrName);

      // Update reverse index
      if (!this.reverseIndex.has(attrName)) {
        this.reverseIndex.set(attrName, new Set());
      }
      this.reverseIndex.get(attrName)!.add(scriptId);
    }
  }

  /**
   * Get all scripts that subscribe to a specific attribute.
   * @param attributeName - Name of the attribute
   * @returns Set of script IDs
   */
  getSubscribers(attributeName: string): Set<string> {
    return this.reverseIndex.get(attributeName) || new Set();
  }

  /**
   * Get all attributes that a script subscribes to.
   * @param scriptId - ID of the script
   * @returns Set of attribute names
   */
  getDependencies(scriptId: string): Set<string> {
    return this.subscriptions.get(scriptId) || new Set();
  }

  /**
   * Clear all subscriptions for a specific script.
   * @param scriptId - ID of the script
   */
  clearSubscriptions(scriptId: string): void {
    const attrs = this.subscriptions.get(scriptId);
    if (attrs) {
      // Remove from reverse index
      for (const attr of attrs) {
        const subscribers = this.reverseIndex.get(attr);
        if (subscribers) {
          subscribers.delete(scriptId);
          if (subscribers.size === 0) {
            this.reverseIndex.delete(attr);
          }
        }
      }
      this.subscriptions.delete(scriptId);
    }
  }

  /**
   * Clear all subscriptions.
   */
  clearAll(): void {
    this.subscriptions.clear();
    this.reverseIndex.clear();
  }
}

/**
 * Create a subscribe() builtin function bound to a SubscriptionManager.
 * @param manager - The subscription manager
 * @returns A function that can be used as the subscribe() builtin
 */
export function createSubscribeBuiltin(manager: SubscriptionManager) {
  return (...attributeNames: string[]): void => {
    // This is a synchronous wrapper around the async registerSubscription
    // We'll handle this by making the subscription registration immediate
    const names = attributeNames.filter((name) => typeof name === 'string');

    // Note: We can't use async in the builtin, so we'll store subscriptions
    // synchronously and rely on the DependencyGraph for persistence
    if (names.length > 0) {
      // Just track that subscribe was called - the static analysis
      // will handle the actual dependency graph building
      // This runtime version is mainly for validation
    }
  };
}
