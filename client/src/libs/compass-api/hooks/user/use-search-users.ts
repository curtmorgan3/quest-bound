
import {
  searchUsers as searchUsersQuery,
  SearchUsersQuery,
  SearchUsersQueryVariables,
  User,
} from '../../gql';
import { useLazyQuery } from '../../utils';
import { useError } from '../metrics';

interface UseSearchUsers {
  searchUsers: (input: SearchUsersQueryVariables) => Promise<User[]>;
  loading: boolean;
  error?: Error;
}

export const useSearchUsers = (): UseSearchUsers => {
  const [query, { loading, error }] = useLazyQuery<SearchUsersQuery, SearchUsersQueryVariables>(
    searchUsersQuery,
    { fetchPolicy: 'network-only' },
  );

  useError({
    error: error,
    message: 'Failed to search users.',
  });

  const searchUsers = async (input: SearchUsersQueryVariables): Promise<User[]> => {
    const res = await query({ variables: { ...input } });

    if (!res.data?.searchUsers) {
      throw Error('Failed to search users.');
    }

    return res.data.searchUsers as User[];
  };

  return {
    searchUsers,
    loading: loading,
    error: error,
  };
};
