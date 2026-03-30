import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
  useActiveRuleset,
  useRulesetPages,
  useRulesetWindows,
  useWindows,
} from '@/lib/compass-api';
import { repairOrphanCharacterWindowsForRulesetWindows } from '@/lib/compass-api/utils/default-archetype-test-character';
import { PageDetailsForm } from '@/lib/compass-planes/page-details-form';
import type { RulesetWindow as RulesetWindowType } from '@/types';
import { Pencil, Plus } from 'lucide-react';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { WindowCanvasHost } from './sheet-viewer/window-canvas-host';
import { WindowNode } from './sheet-viewer/window-node';

interface RulesetPageEditorProps {
  /** Page entity id (from route /rulesets/:rulesetId/pages/:pageId). */
  pageId?: string | null;
}

export const RulesetPageEditor = ({ pageId }: RulesetPageEditorProps) => {
  const { activeRuleset } = useActiveRuleset();
  const { pages, updatePage } = useRulesetPages();
  const currentPage = pages.find((p) => p.id === pageId);
  const effectivePageId = currentPage?.id ?? null;
  const {
    windows: templateWindows,
    updateRulesetWindow,
    createRulesetWindow,
    deleteRulesetWindow,
  } = useRulesetWindows(effectivePageId);

  const [editPageOpen, setEditPageOpen] = useState(false);
  const [addWindowOpen, setAddWindowOpen] = useState(false);
  const [filterText, setFilterText] = useState('');
  const pageEditorBottomBarRef = useRef<HTMLDivElement>(null);
  const [pageEditorBottomInsetPx, setPageEditorBottomInsetPx] = useState(0);

  const { windows: rulesetWindowDefs } = useWindows();
  const sortedWindowDefs = [...rulesetWindowDefs].sort((a, b) => a.title.localeCompare(b.title));
  const filteredWindowDefs = sortedWindowDefs.filter((w) =>
    w.title.toLowerCase().includes(filterText.toLowerCase()),
  );
  const existingWindowIds = new Set(templateWindows.map((w) => w.windowId));

  const pageRulesetWindowIdsKey = useMemo(
    () => JSON.stringify([...new Set(templateWindows.map((tw) => tw.windowId))].sort()),
    [templateWindows],
  );

  useEffect(() => {
    const rulesetId = currentPage?.rulesetId ?? activeRuleset?.id;
    if (!effectivePageId || !rulesetId) return;
    const windowIds: string[] = JSON.parse(pageRulesetWindowIdsKey || '[]') as string[];
    if (windowIds.length === 0) return;
    let cancelled = false;
    void (async () => {
      if (cancelled) return;
      await repairOrphanCharacterWindowsForRulesetWindows(rulesetId, windowIds);
    })();
    return () => {
      cancelled = true;
    };
  }, [effectivePageId, currentPage?.rulesetId, activeRuleset?.id, pageRulesetWindowIdsKey]);

  useLayoutEffect(() => {
    const el = pageEditorBottomBarRef.current;
    if (!el || !currentPage) {
      setPageEditorBottomInsetPx(0);
      return;
    }
    const update = () => setPageEditorBottomInsetPx(el.getBoundingClientRect().height);
    const ro = new ResizeObserver(update);
    ro.observe(el);
    update();
    return () => ro.disconnect();
  }, [currentPage]);

  const handleChildWindowClick = useCallback(
    (
      childWindowId: string,
      rulesetWindow: RulesetWindowType,
      resolved?: { x: number; y: number; collapseIfOpen?: boolean },
    ) => {
      const existing = templateWindows.find((tw) => tw.windowId === childWindowId);
      if (existing) {
        deleteRulesetWindow(existing.id);
        return;
      }
      const w = rulesetWindowDefs.find((r) => r.id === childWindowId);
      if (!w || !effectivePageId) return;
      createRulesetWindow({
        windowId: w.id,
        pageId: effectivePageId,
        title: w.title,
        x: resolved?.x ?? rulesetWindow.x + 200,
        y: resolved?.y ?? rulesetWindow.y + 150,
        isCollapsed: false,
      });
    },
    [templateWindows, rulesetWindowDefs, effectivePageId, createRulesetWindow, deleteRulesetWindow],
  );

  const handleAddWindow = async (windowDef: { id: string; title: string }) => {
    if (!effectivePageId) return;
    await createRulesetWindow({
      title: windowDef.title,
      pageId: effectivePageId,
      windowId: windowDef.id,
      x: 100,
      y: 100,
      isCollapsed: false,
    });
    setAddWindowOpen(false);
    setFilterText('');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', position: 'relative' }}>
      <WindowCanvasHost
        className='relative min-h-0 min-w-0 flex-1 overflow-hidden'
        showGridToolbar
        sheetFitBottomInsetPx={pageEditorBottomInsetPx}
        windows={templateWindows}
        locked={false}
        onWindowPositionUpdate={(id, x, y) => updateRulesetWindow(id, { x, y })}
        backgroundColor={currentPage?.backgroundColor}
        backgroundImage={currentPage?.image}
        backgroundOpacity={currentPage?.backgroundOpacity}
        renderWindow={(window, layout) => {
          const wAt = { ...window, x: layout.x, y: layout.y };
          return (
            <WindowNode
              data={{
                window: wAt,
                sheetTemplatePageId: effectivePageId ?? null,
                locked: false,
                onClose: (id: string) => deleteRulesetWindow(id),
                onChildWindowClick: (childWindowId, openResolved) =>
                  handleChildWindowClick(childWindowId, wAt, openResolved),
                editWindowHref:
                  activeRuleset?.id != null
                    ? `/rulesets/${activeRuleset.id}/windows/${window.windowId}`
                    : undefined,
                onDisplayScaleChange: (id, displayScale) =>
                  updateRulesetWindow(id, { displayScale }),
              }}
            />
          );
        }}
      />
      {currentPage && (
        <div
          ref={pageEditorBottomBarRef}
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            display: 'flex',
            gap: 8,
            padding: '8px',
            backgroundColor: '#2a2a2a',
            borderTop: '1px solid #333',
            alignItems: 'center',
          }}>
          <Button
            variant='outline'
            size='sm'
            className='h-8 shrink-0 gap-1 px-2 text-xs border-[#555] bg-[#333] text-white hover:bg-[#444]'
            onClick={() => setEditPageOpen(true)}
            title='Edit page details'>
            <Pencil size={14} />
            Edit page
          </Button>
          <Button
            variant='outline'
            size='sm'
            className='h-8 shrink-0 gap-1 px-2 text-xs border-[#555] bg-[#333] text-white hover:bg-[#444]'
            onClick={() => setAddWindowOpen(true)}
            title='Add window to this page'
            data-testid='page-editor-add-window'>
            <Plus size={14} />
            Add window
          </Button>
        </div>
      )}

      <Dialog open={editPageOpen} onOpenChange={setEditPageOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit page details</DialogTitle>
            <DialogDescription>Edit page details</DialogDescription>
          </DialogHeader>
          {currentPage && (
            <PageDetailsForm
              value={{
                label: currentPage.label,
                image: currentPage.image,
                backgroundColor: currentPage.backgroundColor,
                backgroundOpacity: currentPage.backgroundOpacity,
              }}
              onUpdate={(data) => updatePage(currentPage.id, data)}
              rulesetId={activeRuleset?.id}
              showLabel
            />
          )}
        </DialogContent>
      </Dialog>

      <Dialog
        open={addWindowOpen}
        onOpenChange={(open) => {
          setAddWindowOpen(open);
          if (!open) setFilterText('');
        }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add window</DialogTitle>
            <DialogDescription>Add window</DialogDescription>
          </DialogHeader>
          <Input
            placeholder='Filter by name'
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
            className='mb-2 bg-[#333] border-[#555] text-white placeholder:text-[#888]'
          />
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
              maxHeight: '400px',
              overflowY: 'auto',
            }}>
            {rulesetWindowDefs.length === 0 ? (
              <p className='text-center p-4 text-muted-foreground'>
                No windows available in this ruleset. Create windows first from the Windows tab.
              </p>
            ) : filteredWindowDefs.length === 0 ? (
              <p className='text-center p-4 text-muted-foreground'>No windows match your filter.</p>
            ) : (
              filteredWindowDefs.map((w) => (
                <button
                  key={w.id}
                  type='button'
                  disabled={existingWindowIds.has(w.id)}
                  onClick={() => handleAddWindow(w)}
                  data-testid={`add-window-option-${w.title.toLowerCase().replace(/\s+/g, '-')}`}
                  style={{
                    padding: '12px 16px',
                    backgroundColor: '#333',
                    color: '#fff',
                    border: '1px solid #555',
                    borderRadius: 4,
                    cursor: existingWindowIds.has(w.id) ? 'not-allowed' : 'pointer',
                    textAlign: 'left',
                    opacity: existingWindowIds.has(w.id) ? 0.5 : 1,
                  }}>
                  {w.title}
                  {w.category && (
                    <span style={{ color: '#888', marginLeft: 8, fontSize: '0.85em' }}>
                      ({w.category})
                    </span>
                  )}
                </button>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
