import { Module } from "@nestjs/common";
import { AnalyticsModule } from "../analytics/analytics.module.js";
import { BulkModule } from "../bulk/bulk.module.js";
import { CouponsModule } from "../coupons/coupons.module.js";
import { OrdersModule } from "../orders/orders.module.js";
import { PayoutsModule } from "../payouts/payouts.module.js";
import { ShippingModule } from "../shipping/shipping.module.js";
import { AdminController } from "./admin.controller.js";
import { AdminService } from "./admin.service.js";
import { ModerationService } from "./moderation.service.js";

@Module({
  imports: [
    OrdersModule,
    CouponsModule,
    PayoutsModule,
    ShippingModule,
    AnalyticsModule,
    BulkModule,
  ],
  controllers: [AdminController],
  providers: [AdminService, ModerationService],
})
export class AdminModule {}
