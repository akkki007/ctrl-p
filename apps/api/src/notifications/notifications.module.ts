import { Global, Module } from "@nestjs/common";
import { NotificationsController } from "./notifications.controller.js";
import { NotificationsService } from "./notifications.service.js";

/** Global so any service can inject the hub to emit notifications. */
@Global()
@Module({
  controllers: [NotificationsController],
  providers: [NotificationsService],
  exports: [NotificationsService],
})
export class NotificationsModule {}
