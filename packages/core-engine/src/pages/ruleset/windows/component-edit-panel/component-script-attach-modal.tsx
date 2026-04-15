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
import { ScriptLookup } from '@quest-bound/core-ui/api-components';
import type { ComponentUpdate } from '@/lib/compass-api/hooks/rulesets/use-components';
import { useScripts } from '@/lib/compass-api/hooks/scripts/use-scripts';
import { getComponentData } from '@/lib/compass-planes/utils';
import type { Component, Script, ScriptParamValue } from '@/types';
import { useMemo } from 'react';

interface ComponentScriptAttachModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  component: Component;
  updateComponents: (updates: ComponentUpdate[]) => Promise<void> | void;
}

export function ComponentScriptAttachModal({
  open,
  onOpenChange,
  component,
  updateComponents,
}: ComponentScriptAttachModalProps) {
  const { scripts } = useScripts();

  const selectedScript: Script | undefined = useMemo(
    () => scripts.find((s) => s.id === component.scriptId),
    [scripts, component.scriptId],
  );

  const data = getComponentData(component);
  const parameterValues: Record<string, ScriptParamValue> = data.scriptParameterValues ?? {};

  const handleSelectScript = (script: Script) => {
    const baseData = JSON.parse(component.data);
    delete baseData.scriptParameterValues;

    updateComponents([
      {
        id: component.id,
        scriptId: script.id,
        data: JSON.stringify(baseData),
      },
    ]);
  };

  const handleClearScript = () => {
    const baseData = JSON.parse(component.data);
    delete baseData.scriptParameterValues;

    updateComponents([
      {
        id: component.id,
        scriptId: null,
        data: JSON.stringify(baseData),
      },
    ]);
  };

  const handleUpdateParameterValue = (paramId: string, value: ScriptParamValue) => {
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

    updateComponents([
      {
        id: component.id,
        data: JSON.stringify(baseData),
      },
    ]);
  };

  const hasParameters = (selectedScript?.parameters?.length ?? 0) > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='min-w-[420px] max-w-[90vw] max-h-[85vh] overflow-hidden flex flex-col gap-4'>
        <DialogTitle>Attach script</DialogTitle>
        <DialogDescription>
          Attach a Game Manager script to this component. Values you enter are available in QBScript
          as `params.get('&lt;Label&gt;')`.
        </DialogDescription>

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

        {selectedScript && hasParameters && (
          <div className='flex flex-col gap-3'>
            <Label className='text-xs text-muted-foreground'>Parameters</Label>
            <p className='text-[0.7rem] text-muted-foreground'>
              When not set, each parameter falls back to its default value from the script
              definition.
            </p>
            <div className='flex flex-col gap-2 max-h-[260px] overflow-auto pr-1'>
              {selectedScript.parameters!.map((param) => {
                const resolvedValue =
                  parameterValues[param.id] ??
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
                            handleUpdateParameterValue(param.id, next ? 'true' : 'false')
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
                      {param.label} <span className='text-[0.7rem] uppercase'>({param.type})</span>
                    </span>
                    <Input
                      className='flex-1 h-7 rounded-[4px]'
                      type={param.type === 'number' ? 'number' : 'text'}
                      value={resolvedValue == null ? '' : String(resolvedValue)}
                      onChange={(e) =>
                        handleUpdateParameterValue(
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

        {!selectedScript && (
          <div className='flex justify-end'>
            <Button type='button' variant='outline' size='sm' onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
