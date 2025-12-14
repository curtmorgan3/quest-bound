
import { useParams } from 'react-router-dom';
import {
  CreateSheetComponent,
  createSheetComponents,
  CreateSheetComponentsMutation,
  CreateSheetComponentsMutationVariables,
  SheetComponent,
} from '../../gql';
import { useMutation } from '../../utils';
import { useError } from '../metrics';
import { useCacheHelpers } from '../sheets/cache-helpers';
import { cloneRawComponents } from './helpers';

export interface CreateComponents {
  components: SheetComponent[];
  cacheOnly?: boolean;
  clone?: boolean;
  onCreate?: (components: SheetComponent[]) => void;
}

interface CreateComponent {
  component: SheetComponent;
  cacheOnly?: boolean;
  clone?: boolean;
  onCreate?: (component: SheetComponent) => void;
}

interface UseCreateComponent {
  createComponent: (input: CreateComponent) => Promise<string>;
  createComponents: (input: CreateComponents) => Promise<string>;
  loading: boolean;
  error?: Error;
}

export const useCreateComponent = (cacheOnly?: boolean): UseCreateComponent => {
  const { rulesetId } = useParams();

  const [mutation, { loading, error }] = useMutation<
    CreateSheetComponentsMutation,
    CreateSheetComponentsMutationVariables
  >(createSheetComponents);

  useError({
    error,
    message: 'Failed to create components.',
    location: 'useCreateComponent',
  });

  const { addComponentsToCache } = useCacheHelpers();

  const createComponentsMutation = async (
    components: CreateSheetComponent[],
  ): Promise<SheetComponent[]> => {
    const res = await mutation({
      variables: {
        input: components,
      },
      fetchPolicy: 'no-cache',
    });

    if (!res.data?.createSheetComponents) {
      throw Error('Failed to create sheet components.');
    }

    return res.data.createSheetComponents;
  };

  const createComponent = async ({
    component,
    clone = true,
    cacheOnly = false,
    onCreate,
  }: CreateComponent) => {
    await createComponents({
      components: [component],
      clone,
      cacheOnly,
      onCreate: (components) => onCreate?.(components[0]),
    });
    return 'success';
  };

  /**
   * Creates new components by optimistically updating cached sheet with new component, then calls a mutation to create it.
   */
  const createComponents = async ({
    components,
    clone = true,
    cacheOnly: scopedCacheOnly = false,
    onCreate,
  }: CreateComponents) => {
    if (!rulesetId) return 'empty';
    if (components.length === 0) return 'empty';

    const clonedComponents = clone ? cloneRawComponents(components) : components;

    addComponentsToCache(clonedComponents);

    onCreate?.(clonedComponents);

    if (cacheOnly || scopedCacheOnly) return 'success';

    await createComponentsMutation(
      clonedComponents.map((c) => ({
        ...c,
        rulesetId,
        images: undefined,
        imageIds: c.images?.map((i) => i.id) || undefined,
      })),
    );
    return 'success';
  };

  return {
    createComponent,
    createComponents,
    loading,
    error,
  };
};
