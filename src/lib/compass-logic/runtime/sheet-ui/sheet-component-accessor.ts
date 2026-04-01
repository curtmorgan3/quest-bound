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

  set(key: string, value: unknown): void {
    this.coordinator.setOnComponent(
      this.characterId,
      this.componentId,
      this.characterWindowInstanceId,
      key,
      value,
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
