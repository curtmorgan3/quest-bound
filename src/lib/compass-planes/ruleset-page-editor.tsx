import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
  useActiveRuleset,
  useRulesetPages,
  useRulesetWindows,
  useWindows,
} from '@/lib/compass-api';
import { PageDetailsForm } from '@/lib/compass-planes/page-details-form';
import type { RulesetWindow as RulesetWindowType } from '@/types';
import type { Node, NodeChange, NodePositionChange } from '@xyflow/react';
import { applyNodeChanges } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Pencil, Plus } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { BaseEditor } from './base-editor';
import { WindowNode } from './sheet-viewer/window-node';

const windowNodeTypes = {
  window: WindowNode,
};

interface RulesetPageEditorProps {
  /** Page entity id (from route /rulesets/:rulesetId/pages/:pageId). */
  pageId?: string | null;
}

export const RulesetPageEditor = ({ pageId }: RulesetPageEditorProps) => {
  const { activeRuleset } = useActiveRuleset();
  const { pages, updatePage } = useRulesetPages();
  const currentPage = pages.find((p) => p.id === pageId);
  const effectiveRulesetPageId = currentPage?.rulesetPageId ?? null;
  const {
    windows: templateWindows,
    updateRulesetWindow,
    createRulesetWindow,
    deleteRulesetWindow,
  } = useRulesetWindows(effectiveRulesetPageId);

  const [editPageOpen, setEditPageOpen] = useState(false);
  const [addWindowOpen, setAddWindowOpen] = useState(false);
  const [filterText, setFilterText] = useState('');

  const { windows: rulesetWindowDefs } = useWindows();
  const sortedWindowDefs = [...rulesetWindowDefs].sort((a, b) => a.title.localeCompare(b.title));
  const filteredWindowDefs = sortedWindowDefs.filter((w) =>
    w.title.toLowerCase().includes(filterText.toLowerCase()),
  );
  const existingWindowIds = new Set(templateWindows.map((w) => w.windowId));

  const handleChildWindowClick = useCallback(
    (
      childWindowId: string,
      parentWindow: { x: number; y: number },
      rulesetWindow: RulesetWindowType,
    ) => {
      const existing = templateWindows.find((tw) => tw.windowId === childWindowId);
      if (existing) {
        deleteRulesetWindow(existing.id);
        return;
      }
      const w = rulesetWindowDefs.find((r) => r.id === childWindowId);
      if (!w || !effectiveRulesetPageId) return;
      createRulesetWindow({
        windowId: w.id,
        rulesetPageId: effectiveRulesetPageId,
        title: w.title,
        x: parentWindow.x + 200,
        y: parentWindow.y + 150,
        isCollapsed: false,
      });
    },
    [
      templateWindows,
      rulesetWindowDefs,
      effectiveRulesetPageId,
      createRulesetWindow,
      deleteRulesetWindow,
    ],
  );

  const convertWindowsToNode = (windows: RulesetWindowType[]): Node[] => {
    return windows.map((window, index) => {
      const position = { x: window.x, y: window.y };

      return {
        id: `window-${window.id}`,
        type: 'window',
        position,
        draggable: true,
        selectable: false,
        zIndex: index,
        data: {
          window,
          locked: false,
          onClose: (id: string) => deleteRulesetWindow(id),
          onChildWindowClick: (childWindowId: string, parentWindow: { x: number; y: number }) =>
            handleChildWindowClick(childWindowId, parentWindow, window),
          editWindowHref:
            activeRuleset?.id != null
              ? `/rulesets/${activeRuleset.id}/windows/${window.windowId}`
              : undefined,
        },
      };
    });
  };

  const [nodes, setNodes] = useState<Node[]>(convertWindowsToNode(templateWindows));
  const positionUpdateTimeouts = useRef<Map<string, NodeJS.Timeout>>(new Map());

  useEffect(() => {
    setNodes(convertWindowsToNode(templateWindows));
  }, [templateWindows, activeRuleset?.id]);

  const onNodesChange = (changes: NodeChange[]) => {
    for (const change of changes) {
      if (change.type === 'position' && change.position) {
        const positionChange = change as NodePositionChange;
        const windowId = positionChange.id.replace('window-', '');
        const { x, y } = positionChange.position!;

        const existingTimeout = positionUpdateTimeouts.current.get(windowId);
        if (existingTimeout) clearTimeout(existingTimeout);

        const timeout = setTimeout(() => {
          updateRulesetWindow(windowId, { x, y });
          positionUpdateTimeouts.current.delete(windowId);
        }, 150);

        positionUpdateTimeouts.current.set(windowId, timeout);
      }
    }

    setNodes((prev) => applyNodeChanges(changes, prev));
  };

  const handleAddWindow = async (windowDef: { id: string; title: string }) => {
    if (!effectiveRulesetPageId) return;
    await createRulesetWindow({
      title: windowDef.title,
      rulesetPageId: effectiveRulesetPageId,
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
      <BaseEditor
        nodes={nodes}
        onNodesChange={onNodesChange}
        nodeTypes={windowNodeTypes}
        useGrid={false}
        nodesConnectable={false}
        selectNodesOnDrag={false}
        panOnScroll={false}
        zoomOnScroll={false}
        nodesDraggable
        renderContextMenu={false}
        backgroundColor={currentPage?.backgroundColor}
        backgroundImage={currentPage?.image}
        backgroundOpacity={currentPage?.backgroundOpacity}
      />
      {currentPage && (
        <div
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
