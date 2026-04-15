import { useErrorHandler } from '@/hooks';
import { db } from '@/stores';
import type { CustomProperty, CustomPropertyType } from '@/types';
import { useLiveQuery } from 'dexie-react-hooks';

function getTypeDefault(type: CustomPropertyType): string | number | boolean {
  switch (type) {
    case 'number':
      return 0;
    case 'boolean':
      return false;
    case 'color':
    case 'image':
      return '';
    default:
      return '';
  }
}

export const useCustomProperties = (rulesetId: string | undefined) => {
  const { handleError } = useErrorHandler();

  const customProperties: CustomProperty[] =
    useLiveQuery(
      () =>
        rulesetId
          ? db.customProperties.where('rulesetId').equals(rulesetId).toArray()
          : Promise.resolve([] as CustomProperty[]),
      [rulesetId],
    ) ?? [];

  const createCustomProperty = async (data: {
    label: string;
    type: CustomPropertyType;
    category?: string;
    defaultValue?: string | number | boolean;
  }): Promise<string | undefined> => {
    if (!rulesetId) return undefined;
    const now = new Date().toISOString();
    const id = crypto.randomUUID();
    const defaultValue =
      data.defaultValue ?? getTypeDefault(data.type);
    try {
      await db.customProperties.add({
        id,
        rulesetId,
        label: data.label.trim(),
        type: data.type,
        category: data.category?.trim() || undefined,
        defaultValue,
        createdAt: now,
        updatedAt: now,
      } as CustomProperty);
      return id;
    } catch (e) {
      handleError(e as Error, {
        component: 'useCustomProperties/createCustomProperty',
        severity: 'medium',
      });
      return undefined;
    }
  };

  const updateCustomProperty = async (
    id: string,
    updates: Partial<Pick<CustomProperty, 'label' | 'type' | 'category' | 'defaultValue'>>,
  ) => {
    try {
      await db.customProperties.update(id, {
        ...updates,
        updatedAt: new Date().toISOString(),
      });
    } catch (e) {
      handleError(e as Error, {
        component: 'useCustomProperties/updateCustomProperty',
        severity: 'medium',
      });
    }
  };

  const deleteCustomProperty = async (id: string) => {
    try {
      await db.customProperties.delete(id);
    } catch (e) {
      handleError(e as Error, {
        component: 'useCustomProperties/deleteCustomProperty',
        severity: 'medium',
      });
    }
  };

  return {
    customProperties,
    createCustomProperty,
    updateCustomProperty,
    deleteCustomProperty,
    getTypeDefault,
  };
};
