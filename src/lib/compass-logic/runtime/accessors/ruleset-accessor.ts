import type { Attribute, Chart } from '@/types';
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
 * Accessor object for ruleset-level definitions.
 * Provides access to attribute definitions, charts, etc.
 */
export class RulesetAccessor {
  private rulesetId: string;
  
  // Cached data
  private attributesCache: Map<string, Attribute>;
  private chartsCache: Map<string, Chart>;

  constructor(
    rulesetId: string,
    attributesCache: Map<string, Attribute>,
    chartsCache: Map<string, Chart>,
  ) {
    this.rulesetId = rulesetId;
    this.attributesCache = attributesCache;
    this.chartsCache = chartsCache;
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
}
