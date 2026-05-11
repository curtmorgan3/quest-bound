/**
 * Drag-and-drop file tree for the scripts page. Scripts are grouped by category;
 * dragging a script onto a category folder reassigns its category. Categories
 * are derived from script.category values; "New Category" adds an ephemeral
 * empty folder until a script is dropped in.
 */

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import type { Script } from '@/types';
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  FolderPlus,
  Plus,
  Search,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

export const UNCATEGORIZED = 'Uncategorized';

interface FileTreeProps {
  scripts: Script[];
  activeId: string | null;
  extraCategories: string[];
  collapsed: boolean;
  onToggleCollapsed: () => void;
  onSelect: (id: string) => void;
  onNewScript: () => void;
  onNewCategory: () => void;
  onMoveScript: (scriptId: string, category: string | null) => void;
}

export function FileTree({
  scripts,
  activeId,
  extraCategories,
  collapsed,
  onToggleCollapsed,
  onSelect,
  onNewScript,
  onNewCategory,
  onMoveScript,
}: FileTreeProps) {
  const [query, setQuery] = useState('');
  const [openCats, setOpenCats] = useState<Record<string, boolean>>({});
  const [dragId, setDragId] = useState<string | null>(null);
  const [dropCat, setDropCat] = useState<string | null>(null);

  const categories = useMemo(() => {
    const set = new Set<string>();
    for (const s of scripts) {
      const cat = s.category?.trim();
      if (cat) set.add(cat);
    }
    for (const c of extraCategories) {
      const trimmed = c.trim();
      if (trimmed) set.add(trimmed);
    }
    const sorted = Array.from(set).sort((a, b) =>
      a.localeCompare(b, undefined, { sensitivity: 'base' }),
    );
    sorted.push(UNCATEGORIZED);
    return sorted;
  }, [scripts, extraCategories]);

  useEffect(() => {
    setOpenCats((prev) => {
      const next = { ...prev };
      for (const c of categories) if (!(c in next)) next[c] = true;
      return next;
    });
  }, [categories]);

  const lowerQuery = query.toLowerCase();
  const filtered = scripts.filter(
    (s) => !query || (s.name ?? '').toLowerCase().includes(lowerQuery),
  );

  const grouped = categories.map((cat) => ({
    cat,
    items: filtered
      .filter((s) =>
        cat === UNCATEGORIZED
          ? !s.category || !s.category.trim()
          : s.category?.trim() === cat,
      )
      .sort((a, b) =>
        (a.name ?? '').localeCompare(b.name ?? '', undefined, { sensitivity: 'base' }),
      ),
  }));

  if (collapsed) {
    return (
      <aside className='w-12 shrink-0 border-r bg-muted/20 flex flex-col items-center py-3 gap-1'>
        <Button
          variant='ghost'
          size='icon'
          onClick={onToggleCollapsed}
          title='Expand file tree'
          aria-label='Expand file tree'>
          <ChevronRight className='h-4 w-4' />
        </Button>
      </aside>
    );
  }

  return (
    <aside className='w-[280px] shrink-0 border-r bg-muted/20 flex flex-col min-h-0'>
      <div className='flex items-center gap-2 p-2 border-b'>
        <div className='relative flex-1 min-w-0'>
          <Search className='absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none' />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder='Filter scripts…'
            className='h-8 pl-7 text-sm'
            aria-label='Filter scripts'
          />
        </div>
        <Button
          variant='ghost'
          size='icon'
          className='h-8 w-8 shrink-0'
          onClick={onToggleCollapsed}
          title='Collapse file tree'
          aria-label='Collapse file tree'>
          <ChevronLeft className='h-4 w-4' />
        </Button>
      </div>

      <div className='flex-1 overflow-auto p-1.5'>
        {grouped.map(({ cat, items }) => {
          const open = openCats[cat] ?? true;
          const isDropping = dropCat === cat;
          return (
            <div
              key={cat}
              onDragOver={(e) => {
                if (dragId) {
                  e.preventDefault();
                  setDropCat(cat);
                }
              }}
              onDragLeave={() => {
                if (dropCat === cat) setDropCat(null);
              }}
              onDrop={(e) => {
                e.preventDefault();
                if (dragId) {
                  onMoveScript(dragId, cat === UNCATEGORIZED ? null : cat);
                }
                setDragId(null);
                setDropCat(null);
              }}
              className={cn(
                'mb-1 rounded transition-colors',
                isDropping && 'bg-primary/10 outline-dashed outline-1 outline-primary',
              )}>
              <button
                type='button'
                onClick={() => setOpenCats((o) => ({ ...o, [cat]: !open }))}
                className='w-full flex items-center gap-2 px-2 py-1.5 text-left text-xs uppercase tracking-wider text-muted-foreground hover:text-foreground rounded'>
                {open ? (
                  <ChevronDown className='h-3 w-3 shrink-0' />
                ) : (
                  <ChevronRight className='h-3 w-3 shrink-0' />
                )}
                <span className='flex-1 truncate'>{cat}</span>
                <span className='text-[10px] tabular-nums text-muted-foreground/70'>
                  {items.length}
                </span>
              </button>
              {open && (
                <div className='pl-1.5'>
                  {items.map((s) => {
                    const active = s.id === activeId;
                    const isDragging = dragId === s.id;
                    return (
                      <button
                        key={s.id}
                        type='button'
                        draggable
                        onDragStart={(e) => {
                          setDragId(s.id);
                          e.dataTransfer.effectAllowed = 'move';
                        }}
                        onDragEnd={() => {
                          setDragId(null);
                          setDropCat(null);
                        }}
                        onClick={() => onSelect(s.id)}
                        className={cn(
                          'group flex items-center gap-2 w-full text-left text-sm px-2.5 py-1 my-0.5 border-l-2',
                          active
                            ? 'bg-accent text-foreground border-primary'
                            : 'text-muted-foreground border-transparent hover:bg-accent/40 hover:text-foreground',
                          isDragging ? 'opacity-40 cursor-grabbing' : 'cursor-grab',
                        )}
                        title={s.name || 'Untitled'}>
                        <span
                          className={cn(
                            'flex-1 truncate',
                            s.moduleId && 'text-module-origin',
                          )}>
                          {s.name || 'Untitled'}.qbs
                        </span>
                      </button>
                    );
                  })}
                  {items.length === 0 && (
                    <div className='px-3.5 py-1 text-xs italic text-muted-foreground/60'>
                      empty
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className='border-t p-2 flex gap-1.5'>
        <Button
          variant='outline'
          size='sm'
          className='flex-1 h-8 gap-1 text-xs'
          onClick={onNewScript}>
          <Plus className='h-3 w-3' />
          New Script
        </Button>
        <Button
          variant='outline'
          size='sm'
          className='flex-1 h-8 gap-1 text-xs'
          onClick={onNewCategory}>
          <FolderPlus className='h-3 w-3' />
          New Category
        </Button>
      </div>
    </aside>
  );
}
