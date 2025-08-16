import { ApolloServer } from '@apollo/server';
import fs from 'fs';
import path from 'path';
import { resolvers } from './resolvers';
import express, { Express } from 'express';
import { expressMiddleware } from '@apollo/server/express4';
import cors from 'cors';
import { AuthorizationContext } from '../types';
import { authorizer } from '../authorization';

import { createServer } from 'http';
import { ApolloServerPluginDrainHttpServer } from '@apollo/server/plugin/drainHttpServer';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { WebSocketServer } from 'ws';
import { useServer } from 'graphql-ws/lib/use/ws';

import dotenv from 'dotenv';
dotenv.config();

const port = process.env.PORT;

const queriesWithoutAuth = [
  'EarlyAccessUser',
  'StreamCharacter',
  'StreamComponents',
  'RulesetSalesPage',
  'Character',
  'SheetComponents',
  'Sheet',
];
const queriesWhichShouldIgnoreCache = ['RulesetSalesPage'];

const typeDefs = `
  ${fs.readFileSync(path.resolve(__dirname, 'schema.graphql').toString())}
`;

export const initializeGqlServer = async (app: Express) => {
  const httpServer = createServer(app);
  const schema = makeExecutableSchema({ typeDefs, resolvers });

  const wsServer = new WebSocketServer({
    server: httpServer,
    path: '/graphql',
  });

  const serverCleanup = useServer(
    {
      schema,
      context: async (ctx, msg, args) => {
        if (!ctx.connectionParams?.authToken) return {};
        return authorizer({
          token: ctx.connectionParams.authToken as string,
          optionalAuth: true,
          // optionalAuth: queriesWithoutAuth.includes(req.body.operationName),
          // ignoreCache: queriesWhichShouldIgnoreCache.includes(req.body.operationName),
        });
      },
    },
    wsServer,
  );

  const gqlServer = new ApolloServer<AuthorizationContext>({
    schema,
    includeStacktraceInErrorResponses: false,
    plugins: [
      // Proper shutdown for the HTTP server.
      ApolloServerPluginDrainHttpServer({ httpServer }),

      // Proper shutdown for the WebSocket server.
      {
        async serverWillStart() {
          return {
            async drainServer() {
              await serverCleanup.dispose();
            },
          };
        },
      },
    ],
  });

  await gqlServer.start();

  app.use(
    '/graphql',
    cors<cors.CorsRequest>(),
    express.json(),
    expressMiddleware(gqlServer, {
      context: async ({ req }) => {
        return authorizer({
          token: req.headers.authorization,
          optionalAuth: queriesWithoutAuth.includes(req.body.operationName),
          ignoreCache: queriesWhichShouldIgnoreCache.includes(req.body.operationName),
        });
      },
    }),
  );

  httpServer.listen(port, () => {
    if (process.env.MODE === 'local') {
      console.log(`[server]: Server is running at http://localhost:${port}`);
    }
  });
};
