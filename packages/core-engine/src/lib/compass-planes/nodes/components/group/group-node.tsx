import {
  EditorItemIdProvider,
  EditorItemLayoutProvider,
  useComponentCanvasDimensions,
} from '@/lib/compass-planes/canvas';
import { useEditorItemId } from '@/lib/compass-planes/canvas/editor-item-context';
import type { EffectiveLayout } from '@/lib/compass-planes/sheet-editor/component-world-geometry';
import {
  directChildrenSortedByTop,
  getGroupOverflowMode,
  groupFlexContainerStyle,
  groupFlexInnerOverflowCss,
  groupOuterChromeStyle,
  groupOuterShellOverflowCss,
  isFlexLayoutGroup,
} from '@/lib/compass-planes/sheet-editor/group-flex-utils';
import { useSheetCanvasLayout } from '@/lib/compass-planes/sheet-editor/sheet-canvas-layout-context';
import {
  getBackgroundStyle,
  getComponentData,
  useComponentStyles,
} from '@/lib/compass-planes/utils';
import { WindowEditorContext } from '@/stores';
import type { CharacterAttribute, Component, ComponentStyle } from '@/types';
import { useContext, useMemo, type ComponentType, type ReactNode } from 'react';
import { sheetNodeTypes } from '../../constants';
import { isComponentConditionallyVisible, ResizableNode } from '../../decorators';
import { ComponentTypes } from '../../node-types';

