import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { useComponents } from '@/lib/compass-api';
import type { Component } from '@/types';
import { ChevronDown, ChevronRight, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';

export const DevTools = () => {
  const [inputValue, setInputValue] = useState('');
  const [debugVars, setDebugVars] = useState<Array<{ key: string; value: string }>>([]);
  const [openSections, setOpenSections] = useState<Set<string>>(new Set());

  const { windowId } = useParams();
  const { createComponents } = useComponents(windowId);

  // Load debug variables from localStorage
  const loadDebugVars = () => {
    const vars: Array<{ key: string; value: string }> = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('debug.log')) {
        const value = localStorage.getItem(key) || '';
        vars.push({ key, value });
      }
    }
    setDebugVars(vars);
  };

  // Load debug variables on component mount
  useEffect(() => {
    loadDebugVars();
  }, []);

  // Add new debug variable
  const handleAdd = () => {
    if (inputValue.trim()) {
      const key = `debug.log.${inputValue.trim()}`;
      localStorage.setItem(key, 'true');
      setInputValue('');
      loadDebugVars();
    }
  };

  // Remove debug variable
  const handleRemove = (key: string) => {
    localStorage.removeItem(`debug.log.${key}`);
    loadDebugVars();
  };

  // Toggle debug variable value between true/false
  const handleToggle = (key: string, currentValue: string) => {
    const newValue = currentValue === 'true' ? 'false' : 'true';
    localStorage.setItem(`debug.log.${key}`, newValue);
    loadDebugVars();
  };

  // Handle Enter key press
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleAdd();
    }
  };

  // Group variables by prefix (text after debug. but before next dot)
  const groupVariablesByPrefix = () => {
    const groups: { [prefix: string]: Array<{ key: string; value: string }> } = {};

    debugVars.forEach(({ key, value }) => {
      key = key.replace('debug.log.', '');
      // Remove 'debug.' prefix first
      const firstDotIndex = key.indexOf('.');
      const prefix = firstDotIndex > 0 ? key.substring(0, firstDotIndex) : key;

      if (!groups[prefix]) {
        groups[prefix] = [];
      }
      groups[prefix].push({ key, value });
    });

    // Sort groups alphabetically and sort variables within each group
    const sortedGroups = Object.keys(groups)
      .sort()
      .reduce(
        (acc, prefix) => {
          acc[prefix] = groups[prefix].sort((a, b) => a.key.localeCompare(b.key));
          return acc;
        },
        {} as { [prefix: string]: Array<{ key: string; value: string }> },
      );

    return sortedGroups;
  };

  // Toggle section open/closed
  const toggleSection = (prefix: string) => {
    const newOpenSections = new Set(openSections);
    if (newOpenSections.has(prefix)) {
      newOpenSections.delete(prefix);
    } else {
      newOpenSections.add(prefix);
    }
    setOpenSections(newOpenSections);
  };

  const addComponents = async () => {
    if (!windowId) return;
    const comps: Partial<Component>[] = [];
    const groupId = 'group';

    for (let x = 0; x < 100; x++) {
      for (let y = 0; y < 10; y++) {
        comps.push({
          type: 'shape',
          windowId,
          groupId,
          width: 60,
          height: 60,
          x: x * 80,
          y: y * 80,
        });
      }
    }
    await createComponents(comps);
  };

  return (
    <div className='p-4 space-y-4'>
      <button onClick={addComponents}>Add 1000 Components</button>
      <div className='space-y-2'>
        <Label htmlFor='debug-input'>Add Debug Variable</Label>
        <div className='flex gap-2'>
          <Input
            id='debug-input'
            placeholder='Enter debug variable name...'
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
          />
          <Button onClick={handleAdd} disabled={!inputValue.trim()}>
            Add
          </Button>
        </div>
      </div>

      <Separator />

      <div className='space-y-2'>
        <Label>Debug Variables</Label>
        <ScrollArea className='h-64 w-full border rounded-md'>
          <div className='p-2 space-y-2'>
            {debugVars.length === 0 ? (
              <p className='text-muted-foreground text-sm'>No debug variables found</p>
            ) : (
              Object.entries(groupVariablesByPrefix()).map(([prefix, variables]) => (
                <Collapsible
                  key={prefix}
                  open={openSections.has(prefix)}
                  onOpenChange={() => toggleSection(prefix)}>
                  <CollapsibleTrigger asChild>
                    <Button
                      variant='ghost'
                      className='w-full justify-between p-2 h-auto font-medium'>
                      <div className='flex items-center gap-2'>
                        {openSections.has(prefix) ? (
                          <ChevronDown className='h-4 w-4' />
                        ) : (
                          <ChevronRight className='h-4 w-4' />
                        )}
                        <span>{prefix}</span>
                        <span className='text-xs text-muted-foreground'>
                          ({variables.length} variable{variables.length !== 1 ? 's' : ''})
                        </span>
                      </div>
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className='space-y-1 ml-4'>
                    {variables.map(({ key, value }) => (
                      <div
                        key={key}
                        className='flex items-center justify-between p-2 bg-muted rounded-md'>
                        <div className='flex-1 min-w-0'>
                          <p className='text-sm font-medium truncate'>
                            {key.replace(`${prefix}.`, '')}
                          </p>
                          <p className='text-xs text-muted-foreground truncate'>{value}</p>
                        </div>
                        <div className='flex items-center gap-2 ml-2'>
                          <div className='flex items-center gap-2'>
                            <Switch
                              checked={value === 'true'}
                              onCheckedChange={() => handleToggle(key, value)}
                              className='data-[state=checked]:bg-primary'
                            />
                            <span className='text-xs text-muted-foreground'>
                              {value === 'true' ? 'ON' : 'OFF'}
                            </span>
                          </div>
                          <Button
                            variant='ghost'
                            size='sm'
                            onClick={() => handleRemove(key)}
                            className='h-8 w-8 p-0 text-destructive hover:text-destructive'>
                            <Trash2 className='h-4 w-4' />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </CollapsibleContent>
                </Collapsible>
              ))
            )}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
};
