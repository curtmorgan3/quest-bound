import { MutationFetchPolicy } from '@apollo/client/core/watchQueryOptions';
import { WatchQueryFetchPolicy } from '@apollo/client';

export type QueryOptions = {
  fetchPolicy?: WatchQueryFetchPolicy;
};

export type MutationOptions = {
  fetchPolicy?: MutationFetchPolicy;
};

export type QueryFunction<T, R> = (input: T, opts?: QueryOptions) => Promise<R>;

export type MutationFunction<T, R> = (input: T, opts?: MutationOptions) => Promise<R>;
