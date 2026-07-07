import { Pool } from "pg";

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL ?? "postgres://storyrender:storyrender@localhost:5432/storyrender",
});
