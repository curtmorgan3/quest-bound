import { generateId } from '@/libs/compass-web-utils';

import { useParams } from 'react-router-dom';
import {
  CreateSheet,
  createSheet as createSheetMutation,
  CreateSheetMutation,
  CreateSheetMutationVariables,
  pageTemplates,
  Sheet,
  sheetTemplates,
  SheetType,
  TemplateType,
} from '../../gql';
import { MutationFunction } from '../../types';
import { useMutation } from '../../utils';
import { useError } from '../metrics';
import { useCurrentUser } from '../user';
import { useCacheHelpers } from './cache-helpers';

interface CreateSheetFromTemplate {
  templateId: string;
  overrides?: Partial<CreateSheet>;
}

interface UseCreateSheet {
  createSheetTemplate: MutationFunction<Partial<CreateSheet>, Sheet>;
  createSheetFromTemplate: (input: CreateSheetFromTemplate) => Promise<Sheet>;
  createSheetCacheOnly: (input: Partial<Omit<Sheet, '__typename'>>) => Sheet;
  loading: boolean;
  error?: Error;
}

export const useCreateSheet = (): UseCreateSheet => {
  const { rulesetId } = useParams();
  const { createSheetCacheOnly } = useCacheHelpers();

  const [mutation, { loading, error }] = useMutation<
    CreateSheetMutation,
    CreateSheetMutationVariables
  >(createSheetMutation, {
    refetchQueries: rulesetId
      ? [
          { query: sheetTemplates, variables: { rulesetId } },
          { query: pageTemplates, variables: { rulesetId } },
        ]
      : [],
  });

  useError({
    error,
    message: 'Failed to create sheet.',
    location: 'useCreateSheet',
  });

  const { currentUser, loading: currentUserLoading } = useCurrentUser();

  const createSheetFromTemplate = async ({
    templateId,
    overrides,
  }: CreateSheetFromTemplate): Promise<Sheet> => {
    if (!currentUser) {
      throw Error('Failed to create sheet. Current user not found.');
    }

    const res = await mutation({
      variables: {
        input: {
          templateId,
          ...overrides,
        },
      },
    });

    if (!res.data?.createSheet) {
      throw Error('Failed to create sheet.');
    }

    return res.data?.createSheet;
  };

  const createSheetTemplate = async (input: Partial<CreateSheet>): Promise<Sheet> => {
    if (!currentUser) {
      throw Error('Failed to create sheet. Current user not found.');
    }

    const defaultDetails =
      input.templateType === TemplateType.PAGE
        ? {
            defaultFont: 'Roboto Condensed',
            colors: [],
            snapToGrid: true,
            enableLogic: false,
            renderGrid: 'dot',
          }
        : {
            defaultFont: 'Roboto Condensed',
            colors: [],
            snapToGrid: true,
            enableLogic: true,
            renderGrid: 'square',
          };

    const res = await mutation({
      variables: {
        input: {
          ...input,
          details: JSON.stringify({
            ...defaultDetails,
            ...JSON.parse(input.details || '{}'),
          }),
        },
      },
    });

    if (!res.data?.createSheet) {
      throw Error('Failed to create sheet.');
    }

    return res.data?.createSheet;
  };

  const _createSheetCacheOnly = (input: Partial<Omit<Sheet, '__typename'>>): Sheet => {
    return createSheetCacheOnly({
      id: input.id ?? `cache-only-${generateId()}`,
      title: input.title ?? 'Cache Only',
      templateType: null,
      type: SheetType.SHEET,
      userId: currentUser?.id ?? '',
      tabs: JSON.stringify([{ title: 'tab', position: 0, tabId: 'cache-only' }]),
      version: 1,
      description: '',
      pageId: '',
      username: '',
      components: [],
      templateId: null,
      rulesetId: null,
      rulesetTitle: null,
      backgroundImage: null,
      templateName: null,
      image: null,
      details: JSON.stringify({
        defaultFont: 'Roboto Condensed',
        colors: [],
        snapToGrid: true,
        enableLogic: false,
        renderGrid: 'dot',
      }),
      ...input,
    });
  };

  return {
    createSheetTemplate,
    createSheetFromTemplate,
    createSheetCacheOnly: _createSheetCacheOnly,
    loading: loading || currentUserLoading,
    error,
  };
};
