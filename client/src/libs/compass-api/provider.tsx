import { debugLog } from '@/libs/compass-web-utils';
import {
  ApolloClient,
  ApolloLink,
  createHttpLink,
} from '@apollo/client';
import { ApolloProvider as Provider } from '@apollo/client/react'
import { setContext } from '@apollo/client/link/context';
import { from, split } from '@apollo/client/link';
import { GraphQLWsLink } from '@apollo/client/link/subscriptions';
import { getMainDefinition } from '@apollo/client/utilities';
import { createClient as createGraphqlClient } from 'graphql-ws';
import { createContext, ReactNode } from 'react';
import { cache } from './cache';
import { useSessionToken } from './hooks';
import { addStaticDomain } from './utils/inject-static-domain';

const { warn } = debugLog('API', 'API providers');

const operationsNotRequiringAuth = [
  'Character',
  'StreamCharacter',
  'SheetComponents',
  'StreamComponents',
  'EarlyAccessUser',
  'RulesetSalesPage',
];

const GraphQLProvider = ({
  children,
  gqlEndpoint,
  compassKey,
}: {
  children: ReactNode;
  gqlEndpoint: string;
  compassKey: string;
}) => {
  const { token } = useSessionToken();

  const authLink = setContext(async (request, { headers }) => {
    return {
      headers: {
        ...headers,
        Authorization: `Bearer ${token}`,
        ...(request.operationName &&
          operationsNotRequiringAuth.includes(request.operationName!) && {
            'x-api-key': compassKey,
          }),
      },
    };
  });

  const credsLink = createHttpLink({
    uri: gqlEndpoint,
  });

  const wsLink = new GraphQLWsLink(
    createGraphqlClient({
      url: gqlEndpoint.replace('http', 'ws'),
      connectionParams: {
        authToken: `Bearer ${token}`,
      },
    }),
  );

  const splitLink = split(
    ({ query }) => {
      const definition = getMainDefinition(query);
      return definition.kind === 'OperationDefinition' && definition.operation === 'subscription';
    },
    wsLink,
    credsLink,
  );

  const removeTypenames = new ApolloLink((operation, forward) => {
    function omitTypename(key: string, value: any) {
      return key === '__typename' ? undefined : value;
    }

    if (operation.variables) {
      operation.variables = JSON.parse(JSON.stringify(operation.variables), omitTypename);
    }

    return forward(operation);
  });

  const preventCallsWithoutAuth = new ApolloLink((operation, forward) => {
    if (!token && !operationsNotRequiringAuth.includes(operation.operationName ?? '')) {
      throw Error('preventCallsWithoutAuth')
    }

    return forward(operation);
  });

  const linksArray = [authLink, removeTypenames, preventCallsWithoutAuth, addStaticDomain];
  linksArray.push(splitLink);

  const links = from(linksArray);

  const client = new ApolloClient({
    link: links,
    cache,
    devtools: { enabled: import.meta.env.VITE_ENV === 'dev' || import.meta.env.VITE_ENV === 'local' },
  });

  return <Provider client={client}>{children}</Provider>;
};

export const RestContext = createContext({
  emailApiEndpoint: '',
  checkoutEndpoint: '',
  signupEndpoint: '',
  manageEndpoint: '',
});

type SupabaseContextType = {
  host: string;
};

export const SupabaseContext = createContext<SupabaseContextType>(null!);

const RestProvider = ({
  children,
  emailApiEndpoint,
  checkoutEndpoint,
  signupEndpoint,
  manageEndpoint,
}: {
  children: ReactNode;
  emailApiEndpoint: string;
  checkoutEndpoint: string;
  signupEndpoint: string;
  manageEndpoint: string;
}) => {
  return (
    <RestContext.Provider
      value={{
        emailApiEndpoint,
        checkoutEndpoint,
        signupEndpoint,
        manageEndpoint,
      }}>
      {children}
    </RestContext.Provider>
  );
};

export const CacheProvider = ({
  children,
  graphqlEndpoint,
  emailApiEndpoint,
  supabaseKey,
  supabaseHost,
  compassKey,
  checkoutEndpoint,
  signupEndpoint,
  manageEndpoint,
}: {
  children: ReactNode;
  graphqlEndpoint: string;
  emailApiEndpoint: string;
  supabaseKey: string;
  supabaseHost: string;
  compassKey: string;
  checkoutEndpoint: string;
  signupEndpoint: string;
  manageEndpoint: string;
}) => {
  return (
    <SupabaseContext.Provider value={{ host: supabaseHost }}>
      <GraphQLProvider gqlEndpoint={graphqlEndpoint} compassKey={compassKey}>
        <RestProvider
          emailApiEndpoint={emailApiEndpoint}
          checkoutEndpoint={checkoutEndpoint}
          manageEndpoint={manageEndpoint}
          signupEndpoint={signupEndpoint}>
          {children}
        </RestProvider>
      </GraphQLProvider>
    </SupabaseContext.Provider>
  );
};
