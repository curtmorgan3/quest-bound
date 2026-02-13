/**
 * Script library - list all scripts for the active ruleset
 */

import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAttributes, useActions, useItems } from '@/lib/compass-api';
import { useScripts } from '@/lib/compass-api/hooks/scripts/use-scripts';
import { FileCode, Plus } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ScriptListItem } from './script-list-item';

const ENTITY_TYPE_OPTIONS = [
  { value: 'all', label: 'All types' },
  { value: 'attribute', label: 'Attribute' },
  { value: 'action', label: 'Action' },
  { value: 'item', label: 'Item' },
  { value: 'global', label: 'Global' },
] as const;

export function ScriptsIndex() {
  const { rulesetId } = useParams<{ rulesetId: string }>();
  const { scripts } = useScripts();
  const { attributes } = useAttributes();
  const { actions } = useActions();
  const { items } = useItems();
  const [selectedType, setSelectedType] = useState<string>('all');

  const filteredScripts = useMemo(() => {
    if (selectedType === 'all') return scripts;
    return scripts.filter((s) => s.entityType === selectedType);
  }, [scripts, selectedType]);

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold">Scripts</h1>
        <p className="text-sm text-muted-foreground">
          Create and manage QBScript for attributes, actions, and items.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <Label htmlFor="script-type-filter" className="text-sm">
            Type
          </Label>
          <Select value={selectedType} onValueChange={setSelectedType}>
            <SelectTrigger id="script-type-filter" className="w-[140px]">
              <SelectValue placeholder="All types" />
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
            <Plus className="h-4 w-4 mr-2" />
            New Script
          </Link>
        </Button>
      </div>

      <div className="rounded-md border">
        {filteredScripts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <FileCode className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-sm font-medium">No scripts yet</p>
            <p className="text-sm text-muted-foreground mb-4">
              {selectedType !== 'all'
                ? `No scripts of type "${ENTITY_TYPE_OPTIONS.find((o) => o.value === selectedType)?.label}".`
                : 'Create a script to get started.'}
            </p>
            {selectedType === 'all' && (
              <Button asChild>
                <Link to={`/rulesets/${rulesetId}/scripts/new`}>
                  <Plus className="h-4 w-4 mr-2" />
                  New Script
                </Link>
              </Button>
            )}
          </div>
        ) : (
          <ul className="divide-y">
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
