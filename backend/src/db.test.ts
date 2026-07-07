import { describe, it, expect } from "vitest";
import { pool } from "./db.js";

describe("db pool", () => {
  it("aponta pra um connection string válido por padrão", () => {
    expect(pool.options.connectionString).toContain("postgres://");
  });
});
