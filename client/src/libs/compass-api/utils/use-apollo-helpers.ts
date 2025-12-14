import { useApolloClient } from '@apollo/client/react';
import { useParams } from 'react-router-dom';
import { ruleset } from '../gql';

const typenameToQueryMap = new Map<string, any>([['Ruleset', ruleset]]);

export const useApolloHelpers = () => {
  const client = useApolloClient();
  const { rulesetId } = useParams();

  /**
   * Merges the provided input and the current data in cache for the given typename & ID.
   *
   * Mutation optimisticResponse will throw warnings for missing data. This will fill all missing data, allowing for partial
   * optimistic responses.
   *
   * Only use for updating single entities, e.g. ruleset, attribute, etc.
   */
  const getOptimisticResponse = (typename: string, input: any) => {
    const query = typenameToQueryMap.get(typename);
    if (!query) {
      console.warn(`No query found for typename: ${typename}`);
      return;
    }

    const variables =
      typename === 'Ruleset' ? { id: input.id } : { input: { id: input.id, rulesetId } };

    const data = client.readQuery({
      query,
      variables,
    }) as any;

    if (!data[typename.toLowerCase()]) {
      console.warn(`No data found for typename: ${typename}`);
      return {
        __typename: typename,
        ...input,
      };
    }

    return { ...data[typename.toLowerCase()], ...input };
  };

  return {
    getOptimisticResponse,
  };
};
