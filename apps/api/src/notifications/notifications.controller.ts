import { Body, Controller, Get, Post, UseGuards } from "@nestjs/common";
import { z } from "zod";
import { CurrentUser } from "../auth/current-user.decorator.js";
import type { AuthedUser } from "../auth/session.guard.js";
import { SessionGuard } from "../auth/session.guard.js";
import { ZodValidationPipe } from "../common/zod-validation.pipe.js";
import { NotificationsService } from "./notifications.service.js";

const markReadSchema = z.object({ id: z.string().uuid().optional() });
type MarkReadInput = z.infer<typeof markReadSchema>;

@UseGuards(SessionGuard)
@Controller("notifications")
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Get()
  feed(@CurrentUser() user: AuthedUser) {
    return this.notifications.feed(user.id);
  }

  @Post("read")
  markRead(
    @CurrentUser() user: AuthedUser,
    @Body(new ZodValidationPipe(markReadSchema)) body: MarkReadInput,
  ) {
    return this.notifications.markRead(user.id, body.id);
  }
}
