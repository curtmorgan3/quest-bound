import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { useFeatureFlagList } from '@/hooks/use-feature-flag';
import { cn } from '@/lib/utils';
import { removeFeatureFlag, setFeatureFlag } from '@/utils/feature-flags';
import { Bug, ChevronDown, ChevronRight, Code2, Flag, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { ScriptPlayground } from './script-playground';

type ViewMode = 'script' | 'debug' | 'flags';

export const DevTools = () => {
  const [viewMode, setViewMode] = useState<ViewMode>('script');
  const [inputValue, setInputValue] = useState('');
  const [debugVars, setDebugVars] = useState<Array<{ key: string; value: string }>>([]);
  const [openSections, setOpenSections] = useState<Set<string>>(new Set());

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

  return (
    <div className='relative h-screen w-full overflow-hidden bg-background'>
      {/* Main Content Area */}
      <div className='h-full w-full'>
        {viewMode === 'script' ? (
          <ScriptPlayground />
        ) : viewMode === 'flags' ? (
          <FeatureFlagsSection />
        ) : (
          <div className='h-full overflow-auto p-6'>
            <div className='max-w-4xl mx-auto space-y-4'>
              <div>
                <h2 className='text-2xl font-bold'>Debug Variables</h2>
                <p className='text-sm text-muted-foreground mt-1'>
                  Manage localStorage debug flags
                </p>
              </div>

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
                <ScrollArea className='h-[calc(100vh-300px)] w-full border rounded-md'>
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
          </div>
        )}
      </div>

      {/* Bottom Left Toggle */}
      <div className='fixed bottom-4 right-8 z-50'>
        <div className='flex gap-1 bg-background border rounded-lg shadow-lg p-1'>
          <Button
            variant={viewMode === 'script' ? 'default' : 'ghost'}
            size='sm'
            onClick={() => setViewMode('script')}
            className={cn('gap-2', viewMode === 'script' && 'shadow-sm')}
            title='Script Playground'>
            <Code2 className='h-4 w-4' />
            <span className='hidden sm:inline'>Script</span>
          </Button>
          <Button
            variant={viewMode === 'debug' ? 'default' : 'ghost'}
            size='sm'
            onClick={() => setViewMode('debug')}
            className={cn('gap-2', viewMode === 'debug' && 'shadow-sm')}
            title='Debug Variables'>
            <Bug className='h-4 w-4' />
            <span className='hidden sm:inline'>Debug</span>
          </Button>
          <Button
            variant={viewMode === 'flags' ? 'default' : 'ghost'}
            size='sm'
            onClick={() => setViewMode('flags')}
            className={cn('gap-2', viewMode === 'flags' && 'shadow-sm')}
            title='Feature Flags'>
            <Flag className='h-4 w-4' />
            <span className='hidden sm:inline'>Flags</span>
          </Button>
        </div>
      </div>
    </div>
  );
};

function FeatureFlagsSection() {
  const flags = useFeatureFlagList();
  const [inputValue, setInputValue] = useState('');

  const handleAdd = () => {
    const name = inputValue.trim();
    if (name) {
      setFeatureFlag(name, true);
      setInputValue('');
    }
  };

  const handleToggle = (name: string, enabled: boolean) => {
    setFeatureFlag(name, !enabled);
  };

  const handleRemove = (name: string) => {
    removeFeatureFlag(name);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleAdd();
  };

  return (
    <div className='h-full overflow-auto p-6'>
      <div className='max-w-4xl mx-auto space-y-4'>
        <div>
          <h2 className='text-2xl font-bold'>Feature Flags</h2>
          <p className='text-sm text-muted-foreground mt-1'>
            Toggle features via localStorage. Use <code className='text-xs bg-muted px-1 rounded'>useFeatureFlag(name)</code> in code.
          </p>
        </div>

        <div className='space-y-2'>
          <Label htmlFor='flag-input'>Add feature flag</Label>
          <div className='flex gap-2'>
            <Input
              id='flag-input'
              placeholder='e.g. newEditor'
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
            />
            <Button onClick={handleAdd} disabled={!inputValue.trim()}>
              Add
            </Button>
          </div>
        </div>

        <Separator />

        <div className='space-y-2'>
          <Label>Flags</Label>
          <ScrollArea className='h-[calc(100vh-300px)] w-full border rounded-md'>
            <div className='p-2 space-y-2'>
              {flags.length === 0 ? (
                <p className='text-muted-foreground text-sm'>No feature flags. Add one above.</p>
              ) : (
                flags.map(({ name, enabled }) => (
                  <div
                    key={name}
                    className='flex items-center justify-between p-2 bg-muted rounded-md'>
                    <p className='text-sm font-medium'>{name}</p>
                    <div className='flex items-center gap-2'>
                      <Switch
                        checked={enabled}
                        onCheckedChange={() => handleToggle(name, enabled)}
                        className='data-[state=checked]:bg-primary'
                      />
                      <span className='text-xs text-muted-foreground w-8'>
                        {enabled ? 'ON' : 'OFF'}
                      </span>
                      <Button
                        variant='ghost'
                        size='sm'
                        onClick={() => handleRemove(name)}
                        className='h-8 w-8 p-0 text-destructive hover:text-destructive'
                        aria-label={`Remove ${name}`}>
                        <Trash2 className='h-4 w-4' />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </div>
      </div>
    </div>
  );
}
