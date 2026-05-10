import type { ScriptParamValue } from '@quest-bound/types';
import type { StructuredCloneSafe } from '../structured-clone-safe';
import type { SheetUiCoordinator } from './sheet-ui-coordinator';

/**
 * Script handle for one sheet component (template or script overlay) on a character page.
 */
export class SheetComponentAccessor implements StructuredCloneSafe {
  constructor(
    private readonly coordinator: SheetUiCoordinator,
    readonly characterId: string,
    readonly componentId: string,
    /** CharacterWindow row id where this node was resolved (for overlay mutations). */
    readonly characterWindowInstanceId: string,
  ) {}

  delete(): void {
    this.coordinator.deleteComponent(this.characterId, this.componentId, this.characterWindowInstanceId);
  }

  set(updates: Record<string, unknown>): void;
  set(key: string, value: unknown): void;
  set(keyOrUpdates: string | Record<string, unknown>, value?: unknown): void {
    if (typeof keyOrUpdates === 'string') {
      this.coordinator.setOnComponent(
        this.characterId,
        this.componentId,
        this.characterWindowInstanceId,
        keyOrUpdates,
        value,
      );
      return;
    }
    if (keyOrUpdates === null || Array.isArray(keyOrUpdates)) return;
    for (const [key, val] of Object.entries(keyOrUpdates)) {
      this.coordinator.setOnComponent(
        this.characterId,
        this.componentId,
        this.characterWindowInstanceId,
        key,
        val,
      );
    }
  }

  /** Sets the component `data` flag `disabled` (same as `set('disabled', disabled)`). */
  setDisabled(disabled: boolean): void {
    this.set('disabled', disabled);
  }

  /**
   * Configure this component's click event. `kind` is `'fireAction'` (matches `Action.title`) or
   * `'fireScript'` (matches `Script.name`) within the character's ruleset. Optional `params` is
   * keyed by the script's parameter labels (case-insensitive); unmatched keys are ignored.
   * Throws if the named action/script is not found.
   */
  async setClickEvent(
    kind: 'fireAction' | 'fireScript',
    name: string,
    params?: Record<string, ScriptParamValue>,
  ): Promise<void> {
    await this.coordinator.setComponentClickEvent(
      this.characterId,
      this.componentId,
      this.characterWindowInstanceId,
      kind,
      name,
      params,
    );
  }

  /**
   * Activates a named custom state from the component's `states` list (case-insensitive match).
   * Pass `'default'` to clear the active custom state for this component.
   */
  setState(name: string): void {
    this.coordinator.setComponentState(
      this.characterId,
      this.componentId,
      this.characterWindowInstanceId,
      name,
    );
  }

  get(key: string): unknown {
    return this.coordinator.getOnComponent(
      this.characterId,
      this.componentId,
      this.characterWindowInstanceId,
      key,
    );
  }

  /**
   * Resolves a descendant (nested child) of this component by `referenceLabel`, same semantics as
   * `CharacterAccessor.getComponent` but scoped to this subtree. First preorder match wins.
   */
  async getComponent(referenceLabel: string): Promise<SheetComponentAccessor | null> {
    return this.coordinator.getDescendantComponent(
      this.characterId,
      this.componentId,
      this.characterWindowInstanceId,
      referenceLabel,
    );
  }

  /**
   * All descendants of this component with the given `referenceLabel`, in preorder (same as
   * `CharacterAccessor.getComponents`, scoped to this subtree).
   */
  async getComponents(referenceLabel: string): Promise<SheetComponentAccessor[]> {
    return this.coordinator.getDescendantComponents(
      this.characterId,
      this.componentId,
      this.characterWindowInstanceId,
      referenceLabel,
    );
  }

  /** Ruleset attribute title bound to this component, or null if none. */
  async getAttribute(): Promise<string | null> {
    return this.coordinator.getAssociatedAttributeName(
      this.characterId,
      this.componentId,
      this.characterWindowInstanceId,
    );
  }

  /**
   * Associate this component with the ruleset attribute whose title matches (trimmed).
   * Pass `null`, `''`, or whitespace-only to clear. Throws if the attribute name is non-empty and not found.
   */
  async setAttribute(attributeName: string | null): Promise<void> {
    await this.coordinator.setAttributeByName(
      this.characterId,
      this.componentId,
      this.characterWindowInstanceId,
      attributeName,
    );
  }

  add(other: SheetComponentAccessor | null | undefined): void {
    if (!other) return;
    this.coordinator.addChild(this.characterId, this.componentId, other.componentId);
  }

  toStructuredCloneSafe(): unknown {
    return {
      __type: 'SheetComponent',
      characterId: this.characterId,
      componentId: this.componentId,
    };
  }
}
