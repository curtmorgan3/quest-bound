import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  Input,
  Label,
} from '@/components';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  ActionLookup,
  AttributeLookup,
  PageLookup,
  ScriptLookup,
  WindowLookup,
  useComponents,
  type ComponentUpdate,
} from '@/lib/compass-api';
import { useActions } from '@/lib/compass-api/hooks/rulesets/use-actions';
import { useRulesetPages } from '@/lib/compass-api/hooks/rulesets/use-ruleset-pages';
import { useWindows } from '@/lib/compass-api/hooks/rulesets/use-windows';
import { useScripts } from '@/lib/compass-api/hooks/scripts/use-scripts';
import { ComponentTypes } from '@/lib/compass-planes/nodes';
import { getComponentData } from '@/lib/compass-planes/utils';
import type {
  ChildWindowAnchor,
  ChildWindowPlacementMode,
  Component,
  ComponentData,
  Script,
  ScriptParamValue,
} from '@/types';
import { useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';

function stripClickEventFieldsFromData(baseData: ComponentData) {
  delete baseData.pageId;
  delete baseData.viewAttributeId;
  delete baseData.viewAttributeReadOnly;
  delete baseData.childWindowX;
  delete baseData.childWindowY;
  delete baseData.childWindowCollapse;
  delete baseData.childWindowPlacementMode;
  delete baseData.childWindowAnchor;
  delete baseData.scriptParameterValues;
  delete baseData.closeCharacterWindowOnClick;
}

type ClickEventType =
  | 'none'
  | 'openPage'
  | 'openWindow'
  | 'closeThisWindow'
  | 'fireAction'
  | 'fireScript'
  | 'viewAttribute';

const CHILD_WINDOW_PLACEMENT_OPTIONS: { value: ChildWindowPlacementMode; label: string }[] = [
  { value: 'fixed', label: 'Fixed' },
  { value: 'relative', label: 'Relative' },
];

const CHILD_WINDOW_ANCHOR_OPTIONS: { value: Exclude<ChildWindowAnchor, 'positioned'>; label: string }[] =
  [
    { value: 'center', label: 'Center' },
    { value: 'topLeft', label: 'Top Left' },
    { value: 'topCenter', label: 'Top Center' },
    { value: 'topRight', label: 'Top Right' },
    { value: 'leftCenter', label: 'Left Center' },
    { value: 'rightCenter', label: 'Right Center' },
    { value: 'bottomLeft', label: 'Bottom Left' },
    { value: 'bottomCenter', label: 'Bottom Center' },
    { value: 'bottomRight', label: 'Bottom Right' },
  ];

interface Props {
  component: Component;
  allCanOpenChildWindow: boolean;
  persistComponentUpdates?: (updates: Array<ComponentUpdate>) => void | Promise<void>;
}

export const ClickEventModal = ({
  component,
  allCanOpenChildWindow,
  persistComponentUpdates,
}: Props) => {
  const { windowId } = useParams();
  const { updateComponents: defaultPersist } = useComponents(windowId);
  const persist = persistComponentUpdates ?? defaultPersist;
  const { scripts, deleteScript } = useScripts();
  const { pages } = useRulesetPages();
  const { windows } = useWindows();
  const { actions } = useActions();
  const [open, setOpen] = useState(false);
  const [clickEventType, setClickEventType] = useState<ClickEventType>('none');
  const [openWindowX, setOpenWindowX] = useState(0);
  const [openWindowY, setOpenWindowY] = useState(0);
  const [childWindowCollapse, setChildWindowCollapse] = useState(false);
  const [childWindowPlacementMode, setChildWindowPlacementMode] =
    useState<ChildWindowPlacementMode>('fixed');
  const [childWindowAnchor, setChildWindowAnchor] = useState<ChildWindowAnchor>('positioned');

  const selectedScript: Script | undefined = useMemo(
    () => scripts.find((s) => s.id === component.scriptId),
    [scripts, component.scriptId],
  );

  const scriptParameterValues: Record<string, ScriptParamValue> =
    getComponentData(component).scriptParameterValues ?? {};

  const hasScriptParameters = (selectedScript?.parameters?.length ?? 0) > 0;

  const getCurrentClickEventType = (): ClickEventType | null => {
    const data = getComponentData(component);
    if (component.scriptId && selectedScript && !selectedScript.hidden) {
      return 'fireScript';
    }
    if (data.pageId) return 'openPage';
    if (component.childWindowId) return 'openWindow';
    if (component.actionId) return 'fireAction';
    if (data.closeCharacterWindowOnClick) return 'closeThisWindow';
    if (data.viewAttributeId) return 'viewAttribute';
    if (component.scriptId && selectedScript) return 'fireScript';
    return null;
  };

  const getCurrentClickEventLabel = (): string | null => {
    const type = getCurrentClickEventType();
    if (!type) return null;
    const data = getComponentData(component);

    if (type === 'openPage') {
      const pageId = data.pageId;
      const page = pageId ? pages.find((p) => p.id === pageId) : undefined;
      return page ? `Open Page: ${page.label}` : 'Open Page';
    }
    if (type === 'openWindow') {
      const winId = component.childWindowId ?? undefined;
      const win = winId ? windows.find((w) => w.id === winId) : undefined;
      return win ? `Open Window: ${win.title}` : 'Open Window';
    }
    if (type === 'fireAction') {
      const actionId = component.actionId ?? undefined;
      const action = actionId ? actions.find((a) => a.id === actionId) : undefined;
      return action ? `Fire Action: ${action.title}` : 'Fire Action';
    }
    if (type === 'closeThisWindow') {
      return 'Close This Window';
    }
    if (type === 'fireScript') {
      return selectedScript ? `Fire Script: ${selectedScript.name || 'Untitled'}` : 'Fire Script';
    }
    if (type === 'viewAttribute') {
      return 'View Attribute';
    }
    return null;
  };

  const removeLegacyHiddenClickScriptIfPresent = async () => {
    if (selectedScript?.hidden) {
      await deleteScript(selectedScript.id);
      return true;
    }
    return false;
  };

  const handleSetOpenPageClick = (pageId: string) => {
    const baseData = JSON.parse(component.data);
    baseData.pageId = pageId;
    void persist([{ id: component.id, data: JSON.stringify(baseData) }]);
  };

  const handleClearOpenPageClick = async () => {
    const baseData = JSON.parse(component.data);
    delete baseData.pageId;
    const update: ComponentUpdate = { id: component.id, data: JSON.stringify(baseData) };
    if (await removeLegacyHiddenClickScriptIfPresent()) {
      update.scriptId = null;
    }
    await persist([update]);
  };

  const handleSetOpenWindowClick = (
    childWindowId: string,
    params: {
      x: number;
      y: number;
      collapse?: boolean;
      placementMode: ChildWindowPlacementMode;
      anchor: ChildWindowAnchor;
    },
  ) => {
    const baseData: ComponentData = JSON.parse(component.data);
    baseData.childWindowX = params.x;
    baseData.childWindowY = params.y;
    baseData.childWindowCollapse = params.collapse ?? false;
    baseData.childWindowPlacementMode = params.placementMode;
    baseData.childWindowAnchor = params.anchor;
    void persist([
      { id: component.id, childWindowId, data: JSON.stringify(baseData) },
    ]);
  };

  const handleClearOpenWindowClick = async () => {
    const baseData = JSON.parse(component.data);
    delete baseData.childWindowX;
    delete baseData.childWindowY;
    delete baseData.childWindowCollapse;
    delete baseData.childWindowPlacementMode;
    delete baseData.childWindowAnchor;
    const update: ComponentUpdate = {
      id: component.id,
      childWindowId: null,
      data: JSON.stringify(baseData),
    };
    if (await removeLegacyHiddenClickScriptIfPresent()) {
      update.scriptId = null;
    }
    await persist([update]);
  };

  const handleSetFireActionClick = (actionId: string) => {
    void persist([{ id: component.id, actionId }]);
  };

  const handleClearFireActionClick = async () => {
    const update: ComponentUpdate = {
      id: component.id,
      actionId: null,
    };
    if (await removeLegacyHiddenClickScriptIfPresent()) {
      update.scriptId = null;
    }
    await persist([update]);
  };

  const handleSetViewAttributeClick = (attributeId: string) => {
    const baseData = JSON.parse(component.data);
    baseData.viewAttributeId = attributeId;
    persist([{ id: component.id, data: JSON.stringify(baseData) }]);
  };

  const handleClearViewAttributeClick = () => {
    const baseData = JSON.parse(component.data);
    delete baseData.viewAttributeId;
    delete baseData.viewAttributeReadOnly;
    persist([{ id: component.id, data: JSON.stringify(baseData) }]);
  };

  const handleSetViewAttributeReadOnly = (readOnly: boolean) => {
    const baseData = JSON.parse(component.data);
    baseData.viewAttributeReadOnly = readOnly;
    persist([{ id: component.id, data: JSON.stringify(baseData) }]);
  };

  const handleSelectScript = (script: Script) => {
    const baseData = JSON.parse(component.data);
    delete baseData.scriptParameterValues;
    persist([{ id: component.id, scriptId: script.id, data: JSON.stringify(baseData) }]);
  };

  const handleClearScript = () => {
    const baseData = JSON.parse(component.data);
    delete baseData.scriptParameterValues;
    persist([{ id: component.id, scriptId: null, data: JSON.stringify(baseData) }]);
  };

  const persistClickEventAfterStrip = async (
    baseData: ComponentData,
    opts?: { setCloseThisWindow?: boolean },
  ) => {
    if (opts?.setCloseThisWindow) {
      baseData.closeCharacterWindowOnClick = true;
    }

    const update: ComponentUpdate = {
      id: component.id,
      data: JSON.stringify(baseData),
      childWindowId: null,
      actionId: null,
      scriptId: null,
    };

    if (selectedScript?.hidden) {
      await deleteScript(selectedScript.id);
    }

    await persist([update]);
  };

  const applyClickEventTypeSwitch = async (next: ClickEventType) => {
    const baseData: ComponentData = JSON.parse(component.data);
    stripClickEventFieldsFromData(baseData);
    await persistClickEventAfterStrip(baseData, {
      setCloseThisWindow: next === 'closeThisWindow',
    });
  };

  const handleUpdateScriptParameterValue = (paramId: string, value: ScriptParamValue) => {
    const baseData = JSON.parse(component.data);
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

    persist([{ id: component.id, data: JSON.stringify(baseData) }]);
  };

  const currentLabel = getCurrentClickEventLabel();

  return (
    <div className='flex flex-col gap-2'>
      <Label className='text-xs text-muted-foreground'>Click Event</Label>
      <Button
        type='button'
        size='sm'
        variant='outline'
        className='h-7 px-2 justify-start text-xs'
        data-testid='component-set-click-event'
        onClick={() => {
          const current = getCurrentClickEventType();
          setClickEventType(current ?? 'none');
          const data = getComponentData(component);
          setOpenWindowX(data.childWindowX ?? 0);
          setOpenWindowY(data.childWindowY ?? 0);
          setChildWindowCollapse(data.childWindowCollapse ?? false);
          const nextMode = data.childWindowPlacementMode ?? 'fixed';
          const rawAnchor = data.childWindowAnchor ?? 'positioned';
          setChildWindowPlacementMode(nextMode);
          setChildWindowAnchor(nextMode === 'relative' && rawAnchor === 'positioned' ? 'center' : rawAnchor);
          setOpen(true);
        }}>
        Set Click Event
      </Button>
      <p className='text-[0.7rem] text-muted-foreground'>
        Current: {currentLabel ?? 'None'}
      </p>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className='min-w-[320px] max-w-[90vw] flex flex-col gap-4'>
          <DialogTitle>Set Click Event</DialogTitle>
          <DialogDescription>
            Choose what should happen when this component is clicked.
          </DialogDescription>

          <div className='flex flex-col gap-2'>
            <Label className='text-xs text-muted-foreground'>Click Event Type</Label>
            <Select
              value={clickEventType}
              onValueChange={(value: ClickEventType) => {
                if (value === clickEventType) return;
                void (async () => {
                  await applyClickEventTypeSwitch(value);
                  setClickEventType(value);
                })();
              }}>
              <SelectTrigger className='h-8' data-testid='click-event-type-trigger'>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='none'>None</SelectItem>
                <SelectItem value='openPage'>Open Page</SelectItem>
                <SelectItem value='openWindow'>Open Window</SelectItem>
                <SelectItem value='closeThisWindow'>Close This Window</SelectItem>
                <SelectItem value='fireAction' data-testid='click-event-option-fire-action'>
                  Fire Action
                </SelectItem>
                <SelectItem value='fireScript'>Fire Script</SelectItem>
                <SelectItem value='viewAttribute'>View Attribute</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className='flex flex-col gap-3'>
            {clickEventType === 'none' && (
              <p className='text-[0.75rem] text-muted-foreground leading-snug'>
                This component will not run any click action.
              </p>
            )}
            {clickEventType === 'openPage' && component.type !== ComponentTypes.INVENTORY && (
              <PageLookup
                label='Open Page'
                value={getComponentData(component).pageId ?? null}
                onSelect={(page) => {
                  handleSetOpenPageClick(page.id);
                }}
                onDelete={() => {
                  void handleClearOpenPageClick();
                }}
              />
            )}

            {clickEventType === 'fireAction' &&
              component.type !== ComponentTypes.INVENTORY &&
              component.type !== ComponentTypes.GRAPH &&
              component.type !== ComponentTypes.FRAME && (
                <ActionLookup
                  id='component-data-action-lookup'
                  data-testid='component-data-action-lookup'
                  value={component.actionId}
                  onSelect={(attr) => {
                    handleSetFireActionClick(attr.id);
                  }}
                  onDelete={() => {
                    void handleClearFireActionClick();
                  }}
                />
              )}

            {clickEventType === 'closeThisWindow' && (
              <p className='text-[0.75rem] text-muted-foreground leading-snug'>
                On a character sheet, clicking this component closes the window it belongs to (not
                available in ruleset layout previews).
              </p>
            )}

            {clickEventType === 'openWindow' && windowId && allCanOpenChildWindow && (
              <div className='flex flex-col gap-3'>
                <WindowLookup
                  label='Open Window'
                  value={component.childWindowId}
                  onSelect={(win) => {
                    handleSetOpenWindowClick(win.id, {
                      x: openWindowX,
                      y: openWindowY,
                      collapse: childWindowCollapse,
                      placementMode: childWindowPlacementMode,
                      anchor: childWindowAnchor,
                    });
                  }}
                  onDelete={() => {
                    void handleClearOpenWindowClick();
                  }}
                  excludeIds={[windowId]}
                />
                <div className='flex flex-row gap-3'>
                  <div className='flex min-w-0 flex-1 flex-col gap-2'>
                    <Label className='text-xs text-muted-foreground'>Placement</Label>
                    <Select
                      value={childWindowPlacementMode}
                      onValueChange={(v: ChildWindowPlacementMode) => {
                        setChildWindowPlacementMode(v);
                        let nextAnchor = childWindowAnchor;
                        if (v === 'relative' && childWindowAnchor === 'positioned') {
                          nextAnchor = 'center';
                          setChildWindowAnchor('center');
                        }
                        if (component.childWindowId) {
                          handleSetOpenWindowClick(component.childWindowId, {
                            x: openWindowX,
                            y: openWindowY,
                            collapse: childWindowCollapse,
                            placementMode: v,
                            anchor: nextAnchor,
                          });
                        }
                      }}>
                      <SelectTrigger className='h-8' data-testid='child-window-placement-mode'>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CHILD_WINDOW_PLACEMENT_OPTIONS.map((o) => (
                          <SelectItem key={o.value} value={o.value}>
                            {o.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className='flex min-w-0 flex-1 flex-col gap-2'>
                    <Label className='text-xs text-muted-foreground'>Align</Label>
                    <Select
                      value={
                        childWindowPlacementMode === 'relative' &&
                        childWindowAnchor === 'positioned'
                          ? 'center'
                          : childWindowAnchor
                      }
                      onValueChange={(v: ChildWindowAnchor) => {
                        setChildWindowAnchor(v);
                        if (component.childWindowId) {
                          handleSetOpenWindowClick(component.childWindowId, {
                            x: openWindowX,
                            y: openWindowY,
                            collapse: childWindowCollapse,
                            placementMode: childWindowPlacementMode,
                            anchor: v,
                          });
                        }
                      }}>
                      <SelectTrigger className='h-8' data-testid='child-window-anchor'>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CHILD_WINDOW_ANCHOR_OPTIONS.map((o) => (
                          <SelectItem key={o.value} value={o.value}>
                            {o.label}
                          </SelectItem>
                        ))}
                        {childWindowPlacementMode === 'fixed' ? (
                          <SelectItem value='positioned'>Positioned</SelectItem>
                        ) : null}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                {childWindowAnchor === 'positioned' && childWindowPlacementMode === 'fixed' ? (
                  <div className='flex items-center gap-3'>
                    <div className='flex items-center gap-1.5'>
                      <Label className='text-xs text-muted-foreground'>X</Label>
                      <Input
                        className='h-7 w-20 rounded-[4px]'
                        type='number'
                        value={openWindowX}
                        onChange={(e) => {
                          const val = e.target.value === '' ? 0 : Number(e.target.value);
                          setOpenWindowX(val);
                          if (component.childWindowId) {
                            handleSetOpenWindowClick(component.childWindowId, {
                              x: val,
                              y: openWindowY,
                              collapse: childWindowCollapse,
                              placementMode: childWindowPlacementMode,
                              anchor: childWindowAnchor,
                            });
                          }
                        }}
                      />
                    </div>
                    <div className='flex items-center gap-1.5'>
                      <Label className='text-xs text-muted-foreground'>Y</Label>
                      <Input
                        className='h-7 w-20 rounded-[4px]'
                        type='number'
                        value={openWindowY}
                        onChange={(e) => {
                          const val = e.target.value === '' ? 0 : Number(e.target.value);
                          setOpenWindowY(val);
                          if (component.childWindowId) {
                            handleSetOpenWindowClick(component.childWindowId, {
                              x: openWindowX,
                              y: val,
                              collapse: childWindowCollapse,
                              placementMode: childWindowPlacementMode,
                              anchor: childWindowAnchor,
                            });
                          }
                        }}
                      />
                    </div>
                  </div>
                ) : null}
                <div className='flex items-center gap-2'>
                  <Checkbox
                    id='child-window-collapse'
                    checked={childWindowCollapse}
                    onCheckedChange={(checked) => {
                      const val = checked === true;
                      setChildWindowCollapse(val);
                      if (component.childWindowId) {
                        handleSetOpenWindowClick(component.childWindowId, {
                          x: openWindowX,
                          y: openWindowY,
                          collapse: val,
                          placementMode: childWindowPlacementMode,
                          anchor: childWindowAnchor,
                        });
                      }
                    }}
                  />
                  <Label htmlFor='child-window-collapse' className='text-sm leading-none'>
                    Minimize if open
                  </Label>
                </div>
              </div>
            )}

            {clickEventType === 'fireScript' && (
              <div className='flex flex-col gap-3'>
                <div className='space-y-2'>
                  <ScriptLookup
                    label='Script'
                    value={component.scriptId ?? null}
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
            {clickEventType === 'viewAttribute' && (
              <div className='flex flex-col gap-3'>
                <AttributeLookup
                  label='Attribute'
                  value={getComponentData(component).viewAttributeId ?? null}
                  onSelect={(attr) => handleSetViewAttributeClick(attr.id)}
                  onDelete={handleClearViewAttributeClick}
                />
                <div className='flex items-center gap-2'>
                  <Checkbox
                    id='view-attribute-read-only'
                    checked={getComponentData(component).viewAttributeReadOnly ?? false}
                    onCheckedChange={(checked) => handleSetViewAttributeReadOnly(checked === true)}
                  />
                  <Label htmlFor='view-attribute-read-only' className='text-sm leading-none'>
                    Read Only
                  </Label>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
