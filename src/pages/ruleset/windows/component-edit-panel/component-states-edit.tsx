import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  assertUniqueStateName,
  canAddState,
  COMPONENT_STATE_DISABLED,
  COMPONENT_STATE_HOVER,
  COMPONENT_STATE_PRESSED,
  defaultStatesJson,
  getEditorPreviewStateName,
  parseComponentStatesList,
  stringifyComponentStatesList,
  stripLayoutKeysFromAllStateEntries,
  validateNewCustomStateName,
} from '@/lib/compass-planes/utils/component-states';
import { WindowEditorContext } from '@/stores';
import type { Component, ComponentStateEntry } from '@/types';
import { Plus, Trash2 } from 'lucide-react';
import { useContext, useState } from 'react';

type Props = {
  component: Component;
  onStatesUpdated: (statesJson: string) => void;
};

export function ComponentStatesEdit({ component, onStatesUpdated }: Props) {
  const { setStateEditTarget } = useContext(WindowEditorContext);
  const previewTarget = getEditorPreviewStateName(component);
  const entries = parseComponentStatesList(component.states);
  const [customNameDraft, setCustomNameDraft] = useState('');
  const [addError, setAddError] = useState<string | null>(null);

  const persistList = (next: ComponentStateEntry[]) => {
    const raw = stringifyComponentStatesList(next);
    const { json } = stripLayoutKeysFromAllStateEntries(raw, ['x', 'y']);
    onStatesUpdated(json);
  };

  const addBuiltin = (
    name:
      | typeof COMPONENT_STATE_HOVER
      | typeof COMPONENT_STATE_DISABLED
      | typeof COMPONENT_STATE_PRESSED,
  ) => {
    setAddError(null);
    if (!canAddState(entries)) {
      setAddError('Maximum 5 states per component');
      return;
    }
    const err = assertUniqueStateName(entries, name);
    if (err) {
      setAddError(err);
      return;
    }
    const row: ComponentStateEntry = { name, data: '{}', style: '{}' };
    persistList([...entries, row]);
    setStateEditTarget(name);
  };

  const addCustom = () => {
    setAddError(null);
    const vErr = validateNewCustomStateName(customNameDraft);
    if (vErr) {
      setAddError(vErr);
      return;
    }
    if (!canAddState(entries)) {
      setAddError('Maximum 5 states per component');
      return;
    }
    const name = customNameDraft.trim();
    const err = assertUniqueStateName(entries, name);
    if (err) {
      setAddError(err);
      return;
    }
    const row: ComponentStateEntry = { name, data: '{}', style: '{}' };
    persistList([...entries, row]);
    setCustomNameDraft('');
    setStateEditTarget(name);
  };

  const removeState = (name: string) => {
    persistList(entries.filter((e) => e.name !== name));
    if (previewTarget !== 'base' && previewTarget.toLowerCase() === name.toLowerCase()) {
      setStateEditTarget('base');
    }
  };

  const selectItems = [
    { value: 'base', label: 'Default' },
    ...entries.map((e) => ({ value: e.name, label: e.name })),
  ];

  const selectedStateLabel =
    selectItems.find((item) => item.value === previewTarget)?.label ?? previewTarget;

  return (
    <Accordion type='single' collapsible>
      <AccordionItem value='visual-states' className='border-none'>
        <AccordionTrigger className='py-2 text-xs text-muted-foreground hover:no-underline hover:text-foreground'>
          <span className='min-w-0 flex-1 truncate text-left'>State ({selectedStateLabel})</span>
        </AccordionTrigger>
        <AccordionContent className='flex flex-col gap-3 pb-2'>
          <Select value={previewTarget} onValueChange={setStateEditTarget}>
            <SelectTrigger className='h-[30px] w-full' aria-label='Edit base or state'>
              <SelectValue placeholder='Editing target' />
            </SelectTrigger>
            <SelectContent>
              {selectItems.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className='flex flex-wrap gap-1'>
            <Button
              type='button'
              variant='outline'
              size='sm'
              className='h-7 text-xs'
              disabled={
                !canAddState(entries) || entries.some((e) => e.name === COMPONENT_STATE_HOVER)
              }
              onClick={() => addBuiltin(COMPONENT_STATE_HOVER)}>
              <Plus className='mr-1 size-3' />
              Hover
            </Button>
            <Button
              type='button'
              variant='outline'
              size='sm'
              className='h-7 text-xs'
              disabled={
                !canAddState(entries) || entries.some((e) => e.name === COMPONENT_STATE_DISABLED)
              }
              onClick={() => addBuiltin(COMPONENT_STATE_DISABLED)}>
              <Plus className='mr-1 size-3' />
              Disabled
            </Button>
            <Button
              type='button'
              variant='outline'
              size='sm'
              className='h-7 text-xs'
              disabled={
                !canAddState(entries) || entries.some((e) => e.name === COMPONENT_STATE_PRESSED)
              }
              onClick={() => addBuiltin(COMPONENT_STATE_PRESSED)}>
              <Plus className='mr-1 size-3' />
              Pressed
            </Button>
          </div>
          <div className='flex gap-1'>
            <Input
              className='h-8 flex-1 text-xs h-[30px]'
              placeholder='Custom'
              value={customNameDraft}
              onChange={(e) => setCustomNameDraft(e.target.value)}
            />
            <Button
              type='button'
              variant='secondary'
              size='sm'
              className='h-[30px] shrink-0 text-xs'
              disabled={!canAddState(entries)}
              onClick={addCustom}>
              Add
            </Button>
          </div>
          {addError ? <p className='text-xs text-destructive'>{addError}</p> : null}

          {entries.length > 0 ? (
            <ul className='flex flex-col gap-1 text-xs'>
              {entries.map((e) => (
                <li
                  key={e.name}
                  className='flex items-center justify-between gap-2 rounded border border-white/10 px-2 py-1'>
                  <span className='truncate'>{e.name}</span>
                  <Button
                    type='button'
                    variant='ghost'
                    size='icon'
                    className='size-7 shrink-0 text-destructive hover:text-destructive'
                    title='Remove state'
                    onClick={() => removeState(e.name)}>
                    <Trash2 className='size-3.5' />
                  </Button>
                </li>
              ))}
            </ul>
          ) : null}
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}

export function ensureComponentStatesJson(states: string | null | undefined): string {
  if (states == null || states === '') return defaultStatesJson();
  try {
    const parsed = JSON.parse(states) as unknown;
    return Array.isArray(parsed) ? JSON.stringify(parsed) : defaultStatesJson();
  } catch {
    return defaultStatesJson();
  }
}
