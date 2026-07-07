import express from "express";
import { pool } from "./db.js";

const app = express();
const port = process.env.PORT ?? 3001;

app.get("/health", async (_req, res) => {
  try {
    await pool.query("SELECT 1");
    res.json({ status: "ok", db: "connected" });
  } catch (err) {
    res.status(503).json({ status: "degraded", db: "unreachable", error: (err as Error).message });
  }
});

app.listen(port, () => {
  console.log(`Story Render backend rodando em http://localhost:${port}`);
});
