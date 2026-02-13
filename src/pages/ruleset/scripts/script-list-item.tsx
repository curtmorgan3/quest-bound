/**
 * Single script row in the script library
 */

import { Badge } from '@/components/ui/badge';
import type { Action, Attribute, Item, Script } from '@/types';
import { formatDistanceToNow } from 'date-fns';
import { ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';

interface ScriptListItemProps {
  script: Script;
  attributes: Attribute[];
  actions: Action[];
  items: Item[];
  to: string;
}

export function ScriptListItem({
  script,
  attributes,
  actions,
  items,
  to,
}: ScriptListItemProps) {
  const entity =
    script.entityType === 'attribute'
      ? attributes.find((a) => a.id === script.entityId)
      : script.entityType === 'action'
        ? actions.find((a) => a.id === script.entityId)
        : script.entityType === 'item'
          ? items.find((i) => i.id === script.entityId)
          : null;

  const entityTitle = entity && 'title' in entity ? entity.title : null;

  return (
    <li>
      <Link
        to={to}
        className="flex items-center justify-between gap-4 px-4 py-3 hover:bg-muted/50 transition-colors">
        <div className="flex flex-col gap-1 min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium truncate">{script.name || 'Untitled'}</span>
            <Badge variant="secondary" className="text-xs shrink-0">
              {script.entityType}
            </Badge>
            {!script.enabled && (
              <Badge variant="destructive" className="text-xs shrink-0">
                Disabled
              </Badge>
            )}
          </div>
          {entityTitle && (
            <span className="text-sm text-muted-foreground truncate">{entityTitle}</span>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs text-muted-foreground">
            {script.updatedAt
              ? formatDistanceToNow(new Date(script.updatedAt), { addSuffix: true })
              : '—'}
          </span>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </div>
      </Link>
    </li>
  );
}
