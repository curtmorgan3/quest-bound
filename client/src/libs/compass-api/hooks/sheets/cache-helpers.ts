import { debugLog } from '@/libs/compass-web-utils';
import { useApolloClient } from "@apollo/client/react";
import { useParams } from 'react-router-dom';
import {
  componentFragment,
  Sheet,
  sheet,
  SheetComponent,
  sheetComponents,
  sheetFragment,
  UpdateSheet,
  UpdateSheetComponent,
} from '../../gql';
import { getDefaultDimensionsByOperationType, operationTypeToComponentType } from '../../types';
import { useCacheHelpers as useImageCacheHelpers } from '../storage/cache-helpers';

const { warn } = debugLog('useUpdateComponents', 'useCacheHelpers');

export const useCacheHelpers = () => {
  const client = useApolloClient();
  const { rulesetId } = useParams();
  const { getCachedImages } = useImageCacheHelpers();

  const bootstrapSheetComponentsFromLogic = (sheet: Sheet, logic: any): SheetComponent[] => {
    const logicComponents: SheetComponent[] = logic.map((op: any) => ({
      id: op.id,
      __typename: 'SheetComponent',
      sheetId: sheet.id,
      rulesetId: sheet.rulesetId ?? rulesetId,
      label: '',
      style: '{}',
      data: JSON.stringify(op),
      type: operationTypeToComponentType.get(op.type)!,
      tabId: 'logic-editor',
      x: op.x,
      y: op.y,
      locked: false,
      layer: 2,
      rotation: 0,
      description: '',
      images: [],
      groupId: null,
      height: getDefaultDimensionsByOperationType(op.type).height,
      width: getDefaultDimensionsByOperationType(op.type).width,
    }));

    return logicComponents;
  };

  const getComponentsFromCache = (sheetId: string, tabId?: string): SheetComponent[] => {
    const res = client.readQuery({
      query: sheetComponents,
      variables: {
        input: {
          sheetId,
          rulesetId,
          tabId,
        },
      },
    }) as any;

    // When a sheet doesn't have components
    if (!res || !res.sheetComponents) {
      return [];
    }

    const rawComponents = res.sheetComponents as SheetComponent[];
    return rawComponents;
  };

  const createSheetCacheOnly = (input: Omit<Sheet, '__typename'>): Sheet => {
    client.writeQuery({
      query: sheet,
      variables: {
        input: {
          id: input.id,
          rulesetId,
        },
      },
      data: {
        sheet: {
          ...input,
          __typename: 'Sheet',
          rulesetId,
        },
      },
    });

    // https://www.apollographql.com/docs/react/caching/cache-configuration/#calculating-an-objects-cache-id
    const normalizedId = client.cache.identify({
      id: input.id,
      rulesetId,
      __typename: 'Sheet',
    });

    const res = client.readFragment({
      id: normalizedId,
      fragment: sheetFragment,
    }) as any;

    return res;
  };

  const deleteSheetCacheOnly = (id: string) => {
    const normalizedId = client.cache.identify({
      id,
      rulesetId,
      __typename: 'Sheet',
    });

    // Removes the cached sheet ref
    client.cache.evict({
      id: normalizedId,
    });

    client.cache.gc();

    // Removes the ref from the ROOT_QUERY
    // Avoids a cache collision on next sheet update
    client.cache.modify({
      fields: {
        sheets(existing = []) {
          return existing.filter((s: any) => s.__ref !== normalizedId);
        },
      },
    });
  };

  const getSheetFromCache = (id: string): Sheet => {
    const res = client.readQuery({
      query: sheet,
      variables: {
        input: {
          id,
          rulesetId,
        },
      },
    }) as any;

    return res?.sheet ?? null;
  };

  const updateSheetCacheOnly = (update: UpdateSheet, sheetId: string): Sheet => {
    const res = client.readQuery({
      query: sheet,
      variables: {
        input: {
          id: sheetId,
          rulesetId,
        },
      },
    }) as any;

    if (!res || !res.sheet) {
      throw Error('Sheet not found in cache');
    }

    client.writeQuery({
      query: sheet,
      variables: {
        input: {
          id: sheetId,
          rulesetId,
        },
      },
      data: {
        sheet: {
          ...res.sheet,
          ...update,
          details: JSON.stringify({
            ...JSON.parse(res.sheet.details),
            ...JSON.parse(update?.details ?? '{}'),
          }),
        },
      },
    });

    return {
      ...res.sheet,
      ...update,
    };
  };

  const addComponentsToCache = (components: SheetComponent[]) => {
    updateSheetComponentsCacheQuery(components);
  };

  const getComponentFromCache = (componentId: string, sheetId: string, tabId?: string) => {
    const normalizedId = client.cache.identify({
      id: componentId,
      sheetId,
      rulesetId,
      __typename: 'SheetComponent',
    });

    const cachedComponent = client.cache.readFragment({
      fragment: componentFragment,
      id: normalizedId,
    }) as SheetComponent;
    return cachedComponent;
  };

  const updateComponentCacheOnly = (update: UpdateSheetComponent, sheetId: string) => {
    updateComponentsCacheOnly([update], sheetId);
  };

  /**
   * Updates each component by modifying the sheetComponents query for each tab group
   */
  const updateSheetComponentsCacheQuery = (components: SheetComponent[]) => {
    const sheetId = components[0]?.sheetId;

    const componentsByTab = new Map<string, SheetComponent[]>();

    components.forEach((comp) => {
      if (!componentsByTab.has(comp.tabId)) {
        componentsByTab.set(comp.tabId, []);
      }

      componentsByTab.get(comp.tabId)?.push(comp);
    });

    for (const [tabId, comps] of componentsByTab) {
      const cachedComps = getComponentsFromCache(sheetId, tabId);

      const newComponents = comps.filter((c) => !cachedComps.some((cc) => cc.id === c.id));

      const updatedCachedComponents = cachedComps.map((cachedComp) => {
        const updatedComp = comps.find((c) => c.id === cachedComp.id);

        if (updatedComp) {
          return {
            ...cachedComp,
            ...updatedComp,
            x: updatedComp.x ?? cachedComp.x,
            y: updatedComp.y ?? cachedComp.y,
          };
        }

        return cachedComp;
      });

      client.writeQuery({
        query: sheetComponents,
        variables: {
          input: {
            sheetId,
            rulesetId,
            tabId,
          },
        },
        data: {
          sheetComponents: [...updatedCachedComponents, ...newComponents],
        },
      });
    }
  };

  /**
   * Accepts a partial list of sheet components to be updated
   */
  const updateComponentsCacheOnly = (updates: UpdateSheetComponent[], sheetId: string) => {
    const cachedImages = getCachedImages();
    const cachedUpdates = updates.map((update) => {
      const normalizedId = client.cache.identify({
        id: update.id,
        sheetId,
        rulesetId,
        __typename: 'SheetComponent',
      });

      const cachedComponent = client.cache.readFragment({
        fragment: componentFragment,
        id: normalizedId,
      }) as SheetComponent;

      if (!cachedComponent) {
        warn('Component not found in cache');
      }

      if (update.imageIds) {
        const images = cachedImages.filter((i) => update.imageIds?.includes(i.id));

        return {
          ...cachedComponent,
          ...update,
          x: update.x ?? cachedComponent.x,
          y: update.y ?? cachedComponent.y,
          images,
        };
      }

      return {
        ...cachedComponent,
        ...update,
      };
    });

    updateSheetComponentsCacheQuery(cachedUpdates as SheetComponent[]);
  };

  const deleteComponentCacheOnly = (componentId: string, sheetId: string) => {
    const normalizedId = client.cache.identify({
      id: componentId,
      sheetId,
      rulesetId,
      __typename: 'SheetComponent',
    });

    // Removes the cached component ref
    client.cache.evict({
      id: normalizedId,
    });

    client.cache.gc();

    // Removes the ref from the ROOT_QUERY
    // Avoids a cache collision on next component update
    client.cache.modify({
      fields: {
        sheetComponents(existing = []) {
          return existing.filter((c: any) => c.__ref !== normalizedId);
        },
      },
    });
  };

  return {
    getSheetFromCache,
    createSheetCacheOnly,
    bootstrapSheetComponentsFromLogic,
    deleteSheetCacheOnly,
    getComponentsFromCache,
    getComponentFromCache,
    addComponentsToCache,
    updateComponentCacheOnly,
    updateComponentsCacheOnly,
    deleteComponentCacheOnly,
    updateSheetCacheOnly,
  };
};
