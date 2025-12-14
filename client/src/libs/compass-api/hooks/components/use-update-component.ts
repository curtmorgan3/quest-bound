import { debugLog } from '@/libs/compass-web-utils';

import debounce from 'lodash.debounce';
import { useMemo } from 'react';
import { useParams } from 'react-router-dom';
import {
  UpdateSheetComponent,
  updateSheetComponents,
  UpdateSheetComponentsMutation,
  UpdateSheetComponentsMutationVariables,
} from '../../gql';
import { useMutation } from '../../utils';
import { useError } from '../metrics';
import { useCacheHelpers } from '../sheets/cache-helpers';

const { log } = debugLog('API', 'useUpdateComponent');

export interface UpdateComponentsInput {
  updates: Array<Omit<UpdateSheetComponent, 'rulesetId' | 'sheetId'>>;
  sheetId: string;
  opt?: { cacheOnly?: boolean; sync?: boolean };
}

export interface UpdateComponentInput {
  update: Omit<UpdateSheetComponent, 'rulesetId' | 'sheetId'>;
  sheetId: string;
  opt?: { cacheOnly?: boolean; sync?: boolean };
}

export interface UseUpdateComponents {
  updateComponent: (input: UpdateComponentInput) => any;
  updateComponents: (input: UpdateComponentsInput) => any;
  loading: boolean;
  error?: Error;
}

interface UseUpdateComponentProps {
  sheetId: string;
  addFailedUpdateIds: (ids: string[]) => void;
  removeFailedUpdateIds: (ids: string[]) => void;
  cacheOnly?: boolean;
  debounceTime?: number;
}

export const useUpdateComponent = ({
  sheetId,
  addFailedUpdateIds,
  removeFailedUpdateIds,
  cacheOnly,
  debounceTime = 5000,
}: UseUpdateComponentProps): UseUpdateComponents => {
  const { rulesetId, characterId } = useParams();

  const [mutation, { loading, error }] = useMutation<
    UpdateSheetComponentsMutation,
    UpdateSheetComponentsMutationVariables
  >(updateSheetComponents);

  useError({
    error,
    // Each mutation's queued components will remain in the queue until the mutation succeeds.
    message: "Failed to save component. We'll contiue to try.",
    location: 'useUpdateComponents',
  });

  const { updateComponentsCacheOnly, getComponentFromCache } = useCacheHelpers();

  // Queues components for mutation, debouncing and only firing the latest per component
  // If the mutation fails, the components are not removed from the queue, ensuring they're
  // included in the next call.
  const queue = useMemo(() => new Map<string, UpdateSheetComponent>(), []);

  const updateItemInQueue = (update: UpdateSheetComponent) => {
    if (!queue.get(update.id)) {
      queue.set(update.id, update);
      return;
    }

    queue.set(update.id, {
      ...queue.get(update.id),
      ...update,
    });
  };

  const debouncedUpdate = useMemo(
    () =>
      debounce(
        (sheetId: string) => {
          const componentRequests = [...queue.values()];
          const componentsToUpdate: UpdateSheetComponent[] = [];

          // Remove any components in queue that have been removed from cache
          // Occurs when a component fails to update, then gets deleted
          for (const id of queue.keys()) {
            const cachedComponent = getComponentFromCache(id, sheetId);
            if (!cachedComponent) {
              queue.delete(id);
              removeFailedUpdateIds([id]);
            }
          }

          // Ignore any updates that have been removed from cache
          // Occurs when a component is deleted while in the queue
          const deletedComponents: UpdateSheetComponent[] = [];
          for (const component of componentRequests) {
            const cachedComponent = getComponentFromCache(component.id, sheetId);
            if (!!cachedComponent) {
              componentsToUpdate.push({ ...component, characterId });
            } else {
              deletedComponents.push(component);
            }
          }
          removeFailedUpdateIds(deletedComponents.map((c) => c.id));
          deletedComponents.forEach((update) => queue.delete(update.id));

          if (componentsToUpdate.length === 0) {
            log(
              "Component update queue is empty. It's likely that a component was deleted while in the queue.",
            );
            return;
          }

          mutation({
            variables: {
              input: componentsToUpdate,
            },
            // Avoids collision of optimistic updates and responses
            fetchPolicy: 'no-cache',
            // Clears this hook's queue on mutation completion
            onCompleted: (data) => {
              const { failedUpdateIds } = data.updateSheetComponents;
              addFailedUpdateIds(failedUpdateIds);

              const successfulUpdates = componentRequests.filter(
                (c) => !failedUpdateIds.includes(c.id),
              );
              removeFailedUpdateIds(successfulUpdates.map((c) => c.id));

              // Only remove successfully updated components from queue
              successfulUpdates.forEach((update) => queue.delete(update.id));
            },
          });
        },
        debounceTime,
        {
          trailing: true,
        },
      ),
    [],
  );

  /**
   * Accepts a list of partial components to be updated
   */
  const updateComponents = async ({
    updates,
    opt = { cacheOnly: false },
  }: UpdateComponentsInput) => {
    if (!rulesetId) return;
    // Overwrite opt with hook level cacheOnly
    const updateCacheOnly = cacheOnly || opt.cacheOnly || false;

    const updatesWithRulesetId = updates.map((update) => ({
      ...update,
      sheetId,
      rulesetId,
    }));

    // Update component in cache
    updateComponentsCacheOnly(updatesWithRulesetId, sheetId);
    if (updateCacheOnly) return;

    // Don't debounce the call and await the mutation
    if (opt.sync) {
      const res = await mutation({
        variables: {
          input: updatesWithRulesetId,
        },
        // Avoids collision of optimistic updates and responses
        // Failed updates are handled in the onCompleted callback
        fetchPolicy: 'no-cache',
      });
      return res.data;
    }

    // Add update to queue
    updatesWithRulesetId.forEach((update) => updateItemInQueue(update));
    // Call mutation
    debouncedUpdate(sheetId);
  };

  const updateComponent = ({ update, opt = { cacheOnly: false } }: UpdateComponentInput) => {
    return updateComponents({ updates: [update], sheetId, opt });
  };

  return {
    updateComponent,
    updateComponents,
    loading,
    error,
  };
};
