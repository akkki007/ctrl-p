import { Module } from "@nestjs/common";
import { OrdersModule } from "../orders/orders.module.js";
import { AdminController } from "./admin.controller.js";
import { AdminService } from "./admin.service.js";
import { ModerationService } from "./moderation.service.js";

@Module({
  imports: [OrdersModule],
  controllers: [AdminController],
  providers: [AdminService, ModerationService],
})
export class AdminModule {}