export const EditGroupNode = () => {
  const canvasLayout = useSheetCanvasLayout();
  const { components, getComponent, viewMode } = useContext(WindowEditorContext);
  const id = useEditorItemId();
  const component = id ? getComponent(id) : null;
  const css = useComponentStyles(component) as ComponentStyle;

  if (!component) return null;

  const { widthStyle: cw, heightStyle: ch } = useComponentCanvasDimensions(component);
  const isFlex = isFlexLayoutGroup(component);

  const childrenSorted = useMemo(
    () => directChildrenSortedByTop(components, component.id),
    [component.id, components],
  );

  const overflowMode = getGroupOverflowMode(css);
  const outerOverflow = groupOuterShellOverflowCss(overflowMode);
  const innerFlexOverflow = groupFlexInnerOverflowCss(overflowMode);

  const containerEditLabel =
    !viewMode && component.type === ComponentTypes.CONTAINER
      ? (getComponentData(component).referenceLabel ?? '').trim()
      : '';

  if (isFlex) {
    return (
      <ResizableNode component={component}>
        <div
          className='relative box-border h-full w-full'
          style={{
            ...groupOuterChromeStyle(css, cw, ch),
            ...getBackgroundStyle(css),
            overflow: outerOverflow,
          }}>
          <div style={groupFlexContainerStyle(css, innerFlexOverflow)} className='p-1'>
            {canvasLayout
              ? childrenSorted.map((child) => {
                  const eff = canvasLayout.effectiveLayout.get(child.id)!;
                  const childData = getComponentData(child);
                  const Edit = sheetNodeTypes[child.type as ComponentTypes] as
                    | ComponentType
                    | undefined;
                  if (!Edit) return null;
                  return (
                    <div
                      key={child.id}
                      data-canvas-item={child.id}
                      className={
                        child.locked
                          ? 'pointer-events-auto relative flex-shrink-0 [&_*]:pointer-events-none'
                          : 'pointer-events-auto relative flex-shrink-0'
                      }
                      style={{
                        width: viewMode && childData.takeFullWidth ? '100%' : eff.width,
                        height: viewMode && childData.takeFullHeight ? '100%' : eff.height,
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
          {containerEditLabel ? (
            <div
              aria-hidden
              className='pointer-events-none absolute inset-0 z-[5] flex items-center justify-center overflow-hidden'>
              <span className='max-w-full truncate px-2 text-center text-xs text-muted-foreground/80'>
                {containerEditLabel}
              </span>
            </div>
          ) : null}
        </div>
      </ResizableNode>
    );
  }

  return (
    <ResizableNode component={component}>
      <div
        className='box-border h-full w-full'
        style={{
          position: 'relative',
          ...groupOuterChromeStyle(css, cw, ch),
          ...getBackgroundStyle(css),
          overflow: outerOverflow,
        }}>
        {canvasLayout
          ? childrenSorted.map((child) => {
              const eff = canvasLayout.effectiveLayout.get(child.id)!;
              const childData = getComponentData(child);
              const Edit = sheetNodeTypes[child.type as ComponentTypes] as
                | ComponentType
                | undefined;
              if (!Edit) return null;
              return (
                <div
                  key={child.id}
                  data-canvas-item={child.id}
                  className={
                    child.locked
                      ? 'pointer-events-auto absolute [&_*]:pointer-events-none'
                      : 'pointer-events-auto absolute'
                  }
                  style={{
                    left: eff.x,
                    top: eff.y,
                    width: viewMode && childData.takeFullWidth ? '100%' : eff.width,
                    height: viewMode && childData.takeFullHeight ? '100%' : eff.height,
                    zIndex: child.z,
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
        {containerEditLabel ? (
          <div
            aria-hidden
            className='pointer-events-none absolute inset-0 z-[5] flex items-center justify-center overflow-hidden'>
            <span className='max-w-full truncate px-2 text-center text-xs text-muted-foreground/80'>
              {containerEditLabel}
            </span>
          </div>
        ) : null}
      </div>
    </ResizableNode>
  );
};

export const ViewGroupNode = ({
  component,
  allComponents,
  effectiveLayout,
  characterAttributes,
  renderChild,
}: {
  component: Component;
  allComponents: Component[];
  /** When set (viewer), use live width/height; else `component.width` / `height`. */
  effectiveLayout?: Map<string, EffectiveLayout>;
  characterAttributes?: CharacterAttribute[];
  renderChild?: (child: Component) => ReactNode;
}) => {
  const css = useComponentStyles(component) as ComponentStyle;
  const { widthStyle: cw, heightStyle: ch } = useComponentCanvasDimensions(component);
  const isFlex = isFlexLayoutGroup(component);

  const childrenSorted = useMemo(
    () => directChildrenSortedByTop(allComponents, component.id),
    [allComponents, component.id],
  );

  const overflowMode = getGroupOverflowMode(css);
  const outerOverflow = groupOuterShellOverflowCss(overflowMode);
  const innerFlexOverflow = groupFlexInnerOverflowCss(overflowMode);

  if (isFlex && renderChild) {
    return (
      <div
        className='component-group box-border'
        style={{
          ...groupOuterChromeStyle(css, cw, ch),
          ...getBackgroundStyle(css),
          overflow: outerOverflow,
          pointerEvents: 'auto',
        }}>
        <div style={groupFlexContainerStyle(css, innerFlexOverflow)} className='p-1'>
          {childrenSorted.map((child) => {
            if (!isComponentConditionallyVisible(child, characterAttributes)) {
              return null;
            }
            const eff = effectiveLayout?.get(child.id);
            const childData = getComponentData(child);
            const w = eff?.width ?? child.width;
            const h = eff?.height ?? child.height;
            return (
              <div
                key={child.id}
                className='pointer-events-auto'
                style={{
                  width: childData.takeFullWidth ? '100%' : w,
                  height: childData.takeFullHeight ? '100%' : h,
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

  if (renderChild) {
    return (
      <div
        className='component-group pointer-events-auto box-border'
        style={{
          position: 'relative',
          ...groupOuterChromeStyle(css, cw, ch),
          ...getBackgroundStyle(css),
          overflow: outerOverflow,
        }}>
        {childrenSorted.map((child) => {
          if (!isComponentConditionallyVisible(child, characterAttributes)) {
            return null;
          }
          const eff = effectiveLayout?.get(child.id);
          const childData = getComponentData(child);
          const w = eff?.width ?? child.width;
          const h = eff?.height ?? child.height;
          const x = eff?.x ?? child.x;
          const y = eff?.y ?? child.y;
          return (
            <div
              key={child.id}
              className='pointer-events-auto'
              style={{
                position: 'absolute',
                left: x,
                top: y,
                width: childData.takeFullWidth ? '100%' : w,
                height: childData.takeFullHeight ? '100%' : h,
                zIndex: child.z,
              }}>
              {renderChild(child)}
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div
      aria-hidden
      className='pointer-events-none component-group box-border'
      style={{
        ...groupOuterChromeStyle(css, cw, ch),
        ...getBackgroundStyle(css),
        overflow: outerOverflow,
      }}
    />
  );
};
