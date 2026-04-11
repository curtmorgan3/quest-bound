import { Input, Label } from '@/components';
import { RulesetColorPicker } from '@/components/composites/ruleset-color-picker';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  AttributeLookup,
  useAttributes,
  useComponents,
  useRulesets,
  type ComponentUpdate,
} from '@/lib/compass-api';
import { ComponentTypes, isGroupLikeComponentType } from '@/lib/compass-planes/nodes';
import {
  CheckboxDataEdit,
  ContentDataEdit,
  FrameDataEdit,
  GraphDataEdit,
  InputDataEdit,
  InventoryDataEdit,
} from '@/lib/compass-planes/nodes/components';
import { ImageDataEdit } from '@/lib/compass-planes/nodes/components/image';
import { getComponentData } from '@/lib/compass-planes/utils';
import {
  COMPONENT_LAYOUT_KEYS,
  computeSparseDiff,
  getEditorPreviewStateName,
  remapGeometryUpdatesForEditorState,
  updateStateEntryPartial,
  withMergedStateLayers,
} from '@/lib/compass-planes/utils/component-states';
import { colorBlack } from '@/palette';
import type { Component, ConditionalRenderLogic, TextComponentData } from '@/types';
import { rgbToHex } from '@/utils';
import { getNumberAttributeSchemaBindingOptions } from '@/utils/attribute-value-binding';
import { parseEntityCustomPropertiesJson } from '@/utils/parse-entity-custom-properties-json';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { RGBColor } from 'react-color';
import { useParams } from 'react-router-dom';
import { ActionEdit } from './action-edit';
import { ClickEventModal } from './click-event-modal';
import {
  ComponentEditPanelContext,
  type ComponentEditPanelContextValue,
} from './component-edit-panel-context';
import { ConditionalRenderEdit, TextEdit } from './component-edits';
import { ShapeEdit } from './component-edits/shape-edit';
import { ComponentStatesEdit, ensureComponentStatesJson } from './component-states-edit';
import { ComponentTooltipSettings } from './component-tooltip-settings';
import { CustomPropertiesListModal } from './custom-properties-list-modal';
import { PositionEdit } from './position-edit';
import { StyleEdit } from './style-edit';

const ATTRIBUTE_ANIMATION_OPTIONS = [
  { value: 'none', label: 'None' },
  { value: 'floating-difference', label: 'Floating difference' },
  { value: 'tic', label: 'Tic' },
  { value: 'pop', label: 'Pop' },
  { value: 'highlight', label: 'Highlight' },
  { value: 'glow', label: 'Glow' },
  { value: 'shimmer', label: 'Shimmer' },
  { value: 'fade', label: 'Fade' },
  { value: 'shake', label: 'Shake' },
] as const;

const COMPONENTS_TYPES_FOR_ATTR_ASSIGNMENT: string[] = [
  ComponentTypes.CHECKBOX,
  ComponentTypes.INPUT,
  ComponentTypes.TEXT,
  ComponentTypes.CONTENT,
];

const ATTRIBUTE_CUSTOM_PROPERTY_NONE = '__none__';

const LAYOUT_KEY_SET = new Set<string>(COMPONENT_LAYOUT_KEYS);

function stripAttributeCustomPropertyIdFromData(dataStr: string): string {
  const d = { ...JSON.parse(dataStr) } as Record<string, unknown>;
  delete d.attributeCustomPropertyId;
  return JSON.stringify(d);
}

function mapComponentUpdateDataToStateLayer(
  u: ComponentUpdate,
  real: Component,
  stateName: string,
): ComponentUpdate {
  if (stateName === 'base' || u.data === undefined) return u;
  const nextMerged = JSON.parse(u.data) as Record<string, unknown>;
  const baseData = JSON.parse(real.data) as Record<string, unknown>;
  const diff = computeSparseDiff(baseData, nextMerged);
  const { data: _omit, actionId: _a, childWindowId: _cw, scriptId: _s, ...rest } = u;
  return {
    ...rest,
    states: updateStateEntryPartial(real.states, stateName, {
      data: JSON.stringify(diff),
    }),
  };
}

