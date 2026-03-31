import type { Attribute, CharacterAttribute } from '@/types';
import { parseEntityCustomPropertiesJson } from '@/utils/parse-entity-custom-properties-json';
import type { StructuredCloneSafe } from '../structured-clone-safe';

type EntityCustomPropsPending = {
  customProperties: string | null;
  attributeCustomPropertyValues: Record<string, string | number | boolean>;
};

/**
 * Proxy object for character attributes, providing methods to read and modify attribute values.
 * Changes are queued and written to the database when the script execution completes.
 * Implements toStructuredCloneSafe() so the worker can send it to the main thread (e.g. log or return).
 */
export class AttributeProxy implements StructuredCloneSafe {
  private characterAttribute: CharacterAttribute;
  private attribute: Attribute;
  private pendingUpdates: Map<string, any>;

  constructor(
    characterAttribute: CharacterAttribute,
    attribute: Attribute,
    pendingUpdates: Map<string, any>,
  ) {
    this.characterAttribute = characterAttribute;
    this.attribute = attribute;
    this.pendingUpdates = pendingUpdates;
  }

  /**
   * Get the current value of the attribute.
   */
  get value(): any {
    // Check if there's a pending update first
    const key = `characterAttribute:${this.characterAttribute.id}`;
    if (this.pendingUpdates.has(key)) {
      return this.pendingUpdates.get(key);
    }
    return this.characterAttribute.value;
  }

  get max(): any {
    const key = `characterAttributeMax:${this.characterAttribute.id}`;
    if (this.pendingUpdates.has(key)) {
      return this.pendingUpdates.get(key);
    }
    return this.characterAttribute.max;
  }

  get min(): any {
    const key = `characterAttributeMin:${this.characterAttribute.id}`;
    if (this.pendingUpdates.has(key)) {
      return this.pendingUpdates.get(key);
    }
    return this.characterAttribute.min;
  }

  get options(): string[] | undefined {
    const key = `characterAttributeOptions:${this.characterAttribute.id}`;
    if (this.pendingUpdates.has(key)) {
      return this.pendingUpdates.get(key);
    }
    return this.characterAttribute.options;
  }

  /**
   * Set the attribute to a new value.
   */
  private entityCustomPropsKey(): string {
    return `characterAttributeEntityCustomProps:${this.characterAttribute.id}`;
  }

  private getMergedEntityCustomState(): EntityCustomPropsPending {
    const key = this.entityCustomPropsKey();
    if (this.pendingUpdates.has(key)) {
      const p = this.pendingUpdates.get(key) as EntityCustomPropsPending;
      return {
        customProperties: p.customProperties ?? null,
        attributeCustomPropertyValues: { ...p.attributeCustomPropertyValues },
      };
    }
    return {
      customProperties: this.characterAttribute.customProperties ?? null,
      attributeCustomPropertyValues: {
        ...(this.characterAttribute.attributeCustomPropertyValues ?? {}),
      },
    };
  }

  /** Schema JSON for defs: character snapshot when present, else ruleset attribute. */
  private schemaJsonForMerged(merged: EntityCustomPropsPending): string | null {
    const c = merged.customProperties;
    if (c != null && c.trim() !== '') return c;
    const a = this.attribute.customProperties;
    if (a != null && a.trim() !== '') return a;
    return null;
  }

  private inferEntityPropType(newValue: unknown): 'string' | 'number' | 'boolean' {
    if (typeof newValue === 'boolean') return 'boolean';
    if (typeof newValue === 'number' && Number.isFinite(newValue)) return 'number';
    if (typeof newValue === 'string') {
      const t = newValue.trim().toLowerCase();
      if (t === 'true' || t === 'false') return 'boolean';
      const n = Number(newValue);
      if (newValue.trim() !== '' && Number.isFinite(n)) return 'number';
    }
    return 'string';
  }

  private coerceEntityPropValue(
    type: 'string' | 'number' | 'boolean',
    newValue: unknown,
  ): string | number | boolean {
    if (type === 'number') {
      const n =
        typeof newValue === 'string' ? parseFloat(newValue) : Number(newValue);
      return Number.isFinite(n) ? n : 0;
    }
    if (type === 'boolean') {
      if (typeof newValue === 'string') return newValue.toLowerCase() === 'true';
      return Boolean(newValue);
    }
    return newValue != null ? String(newValue) : '';
  }

  private commitEntityCustomPropsState(next: EntityCustomPropsPending): void {
    const key = this.entityCustomPropsKey();
    this.pendingUpdates.set(key, {
      customProperties: next.customProperties,
      attributeCustomPropertyValues: { ...next.attributeCustomPropertyValues },
    });
    this.characterAttribute.customProperties = next.customProperties;
    this.characterAttribute.attributeCustomPropertyValues = {
      ...next.attributeCustomPropertyValues,
    };
  }

