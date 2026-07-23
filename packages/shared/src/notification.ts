import { z } from "zod";

export const NOTIFICATION_CHANNELS = ["in_app", "email", "whatsapp"] as const;
export const notificationChannelSchema = z.enum(NOTIFICATION_CHANNELS);
export type NotificationChannel = z.infer<typeof notificationChannelSchema>;

export interface NotificationView {
  id: string;
  channel: NotificationChannel;
  type: string;
  title: string;
  body: string;
  read: boolean;
  createdAt: string;
}

export interface NotificationFeed {
  items: NotificationView[];
  unread: number;
}
