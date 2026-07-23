import { Module } from "@nestjs/common";
import { PayoutController } from "./payout.controller.js";
import { PayoutService } from "./payout.service.js";

@Module({
  controllers: [PayoutController],
  providers: [PayoutService],
  exports: [PayoutService],
})
export class PayoutsModule {}
