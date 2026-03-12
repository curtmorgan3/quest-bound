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
} from '@/lib/compass-api';
import { useActions } from '@/lib/compass-api/hooks/rulesets/use-actions';
import { useRulesetPages } from '@/lib/compass-api/hooks/rulesets/use-ruleset-pages';
import { useWindows } from '@/lib/compass-api/hooks/rulesets/use-windows';
import { useScripts } from '@/lib/compass-api/hooks/scripts/use-scripts';
import { ComponentTypes } from '@/lib/compass-planes/nodes';
import { getComponentData } from '@/lib/compass-planes/utils';
import type { Component, Script, ScriptParamValue } from '@/types';
import { useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';

type ClickEventType = 'openPage' | 'openWindow' | 'fireAction' | 'fireScript' | 'viewAttribute';

interface Props {
  component: Component;
  allCanOpenChildWindow: boolean;
}

export const ClickEventModal = ({ component, allCanOpenChildWindow }: Props) => {
  const { windowId } = useParams();
  const { updateComponents } = useComponents(windowId);
  const { scripts, createScript, updateScript, deleteScript } = useScripts();
  const { pages } = useRulesetPages();
  const { windows } = useWindows();
  const { actions } = useActions();
  const [open, setOpen] = useState(false);
  const [clickEventType, setClickEventType] = useState<ClickEventType>('openPage');

  const selectedScript: Script | undefined = useMemo(
    () => scripts.find((s) => s.id === component.scriptId),
    [scripts, component.scriptId],
  );

  const scriptParameterValues: Record<string, ScriptParamValue> =
    getComponentData(component).scriptParameterValues ?? {};

  const hasScriptParameters = (selectedScript?.parameters?.length ?? 0) > 0;

  const buildClickScriptSource = (
    kind: Extract<ClickEventType, 'openPage' | 'openWindow' | 'fireAction'>,
    targetId: string,
  ): string => {
    const header =
      '// Auto-generated click handler script. Uses stable entity IDs so it keeps working when labels change.\n\n';
    if (kind === 'openPage') return `${header}Owner.navigateToPage('${targetId}')\n`;
    if (kind === 'openWindow') return `${header}Owner.openWindow('${targetId}')\n`;
    return `${header}Owner.Action('${targetId}').activate()\n`;
  };

  const ensureClickScript = async (
    kind: Extract<ClickEventType, 'openPage' | 'openWindow' | 'fireAction'>,
    targetId: string,
  ): Promise<string | undefined> => {
    const existingId = component.scriptId ?? undefined;
    const sourceCode = buildClickScriptSource(kind, targetId);

    if (existingId) {
      const existing = scripts.find((s) => s.id === existingId);
      if (existing && existing.hidden) {
        await updateScript(existingId, {
          sourceCode,
          entityType: 'gameManager',
          entityId: null,
          hidden: true,
          enabled: true,
          category: existing.category ?? 'Component Click',
          name: existing.name || `component_click_${component.id}`,
        });
        return existingId;
      }
    }

    return createScript({
      name: `component_click_${component.id}`,
      sourceCode,
      entityType: 'gameManager',
      entityId: null,
      enabled: true,
      hidden: true,
      category: 'Component Click',
    });
  };

  const getCurrentClickEventType = (): ClickEventType | null => {
    const data = getComponentData(component);
    if (component.scriptId && selectedScript) {
      if (!selectedScript.hidden) return 'fireScript';
      if (data.pageId) return 'openPage';
      if (component.childWindowId) return 'openWindow';
      if (component.actionId) return 'fireAction';
      return 'fireScript';
    }
    if (data.pageId) return 'openPage';
    if (component.childWindowId) return 'openWindow';
    if (component.actionId) return 'fireAction';
    if (data.viewAttributeId) return 'viewAttribute';
    return null;
  };

  const getCurrentClickEventLabel = (): string | null => {
    const type = getCurrentClickEventType();
    if (!type) return null;
    const data = getComponentData(component);

    if (type === 'openPage') {
      const pageId = (data as any).pageId as string | undefined;
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
    if (type === 'fireScript') {
      return selectedScript ? `Fire Script: ${selectedScript.name || 'Untitled'}` : 'Fire Script';
    }
    if (type === 'viewAttribute') {
      return 'View Attribute';
    }
    return null;
  };

  const handleSetOpenPageClick = async (pageId: string) => {
    const baseData = JSON.parse(component.data);
    baseData.pageId = pageId;
    const scriptId = await ensureClickScript('openPage', pageId);
    const update: any = { id: component.id, data: JSON.stringify(baseData) };
    if (scriptId) update.scriptId = scriptId;
    await updateComponents([update]);
  };

  const handleClearOpenPageClick = async () => {
    const baseData = JSON.parse(component.data);
    delete baseData.pageId;
    const update: any = { id: component.id, data: JSON.stringify(baseData) };
    if (selectedScript?.hidden) {
      update.scriptId = null;
      await deleteScript(selectedScript.id);
    }
    await updateComponents([update]);
  };

  const handleSetOpenWindowClick = async (childWindowId: string) => {
    const baseData = JSON.parse(component.data);
    const scriptId = await ensureClickScript('openWindow', childWindowId);
    const update: any = { id: component.id, childWindowId, data: JSON.stringify(baseData) };
    if (scriptId) update.scriptId = scriptId;
    await updateComponents([update]);
  };

  const handleClearOpenWindowClick = async () => {
    const baseData = JSON.parse(component.data);
    const update: any = {
      id: component.id,
      childWindowId: null as string | null,
      data: JSON.stringify(baseData),
    };
    if (selectedScript?.hidden) {
      update.scriptId = null;
      await deleteScript(selectedScript.id);
    }
    await updateComponents([update]);
  };

  const handleSetFireActionClick = async (actionId: string) => {
    const baseData = JSON.parse(component.data);
    const scriptId = await ensureClickScript('fireAction', actionId);
    const update: any = { id: component.id, actionId, data: JSON.stringify(baseData) };
    if (scriptId) update.scriptId = scriptId;
    await updateComponents([update]);
  };

  const handleClearFireActionClick = async () => {
    const baseData = JSON.parse(component.data);
    const update: any = {
      id: component.id,
      actionId: null as string | null,
      data: JSON.stringify(baseData),
    };
    if (selectedScript?.hidden) {
      update.scriptId = null;
      await deleteScript(selectedScript.id);
    }
    await updateComponents([update]);
  };

  const handleSetViewAttributeClick = (attributeId: string) => {
    const baseData = JSON.parse(component.data);
    baseData.viewAttributeId = attributeId;
    updateComponents([{ id: component.id, data: JSON.stringify(baseData) }]);
  };

  const handleClearViewAttributeClick = () => {
    const baseData = JSON.parse(component.data);
    delete baseData.viewAttributeId;
    delete baseData.viewAttributeReadOnly;
    updateComponents([{ id: component.id, data: JSON.stringify(baseData) }]);
  };

  const handleSetViewAttributeReadOnly = (readOnly: boolean) => {
    const baseData = JSON.parse(component.data);
    baseData.viewAttributeReadOnly = readOnly;
    updateComponents([{ id: component.id, data: JSON.stringify(baseData) }]);
  };

  const handleSelectScript = (script: Script) => {
    const baseData = JSON.parse(component.data);
    delete baseData.scriptParameterValues;
    updateComponents([{ id: component.id, scriptId: script.id, data: JSON.stringify(baseData) }]);
  };

  const handleClearScript = () => {
    const baseData = JSON.parse(component.data);
    delete baseData.scriptParameterValues;
    updateComponents([{ id: component.id, scriptId: null, data: JSON.stringify(baseData) }]);
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

    updateComponents([{ id: component.id, data: JSON.stringify(baseData) }]);
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
          setClickEventType(current ?? 'openPage');
          setOpen(true);
        }}>
        Set Click Event
      </Button>
      {currentLabel && (
        <p className='text-[0.7rem] text-muted-foreground'>Current: {currentLabel}</p>
      )}

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
              onValueChange={(value: ClickEventType) => setClickEventType(value)}>
              <SelectTrigger className='h-8' data-testid='click-event-type-trigger'>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='openPage'>Open Page</SelectItem>
                <SelectItem value='openWindow'>Open Window</SelectItem>
                <SelectItem value='fireAction' data-testid='click-event-option-fire-action'>
                  Fire Action
                </SelectItem>
                <SelectItem value='fireScript'>Fire Script</SelectItem>
                <SelectItem value='viewAttribute'>View Attribute</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className='flex flex-col gap-3'>
            {clickEventType === 'openPage' && component.type !== ComponentTypes.INVENTORY && (
              <PageLookup
                label='Open Page'
                value={getComponentData(component).pageId ?? null}
                onSelect={(page) => {
                  void handleSetOpenPageClick(page.id);
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
                    void handleSetFireActionClick(attr.id);
                  }}
                  onDelete={() => {
                    void handleClearFireActionClick();
                  }}
                />
              )}

            {clickEventType === 'openWindow' && windowId && allCanOpenChildWindow && (
              <WindowLookup
                label='Open Window'
                value={component.childWindowId}
                onSelect={(win) => {
                  void handleSetOpenWindowClick(win.id);
                }}
                onDelete={() => {
                  void handleClearOpenWindowClick();
                }}
                excludeIds={[windowId]}
              />
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
