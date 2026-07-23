import { Controller, Get, Inject } from "@nestjs/common";
import { sql } from "drizzle-orm";
import type { Database } from "@ctrlp/db";
import { DB } from "../db/db.module.js";

@Controller("health")
export class HealthController {
  constructor(@Inject(DB) private readonly db: Database) {}

  @Get()
  async check() {
    let database = "ok";
    try {
      await this.db.execute(sql`select 1`);
    } catch {
      database = "unreachable";
    }
    return {
      status: database === "ok" ? "ok" : "degraded",
      database,
      uptimeSeconds: Math.round(process.uptime()),
    };
  }
}
