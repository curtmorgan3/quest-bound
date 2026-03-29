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
import { AttributeLookup, useComponents, useRulesets } from '@/lib/compass-api';
import { ComponentTypes } from '@/lib/compass-planes/nodes';
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
import { colorBlack } from '@/palette';
import type { ConditionalRenderLogic, TextComponentData } from '@/types';
import { rgbToHex } from '@/utils';
import { useEffect, useRef, useState } from 'react';
import type { RGBColor } from 'react-color';
import { useParams } from 'react-router-dom';
import { ActionEdit } from './action-edit';
import { ClickEventModal } from './click-event-modal';
import { ComponentTooltipSettings } from './component-tooltip-settings';
import {
  ComponentEditPanelContext,
  type ComponentEditPanelContextValue,
} from './component-edit-panel-context';
import { ConditionalRenderEdit, TextEdit } from './component-edits';
import { ShapeEdit } from './component-edits/shape-edit';
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

export const ComponentEditPanel = ({ viewMode }: { viewMode: boolean }) => {
  const { windowId } = useParams();
  const { components, updateComponents } = useComponents(windowId);
  const { activeRuleset } = useRulesets();
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

  useEffect(() => {
    if (selectedComponents.length === 1) {
      setReferenceLabelInput(getComponentData(selectedComponents[0]).referenceLabel ?? '');
    } else {
      setReferenceLabelInput('');
    }
  }, [selectedComponents.length, selectedComponents[0]?.id]);

  const handleUpdate = (key: string | string[], value: number | string | boolean | null) => {
    const toUpdate = selectedComponents.filter((c) => (key === 'locked' ? true : !c.locked));

    if (typeof key === 'string') {
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

  const handleGroupDataUpdate = (key: string, value: string) => {
    const toUpdate = selectedComponents.filter((c) => !c.locked);
    updateComponents(
      toUpdate.map((c) => ({
        id: c.id,
        data: JSON.stringify({
          ...JSON.parse(c.data),
          [key]: value,
        }),
      })),
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
        toUpdate.map((c) => ({
          id: c.id,
          style: JSON.stringify({
            ...JSON.parse(c.style),
            [key]: value,
          }),
        })),
      );
    } else {
      const updated = [...toUpdate];
      for (const component of updated) {
        for (const k of key) {
          Object.assign(component, {
            style: JSON.stringify({
              ...JSON.parse(component.style),
              [k]: value,
            }),
          });
        }
      }
      updateComponents(updated);
    }
  };

  const setConditionalRenderAttributeId = (id: string | null) => {
    const toUpdate = selectedComponents.filter((c) => !c.locked);
    updateComponents(
      toUpdate.map((c) => ({
        id: c.id,
        data: JSON.stringify({
          ...JSON.parse(c.data),
          conditionalRenderAttributeId: id,
        }),
      })),
    );
  };

  const setConditionalRenderLogic = (logic: ConditionalRenderLogic | null) => {
    const toUpdate = selectedComponents.filter((c) => !c.locked);
    updateComponents(
      toUpdate.map((c) => ({
        id: c.id,
        data: JSON.stringify({
          ...JSON.parse(c.data),
          conditionalRenderLogic: logic ?? undefined,
        }),
      })),
    );
  };

  const setHref = (href: string) => {
    const toUpdate = selectedComponents.filter((c) => !c.locked);
    updateComponents(
      toUpdate.map((c) => ({
        id: c.id,
        data: JSON.stringify({
          ...JSON.parse(c.data),
          href: href || undefined,
        }),
      })),
    );
  };

  const setReferenceLabel = (referenceLabel: string) => {
    const toUpdate = selectedComponents.filter((c) => !c.locked);
    updateComponents(
      toUpdate.map((c) => ({
        id: c.id,
        data: JSON.stringify({
          ...JSON.parse(c.data),
          referenceLabel: referenceLabel.trim() || undefined,
        }),
      })),
    );
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
    const toUpdate = selectedComponents.filter((c) => !c.locked);
    updateComponents(
      toUpdate.map((c) => ({
        id: c.id,
        data: JSON.stringify({
          ...JSON.parse(c.data),
          animation: animation && animation !== 'none' ? animation : null,
        }),
      })),
    );
  };

  const setAnimationColor = (animationColor: string | null) => {
    const toUpdate = selectedComponents.filter((c) => !c.locked);
    updateComponents(
      toUpdate.map((c) => ({
        id: c.id,
        data: JSON.stringify({
          ...JSON.parse(c.data),
          animationColor: animationColor ?? null,
        }),
      })),
    );
  };

  const setShowSign = (showSign: boolean) => {
    const toUpdate = selectedComponents.filter((c) => !c.locked);
    updateComponents(
      toUpdate.map((c) => ({
        id: c.id,
        data: JSON.stringify({
          ...JSON.parse(c.data),
          showSign,
        }),
      })),
    );
  };

  const setTooltipValue = (tooltipValue: string) => {
    const toUpdate = selectedComponents.filter((c) => !c.locked);
    updateComponents(
      toUpdate.map((c) => ({
        id: c.id,
        data: JSON.stringify({
          ...JSON.parse(c.data),
          tooltipValue: tooltipValue || undefined,
        }),
      })),
    );
  };

  const setTooltipAttributeId = (id: string | null) => {
    const toUpdate = selectedComponents.filter((c) => !c.locked);
    updateComponents(
      toUpdate.map((c) => ({
        id: c.id,
        data: JSON.stringify({
          ...JSON.parse(c.data),
          tooltipAttributeId: id,
        }),
      })),
    );
  };

  const setTooltipPlacement = (placement: 'top' | 'right' | 'bottom' | 'left') => {
    const toUpdate = selectedComponents.filter((c) => !c.locked);
    updateComponents(
      toUpdate.map((c) => ({
        id: c.id,
        data: JSON.stringify({
          ...JSON.parse(c.data),
          tooltipPlacement: placement,
        }),
      })),
    );
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
        c.type === ComponentTypes.IMAGE,
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
        className='z-20 flex h-[100vh] w-[240px] flex-col items-center gap-2 p-2'
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
              <TabsTrigger value='data' className='flex-1' data-testid='component-edit-tab-data'>
                Content
              </TabsTrigger>
            </TabsList>
            <TabsContent value='style' className='w-full flex flex-col gap-2 mt-2'>
              <ActionEdit components={selectedComponents} handleUpdate={handleUpdate} />
              <PositionEdit components={selectedComponents} handleUpdate={handleUpdate} />
              <StyleEdit
                components={selectedComponents}
                handleUpdate={handleStyleUpdate}
                handleDataUpdate={handleGroupDataUpdate}
              />
              {allAreText && (
                <TextEdit components={selectedComponents} handleUpdate={handleStyleUpdate} />
              )}
              {allAreShapes && <ShapeEdit components={selectedComponents} />}
            </TabsContent>
            <TabsContent value='data' className='w-full flex flex-col gap-4 mt-2 overflow-x-hidden'>
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
                      onSelect={(attr) => handleUpdate('attributeId', attr.id)}
                      onDelete={() => handleUpdate('attributeId', null)}
                      filterType={allAreCheckboxes ? 'boolean' : undefined}
                    />
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
                        getComponentData(selectedComponents[0]).animation ||
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
                      getComponentData(selectedComponents[0]).animationColor ??
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
                        (getComponentData(selectedComponents[0]) as TextComponentData).showSign ??
                        false
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
                  attributeId={getComponentData(selectedComponents[0]).conditionalRenderAttributeId}
                  conditionalRenderLogic={
                    getComponentData(selectedComponents[0]).conditionalRenderLogic
                  }
                  onSelect={(attr) => setConditionalRenderAttributeId(attr?.id ?? null)}
                  onDelete={() => setConditionalRenderAttributeId(null)}
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
                      disabled={!!getComponentData(selectedComponents[0]).pageId}
                      placeholder='https://...'
                      value={getComponentData(selectedComponents[0]).href ?? ''}
                      onChange={(e) => setHref(e.target.value)}
                    />
                  </div>
                )}

              {selectedComponents.length === 1 && (
                <ClickEventModal
                  component={selectedComponents[0]}
                  allCanOpenChildWindow={allCanOpenChildWindow}
                />
              )}

              {selectedComponents.length === 1 && (
                <ComponentTooltipSettings
                  component={selectedComponents[0]}
                  onTooltipValueChange={setTooltipValue}
                  onTooltipAttributeIdChange={setTooltipAttributeId}
                  onTooltipPlacementChange={setTooltipPlacement}
                />
              )}

              {allAreImages && (
                <ImageDataEdit
                  components={selectedComponents}
                  handleUpdate={handleUpdate}
                  updateComponents={updateComponents}
                />
              )}

              {allAreContent && (
                <ContentDataEdit
                  components={selectedComponents}
                  handleUpdate={handleUpdate}
                  updateComponents={updateComponents}
                />
              )}

              {allAreInputs && (
                <InputDataEdit
                  components={selectedComponents}
                  handleUpdate={handleUpdate}
                  updateComponents={updateComponents}
                />
              )}

              {allAreCheckboxes && (
                <CheckboxDataEdit
                  components={selectedComponents}
                  handleUpdate={handleUpdate}
                  updateComponents={updateComponents}
                />
              )}

              {allAreInventories && (
                <InventoryDataEdit
                  components={selectedComponents}
                  updateComponents={updateComponents}
                />
              )}

              {allAreGraphs && (
                <GraphDataEdit
                  components={selectedComponents}
                  updateComponents={updateComponents}
                />
              )}

              {allAreFrames && (
                <FrameDataEdit
                  components={selectedComponents}
                  updateComponents={updateComponents}
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