  /**
   * Read a character attribute entity custom property by name (trimmed, case-sensitive).
   * Returns null if no definition exists with that name.
   */
  getProperty(name: string): string | number | boolean | null {
    const trimmed = name.trim();
    if (!trimmed) return null;
    const merged = this.getMergedEntityCustomState();
    const defs = parseEntityCustomPropertiesJson(this.schemaJsonForMerged(merged));
    const def = defs.find((d) => d.name.trim() === trimmed);
    if (!def) return null;
    const stored = merged.attributeCustomPropertyValues[def.id];
    if (stored !== undefined) return stored;
    return def.defaultValue;
  }

  /**
   * Set a character attribute entity custom property by name.
   * If no definition exists, appends one to the character snapshot with type/default derived from the value.
   */
  setProperty(name: string, value: unknown): void {
    const trimmed = name.trim();
    if (!trimmed) return;
    const merged = this.getMergedEntityCustomState();
    const schemaJson = this.schemaJsonForMerged(merged);
    let defs = parseEntityCustomPropertiesJson(schemaJson);
    let def = defs.find((d) => d.name.trim() === trimmed);
    let nextCustomProperties = merged.customProperties ?? null;

    if (!def) {
      const type = this.inferEntityPropType(value);
      const coerced = this.coerceEntityPropValue(type, value);
      def = {
        id: crypto.randomUUID(),
        name: trimmed,
        type,
        defaultValue: coerced,
      };
      defs = [...defs, def];
      nextCustomProperties = JSON.stringify(defs);
    }

    const coercedValue = this.coerceEntityPropValue(def.type, value);
    this.commitEntityCustomPropsState({
      customProperties: nextCustomProperties,
      attributeCustomPropertyValues: {
        ...merged.attributeCustomPropertyValues,
        [def.id]: coercedValue,
      },
    });
  }

  set(newValue: any): void {
    const key = `characterAttribute:${this.characterAttribute.id}`;
    // When set programmatically from a chart, numbers and bools can be passed as strings
    let typedValue = newValue;
    if (this.characterAttribute.type === 'number' && typeof typedValue === 'string') {
      typedValue = parseFloat(typedValue);
    } else if (this.characterAttribute.type === 'boolean' && typeof typedValue === 'string') {
      typedValue = typedValue.toLowerCase() === 'true';
    }

    this.pendingUpdates.set(key, typedValue);
    // Update local copy for immediate reads
    this.characterAttribute.value = typedValue;
  }

  setMax(newValue: any): void {
    const key = `characterAttributeMax:${this.characterAttribute.id}`;
    const typedValue =
      typeof newValue === 'string' ? parseFloat(newValue) : Number(newValue);
    this.pendingUpdates.set(key, typedValue);
    this.characterAttribute.max = typedValue;
  }

  setMin(newValue: any): void {
    const key = `characterAttributeMin:${this.characterAttribute.id}`;
    const typedValue =
      typeof newValue === 'string' ? parseFloat(newValue) : Number(newValue);
    this.pendingUpdates.set(key, typedValue);
    this.characterAttribute.min = typedValue;
  }

  /**
   * Set the attribute's options (for list-type attributes).
   * All values in the array are coerced to strings before storing.
   */
  setOptions(options: any[]): void {
    const key = `characterAttributeOptions:${this.characterAttribute.id}`;
    const stringOptions = options.map((item) => String(item ?? ''));
    this.pendingUpdates.set(key, stringOptions);
    this.characterAttribute.options = stringOptions;
  }

  /**
   * Reset the character attribute's options to match the ruleset attribute definition.
   */
  resetOptions(): void {
    const key = `characterAttributeOptions:${this.characterAttribute.id}`;
    const options = this.attribute.options !== undefined ? [...this.attribute.options] : undefined;
    this.pendingUpdates.set(key, options);
    this.characterAttribute.options = options;
  }

  /**
   * Add a numeric amount to the attribute.
   * Throws an error if the attribute is not numeric.
   */
  add(amount: number): void {
    if (this.attribute.type !== 'number') {
      throw new Error(`Cannot add to non-numeric attribute '${this.attribute.title}'`);
    }
    const current = Number(this.value);
    this.set(current + amount);
  }

  /**
   * Subtract a numeric amount from the attribute.
   * Throws an error if the attribute is not numeric.
   */
  subtract(amount: number): void {
    if (this.attribute.type !== 'number') {
      throw new Error(`Cannot subtract from non-numeric attribute '${this.attribute.title}'`);
    }
    const current = Number(this.value);
    this.set(current - amount);
  }

