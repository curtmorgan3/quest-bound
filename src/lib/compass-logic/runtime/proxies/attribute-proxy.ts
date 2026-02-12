import type { Attribute, CharacterAttribute } from '@/types';

/**
 * Proxy object for character attributes, providing methods to read and modify attribute values.
 * Changes are queued and written to the database when the script execution completes.
 */
export class AttributeProxy {
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

  /**
   * Set the attribute to a new value.
   */
  set(newValue: any): void {
    const key = `characterAttribute:${this.characterAttribute.id}`;
    this.pendingUpdates.set(key, newValue);
    // Update local copy for immediate reads
    this.characterAttribute.value = newValue;
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
  max(): void {
    if (this.attribute.max === undefined) {
      throw new Error(`Attribute '${this.attribute.title}' has no max value defined`);
    }
    this.set(this.attribute.max);
  }

  /**
   * Set the attribute to its minimum value.
   * Throws an error if the attribute has no min value defined.
   */
  min(): void {
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
   * Set the attribute to a random option from its list.
   * Returns the selected value.
   * Throws an error if the attribute is not a list type.
   */
  random(): any {
    if (this.attribute.type !== 'list' || !this.attribute.options || this.attribute.options.length === 0) {
      throw new Error(`Attribute '${this.attribute.title}' is not a list or has no options`);
    }
    const randomIndex = Math.floor(Math.random() * this.attribute.options.length);
    const randomValue = this.attribute.options[randomIndex];
    this.set(randomValue);
    return randomValue;
  }

  /**
   * Set the attribute to the next option in its list (wraps around).
   * Returns the new value.
   * Throws an error if the attribute is not a list type.
   */
  next(): any {
    if (this.attribute.type !== 'list' || !this.attribute.options || this.attribute.options.length === 0) {
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
    if (this.attribute.type !== 'list' || !this.attribute.options || this.attribute.options.length === 0) {
      throw new Error(`Attribute '${this.attribute.title}' is not a list or has no options`);
    }
    const currentIndex = this.attribute.options.indexOf(this.value);
    const prevIndex = (currentIndex - 1 + this.attribute.options.length) % this.attribute.options.length;
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
}
