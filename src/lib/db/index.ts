// src/lib/db/index.ts
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from './schema';

const connectionString = process.env.DATABASE_URL;

// During build/prerender, if DATABASE_URL is missing, we use a dummy 
// to prevent the build from failing, but we mark the data as dynamic.
if (!connectionString && process.env.NODE_ENV === 'production') {
  console.warn('DATABASE_URL is missing during build. Using mock client.');
}

const sql = neon(connectionString || 'postgres://mock:mock@localhost:5432/mock');
export const db = drizzle(sql, { schema });