  /**
   * Multiply the attribute by a factor.
   * Throws an error if the attribute is not numeric.
   */
  multiply(factor: number): void {
    if (this.attribute.type !== 'number') {
      throw new Error(`Cannot multiply non-numeric attribute '${this.attribute.title}'`);
    }
    const current = Number(this.value);
    this.set(current * factor);
  }

  /**
   * Divide the attribute by a divisor.
   * Throws an error if the attribute is not numeric or if divisor is zero.
   */
  divide(divisor: number): void {
    if (this.attribute.type !== 'number') {
      throw new Error(`Cannot divide non-numeric attribute '${this.attribute.title}'`);
    }
    if (divisor === 0) {
      throw new Error('Cannot divide by zero');
    }
    const current = Number(this.value);
    this.set(current / divisor);
  }

  /**
   * Set the attribute to its maximum value.
   * Throws an error if the attribute has no max value defined.
   */
  setToMax(): void {
    if (this.attribute.max === undefined) {
      throw new Error(`Attribute '${this.attribute.title}' has no max value defined`);
    }
    this.set(this.attribute.max);
  }

  /**
   * Set the attribute to its minimum value.
   * Throws an error if the attribute has no min value defined.
   */
  setToMin(): void {
    if (this.attribute.min === undefined) {
      throw new Error(`Attribute '${this.attribute.title}' has no min value defined`);
    }
    this.set(this.attribute.min);
  }

  /**
   * Toggle a boolean attribute.
   * Throws an error if the attribute is not boolean.
   */
  flip(): void {
    if (this.attribute.type !== 'boolean') {
      throw new Error(`Cannot flip non-boolean attribute '${this.attribute.title}'`);
    }
    this.set(!this.value);
  }

  /**
   * Get a random option from the list attribute (does not set the attribute).
   * Throws an error if the attribute is not a list type.
   */
  get random(): any {
    if (
      this.attribute.type !== 'list' ||
      !this.attribute.options ||
      this.attribute.options.length === 0
    ) {
      throw new Error(`Attribute '${this.attribute.title}' is not a list or has no options`);
    }
    const randomIndex = Math.floor(Math.random() * this.attribute.options.length);
    return this.attribute.options[randomIndex];
  }

  /**
   * Set the attribute to a random option from its list.
   * Returns the selected value.
   * Throws an error if the attribute is not a list type.
   */
  setRandom(): any {
    if (
      this.attribute.type !== 'list' ||
      !this.attribute.options ||
      this.attribute.options.length === 0
    ) {
      throw new Error(`Attribute '${this.attribute.title}' is not a list or has no options`);
    }
    const randomValue = this.random;
    this.set(randomValue);
    return randomValue;
  }

  /**
   * Set the attribute to the next option in its list (wraps around).
   * Returns the new value.
   * Throws an error if the attribute is not a list type.
   */
  next(): any {
    if (
      this.attribute.type !== 'list' ||
      !this.attribute.options ||
      this.attribute.options.length === 0
    ) {
      throw new Error(`Attribute '${this.attribute.title}' is not a list or has no options`);
    }
    const currentIndex = this.attribute.options.indexOf(this.value);
    const nextIndex = (currentIndex + 1) % this.attribute.options.length;
    const nextValue = this.attribute.options[nextIndex];
    this.set(nextValue);
    return nextValue;
  }

  /**
   * Set the attribute to the previous option in its list (wraps around).
   * Returns the new value.
   * Throws an error if the attribute is not a list type.
   */
  prev(): any {
    if (
      this.attribute.type !== 'list' ||
      !this.attribute.options ||
      this.attribute.options.length === 0
    ) {
      throw new Error(`Attribute '${this.attribute.title}' is not a list or has no options`);
    }
    const currentIndex = this.attribute.options.indexOf(this.value);
    const prevIndex =
      (currentIndex - 1 + this.attribute.options.length) % this.attribute.options.length;
    const prevValue = this.attribute.options[prevIndex];
    this.set(prevValue);
    return prevValue;
  }

  /**
   * Get the attribute's description.
   */
  get description(): string {
    return this.attribute.description;
  }

  /**
   * Get the attribute's title/name.
   */
  get title(): string {
    return this.attribute.title;
  }

  /**
   * Return a plain object for postMessage (structured clone).
   * Called at the worker boundary when script returns or logs an AttributeProxy.
   */
  toStructuredCloneSafe(): { title: string; description: string; value: unknown } {
    return {
      title: this.attribute.title,
      description: this.attribute.description,
      value: this.value,
    };
  }
}
