import { PrismaClient } from '@prisma/client';
import { LocalSupabaseClient, createLocalSupabaseClient } from '../local-utils';
import dotenv from 'dotenv';

dotenv.config();

const mode = process.env.MODE ?? 'local';

const password = process.env.DATABASE_PASSWORD ?? '';
const dbHost = process.env.DATABASE_HOST ?? 'localhost';
const dbName = process.env.DATABASE_NAME ?? 'postgres';
const dbPort = process.env.DATABASE_PORT ?? '5432';

let db: PrismaClient | undefined = undefined;
let supabase: LocalSupabaseClient | undefined = undefined;

/**
 * Returns a singleton instance of a PrismaClient
 */
export const dbClient = () => {
  if (db) {
    return db;
  }
  const env = {
    host: dbHost.replace('.supabase.co', ''),
    password,
    dbName,
    username: 'postgres',
    port: '6543',
  };

  // Supabase connection pool URL
  const url =
    mode === 'local'
      ? `postgres://${env.username}:${env.password}@${dbHost}:${dbPort}/${env.dbName}`
      : `postgres://${env.username}.${env.host}:${env.password}@aws-0-us-east-1.pooler.supabase.com:${env.port}/${env.dbName}?pgbouncer=true`;

  db = new PrismaClient({ datasources: { db: { url } } });

  return db;
};

export const supabaseClient = (): LocalSupabaseClient => {
  if (supabase) {
    return supabase;
  }

  // supabase = createClient(`https://${supabseHost}`, supabaseApiKey);

  supabase = createLocalSupabaseClient();

  return supabase;
};
