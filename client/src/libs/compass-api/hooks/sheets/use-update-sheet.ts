
import { useParams } from 'react-router-dom';
import {
  Sheet,
  SheetType,
  TemplateType,
  UpdateSheet,
  updateSheet as updateSheetMutation,
  UpdateSheetMutation,
  UpdateSheetMutationVariables,
} from '../../gql';
import { useMutation } from '../../utils';
import { useError } from '../metrics';
import { useCacheHelpers } from './cache-helpers';
import { useGetSheet } from './use-get-sheet';

type UpdateSheetMutationFn = {
  input: Omit<UpdateSheet, 'rulesetId'>;
};

interface UseUpdateSheet {
  updateSheet: (input: UpdateSheetMutationFn, opt?: { cacheOnly?: boolean }) => Promise<Sheet>;
  convertSheetToTemplate: (sheetId: string, templateType?: TemplateType) => Promise<Sheet>;
  loading: boolean;
  error?: Error;
}

export const useUpdateSheet = (cacheOnly?: boolean): UseUpdateSheet => {
  const { rulesetId } = useParams();
  const [mutation, { loading, error }] = useMutation<
    UpdateSheetMutation,
    UpdateSheetMutationVariables
  >(updateSheetMutation);

  useError({
    error,
    message: 'Failed to save sheet.',
    location: 'useSaveSheet',
  });

  const { getSheet } = useGetSheet();
  const { updateSheetCacheOnly } = useCacheHelpers();

  const updateSheet = async (update: UpdateSheetMutationFn, opt?: { cacheOnly?: boolean }) => {
    if (!rulesetId) throw Error('Ruleset not found');
    if (opt?.cacheOnly || cacheOnly) {
      const res = updateSheetCacheOnly({ ...update.input, rulesetId }, update.input.id);
      return res;
    }

    const sheet = await getSheet(update.input.id);
    const currentDetails = JSON.parse(sheet.details);
    const updatedDetails = update.input.details ? JSON.parse(update.input.details) : {};

    if (!sheet) {
      throw Error('Unable to update sheet');
    }

    const res = await mutation({
      variables: {
        input: {
          ...update.input,
          rulesetId,
          details: JSON.stringify({
            ...currentDetails,
            ...updatedDetails,
          }),
        },
      },
      optimisticResponse: {
        updateSheet: {
          ...sheet,
          ...(update.input.backgroundImageId === null && {
            backgroundImage: null,
          }),
          details: JSON.stringify({
            ...currentDetails,
            ...updatedDetails,
          }),
          __typename: 'Sheet',
          tabs: !update.input.tabs ? sheet.tabs : update.input.tabs,
        },
      },
    });

    if (!res.data?.updateSheet) {
      throw Error('Unable to save sheet');
    }

    return res.data.updateSheet;
  };

  const convertSheetToTemplate = async (sheetId: string, templateType = TemplateType.SHEET) => {
    if (!rulesetId) throw Error('Ruleset not found');
    const res = await mutation({
      variables: {
        input: {
          rulesetId,
          id: sheetId,
          type: SheetType.TEMPLATE,
          templateType,
          templateId: null,
          templateName: null,
          pageId: null,
        },
      },
    });

    if (!res.data?.updateSheet) {
      throw Error('Unable to convert sheet');
    }

    return res.data.updateSheet;
  };

  return {
    updateSheet,
    convertSheetToTemplate,
    loading,
    error,
  };
};
