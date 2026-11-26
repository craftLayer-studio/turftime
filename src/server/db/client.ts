import { mkdirSync } from "node:fs";
import path from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { drizzle as drizzlePglite, type PgliteDatabase } from "drizzle-orm/pglite";
import { migrate as migratePglite } from "drizzle-orm/pglite/migrator";
import * as schema from "./schema";

/**
 * Database access. Dev uses a PGlite file DB at ./.data/pglite, tests use in-memory PGlite,
 * and DATABASE_URL switches to node-postgres. All three speak the same Drizzle query API.
 */
export type Db = PgliteDatabase<typeof schema>;
export type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];
export type DbOrTx = Db | Tx;

export const MIGRATIONS_DIR = path.join(process.cwd(), "src/server/db/migrations");

export async function createPgliteDb(dataDir?: string): Promise<Db> {
  if (dataDir) mkdirSync(path.dirname(dataDir), { recursive: true });
  const client = dataDir ? new PGlite(dataDir) : new PGlite();
  const db = drizzlePglite(client, { schema });
  await migratePglite(db, { migrationsFolder: MIGRATIONS_DIR });
  return db;
}

async function createPgDb(url: string): Promise<Db> {
  const { Pool } = await import("pg");
  const { drizzle } = await import("drizzle-orm/node-postgres");
  const { migrate } = await import("drizzle-orm/node-postgres/migrator");
  const pool = new Pool({ connectionString: url, max: 10 });
  const db = drizzle(pool, { schema });
  await migrate(db, { migrationsFolder: MIGRATIONS_DIR });
  // Same query builder surface; the cast keeps one Db type across drivers.
  return db as unknown as Db;
}

const globalForDb = globalThis as unknown as { __turftimeDb?: Promise<Db> };

/** Shared app database, migrated and auto-seeded with the demo venue when empty. */
export function getDb(): Promise<Db> {
  if (!globalForDb.__turftimeDb) {
    globalForDb.__turftimeDb = (async () => {
      const url = process.env.DATABASE_URL;
      const db = url ? await createPgDb(url) : await createPgliteDb(path.join(process.cwd(), ".data/pglite"));
      const { seedIfEmpty } = await import("./seed");
      await seedIfEmpty(db);
      return db;
    })().catch((err) => {
      globalForDb.__turftimeDb = undefined;
      throw err;
    });
  }
  return globalForDb.__turftimeDb;
}
