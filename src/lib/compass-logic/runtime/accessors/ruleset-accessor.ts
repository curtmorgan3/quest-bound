import type { Attribute, Chart, Item } from '@/types';
import { ChartProxy } from '../proxies';

/**
 * Proxy for attribute definitions (not character-specific values).
 * Provides access to attribute metadata like description, title, etc.
 */
export class AttributeDefinitionProxy {
  private attribute: Attribute;

  constructor(attribute: Attribute) {
    this.attribute = attribute;
  }

  get description(): string {
    return this.attribute.description;
  }

  get title(): string {
    return this.attribute.title;
  }

  get type(): string {
    return this.attribute.type;
  }

  get defaultValue(): any {
    return this.attribute.defaultValue;
  }

  get min(): number | undefined {
    return this.attribute.min;
  }

  get max(): number | undefined {
    return this.attribute.max;
  }

  get options(): string[] | undefined {
    return this.attribute.options;
  }
}

/**
 * Proxy for item definitions (ruleset-level, not character inventory instances).
 * Provides access to item metadata like title, description, customProperties, etc.
 */
export class ItemDefinitionProxy {
  private item: Item;

  constructor(item: Item) {
    this.item = item;
  }

  get description(): string {
    return this.item.description;
  }

  get title(): string {
    return this.item.title;
  }

  get customProperties(): Record<string, string | number | boolean> | undefined {
    return this.item.customProperties;
  }

  get weight(): number {
    return this.item.weight;
  }

  get stackSize(): number {
    return this.item.stackSize;
  }

  get isEquippable(): boolean {
    return this.item.isEquippable;
  }

  get isConsumable(): boolean {
    return this.item.isConsumable;
  }

  get isContainer(): boolean {
    return this.item.isContainer;
  }
}

/**
 * Accessor object for ruleset-level definitions.
 * Provides access to attribute definitions, charts, item definitions, etc.
 */
export class RulesetAccessor {
  private rulesetId: string;

  // Cached data
  private attributesCache: Map<string, Attribute>;
  private chartsCache: Map<string, Chart>;
  private itemsCache: Map<string, Item>;

  constructor(
    rulesetId: string,
    attributesCache: Map<string, Attribute>,
    chartsCache: Map<string, Chart>,
    itemsCache: Map<string, Item>,
  ) {
    this.rulesetId = rulesetId;
    this.attributesCache = attributesCache;
    this.chartsCache = chartsCache;
    this.itemsCache = itemsCache;
  }

  /**
   * Get an attribute definition proxy.
   * @param name - The title/name of the attribute
   * @returns AttributeDefinitionProxy for the attribute
   * @throws Error if attribute not found
   */
  Attribute(name: string): AttributeDefinitionProxy {
    const attribute = Array.from(this.attributesCache.values()).find(
      (attr) => attr.title === name && attr.rulesetId === this.rulesetId,
    );

    if (!attribute) {
      throw new Error(`Attribute definition '${name}' not found in ruleset`);
    }

    return new AttributeDefinitionProxy(attribute);
  }

  /**
   * Get a chart proxy for querying chart data.
   * @param name - The title/name of the chart
   * @returns ChartProxy for the chart
   * @throws Error if chart not found
   */
  Chart(name: string): ChartProxy {
    const chart = Array.from(this.chartsCache.values()).find(
      (c) => c.title === name && c.rulesetId === this.rulesetId,
    );

    if (!chart) {
      throw new Error(`Chart '${name}' not found in ruleset`);
    }

    return new ChartProxy(chart);
  }

  /**
   * Get an item definition proxy.
   * @param name - The title/name of the item
   * @returns ItemDefinitionProxy for the item
   * @throws Error if item not found
   */
  Item(name: string): ItemDefinitionProxy {
    const item = Array.from(this.itemsCache.values()).find(
      (i) => i.title === name && i.rulesetId === this.rulesetId,
    );

    if (!item) {
      throw new Error(`Item definition '${name}' not found in ruleset`);
    }

    return new ItemDefinitionProxy(item);
  }
}
