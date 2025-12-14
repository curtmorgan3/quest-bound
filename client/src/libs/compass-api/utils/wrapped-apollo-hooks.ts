import {
  useLazyQuery as _useLazyQuery,
  useMutation as _useMutation,
  useQuery as _useQuery,
} from '@apollo/client/react'
import type {
  ApolloCache,
  ErrorLike,
  OperationVariables,
} from '@apollo/client'

/*
Overrides the default error handling behavior of Apollo's hooks.
Prevents Apollo from throwing errors on the client when errors are raised in GraphQL resolvers.
These errors are shown to the user in the useError hook.
*/

// Wrapper functions that match the original hook signatures but exclude static properties
export function useMutation<TData = unknown, TVariables extends OperationVariables = OperationVariables, TCache extends ApolloCache = ApolloCache, TConfiguredVariables extends Partial<TVariables> = {}>(
  mutation: Parameters<typeof _useMutation>[0],
  options?: Parameters<typeof _useMutation>[1]
): ReturnType<typeof _useMutation<TData, TVariables, TCache, TConfiguredVariables>> {
  return _useMutation(mutation, {
    ...(options as any),
    onError: (e: ErrorLike) => {
      console.warn('Error in useMutation', e.message);
      (options as any)?.onError?.(e);
    },
  } as any) as ReturnType<typeof _useMutation<TData, TVariables, TCache, TConfiguredVariables>>;
}

export function useQuery<TData = unknown, TVariables extends OperationVariables = OperationVariables>(
  query: Parameters<typeof _useQuery>[0],
  options?: Parameters<typeof _useQuery>[1]
): ReturnType<typeof _useQuery<TData, TVariables>> {
  return _useQuery(query, {
    ...(options as any),
    onError: (e: ErrorLike) => {
      console.warn('Error in useQuery', e.message);
      (options as any)?.onError?.(e);
    },
  } as any) as ReturnType<typeof _useQuery<TData, TVariables>>;
}

export function useLazyQuery<TData = unknown, TVariables extends OperationVariables = OperationVariables>(
  query: Parameters<typeof _useLazyQuery>[0],
  options?: Parameters<typeof _useLazyQuery>[1]
): ReturnType<typeof _useLazyQuery<TData, TVariables>> {
  return _useLazyQuery(query, {
    ...(options as any),
    onError: (e: ErrorLike) => {
      console.warn('Error in useLazyQuery', e.message);
      (options as any)?.onError?.(e);
    },
  } as any) as ReturnType<typeof _useLazyQuery<TData, TVariables>>;
}
