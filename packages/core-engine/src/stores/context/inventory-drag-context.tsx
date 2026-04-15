import { type InventoryItemWithData } from '@/stores';
import {
  createContext,
  type PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

type DragSource = 'node' | 'panel';

export type InventoryDropTargetConfig = {
  componentId: string;
  getBounds: () => DOMRect | null;
  /** Layout (pre-transform) size; used with getBounds() to map client coords when the window is CSS-scaled. */
  layoutWidth: number;
  layoutHeight: number;
  cellWidth: number;
  cellHeight: number;
  gridCols: number;
  gridRows: number;
  typeRestriction?: 'item' | 'action' | 'attribute';
  categoryRestriction?: string;
};

type RegisteredTarget = {
  id: string;
  config: InventoryDropTargetConfig;
};

export type ActiveInventoryDrag = {
  item: InventoryItemWithData;
  source: DragSource;
  /** When `'title'`, drag preview shows text even if the item has an image (matches grid). */
  showItemAs?: 'image' | 'title';
};

export type ResolvedInventoryDrop = {
  targetComponentId: string;
  cellX: number;
  cellY: number;
  config: InventoryDropTargetConfig;
};

type InventoryDragContextValue = {
  activeDrag: ActiveInventoryDrag | null;
  dragPosition: { clientX: number; clientY: number } | null;
  beginDrag: (
    drag: ActiveInventoryDrag,
    initialPosition?: { clientX: number; clientY: number },
  ) => void;
  updateDragPosition: (position: { clientX: number; clientY: number } | null) => void;
  cancelDrag: () => void;
  resolveDrop: (clientX: number, clientY: number) => ResolvedInventoryDrop | null;
  registerDropTarget: (id: string, config: InventoryDropTargetConfig) => void;
  unregisterDropTarget: (id: string) => void;
};

/** No-op fallback so sheet/inventory view nodes can mount without throwing (e.g. isolated previews). */
const defaultInventoryDragContextValue: InventoryDragContextValue = {
  activeDrag: null,
  dragPosition: null,
  beginDrag: () => {},
  updateDragPosition: () => {},
  cancelDrag: () => {},
  resolveDrop: () => null,
  registerDropTarget: () => {},
  unregisterDropTarget: () => {},
};

const InventoryDragContext = createContext<InventoryDragContextValue>(
  defaultInventoryDragContextValue,
);

export const InventoryDragProvider = ({ children }: PropsWithChildren) => {
  const [activeDrag, setActiveDrag] = useState<ActiveInventoryDrag | null>(null);
  const [dragPosition, setDragPosition] = useState<{ clientX: number; clientY: number } | null>(
    null,
  );
  const targetsRef = useRef<RegisteredTarget[]>([]);

  const beginDrag = useCallback(
    (drag: ActiveInventoryDrag, initialPosition?: { clientX: number; clientY: number }) => {
      setActiveDrag(drag);
      if (initialPosition) {
        setDragPosition(initialPosition);
      } else {
        setDragPosition(null);
      }
    },
    [],
  );

  const updateDragPosition = useCallback(
    (position: { clientX: number; clientY: number } | null) => {
      setDragPosition(position);
    },
    [],
  );

  const cancelDrag = useCallback(() => {
    setActiveDrag(null);
    setDragPosition(null);
  }, []);

  const registerDropTarget = useCallback((id: string, config: InventoryDropTargetConfig) => {
    targetsRef.current = [
      ...targetsRef.current.filter((t) => t.id !== id),
      {
        id,
        config,
      },
    ];
  }, []);

  const unregisterDropTarget = useCallback((id: string) => {
    targetsRef.current = targetsRef.current.filter((t) => t.id !== id);
  }, []);

  const resolveDrop = useCallback(
    (clientX: number, clientY: number): ResolvedInventoryDrop | null => {
      // Find the first target whose bounds contain the point.
      for (const target of targetsRef.current) {
        const rect = target.config.getBounds();
        if (!rect) continue;

        if (
          clientX >= rect.left &&
          clientX <= rect.right &&
          clientY >= rect.top &&
          clientY <= rect.bottom
        ) {
          let localX = clientX - rect.left;
          let localY = clientY - rect.top;

          const layoutW =
            target.config.layoutWidth > 0 ? target.config.layoutWidth : rect.width;
          const layoutH =
            target.config.layoutHeight > 0 ? target.config.layoutHeight : rect.height;
          if (rect.width > 0 && rect.height > 0) {
            localX = (localX / rect.width) * layoutW;
            localY = (localY / rect.height) * layoutH;
          }

          let cellX: number;
          let cellY: number;

          if (activeDrag) {
            const itemWidthInPixels = activeDrag.item.inventoryWidth * 20;
            const itemHeightInPixels = activeDrag.item.inventoryHeight * 20;

            // Pointer is at the visual center of the dragged item.
            // Convert to the item's top-left, then snap using a majority rule
            // similar to in-grid dragging.
            const leftPixel = localX - itemWidthInPixels / 2;
            const topPixel = localY - itemHeightInPixels / 2;

            cellX = Math.floor(
              (leftPixel + target.config.cellWidth / 2) / target.config.cellWidth,
            );
            cellY = Math.floor(
              (topPixel + target.config.cellHeight / 2) / target.config.cellHeight,
            );
          } else {
            // Fallback: center-based snapping if we somehow have no active drag.
            cellX = Math.floor(
              (localX + target.config.cellWidth / 2) / target.config.cellWidth,
            );
            cellY = Math.floor(
              (localY + target.config.cellHeight / 2) / target.config.cellHeight,
            );
          }

          return {
            targetComponentId: target.config.componentId,
            cellX,
            cellY,
            config: target.config,
          };
        }
      }

      return null;
    },
    [activeDrag],
  );

  // Global safeguard: if a drag is active but no specific drop handler fires
  // (e.g. pointerup outside expected elements), ensure we clear the drag
  // state on the next pointerup/pointercancel at the window level.
  useEffect(() => {
    if (!activeDrag) return;

    const handleWindowPointerEnd = () => {
      // Defer to allow any component-level handlers to run first.
      setTimeout(() => {
        cancelDrag();
      }, 0);
    };

    window.addEventListener('pointerup', handleWindowPointerEnd);
    window.addEventListener('pointercancel', handleWindowPointerEnd);

    return () => {
      window.removeEventListener('pointerup', handleWindowPointerEnd);
      window.removeEventListener('pointercancel', handleWindowPointerEnd);
    };
  }, [activeDrag, cancelDrag]);

  const value = useMemo<InventoryDragContextValue>(
    () => ({
      activeDrag,
      dragPosition,
      beginDrag,
      updateDragPosition,
      cancelDrag,
      resolveDrop,
      registerDropTarget,
      unregisterDropTarget,
    }),
    [
      activeDrag,
      dragPosition,
      beginDrag,
      cancelDrag,
      resolveDrop,
      registerDropTarget,
      unregisterDropTarget,
    ],
  );

  return <InventoryDragContext.Provider value={value}>{children}</InventoryDragContext.Provider>;
};

export const useInventoryDragContext = () => useContext(InventoryDragContext);
