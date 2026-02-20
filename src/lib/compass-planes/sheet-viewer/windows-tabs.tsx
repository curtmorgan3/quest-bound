import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  useAssets,
  useCharacter,
  useCharacterPages,
  useCharacterWindows,
  useRulesetPagesForRuleset,
  useWindows,
  type CharacterPageWithPage,
} from '@/lib/compass-api';
import { PageDetailsForm } from '@/lib/compass-planes/page-details-form';
import { colorPrimary } from '@/palette';
import type { CharacterWindow, Window } from '@/types';
import { Lock, Pencil, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';

interface WindowsTabsProps {
  characterId?: string;
  characterPages: CharacterPageWithPage[];
  windows: CharacterWindow[];
  toggleWindow: (id: string) => void;
  openWindows: Set<string>;
  locked?: boolean;
  onToggleLock: () => void;
}

export const WindowsTabs = ({
  characterId,
  characterPages,
  windows,
  toggleWindow,
  openWindows,
  locked = false,
  onToggleLock,
}: WindowsTabsProps) => {
  const { character } = useCharacter(characterId);
  const rulesetPages = useRulesetPagesForRuleset(character?.rulesetId);
  const { windows: rulesetWindows } = useWindows();
  const { createCharacterWindow } = useCharacterWindows(characterId);
  const { createCharacterPage, updateCharacterPage, deleteCharacterPage } =
    useCharacterPages(characterId);

  const [searchParams, setSearchParams] = useSearchParams();
  const currentPageId = searchParams.get('pageId') ?? '';

  const { assets } = useAssets();
  const [isAddWindowModalOpen, setIsAddWindowModalOpen] = useState(false);
  const [isAddPageModalOpen, setIsAddPageModalOpen] = useState(false);
  const [newPageLabel, setNewPageLabel] = useState('');
  const [filterText, setFilterText] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [editPageId, setEditPageId] = useState<string | null>(null);

  const sortedRulesetWindows = [...rulesetWindows].sort((a, b) => a.title.localeCompare(b.title));
  const sortedWindows = [...windows].sort((a, b) => a.title.localeCompare(b.title));
  const sortedPages = [...characterPages].sort((a, b) => a.label.localeCompare(b.label));

  const allCategories = [
    ...new Set(
      rulesetWindows.map((w) => w.category).filter((c): c is string => Boolean(c?.trim())),
    ),
  ].sort((a, b) => a.localeCompare(b));

  const page = characterPages.find((p) => p.id === editPageId);

  let backgroundImage = page?.assetUrl ?? null;

  if (!backgroundImage && page?.assetId) {
    const asset = assets.find((a) => a.id === page.assetId);
    backgroundImage = asset?.data ?? null;
  }

  const filteredRulesetWindows = sortedRulesetWindows.filter((w) => {
    if (selectedCategory && w.category !== selectedCategory) return false;
    const searchTerm = filterText.toLowerCase();
    return w.title.toLowerCase().includes(searchTerm);
  });

  const handleCreateWindow = async (rulesetWindow: Window) => {
    if (!characterId) return;

    await createCharacterWindow({
      title: rulesetWindow.title,
      characterId,
      characterPageId: currentPageId ?? undefined,
      windowId: rulesetWindow.id,
      x: 100,
      y: 100,
      isCollapsed: false,
    });

    setIsAddWindowModalOpen(false);
  };

  const handleNavigate = (pageId: string) => {
    const next = new URLSearchParams(searchParams);
    next.set('pageId', pageId);
    setSearchParams(next);
  };

  const handleAddPage = async () => {
    const label = newPageLabel.trim() || 'Untitled';
    const newId = await createCharacterPage({ label });
    setNewPageLabel('');
    setIsAddPageModalOpen(false);
    if (newId) {
      handleNavigate(newId);
    }
  };

  const handleAddPageFromTemplate = async (rulesetPageId: string) => {
    const newId = await createCharacterPage({ fromRulesetPageId: rulesetPageId });
    setIsAddPageModalOpen(false);
    if (newId) {
      handleNavigate(newId);
    }
  };

  const handleDeletePage = async (pageId: string) => {
    const remaining = characterPages.filter((p) => p.id !== pageId);
    await deleteCharacterPage(pageId);
    handleNavigate(remaining[0]?.id ?? '');
  };

  const tabBarStyle = {
    position: 'absolute' as const,
    bottom: 0,
    left: 0,
    right: 0,
    display: 'flex',
    gap: 8,
    padding: '8px',
    backgroundColor: '#2a2a2a',
    borderTop: '1px solid #333',
    overflowX: 'auto' as const,
    alignItems: 'center',
  };

  const tabButtonStyle = (selected: boolean) => ({
    height: '30px',
    minWidth: '60px',
    backgroundColor: selected ? '#444' : '#333',
    color: '#fff',
    border: '1px solid #555',
    borderRadius: 4,
    cursor: 'pointer' as const,
    whiteSpace: 'nowrap' as const,
    fontSize: '0.7rem',
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    padding: '0 6px',
  });

  return (
    <>
      <div className='window-tabs' style={tabBarStyle}>
        <button
          onClick={onToggleLock}
          style={{
            height: '30px',
            width: '30px',
            minWidth: '30px',
            backgroundColor: '#333',
            color: locked ? colorPrimary : '#fff',
            border: '1px solid #555',
            borderRadius: 4,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          title='Lock layout'>
          <Lock size={16} />
        </button>

        {!locked && (
          <Button
            variant='outline'
            size='sm'
            className='h-8 shrink-0 gap-1 px-2 text-xs border-[#555] bg-[#333] text-white hover:bg-[#444]'
            onClick={() => setIsAddPageModalOpen(true)}
            title='Add page'
            data-testid='sheet-add-page'>
            <Plus size={14} />
          </Button>
        )}

        <select
          value={currentPageId ?? ''}
          onChange={(e) => {
            const next = e.target.value || null;
            if (next !== currentPageId && next !== null) {
              handleNavigate(next);
            }
          }}
          disabled={characterPages.length === 0}
          title='Current page'
          style={{
            height: '30px',
            minWidth: 140,
            paddingLeft: 8,
            paddingRight: 24,
            backgroundColor: '#333',
            color: '#fff',
            border: '1px solid #555',
            borderRadius: 4,
            fontSize: '0.75rem',
            cursor: characterPages.length === 0 ? 'not-allowed' : 'pointer',
            appearance: 'none',
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23888' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`,
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'right 6px center',
          }}>
          <option value='' disabled>
            {characterPages.length === 0 ? 'No pages' : 'Select page'}
          </option>
          {sortedPages.map((page) => (
            <option key={page.id} value={page.id}>
              {page.label}
            </option>
          ))}
        </select>

        {currentPageId && !locked && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant='ghost'
                size='icon'
                className='h-8 w-8 shrink-0 rounded border border-[#555] bg-[#333] text-[#888] hover:bg-[#444] hover:text-white'
                title='Page options'>
                <Pencil size={14} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align='start'>
              <DropdownMenuItem onClick={() => currentPageId && setEditPageId(currentPageId)}>
                <Pencil size={14} />
                Edit page details
              </DropdownMenuItem>
              <DropdownMenuItem
                variant='destructive'
                onClick={() => currentPageId && handleDeletePage(currentPageId)}>
                <Trash2 size={14} />
                Remove page
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        {!locked && currentPageId && (
          <button
            onClick={() => setIsAddWindowModalOpen(true)}
            style={{
              height: '30px',
              width: '30px',
              minWidth: '30px',
              backgroundColor: '#333',
              color: '#fff',
              border: '1px solid #555',
              borderRadius: 4,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            title='Add window'>
            <Plus size={16} />
          </button>
        )}

        {sortedWindows.map((window) => (
          <button
            key={window.id}
            onClick={() => toggleWindow(window.id)}
            style={tabButtonStyle(openWindows.has(window.id))}>
            {window.title}
          </button>
        ))}
      </div>

      <Dialog
        open={isAddWindowModalOpen}
        onOpenChange={(open) => {
          setIsAddWindowModalOpen(open);
          if (!open) {
            setFilterText('');
            setSelectedCategory('');
          }
        }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Window</DialogTitle>
          </DialogHeader>
          <div className='flex flex-col gap-2 mb-2'>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              title='Category'
              className='h-9 rounded-md border border-[#555] bg-[#333] px-3 py-1 text-white text-sm cursor-pointer appearance-none focus:outline-none focus:ring-2 focus:ring-[#555]'
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23888' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`,
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'right 8px center',
                paddingRight: 28,
              }}>
              <option value=''>All categories</option>
              {allCategories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
            <Input
              placeholder='Filter by name'
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
              className='bg-[#333] border-[#555] text-white placeholder:text-[#888]'
            />
          </div>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
              maxHeight: '400px',
              overflowY: 'auto',
            }}>
            {rulesetWindows.length === 0 ? (
              <p className='text-center p-4 text-muted-foreground'>
                No windows available in this ruleset.
              </p>
            ) : filteredRulesetWindows.length === 0 ? (
              <p className='text-center p-4 text-muted-foreground'>No windows match your filter.</p>
            ) : (
              filteredRulesetWindows.map((rulesetWindow) => (
                <button
                  key={rulesetWindow.id}
                  disabled={windows.some((cw) => cw.windowId === rulesetWindow.id)}
                  onClick={() => handleCreateWindow(rulesetWindow)}
                  style={{
                    padding: '12px 16px',
                    backgroundColor: '#333',
                    color: '#fff',
                    border: '1px solid #555',
                    borderRadius: 4,
                    cursor: 'pointer',
                    textAlign: 'left',
                    opacity: windows.some((cw) => cw.windowId === rulesetWindow.id) ? 0.5 : 1,
                  }}>
                  {rulesetWindow.title}
                  {rulesetWindow.category && (
                    <span style={{ color: '#888', marginLeft: 8, fontSize: '0.85em' }}>
                      ({rulesetWindow.category})
                    </span>
                  )}
                </button>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={isAddPageModalOpen}
        onOpenChange={(open) => {
          setIsAddPageModalOpen(open);
          if (!open) setNewPageLabel('');
        }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Page</DialogTitle>
          </DialogHeader>
          {rulesetPages.length > 0 && (
            <div className='flex flex-col gap-2'>
              <Label className='text-muted-foreground text-xs'>From template</Label>
              <div
                className='flex flex-col gap-1 max-h-[200px] overflow-y-auto rounded-md border border-[#555] bg-[#333] p-1'
                role='list'>
                {rulesetPages.map((rp) => (
                  <button
                    key={rp.rulesetPageId}
                    type='button'
                    onClick={() => handleAddPageFromTemplate(rp.rulesetPageId)}
                    className='text-left px-3 py-2 rounded text-sm text-white hover:bg-[#444] transition-colors'
                    data-testid={`add-page-option-${rp.label.toLowerCase().replace(/\s+/g, '-')}`}>
                    {rp.label}
                    {rp.category && (
                      <span className='text-muted-foreground ml-1 text-xs'>({rp.category})</span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}
          <div className='flex flex-col gap-2'>
            <Label className='text-muted-foreground text-xs'>
              {rulesetPages.length > 0 ? 'Or create blank page' : 'Page label'}
            </Label>
            <Input
              placeholder='Page label'
              value={newPageLabel}
              onChange={(e) => setNewPageLabel(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddPage()}
              className='bg-[#333] border-[#555] text-white placeholder:text-[#888]'
            />
          </div>
          <DialogFooter>
            <Button
              variant='outline'
              onClick={() => {
                setIsAddPageModalOpen(false);
                setNewPageLabel('');
              }}>
              Cancel
            </Button>
            <Button onClick={handleAddPage}>Add blank page</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={editPageId !== null} onOpenChange={(open) => !open && setEditPageId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit page details</DialogTitle>
          </DialogHeader>
          {editPageId && page && (
            <PageDetailsForm
              value={{
                label: page.label,
                image: backgroundImage ?? undefined,
                backgroundColor: page.backgroundColor,
                backgroundOpacity: page.backgroundOpacity,
              }}
              onUpdate={(data) => updateCharacterPage(editPageId, data)}
              showLabel
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};
