import { useParams } from 'react-router-dom';
import {
  Attribute,
  attributes,
  AttributesQuery,
  AttributesQueryVariables,
  attributesWithLogic,
  AttributeType,
} from '../../gql';
import { useLazyQuery } from '../../utils';
import { useError } from '../metrics';

export const useGetAttributes = ({
  type,
  fetchLogic,
  overrideRulesetId,
  fetchPolicy,
}: {
  type?: AttributeType;
  fetchLogic?: boolean;
  overrideRulesetId?: string;
  fetchPolicy?: 'cache-first' | 'cache-and-network' | 'network-only' | 'cache-only' | 'no-cache';
}) => {
  const { rulesetId: _rulesetId } = useParams();
  const rulesetId = overrideRulesetId ?? _rulesetId;

  const query = fetchLogic ? attributesWithLogic : attributes;

  const [lazyQuery, { loading, error }] = useLazyQuery<AttributesQuery, AttributesQueryVariables>(
    query,
    {
      fetchPolicy,
    },
  );

  useError({
    error,
    message: 'Failed to load attributes',
  });

  const getAttributes = async ({ fetchPolicy }: { fetchPolicy?: 'no-cache' | 'network-only' }) => {
    const res = await lazyQuery({
      variables: {
        rulesetId: rulesetId ?? '',
        type,
      }
    });

    if (fetchPolicy) {
      console.warn(`Deprecated fetch policy provided to getAttributes: ${fetchPolicy}`)
    }

    return (res.data?.attributes ?? []) as Attribute[];
  };

  return {
    getAttributes,
    loading,
    error,
  };
};
