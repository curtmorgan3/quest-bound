import {
  renderViewComponent,
  type ViewRenderContext,
} from '@/lib/compass-planes/nodes/render-node';
import type { PositionValues } from '@/lib/compass-planes/utils';
import { getComponentData } from '@/lib/compass-planes/utils';
import {
  getEditorPreviewStateName,
  withMergedStateLayers,
} from '@/lib/compass-planes/utils/component-states';
import type { CharacterAttribute, Component } from '@/types';

type Props = {
  component: Component;
  characterAttributes?: CharacterAttribute[];
  position?: PositionValues;
  viewRenderContext: ViewRenderContext;
};

/** Sheet / window viewer entry: state layers are applied in {@link NodeStateDecorator} inside `renderViewComponent`. */
export function SheetComponentWithStates({
  component,
  characterAttributes,
  position,
  viewRenderContext,
}: Props) {
  return renderViewComponent(component, characterAttributes, position, viewRenderContext);
}

export function sheetComponentLayoutData(
  component: Component,
  activeCustomStateName: string | null | undefined,
  characterSheet: boolean,
) {
  const opts = characterSheet
    ? {
        activeCustomStateName,
        showHoverLayer: false as const,
        showDisabledLayer: true as const,
      }
    : {
        editorPreviewState: getEditorPreviewStateName(component),
        showHoverLayer: false as const,
        showDisabledLayer: true as const,
      };
  return getComponentData(withMergedStateLayers(component, opts));
}
