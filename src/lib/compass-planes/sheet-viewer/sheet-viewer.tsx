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
  onWindowDeleted?: (id: string) => void;
  lockByDefault?: boolean;
  /** Initial current page (e.g. from localStorage). SheetViewer may still reset to first page if this id is invalid. */
  initialCurrentPageId?: string | null;
  /** Initial locked state (e.g. from localStorage). */
  initialLocked?: boolean;
  /** Called when the locked state changes (e.g. to persist). */
  onLockedChange?: (locked: boolean) => void;
  editorWindowId?: string;
  /** When true, no page background color/image is shown (e.g. character editor embed). */
  transparentBackground?: boolean;
  /** When true, windows marked as hidden from player view are still shown in the add-window list. */
  showHiddenWindows?: boolean;
}

export const SheetViewer = ({
  characterId,
  onWindowUpdated,
  onWindowDeleted,
  lockByDefault,
  initialCurrentPageId,
  initialLocked,
  onLockedChange,
  editorWindowId,
  transparentBackground = false,
  showHiddenWindows = false,
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

  const [locked, setLockedState] = useState<boolean>(initialLocked ?? lockByDefault ?? false);
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

  const sheetFitToViewport = !editorWindowId && currentPage?.sheetFitToViewport === true;

  const handleSheetFitToViewportChange = useCallback(() => {
    if (!characterId || !currentPageId) return;
    const page = characterPages.find((p) => p.id === currentPageId);
    if (!page) return;
    void updateCharacterPage(currentPageId, {
      sheetFitToViewport: !(page.sheetFitToViewport === true),
    });
  }, [characterId, characterPages, currentPageId, updateCharacterPage]);

  const setLocked = (next: boolean | ((prev: boolean) => boolean)) => {
    setLockedState((prev) => {
      const value = typeof next === 'function' ? next(prev) : next;
      onLockedChange?.(value);
      return value;
    });
  };

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
      const root = characterWindows.filter(
        (w) => w.windowId === editorWindowId && !w.characterPageId,
      );
      const children = characterWindows.filter(
        (w) => !w.characterPageId && openedChildRulesetWindowIds.has(w.windowId),
      );
      return [...root, ...children];
    }
    return windowsForCurrentPage;
  }, [windowsForCurrentPage, editorWindowId, characterWindows, openedChildRulesetWindowIds]);

  // Windows that are open
  const openWindows = new Set(
    windowsForCurrentPage.filter((cw) => !cw.isCollapsed).map((cw) => cw.id),
  );

  // Sorting by createdAt ensures child windows appear at a higher z-index
  const openCharacterWindows = useMemo(
    () =>
      [
        ...windowsToRenderAsNodes.filter((w) => {
          if (editorWindowId) return true;
          return !w.isCollapsed;
        }),
      ].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()),
    [windowsToRenderAsNodes],
  );

  const handleChildWindowClick = async (
    childWindowId: string,
    parentWindow: { x: number; y: number },
    characterWindow: CharacterWindow,
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
    createCharacterWindow({
      windowId: w.id,
      characterId,
      characterPageId: characterWindow.characterPageId ?? undefined,
      title: w.title,
      x: parentWindow.x + 200,
      y: parentWindow.y + 150,
      isCollapsed: false,
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
        locked={locked}
        sheetFitToViewport={sheetFitToViewport}
        sheetFitBottomInsetPx={sheetFitBottomInsetPx}
        onWindowPositionUpdate={(id, x, y) => onWindowUpdated?.({ id, x, y })}
        transparentBackground={transparentBackground && !editorWindowId}
        backgroundColor={
          !transparentBackground && !editorWindowId ? currentPage?.backgroundColor : undefined
        }
        backgroundImage={!transparentBackground && !editorWindowId ? currentPage?.image : undefined}
        backgroundOpacity={!transparentBackground && !editorWindowId ? currentPage?.backgroundOpacity : undefined}
        onBackdropClick={(clientX, clientY) =>
          dispatchSheetViewerBackdropClick(clientX, clientY)
        }
        renderWindow={(window, layout) => {
          const wAt = { ...window, x: layout.x, y: layout.y };
          return (
            <WindowNode
              data={{
                locked,
                window: wAt,
                onMinimize: !editorWindowId
                  ? (id: string) => {
                      onWindowUpdated?.({ id, isCollapsed: true });
                    }
                  : undefined,
                onClose: !editorWindowId
                  ? (id: string) => {
                      onWindowDeleted?.(id);
                    }
                  : undefined,
                onChildWindowClick: (childWindowId, parentWindow) =>
                  handleChildWindowClick(childWindowId, parentWindow, wAt),
                onDisplayScaleChange:
                  !locked && onWindowUpdated
                    ? (id, displayScale) => onWindowUpdated({ id, displayScale })
                    : undefined,
              }}
            />
          );
        }}
      />
      {!editorWindowId && (
        <WindowsTabs
          pageId={currentPageId}
          characterId={characterId}
          characterPages={characterPages}
          windows={windowsForCurrentPage}
          openWindows={openWindows}
          toggleWindow={(id: string) => onWindowUpdated?.({ id, isCollapsed: openWindows.has(id) })}
          locked={locked}
          onToggleLock={() => setLocked((prev) => !prev)}
          sheetFitToViewport={sheetFitToViewport}
          onSheetFitToViewportChange={
            characterId && currentPageId ? handleSheetFitToViewportChange : undefined
          }
          showHiddenWindows={showHiddenWindows}
          bottomBarRef={sheetBottomBarRef}
        />
      )}
    </div>
  );
};
