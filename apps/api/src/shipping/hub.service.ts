import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { arrayContains, desc, eq } from "drizzle-orm";
import { DB } from "../db/db.module.js";
import type { DbExecutor } from "../db/tx.js";
import type { Database } from "@ctrlp/db";
import { schema } from "@ctrlp/db";
import {
  type CreateHubInput,
  type HubView,
  type ServiceabilityResult,
  type UpdateHubInput,
  pincodePrefix,
} from "@ctrlp/shared";

type HubRow = typeof schema.fulfillmentHub.$inferSelect;

@Injectable()
export class HubService {
  constructor(@Inject(DB) private readonly db: Database) {}

  /** The active hub that serves a PIN code, if any. */
  async resolveHub(pincode: string, exec: DbExecutor = this.db): Promise<HubRow | undefined> {
    const prefix = pincodePrefix(pincode);
    const hubs = await exec.query.fulfillmentHub.findMany({
      where: arrayContains(schema.fulfillmentHub.pincodePrefixes, [prefix]),
    });
    return hubs.find((h) => h.active);
  }

  async checkServiceability(pincode: string): Promise<ServiceabilityResult> {
    const hub = await this.resolveHub(pincode);
    return hub
      ? { serviceable: true, hubName: hub.name, city: hub.city }
      : { serviceable: false, hubName: null, city: null };
  }

  // ── Admin ────────────────────────────────────────────────

  async list(): Promise<HubView[]> {
    const rows = await this.db.query.fulfillmentHub.findMany({
      orderBy: [desc(schema.fulfillmentHub.createdAt)],
    });
    return Promise.all(
      rows.map(async (h) => ({
        ...this.toView(h),
        orderCount: await this.db.$count(schema.order, eq(schema.order.hubId, h.id)),
      })),
    );
  }

  async create(input: CreateHubInput): Promise<HubView> {
    const [row] = await this.db
      .insert(schema.fulfillmentHub)
      .values({
        name: input.name,
        city: input.city,
        pincodePrefixes: input.pincodePrefixes,
        active: input.active,
      })
      .returning();
    if (!row) throw new BadRequestException("Failed to create hub");
    return { ...this.toView(row), orderCount: 0 };
  }

  async update(id: string, input: UpdateHubInput): Promise<HubView> {
    const found = await this.db.query.fulfillmentHub.findFirst({
      where: eq(schema.fulfillmentHub.id, id),
    });
    if (!found) throw new NotFoundException("Hub not found");

    const [row] = await this.db
      .update(schema.fulfillmentHub)
      .set({
        name: input.name ?? found.name,
        pincodePrefixes: input.pincodePrefixes ?? found.pincodePrefixes,
        active: input.active ?? found.active,
      })
      .where(eq(schema.fulfillmentHub.id, id))
      .returning();

    const orderCount = await this.db.$count(schema.order, eq(schema.order.hubId, id));
    return { ...this.toView(row!), orderCount };
  }

  private toView(h: HubRow): Omit<HubView, "orderCount"> {
    return {
      id: h.id,
      name: h.name,
      city: h.city,
      pincodePrefixes: h.pincodePrefixes,
      active: h.active,
      createdAt: h.createdAt.toISOString(),
    };
  }
}
