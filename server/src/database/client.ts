import 'dotenv/config';
import { PrismaClient } from './prisma/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { LocalSupabaseClient, createLocalSupabaseClient } from '../local-utils';

const password = process.env.DATABASE_PASSWORD ?? '';
const dbHost = process.env.DATABASE_HOST ?? 'localhost';
const dbName = process.env.DATABASE_NAME ?? 'postgres';
const dbPort = process.env.DATABASE_PORT ?? '5432';

let db: PrismaClient | undefined = undefined;
let supabase: LocalSupabaseClient | undefined = undefined;

export type TPrismaClient = PrismaClient;

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

  const connectionString = `postgres://${env.username}:${env.password}@${dbHost}:${dbPort}/${env.dbName}`;

  const adapter = new PrismaPg({ connectionString });
  db = new PrismaClient({ adapter });

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
