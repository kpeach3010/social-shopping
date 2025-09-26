import "dotenv/config";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "./schema.js";

const client = postgres(process.env.DATABASE_URL, {
  max: 10,
  ssl: "require",
});

export const db = drizzle(client, { schema });

process.on("SIGINT", async () => {
  await client.end({ timeout: 5 });
  process.exit(0);
});
