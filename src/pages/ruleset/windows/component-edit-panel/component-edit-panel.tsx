import { Button, Dialog, DialogContent, DialogDescription, DialogTitle, Input, Label } from '@/components';
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
  ActionLookup,
  AttributeLookup,
  PageLookup,
  ScriptLookup,
  useComponents,
  WindowLookup,
} from '@/lib/compass-api';
import { useScripts } from '@/lib/compass-api/hooks/scripts/use-scripts';
import { ComponentTypes } from '@/lib/compass-planes/nodes';
import {
  CheckboxDataEdit,
  FrameDataEdit,
  GraphDataEdit,
  InputDataEdit,
  InventoryDataEdit,
} from '@/lib/compass-planes/nodes/components';
import { ImageDataEdit } from '@/lib/compass-planes/nodes/components/image';
import { getComponentData } from '@/lib/compass-planes/utils';
import { colorBlack } from '@/palette';
import type { ConditionalRenderLogic, Script, ScriptParamValue, TextComponentData } from '@/types';
import { useMemo, useRef, useState } from 'react';
import type { RGBColor } from 'react-color';
import { useParams } from 'react-router-dom';
import { ActionEdit } from './action-edit';
import {
  ComponentEditPanelContext,
  type ComponentEditPanelContextValue,
} from './component-edit-panel-context';
import { ConditionalRenderEdit, TextEdit } from './component-edits';
import { ShapeEdit } from './component-edits/shape-edit';
import { CustomPropertiesListModal } from './custom-properties-list-modal';
import { PositionEdit } from './position-edit';
import { StyleEdit } from './style-edit';

type ClickEventType = 'openPage' | 'openWindow' | 'fireAction' | 'fireScript';

