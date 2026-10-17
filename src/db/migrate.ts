import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import { env } from "../config/env";

const client = postgres(env.DATABASE_URL, { max: 1 });
const db = drizzle(client);

async function runMigrate() {
  console.log("⏳ Aplicando migrações...");
  await migrate(db, { migrationsFolder: "./drizzle" });
  console.log("✅ Migrações aplicadas com sucesso!");
  await client.end();
}

runMigrate().catch((err) => {
  console.error("Erro ao aplicar migrações:", err);
  client.end();
  process.exit(1);
});
