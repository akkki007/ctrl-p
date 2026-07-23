import { Inject, Injectable, Logger } from "@nestjs/common";
import { and, desc, eq, isNull } from "drizzle-orm";
import { DB } from "../db/db.module.js";
import type { DbExecutor } from "../db/tx.js";
import type { Database } from "@ctrlp/db";
import { schema } from "@ctrlp/db";
import type { NotificationChannel, NotificationFeed } from "@ctrlp/shared";

interface NotifyInput {
  type: string;
  title: string;
  body: string;
  /** Extra channels to dispatch alongside the always-persisted in-app one. */
  channels?: Array<Exclude<NotificationChannel, "in_app">>;
}

/**
 * Notifications hub. Every notification is persisted as an in-app row (the feed
 * the bell reads). Email/WhatsApp are dispatched through a transport that, with
 * no provider configured, logs the message — the seam where SES/Twilio plug in.
 * Delivery never throws into the caller's transaction.
 */
@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(@Inject(DB) private readonly db: Database) {}

  async notify(exec: DbExecutor, userId: string, input: NotifyInput): Promise<void> {
    try {
      await exec.insert(schema.notification).values({
        userId,
        channel: "in_app",
        type: input.type,
        title: input.title,
        body: input.body,
      });

      for (const channel of input.channels ?? []) {
        await exec.insert(schema.notification).values({
          userId,
          channel,
          type: input.type,
          title: input.title,
          body: input.body,
        });
        this.dispatch(channel, userId, input);
      }
    } catch (err) {
      // Notifications are best-effort — never fail the originating action.
      this.logger.warn(`Failed to record notification for ${userId}: ${String(err)}`);
    }
  }

  async feed(userId: string): Promise<NotificationFeed> {
    const rows = await this.db.query.notification.findMany({
      where: and(
        eq(schema.notification.userId, userId),
        eq(schema.notification.channel, "in_app"),
      ),
      orderBy: [desc(schema.notification.createdAt)],
      limit: 50,
    });
    return {
      items: rows.map((n) => ({
        id: n.id,
        channel: n.channel,
        type: n.type,
        title: n.title,
        body: n.body,
        read: n.readAt != null,
        createdAt: n.createdAt.toISOString(),
      })),
      unread: rows.filter((n) => n.readAt == null).length,
    };
  }

  /** Mark one notification read, or all of the user's when `id` is omitted. */
  async markRead(userId: string, id?: string): Promise<{ ok: true }> {
    const now = new Date();
    if (id) {
      await this.db
        .update(schema.notification)
        .set({ readAt: now })
        .where(and(eq(schema.notification.id, id), eq(schema.notification.userId, userId)));
    } else {
      await this.db
        .update(schema.notification)
        .set({ readAt: now })
        .where(
          and(eq(schema.notification.userId, userId), isNull(schema.notification.readAt)),
        );
    }
    return { ok: true };
  }

  /** Transport stub — logs the message. Swap for SES/Twilio here. */
  private dispatch(channel: NotificationChannel, userId: string, input: NotifyInput): void {
    this.logger.log(`[${channel}] → ${userId}: ${input.title} — ${input.body}`);
  }
}
