/**
 * Script library - list all scripts for the active ruleset
 */

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useActions, useAttributes, useItems } from '@/lib/compass-api';
import { useScripts } from '@/lib/compass-api/hooks/scripts/use-scripts';
import { FileCode, Plus, Search } from 'lucide-react';
import { useMemo } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { ScriptListItem } from './script-list-item';

const ENTITY_TYPE_OPTIONS = [
  { value: 'all', label: 'All types' },
  { value: 'attribute', label: 'Attribute' },
  { value: 'action', label: 'Action' },
  { value: 'item', label: 'Item' },
  { value: 'global', label: 'Global' },
] as const;

const VALID_TYPES = new Set(ENTITY_TYPE_OPTIONS.map((o) => o.value));

function typeFromParams(searchParams: URLSearchParams): string {
  const type = (searchParams.get('type') ?? 'all') as
    | 'all'
    | 'attribute'
    | 'action'
    | 'item'
    | 'global';
  return VALID_TYPES.has(type) ? type : 'all';
}

function nameFromParams(searchParams: URLSearchParams): string {
  return searchParams.get('q') ?? '';
}

export function ScriptsIndex() {
  const { rulesetId } = useParams<{ rulesetId: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const { scripts } = useScripts();
  const { attributes } = useAttributes();
  const { actions } = useActions();
  const { items } = useItems();
  const selectedType = typeFromParams(searchParams);
  const setSelectedType = (value: string) => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (value === 'all') {
          next.delete('type');
        } else {
          next.set('type', value);
        }
        return next;
      },
      { replace: true },
    );
  };
  const nameFilter = nameFromParams(searchParams);
  const setNameFilter = (value: string) => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (value.trim() === '') {
          next.delete('q');
        } else {
          next.set('q', value);
        }
        return next;
      },
      { replace: true },
    );
  };

  const filteredScripts = useMemo(() => {
    let result = scripts;
    if (selectedType !== 'all') {
      result = result.filter((s) => s.entityType === selectedType);
    }
    const query = nameFilter.trim().toLowerCase();
    if (query) {
      result = result.filter((s) => (s.name ?? '').toLowerCase().includes(query));
    }
    return result;
  }, [scripts, selectedType, nameFilter]);

  return (
    <div className='flex flex-col gap-6 p-6'>
      <div className='flex flex-col gap-2'>
        <h1 className='text-2xl font-semibold'>Scripts</h1>
      </div>

      <div className='flex flex-wrap items-center gap-4'>
        <div className='relative flex-1 min-w-[200px] max-w-[280px]'>
          <Search className='absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none' />
          <Input
            id='script-name-filter'
            type='search'
            placeholder='Filter by name...'
            value={nameFilter}
            onChange={(e) => setNameFilter(e.target.value)}
            className='pl-9'
            aria-label='Filter scripts by name'
          />
        </div>
        <div className='flex items-center gap-2'>
          <Label htmlFor='script-type-filter' className='text-sm'>
            Type
          </Label>
          <Select value={selectedType} onValueChange={setSelectedType}>
            <SelectTrigger id='script-type-filter' className='w-[140px]'>
              <SelectValue placeholder='All types' />
            </SelectTrigger>
            <SelectContent>
              {ENTITY_TYPE_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button asChild>
          <Link to={`/rulesets/${rulesetId}/scripts/new`}>
            <Plus className='h-4 w-4 mr-2' />
            New Script
          </Link>
        </Button>
      </div>

      <div className='rounded-md border'>
        {filteredScripts.length === 0 ? (
          <div className='flex flex-col items-center justify-center py-12 text-center'>
            <FileCode className='h-12 w-12 text-muted-foreground mb-4' />
            <p className='text-sm font-medium'>No scripts yet</p>
            <p className='text-sm text-muted-foreground mb-4'>
              {selectedType !== 'all'
                ? `No scripts of type "${ENTITY_TYPE_OPTIONS.find((o) => o.value === selectedType)?.label}".`
                : 'Create a script to get started.'}
            </p>
            {selectedType === 'all' && (
              <Button asChild>
                <Link to={`/rulesets/${rulesetId}/scripts/new`}>
                  <Plus className='h-4 w-4 mr-2' />
                  New Script
                </Link>
              </Button>
            )}
          </div>
        ) : (
          <ul className='divide-y'>
            {filteredScripts.map((script) => (
              <ScriptListItem
                key={script.id}
                script={script}
                attributes={attributes}
                actions={actions}
                items={items}
                to={`/rulesets/${rulesetId}/scripts/${script.id}`}
              />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
