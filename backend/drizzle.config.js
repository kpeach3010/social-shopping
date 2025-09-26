import "dotenv/config";
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "postgresql",
  schema: "./app/db/schema.js",
  out: "./app/drizzle",
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
});
