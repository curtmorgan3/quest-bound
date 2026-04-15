import {
  useCharacterPages,
  useCharacterWindows,
  useWindows,
  type CharacterWindowUpdate,
} from '@/lib/compass-api';
import { db } from '@/stores';
import type { CharacterWindow } from '@/types';
import { useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { dispatchSheetViewerBackdropClick } from './backdrop-click-event';
import { WindowCanvasHost } from './window-canvas-host';
import { WindowNode } from './window-node';
import { WindowsTabs } from './windows-tabs';

interface SheetViewerProps {
  characterId?: string;
  onWindowUpdated?: (update: CharacterWindowUpdate) => void;
  /** Initial current page (e.g. from localStorage). SheetViewer may still reset to first page if this id is invalid. */
  initialCurrentPageId?: string | null;
  editorWindowId?: string;
  /** When true, no page background color/image is shown (e.g. character editor embed). */
  transparentBackground?: boolean;
  /** When true, character windows with `isCollapsed` still render on the canvas (e.g. ruleset window editor preview). */
  ignoreCharacterWindowCollapsedState?: boolean;
  forceFitSheetToViewport?: boolean;
  /**
   * When true (archetype default sheet editor), bottom bar includes add page/window and page edit.
   * Player character sheet omits these.
   */
  allowManagePagesAndWindows?: boolean;
}

export const SheetViewer = ({
  characterId,
  onWindowUpdated,
  initialCurrentPageId,
  editorWindowId,
  transparentBackground = false,
  ignoreCharacterWindowCollapsedState = false,
  forceFitSheetToViewport = false,
  allowManagePagesAndWindows = false,
}: SheetViewerProps) => {
  const { characterPages, updateCharacterPage } = useCharacterPages(characterId);

  const sortedCharacterPages = [
    ...characterPages.sort((a, b) => a.label?.localeCompare(b.label ?? '')),
  ];
  const {
    windows: characterWindows,
    createCharacterWindow,
    deleteCharacterWindow,
  } = useCharacterWindows(characterId);
  const { windows: rulesetWindowDefs } = useWindows();
  const [searchParams] = useSearchParams();

  const currentPageId =
    searchParams.get('pageId') ?? initialCurrentPageId ?? sortedCharacterPages[0]?.id;

  const sheetBottomBarRef = useRef<HTMLDivElement>(null);
  const [sheetFitBottomInsetPx, setSheetFitBottomInsetPx] = useState(0);

  useLayoutEffect(() => {
    if (editorWindowId) {
      setSheetFitBottomInsetPx(0);
      return;
    }
    const el = sheetBottomBarRef.current;
    if (!el) {
      setSheetFitBottomInsetPx(0);
      return;
    }
    const update = () => setSheetFitBottomInsetPx(el.getBoundingClientRect().height);
    const ro = new ResizeObserver(update);
    ro.observe(el);
    update();
    return () => ro.disconnect();
  }, [editorWindowId]);

  const currentPage = editorWindowId
    ? undefined
    : characterPages.find((p) => p.id === currentPageId);

  const sheetFitToViewport =
    forceFitSheetToViewport || (!editorWindowId && currentPage?.sheetFitToViewport === true);

  const handleSheetFitToViewportChange = useCallback(() => {
    if (!characterId || !currentPageId) return;
    const page = characterPages.find((p) => p.id === currentPageId);
    if (!page) return;
    void updateCharacterPage(currentPageId, {
      sheetFitToViewport: !(page.sheetFitToViewport === true),
    });
  }, [characterId, characterPages, currentPageId, updateCharacterPage]);

  // Windows on the current page
  const windowsForCurrentPage = useMemo(() => {
    if (currentPageId === null || currentPageId === undefined) {
      return [];
    }
    return characterWindows.filter((w) => w.characterPageId === currentPageId);
  }, [characterWindows, currentPageId]);

  // When editorWindowId is set, track which sub-windows were opened from this view so we render them too
  const [openedChildRulesetWindowIds, setOpenedChildRulesetWindowIds] = useState<Set<string>>(
    () => new Set(),
  );

  // If editorWindowId is provided, render that window plus any sub-windows opened from it
  const windowsToRenderAsNodes = useMemo(() => {
    if (editorWindowId) {
      const matchingRoots = characterWindows.filter((w) => w.windowId === editorWindowId);
      /** Preview must show one instance even if the test character has duplicate opens of the same template. */
      const root =
        matchingRoots.length <= 1
          ? matchingRoots
          : [
              [...matchingRoots].sort((a, b) => {
                const t = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
                if (t !== 0) return t;
                return a.id.localeCompare(b.id);
              })[0],
            ];
      const children = characterWindows.filter(
        (w) => !w.characterPageId && openedChildRulesetWindowIds.has(w.windowId),
      );
      return [...root, ...children];
    }
    return windowsForCurrentPage;
  }, [windowsForCurrentPage, editorWindowId, characterWindows, openedChildRulesetWindowIds]);

  // Stacking order is `CharacterWindow.layer` (and tie-breakers) inside `WindowCanvasHost`.
  const openCharacterWindows = useMemo(
    () =>
      windowsToRenderAsNodes.filter((w) => {
        if (editorWindowId || ignoreCharacterWindowCollapsedState) return true;
        return !w.isCollapsed;
      }),
    [editorWindowId, ignoreCharacterWindowCollapsedState, windowsToRenderAsNodes],
  );

  const handleChildWindowClick = async (
    childWindowId: string,
    characterWindow: CharacterWindow,
    resolved?: { x: number; y: number; collapseIfOpen?: boolean },
  ) => {
    const existing = editorWindowId
      ? characterWindows.find((cw) => !cw.characterPageId && cw.windowId === childWindowId)
      : windowsForCurrentPage.find((cw) => cw.windowId === childWindowId);

    if (existing) {
      deleteCharacterWindow(existing.id);
      if (editorWindowId) {
        setOpenedChildRulesetWindowIds((prev) => {
          const next = new Set(prev);
          next.delete(childWindowId);
          return next;
        });
      }
      return;
    }
    const w =
      rulesetWindowDefs.find((r) => r.id === childWindowId) ??
      (await db.windows.get(childWindowId));
    if (!w || !characterId) return;
    const peers = characterWindows.filter(
      (cw) => (cw.characterPageId ?? null) === (characterWindow.characterPageId ?? null),
    );
    const maxPeerLayer = peers.reduce(
      (m, r) => Math.max(m, typeof r.layer === 'number' && Number.isFinite(r.layer) ? r.layer : -1),
      -1,
    );
    createCharacterWindow({
      windowId: w.id,
      characterId,
      characterPageId: characterWindow.characterPageId ?? undefined,
      title: w.title,
      x: resolved?.x ?? characterWindow.x + 200,
      y: resolved?.y ?? characterWindow.y + 150,
      isCollapsed: false,
      layer: maxPeerLayer + 1,
    });
    if (editorWindowId) {
      setOpenedChildRulesetWindowIds((prev) => new Set(prev).add(childWindowId));
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', position: 'relative' }}>
      <WindowCanvasHost
        className='relative min-h-0 w-full flex-1 overflow-hidden'
        windows={openCharacterWindows}
        locked={false}
        staticWindows
        sheetFitToViewport={sheetFitToViewport}
        sheetFitBottomInsetPx={sheetFitBottomInsetPx}
        onWindowPositionUpdate={(id, x, y) => onWindowUpdated?.({ id, x, y })}
        transparentBackground={transparentBackground && !editorWindowId}
        backgroundColor={
          !transparentBackground && !editorWindowId ? currentPage?.backgroundColor : undefined
        }
        backgroundImage={!transparentBackground && !editorWindowId ? currentPage?.image : undefined}
        backgroundOpacity={
          !transparentBackground && !editorWindowId ? currentPage?.backgroundOpacity : undefined
        }
        onBackdropClick={(clientX, clientY) => dispatchSheetViewerBackdropClick(clientX, clientY)}
        renderWindow={(window, layout) => {
          const wAt = { ...window, x: layout.x, y: layout.y };
          return (
            <WindowNode
              data={{
                locked: false,
                hideWindowChrome: true,
                sheetTemplatePageId: !editorWindowId ? currentPage?.pageId : null,
                window: wAt,
                onClose: (id) => {
                  void deleteCharacterWindow(id);
                },
                onChildWindowClick: (childWindowId, openResolved) =>
                  handleChildWindowClick(childWindowId, wAt, openResolved),
              }}
            />
          );
        }}
      />
      {!editorWindowId && (
        <WindowsTabs
          pageId={currentPageId}
          characterPages={characterPages}
          allowManagePagesAndWindows={allowManagePagesAndWindows}
          characterId={characterId}
          showHiddenWindows={allowManagePagesAndWindows}
          sheetFitToViewport={sheetFitToViewport}
          onSheetFitToViewportChange={
            characterId && currentPageId ? handleSheetFitToViewportChange : undefined
          }
          bottomBarRef={sheetBottomBarRef}
        />
      )}
    </div>
  );
};
