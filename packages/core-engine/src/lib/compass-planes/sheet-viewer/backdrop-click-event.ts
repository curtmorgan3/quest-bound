/** Custom window event when the sheet viewer backdrop (non-node area) is clicked. */
export const SHEET_VIEWER_BACKDROP_CLICK = 'compass-planes-backdrop-click';

export interface SheetViewerBackdropClickDetail {
  clientX: number;
  clientY: number;
}

export function dispatchSheetViewerBackdropClick(clientX: number, clientY: number): void {
  window.dispatchEvent(
    new CustomEvent<SheetViewerBackdropClickDetail>(SHEET_VIEWER_BACKDROP_CLICK, {
      detail: { clientX, clientY },
    }),
  );
}
