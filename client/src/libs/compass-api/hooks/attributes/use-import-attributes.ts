import { getApiEndpoint } from '@/constants';
import axios from 'axios';
import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { AttributeType } from '../../gql';
import { useError } from '../metrics';
import { useSessionToken } from '../user';
import { useGetAttributes } from './use-get-attributes';

export const useImportAttributes = ({ type }: { type?: AttributeType }) => {
  const { rulesetId } = useParams();
  const { token } = useSessionToken();

  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error>();

  const { getAttributes } = useGetAttributes({
    fetchLogic: true,
    type,
  });

  useError({
    error,
    message: 'Error importing data',
    location: 'useImportAttributes',
  });

  const importAttributes = async ({ fileKey }: { fileKey: string }) => {
    try {
      setLoading(true);
      await axios.post(
        `${getApiEndpoint()}/import/attributes`,
        {
          fileKey,
          rulesetId,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      await getAttributes({ fetchPolicy: 'network-only' });
    } catch (e: any) {
      setError(e);
    } finally {
      setLoading(false);
    }
  };

  return {
    importAttributes,
    loading,
    error,
  };
};
