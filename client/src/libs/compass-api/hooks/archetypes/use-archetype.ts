import { useParams } from 'react-router-dom';
import { Archetype, archetype, ArchetypeQuery, ArchetypeQueryVariables } from '../../gql';
import { useLazyQuery, useQuery } from '../../utils/wrapped-apollo-hooks';
import { useError } from '../metrics';

export const useArchetype = (id?: string) => {
  const { rulesetId } = useParams();

  const { data, loading, error } = useQuery<ArchetypeQuery, ArchetypeQueryVariables>(archetype, {
    variables: {
      input: {
        rulesetId: rulesetId ?? '',
        id: id ?? '',
      },
    },
    skip: !id || !rulesetId,
  });

  const [lazyQuery, { loading: lazyLoading }] = useLazyQuery<
    ArchetypeQuery,
    ArchetypeQueryVariables
  >(archetype, {
      fetchPolicy: 'network-only',
    });

  useError({
    error,
    message: 'Failed to load archetype',
    location: 'useArchetype',
  });

  const getArchetype = async (id: string) => {
    if (!rulesetId) return;

    const res = await lazyQuery({
      variables: {
        input: {
          rulesetId,
          id,
        },
      },
    });

    if (!res.data) {
      throw Error('Failed to load archetype');
    }

    return res.data.archetype as Archetype;
  };

  return {
    archetype: (data?.archetype as Archetype) ?? null,
    getArchetype,
    loading: loading || lazyLoading,
    error,
  };
};
