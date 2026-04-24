import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
} from '@/lib/compass-api';
import { PageDetailsForm } from '@/lib/compass-planes/page-details-form';
import { colorPrimary } from '@/palette';
import { db } from '@/stores';
import type { CharacterPage, RulesetWindow, Window } from '@/types';
import { Maximize2, Pencil, Plus, Trash2 } from 'lucide-react';
import { useMemo, useState, type Ref } from 'react';
import { useNavigate } from 'react-router-dom';

export interface WindowsTabsProps {
  characterPages: CharacterPage[];
  /** Scale sheet to viewport width; scroll vertically if needed. */
  sheetFitToViewport?: boolean;
  onSheetFitToViewportChange?: (next: boolean) => void;
  pageId?: string;
  bottomBarRef?: Ref<HTMLDivElement>;
  /**
   * When true (e.g. archetype default sheet editor), show add page/window and page options.
   * Player character sheet keeps only fit-to-viewport + page dropdown.
   */
  allowManagePagesAndWindows?: boolean;
  characterId?: string;
  /** When true, ruleset windows hidden from player view still appear in the add-window list. */
  showHiddenWindows?: boolean;
}

export const WindowsTabs = ({
  characterPages,
  sheetFitToViewport = false,
  onSheetFitToViewportChange,
  pageId,
  bottomBarRef,
  allowManagePagesAndWindows = false,
  characterId,
  showHiddenWindows = false,
}: WindowsTabsProps) => {
  const { character } = useCharacter(allowManagePagesAndWindows ? characterId : undefined);
  const rulesetPages = useRulesetPagesForRuleset(character?.rulesetId);
  const { windows: rulesetWindows } = useWindows();
  const { createCharacterWindow, windows: allCharacterWindows } = useCharacterWindows(
    allowManagePagesAndWindows ? characterId : undefined,
  );
  const { createCharacterPage, updateCharacterPage, deleteCharacterPage } = useCharacterPages(
    allowManagePagesAndWindows ? characterId : undefined,
  );

  const currentPageId = pageId ?? '';
  const navigate = useNavigate();

  const { assets } = useAssets();
  const [isAddWindowModalOpen, setIsAddWindowModalOpen] = useState(false);
  const [isAddPageModalOpen, setIsAddPageModalOpen] = useState(false);
  const [newPageLabel, setNewPageLabel] = useState('');
  const [filterText, setFilterText] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [editPageId, setEditPageId] = useState<string | null>(null);

  const sortedRulesetWindows = [...rulesetWindows]
    .filter((w) => showHiddenWindows || !w.hideFromPlayerView)
    .sort((a, b) => a.title.localeCompare(b.title));
  const sortedPages = [...characterPages].sort((a, b) => a.label?.localeCompare(b.label));

  const windowsOnPage = useMemo(
    () =>
      allowManagePagesAndWindows && currentPageId
        ? allCharacterWindows.filter((w) => w.characterPageId === currentPageId)
        : [],
    [allowManagePagesAndWindows, allCharacterWindows, currentPageId],
  );

  const existingTemplatePageIds = new Set(
    characterPages
      .map((p) => p.pageId)
      .filter((id): id is string => Boolean(id && id.trim().length > 0)),
  );

  const allCategories = [
    ...new Set(
      rulesetWindows.map((w) => w.category).filter((c): c is string => Boolean(c?.trim())),
    ),
  ].sort((a, b) => a.localeCompare(b));

  const page = characterPages.find((p) => p.id === editPageId);

  let backgroundImage = page?.image ?? null;

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

    const currentPage = characterPages.find((p) => p.id === currentPageId);
    let layer: number | undefined;
    if (currentPage?.pageId) {
      const templateRw = (await db.rulesetWindows
        .where('pageId')
        .equals(currentPage.pageId)
        .filter((rw) => (rw as RulesetWindow).windowId === rulesetWindow.id)
        .first()) as RulesetWindow | undefined;
      if (
        templateRw != null &&
        typeof templateRw.layer === 'number' &&
        Number.isFinite(templateRw.layer)
      ) {
        layer = templateRw.layer;
      }
    }
    if (layer == null) {
      const peers = allCharacterWindows.filter((w) => w.characterPageId === currentPageId);
      const maxPeerLayer = peers.reduce(
        (m, r) =>
          Math.max(m, typeof r.layer === 'number' && Number.isFinite(r.layer) ? r.layer : -1),
        -1,
      );
      layer = maxPeerLayer + 1;
    }

    await createCharacterWindow({
      title: rulesetWindow.title,
      characterId,
      characterPageId: currentPageId ?? undefined,
      windowId: rulesetWindow.id,
      x: 100,
      y: 100,
      isCollapsed: false,
      layer,
    });

    setIsAddWindowModalOpen(false);
  };

  const handleNavigate = (nextPageId: string) => {
    navigate(`/characters/${characterId}?pageId=${nextPageId}`);
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

  const handleAddPageFromTemplate = async (templatePageId: string) => {
    const newId = await createCharacterPage({ fromPageId: templatePageId });
    setIsAddPageModalOpen(false);
    if (newId) {
      handleNavigate(newId);
    }
  };

  const handleDeletePage = async (deletePageId: string) => {
    const remaining = characterPages.filter((p) => p.id !== deletePageId);
    await deleteCharacterPage(deletePageId);
    handleNavigate(remaining[0]?.id ?? '');
  };

  const tabBarStyle = {
    position: 'absolute' as const,
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 50,
    display: 'flex',
    gap: 8,
    padding: '8px',
    backgroundColor: '#2a2a2a',
    borderTop: '1px solid #333',
    overflowX: 'auto' as const,
    alignItems: 'center',
  };

  return (
    <>
      <div ref={bottomBarRef} className='window-tabs' style={tabBarStyle}>
        {onSheetFitToViewportChange ? (
          <button
            type='button'
            onClick={() => onSheetFitToViewportChange(!sheetFitToViewport)}
            aria-pressed={sheetFitToViewport}
            style={{
              height: '30px',
              width: '30px',
              minWidth: '30px',
              backgroundColor: '#333',
              color: sheetFitToViewport ? colorPrimary : '#fff',
              border: '1px solid #555',
              borderRadius: 4,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            title={
              sheetFitToViewport
                ? 'Turn off fit sheet to viewport width'
                : 'Fit sheet to viewport width (scroll if tall)'
            }>
            <Maximize2 size={16} />
          </button>
        ) : null}

        {allowManagePagesAndWindows ? (
          <Button
            variant='outline'
            size='sm'
            className='h-8 shrink-0 gap-1 px-2 text-xs border-[#555] bg-[#333] text-white hover:bg-[#444]'
            onClick={() => setIsAddPageModalOpen(true)}
            title='Add page'
            data-testid='sheet-add-page'>
            <Plus size={14} />
          </Button>
        ) : null}

        <select
          data-testid='sheet-page-select'
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
          {sortedPages.map((p) => (
            <option
              key={p.id}
              value={p.id}
              data-testid={`sheet-page-option-${p.label?.toLowerCase().replace(/\s+/g, '-') ?? 'page'}`}>
              {p.label}
            </option>
          ))}
        </select>

        {allowManagePagesAndWindows && currentPageId ? (
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
        ) : null}

        {allowManagePagesAndWindows && currentPageId ? (
          <button
            type='button'
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
        ) : null}
      </div>

      {allowManagePagesAndWindows ? (
        <>
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
                <DialogDescription>Add Window</DialogDescription>
              </DialogHeader>
              <div className='mb-2 flex flex-col gap-2'>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  title='Category'
                  className='h-9 cursor-pointer appearance-none rounded-md border border-[#555] bg-[#333] px-3 py-1 text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#555]'
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
                  className='border-[#555] bg-[#333] text-white placeholder:text-[#888]'
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
                  <p className='text-muted-foreground p-4 text-center'>
                    No windows available in this ruleset.
                  </p>
                ) : filteredRulesetWindows.length === 0 ? (
                  <p className='text-muted-foreground p-4 text-center'>
                    No windows match your filter.
                  </p>
                ) : (
                  filteredRulesetWindows.map((rulesetWindow) => (
                    <button
                      key={rulesetWindow.id}
                      type='button'
                      disabled={windowsOnPage.some((cw) => cw.windowId === rulesetWindow.id)}
                      onClick={() => handleCreateWindow(rulesetWindow)}
                      style={{
                        padding: '12px 16px',
                        backgroundColor: '#333',
                        color: '#fff',
                        border: '1px solid #555',
                        borderRadius: 4,
                        cursor: 'pointer',
                        textAlign: 'left',
                        opacity: windowsOnPage.some((cw) => cw.windowId === rulesetWindow.id)
                          ? 0.5
                          : 1,
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
                <DialogDescription>Add Page</DialogDescription>
              </DialogHeader>
              {rulesetPages.length > 0 && (
                <div className='flex flex-col gap-2'>
                  <Label className='text-muted-foreground text-xs'>From template</Label>
                  <div
                    className='flex max-h-[200px] flex-col gap-1 overflow-y-auto rounded-md border border-[#555] bg-[#333] p-1'
                    role='list'>
                    {rulesetPages
                      .filter((rp) => !rp.hideFromPlayerView)
                      .map((rp) => (
                        <button
                          key={rp.id}
                          type='button'
                          disabled={existingTemplatePageIds.has(rp.id)}
                          onClick={() => {
                            if (existingTemplatePageIds.has(rp.id)) return;
                            void handleAddPageFromTemplate(rp.id);
                          }}
                          className={`rounded px-3 py-2 text-left text-sm text-white transition-colors ${
                            existingTemplatePageIds.has(rp.id)
                              ? 'cursor-not-allowed opacity-50'
                              : 'hover:bg-[#444]'
                          }`}
                          data-testid={`add-page-option-${rp.label.toLowerCase().replace(/\s+/g, '-')}`}>
                          {rp.label}
                          {rp.category && (
                            <span className='text-muted-foreground ml-1 text-xs'>
                              ({rp.category})
                            </span>
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
                  onKeyDown={(e) => e.key === 'Enter' && void handleAddPage()}
                  className='border-[#555] bg-[#333] text-white placeholder:text-[#888]'
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
                <Button onClick={() => void handleAddPage()}>Add blank page</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={editPageId !== null} onOpenChange={(open) => !open && setEditPageId(null)}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Edit page details</DialogTitle>
                <DialogDescription>Edit page details</DialogDescription>
              </DialogHeader>
              {editPageId && page && (
                <PageDetailsForm
                  value={{
                    label: page.label,
                    image: backgroundImage ?? undefined,
                    backgroundColor: page.backgroundColor,
                    backgroundOpacity: page.backgroundOpacity,
                  }}
                  onUpdate={(data) => void updateCharacterPage(editPageId, data)}
                  showLabel
                />
              )}
            </DialogContent>
          </Dialog>
        </>
      ) : null}
    </>
  );
};
