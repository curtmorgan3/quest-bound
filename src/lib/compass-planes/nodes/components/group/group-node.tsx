import {
  EditorItemIdProvider,
  EditorItemLayoutProvider,
  useComponentCanvasDimensions,
} from '@/lib/compass-planes/canvas';
import { useEditorItemId } from '@/lib/compass-planes/canvas/editor-item-context';
import { sheetNodeTypes } from '../../constants';
import { ComponentTypes } from '../../node-types';
import type { EffectiveLayout } from '@/lib/compass-planes/sheet-editor/component-world-geometry';
import {
  directChildrenSortedByTop,
  groupFlexContainerStyle,
  groupOuterChromeStyle,
  isFlexLayoutGroup,
} from '@/lib/compass-planes/sheet-editor/group-flex-utils';
import { useSheetCanvasLayout } from '@/lib/compass-planes/sheet-editor/sheet-canvas-layout-context';
import { getBackgroundStyle, useComponentStyles } from '@/lib/compass-planes/utils';
import { WindowEditorContext } from '@/stores';
import type { Component, ComponentStyle } from '@/types';
import { useContext, useMemo, type ComponentType, type ReactNode } from 'react';
import { ResizableNode } from '../../decorators';

export const EditGroupNode = () => {
  const canvasLayout = useSheetCanvasLayout();
  const { components, getComponent } = useContext(WindowEditorContext);
  const id = useEditorItemId();
  const component = id ? getComponent(id) : null;
  const css = useComponentStyles(component) as ComponentStyle;

  if (!component) return null;

  const { width: cw, height: ch } = useComponentCanvasDimensions(component);
  const isFlex = isFlexLayoutGroup(component);

  const childrenSorted = useMemo(
    () => (isFlex ? directChildrenSortedByTop(components, component.id) : []),
    [component.id, components, isFlex],
  );

  if (isFlex) {
    return (
      <ResizableNode component={component}>
        <div
          className='box-border h-full w-full'
          style={{
            ...groupOuterChromeStyle(css, cw, ch),
            ...getBackgroundStyle(css),
            overflow: 'hidden',
          }}>
          <div style={groupFlexContainerStyle(css)}>
            {canvasLayout
              ? childrenSorted.map((child) => {
                  const eff = canvasLayout.effectiveLayout.get(child.id)!;
                  const Edit = sheetNodeTypes[child.type as ComponentTypes] as
                    | ComponentType
                    | undefined;
                  if (!Edit) return null;
                  return (
                    <div
                      key={child.id}
                      data-canvas-item={child.id}
                      className='pointer-events-auto'
                      style={{
                        width: eff.width,
                        height: eff.height,
                        flexShrink: 0,
                        position: 'relative',
                      }}
                      onPointerDown={(e) => canvasLayout.onItemPointerDown(e, child)}>
                      <EditorItemLayoutProvider value={{ width: eff.width, height: eff.height }}>
                        <EditorItemIdProvider id={child.id}>
                          <Edit />
                        </EditorItemIdProvider>
                      </EditorItemLayoutProvider>
                    </div>
                  );
                })
              : null}
          </div>
        </div>
      </ResizableNode>
    );
  }

  return (
    <ResizableNode component={component}>
      <div
        aria-hidden
        className='box-border h-full w-full'
        style={{
          ...css,
          ...getBackgroundStyle(css),
          width: cw,
          height: ch,
          overflow: 'visible',
        }}
      />
    </ResizableNode>
  );
};

export const ViewGroupNode = ({
  component,
  allComponents,
  effectiveLayout,
  renderChild,
}: {
  component: Component;
  allComponents: Component[];
  /** When set (viewer), use live width/height; else `component.width` / `height`. */
  effectiveLayout?: Map<string, EffectiveLayout>;
  renderChild?: (child: Component) => ReactNode;
}) => {
  const css = useComponentStyles(component) as ComponentStyle;
  const { width: cw, height: ch } = useComponentCanvasDimensions(component);
  const isFlex = isFlexLayoutGroup(component);

  const childrenSorted = useMemo(
    () => (isFlex ? directChildrenSortedByTop(allComponents, component.id) : []),
    [allComponents, component.id, isFlex],
  );

  if (isFlex && renderChild) {
    return (
      <div
        className='component-group box-border'
        style={{
          ...groupOuterChromeStyle(css, cw, ch),
          ...getBackgroundStyle(css),
          overflow: 'hidden',
          pointerEvents: 'auto',
        }}>
        <div style={groupFlexContainerStyle(css)}>
          {childrenSorted.map((child) => {
            const eff = effectiveLayout?.get(child.id);
            const w = eff?.width ?? child.width;
            const h = eff?.height ?? child.height;
            return (
              <div
                key={child.id}
                className='pointer-events-auto'
                style={{
                  width: w,
                  height: h,
                  flexShrink: 0,
                  position: 'relative',
                }}>
                {renderChild(child)}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div
      aria-hidden
      className='pointer-events-none component-group box-border'
      style={{
        ...css,
        ...getBackgroundStyle(css),
        width: cw,
        height: ch,
        overflow: 'visible',
      }}
    />
  );
};
