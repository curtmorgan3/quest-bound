import { selectAnyApiLoading, useApiLoadingStore } from '@/stores/api-loading-store';
import { Loading } from './composites/loading';

/**
 * Subscribes to the API loading store with a stable selector (any loading).
 * Only this component re-renders when the aggregate loading state flips.
 * Renders a full-screen overlay when any tracked API is loading.
 */
export function GlobalLoadingOverlay() {
  // This doesn't quite work with the architecture. Virtualized lists, for example,
  // will trigger this to render on nearly every scroll. Disabled for now. Need to
  // reconsider how the API are updating the loading store.

  return null;
  const anyLoading = useApiLoadingStore(selectAnyApiLoading);

  if (!anyLoading) return null;

  return (
    <div
      className='fixed inset-0 z-50 flex items-center justify-center bg-background/80'
      aria-live='polite'
      aria-busy='true'>
      <Loading />
    </div>
  );
}
