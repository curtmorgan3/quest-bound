import {
  CreateComponents,
  Sheet,
  SheetComponent,
  UpdateComponentInput,
  UpdateComponentsInput,
  useCreateComponent,
  useCreateSheet,
  useDeleteComponents,
  useGetSheet,
  useUpdateSheet,
} from '@/libs/compass-api';
import { useNavigateTabs } from './use-navigate-tabs';
import { useUpdateComponentsWithQueue } from './use-update-components-with-queue';

interface Props {
  sheetId: string;
  sheetCacheOnly?: boolean;
  cacheOnly?: boolean;
  onCreateComponents?: (components: SheetComponent[]) => void;
  onDeleteComponents?: (ids: string[]) => void;
  onUpdateComponents?: (update: UpdateComponentsInput) => void;
  cacheSheetOverride?: Partial<Sheet>;
}

export const useSheetCrud = ({
  sheetId,
  sheetCacheOnly,
  cacheOnly,
  onCreateComponents,
  onDeleteComponents,
  onUpdateComponents,
  cacheSheetOverride,
}: Props) => {
  const { activeTab } = useNavigateTabs([]);
  const { createSheetCacheOnly } = useCreateSheet();

  if (sheetCacheOnly) {
    const cachedSheet = createSheetCacheOnly(cacheSheetOverride ?? {});
    sheetId = cachedSheet.id;
  }

  const { sheet, getSheet, loading: sheetLoading, error } = useGetSheet(sheetId, cacheOnly);

  // All updates are made only in cache when using a logic editor
  // Skips component fetch in useUpdateComponentsWithQueue until activeTab is established
  const {
    updateComponent: _updateComponent,
    updateComponents: _updateComponents,
    components,
    loading: componentUpdateLoading,
    componentsLoading,
    failedUpdateIds,
  } = useUpdateComponentsWithQueue(sheetId, cacheOnly, activeTab);

  const { updateSheet, loading: updateSheetLoading } = useUpdateSheet(cacheOnly);

  const { createComponents: _createComponents, loading: createComponentsLoading } =
    useCreateComponent(cacheOnly);

  const { deleteComponents: _deleteComponents, loading: deleteComponentsLoading } =
    useDeleteComponents(sheetId, cacheOnly);

  const isUnocked = (id: string) => !components.find((c) => c.id === id)?.locked;

  const createComponents = async (input: CreateComponents) => {
    const componentsToCreate = input.components.map((component) => ({
      ...component,
      x: Math.floor(component.x),
      y: Math.floor(component.y),
    }));

    const res = await _createComponents({
      ...input,
      components: componentsToCreate,
      onCreate: (components) => {
        onCreateComponents?.(components);
        input.onCreate?.(components);
      },
    });
    return res;
  };

  const updateComponent = async (input: UpdateComponentInput, ignoreLock?: boolean) => {
    // if (!ignoreLock && !isUnocked(input.update.id)) return;

    const res = await _updateComponent(input);
    onUpdateComponents?.({
      ...input,
      updates: [input.update],
    });
    return res;
  };

  const updateComponents = async (input: UpdateComponentsInput, ignoreLock?: boolean) => {
    const update = {
      ...input,
      updates: ignoreLock ? input.updates : input.updates.filter((u) => isUnocked(u.id)),
    };

    const res = await _updateComponents(update);
    onUpdateComponents?.(update);
    return res;
  };

  const deleteComponents = async (ids: string[]) => {
    const res = await _deleteComponents(ids);
    onDeleteComponents?.(ids);
    return res;
  };

  return {
    sheet,
    components,
    errorLoadingSheet: !!error,
    getSheet,
    sheetLoading,
    updateSheet,
    updateSheetLoading,
    updateComponent,
    updateComponents,
    componentUpdateLoading,
    failedUpdateIds,
    createComponents,
    createComponentsLoading,
    deleteComponents,
    deleteComponentsLoading,
    componentsLoading,
  };
};