export const ComponentEditPanel = ({ viewMode }: { viewMode: boolean }) => {
  const { windowId } = useParams();
  const { components, updateComponents } = useComponents(windowId);
  const { activeRuleset } = useRulesets();
  const { attributes } = useAttributes();
  const [customPropertiesModalOpen, setCustomPropertiesModalOpen] = useState(false);
  const [referenceLabelInput, setReferenceLabelInput] = useState('');
  const customPropertiesModalParamsRef = useRef<{
    styleKey: string | null;
    onSelect?: (customPropertyId: string) => void;
  }>({ styleKey: null });
  let selectedComponents = components.filter((c) => c.selected);
  const hadSelection = selectedComponents.length > 0;

  // multiple components selected and all are locked
  if (selectedComponents.length > 1) {
    selectedComponents = selectedComponents.filter((c) => !c.locked);
  }

  const soleSelected = selectedComponents.length === 1 ? selectedComponents[0] : undefined;

  useEffect(() => {
    if (!soleSelected) {
      setReferenceLabelInput('');
      return;
    }
    const merged =
      getEditorPreviewStateName(soleSelected) === 'base'
        ? soleSelected
        : withMergedStateLayers(soleSelected, {
            editorPreviewState: getEditorPreviewStateName(soleSelected),
          });
    setReferenceLabelInput(getComponentData(merged).referenceLabel ?? '');
  }, [
    soleSelected?.id,
    soleSelected?.editorStateTarget,
    soleSelected?.data,
    soleSelected?.states,
  ]);

  const panelDisplayComponents = useMemo(
    () =>
      selectedComponents.map((c) => {
        const target = getEditorPreviewStateName(c);
        if (target === 'base') return c;
        return withMergedStateLayers(c, { editorPreviewState: target });
      }),
    [selectedComponents],
  );

  const patchSelectedComponentsMergedData = (
    nextFromMerged: (merged: Record<string, unknown>) => Record<string, unknown>,
  ) => {
    const toUpdate = selectedComponents.filter((c) => !c.locked);
    updateComponents(
      toUpdate.map((real) => {
        const target = getEditorPreviewStateName(real);
        if (target === 'base') {
          const merged = { ...JSON.parse(real.data) } as Record<string, unknown>;
          return { id: real.id, data: JSON.stringify(nextFromMerged(merged)) };
        }
        const display = withMergedStateLayers(real, { editorPreviewState: target });
        const merged = { ...JSON.parse(display.data) } as Record<string, unknown>;
        const nextMerged = nextFromMerged(merged);
        const baseData = JSON.parse(real.data) as Record<string, unknown>;
        const diff = computeSparseDiff(baseData, nextMerged);
        return {
          id: real.id,
          states: updateStateEntryPartial(real.states, target, {
            data: JSON.stringify(diff),
          }),
        };
      }),
    );
  };

  const persistMergedDataUpdates = async (updates: Array<ComponentUpdate>) => {
    await updateComponents(
      updates.map((u) => {
        const real = selectedComponents.find((c) => c.id === u.id);
        if (!real) return u;
        const target = getEditorPreviewStateName(real);
        if (target === 'base' || u.data === undefined) return u;
        return mapComponentUpdateDataToStateLayer(u, real, target);
      }),
    );
  };

  const handleUpdate = (key: string | string[], value: number | string | boolean | null) => {
    const toUpdate = selectedComponents.filter((c) => (key === 'locked' ? true : !c.locked));

    if (typeof key === 'string') {
      if (LAYOUT_KEY_SET.has(key)) {
        void updateComponents(
          remapGeometryUpdatesForEditorState(
            toUpdate.map((c) => ({
              id: c.id,
              [key]: value as number | string,
            })),
            (id) => components.find((row) => row.id === id),
          ),
        );
        return;
      }
      updateComponents(
        toUpdate.map((c) => ({
          id: c.id,
          [key]: value,
        })),
      );
    } else {
      const updated = [...toUpdate];
      for (const component of updated) {
        for (const k of key) {
          Object.assign(component, { [k]: value });
        }
      }
      updateComponents(updated);
    }
  };

  const handleGroupDataUpdate = (key: string, value: string | boolean) => {
    const toUpdate = selectedComponents.filter((c) => !c.locked);
    updateComponents(
      toUpdate.map((real) => {
        const target = getEditorPreviewStateName(real);
        if (target === 'base') {
          return {
            id: real.id,
            data: JSON.stringify({
              ...JSON.parse(real.data),
              [key]: value,
            }),
          };
        }
        const display = withMergedStateLayers(real, { editorPreviewState: target });
        const dataObj = {
          ...(JSON.parse(display.data) as Record<string, unknown>),
          [key]: value,
        };
        const baseData = JSON.parse(real.data) as Record<string, unknown>;
        const diff = computeSparseDiff(baseData, dataObj);
        return {
          id: real.id,
          states: updateStateEntryPartial(real.states, target, {
            data: JSON.stringify(diff),
          }),
        };
      }),
    );
  };

  const handlePositionDataFlag = (key: 'takeFullWidth' | 'takeFullHeight', value: boolean) => {
    const toUpdate = selectedComponents.filter((c) => !c.locked);
    updateComponents(
      toUpdate.map((c) => {
        const d = { ...JSON.parse(c.data) } as Record<string, unknown>;
        if (value) d[key] = true;
        else delete d[key];
        return { id: c.id, data: JSON.stringify(d) };
      }),
    );
  };

  const handleStyleUpdate = (
    key: string | string[],
    value: number | string | boolean | null | RGBColor,
  ) => {
    const toUpdate = selectedComponents.filter((c) => (key === 'locked' ? true : !c.locked));

    if (Object.hasOwn(value as any, 'r')) {
      const color = { ...(value as any) } as RGBColor;
      value = `rgba(${color.r}, ${color.g}, ${color.b}, ${color.a})`;
    }

    if (typeof key === 'string') {
      updateComponents(
        toUpdate.map((real) => {
          const target = getEditorPreviewStateName(real);
          if (target === 'base') {
            return {
              id: real.id,
              style: JSON.stringify({
                ...JSON.parse(real.style),
                [key]: value,
              }),
            };
          }
          const display = withMergedStateLayers(real, { editorPreviewState: target });
          const styleObj = {
            ...(JSON.parse(display.style) as Record<string, unknown>),
            [key]: value,
          };
          const baseStyle = JSON.parse(real.style) as Record<string, unknown>;
          const diff = computeSparseDiff(baseStyle, styleObj);
          return {
            id: real.id,
            states: updateStateEntryPartial(real.states, target, {
              style: JSON.stringify(diff),
            }),
          };
        }),
      );
      return;
    }

    updateComponents(
      toUpdate.map((real) => {
        const target = getEditorPreviewStateName(real);
        if (target === 'base') {
          let styleObj = JSON.parse(real.style) as Record<string, unknown>;
          for (const k of key) {
            styleObj = { ...styleObj, [k]: value };
          }
          return { id: real.id, style: JSON.stringify(styleObj) };
        }
        let styleObj = JSON.parse(
          withMergedStateLayers(real, { editorPreviewState: target }).style,
        ) as Record<string, unknown>;
        for (const k of key) {
          styleObj = { ...styleObj, [k]: value };
        }
        const baseStyle = JSON.parse(real.style) as Record<string, unknown>;
        const diff = computeSparseDiff(baseStyle, styleObj);
        return {
          id: real.id,
          states: updateStateEntryPartial(real.states, target, {
            style: JSON.stringify(diff),
          }),
        };
      }),
    );
  };

  const setConditionalRenderAttributeId = (id: string | null) => {
    patchSelectedComponentsMergedData((d) => {
      const next = { ...d } as Record<string, unknown>;
      next.conditionalRenderAttributeId = id;
      delete next.conditionalRenderAttributeCustomPropertyId;
      return next;
    });
  };

  const setConditionalRenderAttributeCustomPropertyId = (customPropertyId: string | null) => {
    patchSelectedComponentsMergedData((d) => {
      const next = { ...d } as Record<string, unknown>;
      if (customPropertyId == null) {
        delete next.conditionalRenderAttributeCustomPropertyId;
      } else {
        next.conditionalRenderAttributeCustomPropertyId = customPropertyId;
      }
      return next;
    });
  };

  const setConditionalRenderLogic = (logic: ConditionalRenderLogic | null) => {
    patchSelectedComponentsMergedData((d) => ({
      ...d,
      conditionalRenderLogic: logic ?? undefined,
    }));
  };

  const setHref = (href: string) => {
    patchSelectedComponentsMergedData((d) => ({
      ...d,
      href: href || undefined,
    }));
  };

  const setReferenceLabel = (referenceLabel: string) => {
    patchSelectedComponentsMergedData((d) => ({
      ...d,
      referenceLabel: referenceLabel.trim() || undefined,
    }));
  };

  const referenceLabelDebounceTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    if (selectedComponents.length !== 1) return;

    if (referenceLabelDebounceTimeoutRef.current !== null) {
      window.clearTimeout(referenceLabelDebounceTimeoutRef.current);
    }

    referenceLabelDebounceTimeoutRef.current = window.setTimeout(() => {
      setReferenceLabel(referenceLabelInput);
    }, 300);

    return () => {
      if (referenceLabelDebounceTimeoutRef.current !== null) {
        window.clearTimeout(referenceLabelDebounceTimeoutRef.current);
      }
    };
  }, [referenceLabelInput, selectedComponents.length, selectedComponents[0]?.id]);

  const setAnimation = (animation: string | null) => {
    patchSelectedComponentsMergedData((d) => ({
      ...d,
      animation: animation && animation !== 'none' ? animation : null,
    }));
  };

  const setAnimationColor = (animationColor: string | null) => {
    patchSelectedComponentsMergedData((d) => ({
      ...d,
      animationColor: animationColor ?? null,
    }));
  };

  const setShowSign = (showSign: boolean) => {
    patchSelectedComponentsMergedData((d) => ({
      ...d,
      showSign,
    }));
  };

  const setTooltipValue = (tooltipValue: string) => {
    patchSelectedComponentsMergedData((d) => ({
      ...d,
      tooltipValue: tooltipValue || undefined,
    }));
  };

  const setTooltipAttributeId = (id: string | null) => {
    patchSelectedComponentsMergedData((d) => ({
      ...d,
      tooltipAttributeId: id,
    }));
  };

  const setTooltipPlacement = (placement: 'top' | 'right' | 'bottom' | 'left') => {
    patchSelectedComponentsMergedData((d) => ({
      ...d,
      tooltipPlacement: placement,
    }));
  };

  const assignStyleToCustomProperty = (styleKey: string, customPropertyId: string) => {
    const nonstyleKeys = ['width', 'height', 'rotation', 'z'];

    if (nonstyleKeys.includes(styleKey)) {
      handleUpdate(styleKey, `custom-prop-${customPropertyId}`);
      return;
    }

    if (styleKey === 'animationColor') {
      setAnimationColor(`custom-prop-${customPropertyId}`);
      return;
    }

    handleStyleUpdate(styleKey, `custom-prop-${customPropertyId}`);
  };

  const contextValue: ComponentEditPanelContextValue = {
    assignStyleToCustomProperty,
    openCustomPropertiesModal: (styleKey, onSelect) => {
      customPropertiesModalParamsRef.current = {
        styleKey: styleKey ?? null,
        onSelect,
      };
      setCustomPropertiesModalOpen(true);
    },
  };

  // Check if all selected components are image type
  const allAreImages =
    selectedComponents.length > 0 &&
    selectedComponents.every((c) => c.type === ComponentTypes.IMAGE);

  const allAreContent =
    selectedComponents.length > 0 &&
    selectedComponents.every((c) => c.type === ComponentTypes.CONTENT);

  const allAreText =
    selectedComponents.length > 0 &&
    selectedComponents.every(
      (c) =>
        c.type === ComponentTypes.TEXT ||
        c.type === ComponentTypes.INPUT ||
        c.type === ComponentTypes.CONTENT ||
        c.type === ComponentTypes.INVENTORY,
    );

  const allCanOpenChildWindow =
    selectedComponents.length > 0 &&
    selectedComponents.every(
      (c) =>
        c.type === ComponentTypes.TEXT ||
        c.type === ComponentTypes.CONTENT ||
        c.type === ComponentTypes.SHAPE ||
        c.type === ComponentTypes.GRAPH ||
        c.type === ComponentTypes.IMAGE ||
        isGroupLikeComponentType(c.type),
    );

  const allAreShapes =
    selectedComponents.length > 0 &&
    selectedComponents.every((c) => c.type === ComponentTypes.SHAPE);

  const allAreCheckboxes =
    selectedComponents.length > 0 &&
    selectedComponents.every((c) => c.type === ComponentTypes.CHECKBOX);

  const allAreInputs =
    selectedComponents.length > 0 &&
    selectedComponents.every((c) => c.type === ComponentTypes.INPUT);

  const allAreInventories =
    selectedComponents.length > 0 &&
    selectedComponents.every((c) => c.type === ComponentTypes.INVENTORY);

  const allAreGraphs =
    selectedComponents.length > 0 &&
    selectedComponents.every((c) => c.type === ComponentTypes.GRAPH);

  const allAreFrames =
    selectedComponents.length > 0 &&
    selectedComponents.every((c) => c.type === ComponentTypes.FRAME);

  if (viewMode || !hadSelection) {
    return null;
  }

  return (
    <ComponentEditPanelContext.Provider value={contextValue}>
      <div
        data-component-edit-panel
        className='z-20 flex h-[100vh] w-[280px] flex-col items-center gap-2 p-4'
        style={{
          position: 'absolute',
          top: 0,
          right: 0,
          backgroundColor: colorBlack,
          overflow: 'auto',
        }}>
        {selectedComponents.length > 0 ? (
          <Tabs defaultValue='style' className='w-full flex flex-col'>
            <TabsList className='w-full'>
              <TabsTrigger value='style' className='flex-1'>
                Style
              </TabsTrigger>
              <TabsTrigger
                value='data'
                className='flex-1'
                data-testid='component-edit-tab-data'>
                Content
              </TabsTrigger>
            </TabsList>
            {selectedComponents.length === 1 ? (
              <ComponentStatesEdit
                component={selectedComponents[0]!}
                onStatesUpdated={(statesJson) => {
                  const c = selectedComponents[0]!;
                  updateComponents([{ id: c.id, states: ensureComponentStatesJson(statesJson) }]);
                }}
              />
            ) : null}
            <TabsContent value='style' className='mt-2 flex w-full flex-col gap-2'>
              <ActionEdit components={selectedComponents} handleUpdate={handleUpdate} />
              <PositionEdit
                components={panelDisplayComponents}
                handleUpdate={handleUpdate}
                handleDataFlagUpdate={handlePositionDataFlag}
              />
              <StyleEdit
                components={panelDisplayComponents}
                handleUpdate={handleStyleUpdate}
                handleDataUpdate={handleGroupDataUpdate}
              />
              {allAreText && (
                <TextEdit components={panelDisplayComponents} handleUpdate={handleStyleUpdate} />
              )}
              {allAreShapes &&
                selectedComponents.every((c) => getEditorPreviewStateName(c) === 'base') && (
                  <ShapeEdit components={selectedComponents} />
                )}
            </TabsContent>
            <TabsContent value='data' className='mt-2 flex w-full flex-col gap-4 overflow-x-hidden'>
              {selectedComponents.length === 1 && (
                <div className='flex flex-col gap-2'>
                  <Label
                    htmlFor='component-edit-reference-label'
                    className='text-xs text-muted-foreground'>
                    Reference ID
                  </Label>
                  <Input
                    id='component-edit-reference-label'
                    className='h-8 rounded-[4px]'
                    placeholder='Used for reference in script'
                    value={referenceLabelInput}
                    onChange={(e) => setReferenceLabelInput(e.target.value)}
                  />
                </div>
              )}
              {selectedComponents.length === 1 &&
                COMPONENTS_TYPES_FOR_ATTR_ASSIGNMENT.includes(selectedComponents[0].type) && (
                  <>
                    <AttributeLookup
                      id='component-data-attribute-lookup'
                      value={selectedComponents[0].attributeId}
                      onSelect={(attr) => {
                        const c = selectedComponents[0]!;
                        const target = getEditorPreviewStateName(c);
                        if (target === 'base') {
                          updateComponents([
                            {
                              id: c.id,
                              attributeId: attr.id,
                              data: stripAttributeCustomPropertyIdFromData(c.data),
                            },
                          ]);
                          return;
                        }
                        const display = withMergedStateLayers(c, {
                          editorPreviewState: target,
                        });
                        const merged = { ...JSON.parse(display.data) } as Record<string, unknown>;
                        delete merged.attributeCustomPropertyId;
                        const baseData = JSON.parse(c.data) as Record<string, unknown>;
                        const diff = computeSparseDiff(baseData, merged);
                        updateComponents([
                          {
                            id: c.id,
                            attributeId: attr.id,
                            states: updateStateEntryPartial(c.states, target, {
                              data: JSON.stringify(diff),
                            }),
                          },
                        ]);
                      }}
                      onDelete={() => {
                        const c = selectedComponents[0]!;
                        const target = getEditorPreviewStateName(c);
                        if (target === 'base') {
                          updateComponents([
                            {
                              id: c.id,
                              attributeId: null,
                              data: stripAttributeCustomPropertyIdFromData(c.data),
                            },
                          ]);
                          return;
                        }
                        const display = withMergedStateLayers(c, {
                          editorPreviewState: target,
                        });
                        const merged = { ...JSON.parse(display.data) } as Record<string, unknown>;
                        delete merged.attributeCustomPropertyId;
                        const baseData = JSON.parse(c.data) as Record<string, unknown>;
                        const diff = computeSparseDiff(baseData, merged);
                        updateComponents([
                          {
                            id: c.id,
                            attributeId: null,
                            states: updateStateEntryPartial(c.states, target, {
                              data: JSON.stringify(diff),
                            }),
                          },
                        ]);
                      }}
                    />
                    {(() => {
                      const c = selectedComponents[0];
                      const displayC = panelDisplayComponents[0]!;
                      const boundAttr = c.attributeId
                        ? attributes.find((a) => a.id === c.attributeId)
                        : undefined;
                      const defs = boundAttr
                        ? parseEntityCustomPropertiesJson(boundAttr.customProperties)
                        : [];
                      const schemaBindingOpts = getNumberAttributeSchemaBindingOptions(boundAttr);
                      if (defs.length === 0 && schemaBindingOpts.length === 0) return null;
                      const data = getComponentData(displayC);
                      const storedId = data.attributeCustomPropertyId;
                      const isValidBindingId = (id: string) =>
                        defs.some((d) => d.id === id) ||
                        schemaBindingOpts.some((o) => o.id === id);
                      const current =
                        storedId && isValidBindingId(storedId)
                          ? storedId
                          : ATTRIBUTE_CUSTOM_PROPERTY_NONE;
                      return (
                        <div className='flex flex-col gap-2'>
                          <Label
                            htmlFor='component-attribute-custom-property'
                            className='text-xs text-muted-foreground'>
                            Custom property (optional)
                          </Label>
                          <Select
                            value={current}
                            onValueChange={(v) => {
                              patchSelectedComponentsMergedData((merged) => {
                                const nextData = { ...merged };
                                if (v === ATTRIBUTE_CUSTOM_PROPERTY_NONE) {
                                  delete nextData.attributeCustomPropertyId;
                                } else {
                                  nextData.attributeCustomPropertyId = v;
                                }
                                return nextData;
                              });
                            }}>
                            <SelectTrigger
                              id='component-attribute-custom-property'
                              className='h-8 w-full'>
                              <SelectValue placeholder='Use main attribute value' />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value={ATTRIBUTE_CUSTOM_PROPERTY_NONE}>
                                None (main attribute value)
                              </SelectItem>
                              {defs.map((def) => (
                                <SelectItem key={def.id} value={def.id}>
                                  {def.name}
                                </SelectItem>
                              ))}
                              {schemaBindingOpts.map((opt) => (
                                <SelectItem key={opt.id} value={opt.id}>
                                  {opt.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      );
                    })()}
                  </>
                )}
              {selectedComponents.length === 1 && selectedComponents[0].attributeId && (
                <div className='flex flex-row gap-2 items-end justify-end'>
                  <div className='flex flex-col gap-2 flex-1 min-w-0'>
                    <Label
                      htmlFor='component-edit-animation'
                      className='text-xs text-muted-foreground'>
                      Animation
                    </Label>
                    <Select
                      value={
                        getComponentData(panelDisplayComponents[0]!).animation ||
                        activeRuleset?.details?.animation ||
                        'none'
                      }
                      onValueChange={(value) => setAnimation(value)}>
                      <SelectTrigger id='component-edit-animation' className='h-8 w-full'>
                        <SelectValue placeholder='Select animation…' />
                      </SelectTrigger>
                      <SelectContent>
                        {ATTRIBUTE_ANIMATION_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <RulesetColorPicker
                    showLabel
                    label='Animation Color'
                    propertyKey='animationColor'
                    color={
                      getComponentData(panelDisplayComponents[0]!).animationColor ??
                      activeRuleset?.details?.animationColor
                    }
                    disableAlpha
                    onUpdate={(value) => {
                      if (typeof value === 'string') return;
                      const hex = rgbToHex(value.r, value.g, value.b);
                      setAnimationColor(hex);
                    }}
                  />
                </div>
              )}
              {selectedComponents.every((c) => c.type === ComponentTypes.TEXT) &&
                selectedComponents.length === 1 &&
                selectedComponents[0].attributeId && (
                  <div className='flex items-center gap-2'>
                    <Checkbox
                      id='show-sign'
                      checked={
                        (getComponentData(panelDisplayComponents[0]!) as TextComponentData)
                          .showSign ?? false
                      }
                      onCheckedChange={(checked) => setShowSign(checked === true)}
                      onKeyDown={(e) => e.stopPropagation()}
                    />
                    <Label htmlFor='show-sign' className='text-sm leading-none'>
                      Show sign
                    </Label>
                  </div>
                )}
              {selectedComponents.length === 1 && (
                <ConditionalRenderEdit
                  attributeId={
                    getComponentData(panelDisplayComponents[0]!).conditionalRenderAttributeId
                  }
                  conditionalRenderAttributeCustomPropertyId={
                    getComponentData(panelDisplayComponents[0]!)
                      .conditionalRenderAttributeCustomPropertyId
                  }
                  conditionalRenderLogic={
                    getComponentData(panelDisplayComponents[0]!).conditionalRenderLogic
                  }
                  onSelect={(attr) => setConditionalRenderAttributeId(attr?.id ?? null)}
                  onDelete={() => setConditionalRenderAttributeId(null)}
                  onCustomPropertyChange={setConditionalRenderAttributeCustomPropertyId}
                  onLogicChange={setConditionalRenderLogic}
                />
              )}

              {selectedComponents.length === 1 &&
                selectedComponents[0].type !== ComponentTypes.INVENTORY && (
                  <div className='flex flex-col gap-2'>
                    <Label htmlFor='component-edit-href' className='text-xs text-muted-foreground'>
                      Link
                    </Label>
                    <Input
                      id='component-edit-href'
                      className='h-8 rounded-[4px]'
                      disabled={!!getComponentData(panelDisplayComponents[0]!).pageId}
                      placeholder='https://...'
                      value={getComponentData(panelDisplayComponents[0]!).href ?? ''}
                      onChange={(e) => setHref(e.target.value)}
                    />
                  </div>
                )}

              {selectedComponents.length === 1 && (
                <ClickEventModal
                  component={panelDisplayComponents[0]!}
                  allCanOpenChildWindow={allCanOpenChildWindow}
                  persistComponentUpdates={persistMergedDataUpdates}
                />
              )}

              {selectedComponents.length === 1 && (
                <ComponentTooltipSettings
                  component={panelDisplayComponents[0]!}
                  onTooltipValueChange={setTooltipValue}
                  onTooltipAttributeIdChange={setTooltipAttributeId}
                  onTooltipPlacementChange={setTooltipPlacement}
                />
              )}

              {allAreImages && (
                <ImageDataEdit
                  components={panelDisplayComponents}
                  handleUpdate={handleUpdate}
                  updateComponents={persistMergedDataUpdates}
                />
              )}

              {allAreContent && (
                <ContentDataEdit
                  components={panelDisplayComponents}
                  handleUpdate={handleUpdate}
                  updateComponents={persistMergedDataUpdates}
                />
              )}

              {allAreInputs && (
                <InputDataEdit
                  components={panelDisplayComponents}
                  handleUpdate={handleUpdate}
                  updateComponents={persistMergedDataUpdates}
                />
              )}

              {allAreCheckboxes && (
                <CheckboxDataEdit
                  components={panelDisplayComponents}
                  handleUpdate={handleUpdate}
                  updateComponents={persistMergedDataUpdates}
                />
              )}

              {allAreInventories && (
                <InventoryDataEdit
                  components={panelDisplayComponents}
                  updateComponents={persistMergedDataUpdates}
                />
              )}

              {allAreGraphs && (
                <GraphDataEdit
                  components={panelDisplayComponents}
                  updateComponents={persistMergedDataUpdates}
                />
              )}

              {allAreFrames && (
                <FrameDataEdit
                  components={panelDisplayComponents}
                  updateComponents={persistMergedDataUpdates}
                />
              )}
            </TabsContent>
          </Tabs>
        ) : (
          <p className='text-xs'>All selected components are locked</p>
        )}
      </div>
      <CustomPropertiesListModal
        open={customPropertiesModalOpen}
        onOpenChange={setCustomPropertiesModalOpen}
        onSelect={(customPropertyId) => {
          const { styleKey, onSelect } = customPropertiesModalParamsRef.current;
          if (onSelect) {
            onSelect(customPropertyId);
          } else if (styleKey) {
            assignStyleToCustomProperty(styleKey, customPropertyId);
          }
          customPropertiesModalParamsRef.current = { styleKey: null };
          setCustomPropertiesModalOpen(false);
        }}
      />
    </ComponentEditPanelContext.Provider>
  );
};