export const ComponentEditPanel = ({ viewMode }: { viewMode: boolean }) => {
  const { windowId } = useParams();
  const { components, updateComponents } = useComponents(windowId);
  const { scripts } = useScripts();
  const [customPropertiesModalOpen, setCustomPropertiesModalOpen] = useState(false);
  const [clickEventDialogOpen, setClickEventDialogOpen] = useState(false);
  const [clickEventType, setClickEventType] = useState<ClickEventType>('openPage');
  const customPropertiesModalStyleKeyRef = useRef<string | null>(null);
  let selectedComponents = components.filter((c) => c.selected);
  const hadSelection = selectedComponents.length > 0;

  // multiple components selected and all are locked
  if (selectedComponents.length > 1) {
    selectedComponents = selectedComponents.filter((c) => !c.locked);
  }

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

  const setPageId = (pageId: string | null) => {
    const toUpdate = selectedComponents.filter((c) => !c.locked);
    updateComponents(
      toUpdate.map((c) => ({
        id: c.id,
        data: JSON.stringify({
          ...JSON.parse(c.data),
          pageId: pageId ?? undefined,
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

  const singleSelectedComponent =
    selectedComponents.length === 1 ? selectedComponents[0] : null;

  const selectedScript: Script | undefined = useMemo(
    () =>
      singleSelectedComponent
        ? scripts.find((s) => s.id === singleSelectedComponent.scriptId)
        : undefined,
    [scripts, singleSelectedComponent?.scriptId],
  );

  const scriptParameterValues: Record<string, ScriptParamValue> = singleSelectedComponent
    ? (getComponentData(singleSelectedComponent).scriptParameterValues ?? {})
    : {};

  const hasScriptParameters = (selectedScript?.parameters?.length ?? 0) > 0;

  const handleSelectScript = (script: Script) => {
    if (!singleSelectedComponent) return;
    const baseData = JSON.parse(singleSelectedComponent.data);
    delete baseData.scriptParameterValues;

    updateComponents([
      {
        id: singleSelectedComponent.id,
        scriptId: script.id,
        data: JSON.stringify(baseData),
      },
    ]);
  };

  const handleClearScript = () => {
    if (!singleSelectedComponent) return;
    const baseData = JSON.parse(singleSelectedComponent.data);
    delete baseData.scriptParameterValues;

    updateComponents([
      {
        id: singleSelectedComponent.id,
        scriptId: null,
        data: JSON.stringify(baseData),
      },
    ]);
  };

  const handleUpdateScriptParameterValue = (paramId: string, value: ScriptParamValue) => {
    if (!singleSelectedComponent) return;
    const baseData = JSON.parse(singleSelectedComponent.data);
    const existing: Record<string, ScriptParamValue> = baseData.scriptParameterValues ?? {};
    const next: Record<string, ScriptParamValue> = { ...existing };

    if (value === '' || value === null || value === undefined) {
      delete next[paramId];
    } else {
      next[paramId] = value;
    }

    if (Object.keys(next).length === 0) {
      delete baseData.scriptParameterValues;
    } else {
      baseData.scriptParameterValues = next;
    }

    updateComponents([
      {
        id: singleSelectedComponent.id,
        data: JSON.stringify(baseData),
      },
    ]);
  };

  const assignStyleToCustomProperty = (styleKey: string, customPropertyId: string) => {
    const nonstyleKeys = ['width', 'height', 'rotation', 'z'];

    if (nonstyleKeys.includes(styleKey)) {
      handleUpdate(styleKey, `custom-prop-${customPropertyId}`);
      return;
    }

    handleStyleUpdate(styleKey, `custom-prop-${customPropertyId}`);
  };

  const contextValue: ComponentEditPanelContextValue = {
    assignStyleToCustomProperty,
    openCustomPropertiesModal: (styleKey) => {
      customPropertiesModalStyleKeyRef.current = styleKey ?? null;
      setCustomPropertiesModalOpen(true);
    },
  };

  // Check if all selected components are image type
  const allAreImages =
    selectedComponents.length > 0 &&
    selectedComponents.every((c) => c.type === ComponentTypes.IMAGE);

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

  const getCurrentClickEventType = (): ClickEventType | null => {
    if (!singleSelectedComponent) return null;
    const component = singleSelectedComponent;
    const data = getComponentData(component);

    if (component.scriptId) return 'fireScript';
    if (data.pageId) return 'openPage';
    if (component.childWindowId) return 'openWindow';
    if (component.actionId) return 'fireAction';

    return null;
  };

  const getClickEventLabel = (type: ClickEventType | null): string | null => {
    if (!type) return null;
    switch (type) {
      case 'openPage':
        return 'Open Page';
      case 'openWindow':
        return 'Open Window';
      case 'fireAction':
        return 'Fire Action';
      case 'fireScript':
        return 'Fire Script';
      default:
        return null;
    }
  };

  if (viewMode || !hadSelection) {
    return null;
  }

  return (
    <ComponentEditPanelContext.Provider value={contextValue}>
      <div
        className='w-[240px] h-[100vh] flex flex-col gap-2 items-center p-2'
        style={{ position: 'absolute', right: 0, backgroundColor: colorBlack, overflow: 'auto' }}>
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
              <StyleEdit components={selectedComponents} handleUpdate={handleStyleUpdate} />
              {allAreText && (
                <TextEdit components={selectedComponents} handleUpdate={handleStyleUpdate} />
              )}
              {allAreShapes && <ShapeEdit components={selectedComponents} />}
            </TabsContent>
            <TabsContent value='data' className='w-full flex flex-col gap-4 mt-2 overflow-x-hidden'>
              {selectedComponents.length === 1 &&
                selectedComponents[0].type !== ComponentTypes.INVENTORY &&
                selectedComponents[0].type !== ComponentTypes.GRAPH &&
                selectedComponents[0].type !== ComponentTypes.FRAME && (
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
                <div className='flex flex-col gap-2'>
                  <Label className='text-xs text-muted-foreground'>Click Event</Label>
                  <Button
                    type='button'
                    size='sm'
                    variant='outline'
                    className='h-7 px-2 justify-start text-xs'
                    onClick={() => {
                      const current = getCurrentClickEventType();
                      setClickEventType(current ?? 'openPage');
                      setClickEventDialogOpen(true);
                    }}>
                    Set Click Event
                  </Button>
                  {getClickEventLabel(getCurrentClickEventType()) && (
                    <p className='text-[0.7rem] text-muted-foreground'>
                      Current: {getClickEventLabel(getCurrentClickEventType())}
                    </p>
                  )}
                </div>
              )}

              {allAreImages && (
                <ImageDataEdit
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
      {selectedComponents.length === 1 && (
        <Dialog open={clickEventDialogOpen} onOpenChange={setClickEventDialogOpen}>
          <DialogContent className='min-w-[320px] max-w-[90vw] flex flex-col gap-4'>
            <DialogTitle>Set Click Event</DialogTitle>
            <DialogDescription>
              Choose what should happen when this component is clicked.
            </DialogDescription>

            <div className='flex flex-col gap-2'>
              <Label className='text-xs text-muted-foreground'>Click Event Type</Label>
              <Select value={clickEventType} onValueChange={(value: ClickEventType) => setClickEventType(value)}>
                <SelectTrigger className='h-8'>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='openPage'>Open Page</SelectItem>
                  <SelectItem value='openWindow'>Open Window</SelectItem>
                  <SelectItem value='fireAction'>Fire Action</SelectItem>
                  <SelectItem value='fireScript'>Fire Script</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className='flex flex-col gap-3'>
              {clickEventType === 'openPage' &&
                selectedComponents[0].type !== ComponentTypes.INVENTORY && (
                  <PageLookup
                    label='Open Page'
                    value={getComponentData(selectedComponents[0]).pageId ?? null}
                    onSelect={(page) => setPageId(page.id)}
                    onDelete={() => setPageId(null)}
                  />
                )}

              {clickEventType === 'fireAction' &&
                selectedComponents[0].type !== ComponentTypes.INVENTORY &&
                selectedComponents[0].type !== ComponentTypes.GRAPH &&
                selectedComponents[0].type !== ComponentTypes.FRAME && (
                  <ActionLookup
                    id='component-data-action-lookup'
                    value={selectedComponents[0].actionId}
                    onSelect={(attr) => handleUpdate('actionId', attr.id)}
                    onDelete={() => handleUpdate('actionId', null)}
                  />
                )}

              {clickEventType === 'openWindow' && windowId && allCanOpenChildWindow && (
                <WindowLookup
                  label='Open Window'
                  value={selectedComponents[0].childWindowId}
                  onSelect={(win) => handleUpdate('childWindowId', win.id)}
                  onDelete={() => handleUpdate('childWindowId', null)}
                  excludeIds={[windowId]}
                />
              )}

              {clickEventType === 'fireScript' && singleSelectedComponent && (
                <div className='flex flex-col gap-3'>
                  <div className='space-y-2'>
                    <ScriptLookup
                      label='Script'
                      value={singleSelectedComponent.scriptId ?? null}
                      filterEntityType='gameManager'
                      onSelect={handleSelectScript}
                      onDelete={handleClearScript}
                      placeholder='Search Game Manager scripts...'
                    />
                  </div>

                  {selectedScript && hasScriptParameters && (
                    <div className='flex flex-col gap-3'>
                      <Label className='text-xs text-muted-foreground'>Parameters</Label>
                      <p className='text-[0.7rem] text-muted-foreground'>
                        When not set, each parameter falls back to its default value from the script
                        definition.
                      </p>
                      <div className='flex flex-col gap-2 max-h-[260px] overflow-auto pr-1'>
                        {selectedScript.parameters!.map((param) => {
                          const resolvedValue =
                            scriptParameterValues[param.id] ??
                            (param.defaultValue as ScriptParamValue | undefined) ??
                            null;

                          if (param.type === 'boolean') {
                            const checked =
                              resolvedValue === true ||
                              (typeof resolvedValue === 'string' &&
                                resolvedValue.trim().toLowerCase() === 'true');

                            return (
                              <div
                                key={param.id}
                                className='flex items-center gap-2 text-xs text-muted-foreground'>
                                <span className='w-40 truncate'>
                                  {param.label}{' '}
                                  <span className='text-[0.7rem] uppercase'>({param.type})</span>
                                </span>
                                <div className='flex items-center gap-1'>
                                  <Checkbox
                                    checked={checked}
                                    onCheckedChange={(next) =>
                                      handleUpdateScriptParameterValue(
                                        param.id,
                                        next ? 'true' : 'false',
                                      )
                                    }
                                  />
                                  {param.defaultValue != null && (
                                    <span className='text-[0.7rem] italic text-muted-foreground'>
                                      Default: {String(param.defaultValue)}
                                    </span>
                                  )}
                                </div>
                              </div>
                            );
                          }

                          return (
                            <div
                              key={param.id}
                              className='flex items-center gap-2 text-xs text-muted-foreground'>
                              <span className='w-40 truncate'>
                                {param.label}{' '}
                                <span className='text-[0.7rem] uppercase'>({param.type})</span>
                              </span>
                              <Input
                                className='flex-1 h-7 rounded-[4px]'
                                type={param.type === 'number' ? 'number' : 'text'}
                                value={resolvedValue == null ? '' : String(resolvedValue)}
                                onChange={(e) =>
                                  handleUpdateScriptParameterValue(
                                    param.id,
                                    param.type === 'number' && e.target.value !== ''
                                      ? Number(e.target.value)
                                      : (e.target.value as ScriptParamValue),
                                  )
                                }
                              />
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {selectedScript && (
                    <p className='text-[0.7rem] text-muted-foreground'>
                      This component will run its attached script on click, overriding other click
                      behaviors.
                    </p>
                  )}
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
      <CustomPropertiesListModal
        open={customPropertiesModalOpen}
        onOpenChange={setCustomPropertiesModalOpen}
        onSelect={(customPropertyId) => {
          const styleKey = customPropertiesModalStyleKeyRef.current;
          if (styleKey) {
            assignStyleToCustomProperty(styleKey, customPropertyId);
          }
          customPropertiesModalStyleKeyRef.current = null;
          setCustomPropertiesModalOpen(false);
        }}
      />
    </ComponentEditPanelContext.Provider>
  );
};
