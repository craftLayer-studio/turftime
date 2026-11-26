/**
 * pnpm db:seed           seed the demo venue if the database is empty
 * pnpm db:seed --reset   wipe all data and seed again
 */
import path from "node:path";
import { createPgliteDb, type Db } from "./client";
import { seedDemo, seedIfEmpty, wipe } from "./seed";

async function main() {
  const reset = process.argv.includes("--reset");
  let db: Db;
  if (process.env.DATABASE_URL) {
    const { Pool } = await import("pg");
    const { drizzle } = await import("drizzle-orm/node-postgres");
    const { migrate } = await import("drizzle-orm/node-postgres/migrator");
    const schema = await import("./schema");
    const pg = drizzle(new Pool({ connectionString: process.env.DATABASE_URL }), { schema });
    await migrate(pg, { migrationsFolder: path.join(process.cwd(), "src/server/db/migrations") });
    db = pg as unknown as Db;
  } else {
    db = await createPgliteDb(path.join(process.cwd(), ".data/pglite"));
  }
  if (reset) {
    await wipe(db);
    await seedDemo(db);
    console.log("Demo data reset.");
  } else {
    console.log((await seedIfEmpty(db)) ? "Demo data seeded." : "Database already has data. Use --reset to start over.");
  }
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
