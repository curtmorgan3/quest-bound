import { createContext, type MutableRefObject } from 'react';

/**
 * When a Sheet/Dialog is open, RemoveScroll locks body. Popovers portaled to body
 * cannot be scrolled on touch devices. This context provides a ref to the sheet/dialog
 * content element (a RemoveScroll shard) so that NumberInput and other popovers can
 * portal into it and remain scrollable.
 */
export type PopoverScrollContainerContextValue =
  | MutableRefObject<HTMLElement | null>
  | null
  | undefined;

export const PopoverScrollContainerContext =
  createContext<PopoverScrollContainerContextValue>(undefined);
