import { Module } from "@nestjs/common";
import { AssetsModule } from "../assets/assets.module.js";
import { CouponsModule } from "../coupons/coupons.module.js";
import { LoyaltyModule } from "../loyalty/loyalty.module.js";
import { ReferralsModule } from "../referrals/referrals.module.js";
import { OrdersController } from "./orders.controller.js";
import { OrdersService } from "./orders.service.js";

@Module({
  imports: [AssetsModule, LoyaltyModule, CouponsModule, ReferralsModule],
  controllers: [OrdersController],
  providers: [OrdersService],
  exports: [OrdersService],
})
export class OrdersModule {}
