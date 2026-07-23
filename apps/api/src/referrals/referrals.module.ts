import { Module } from "@nestjs/common";
import { LoyaltyModule } from "../loyalty/loyalty.module.js";
import { ReferralController } from "./referral.controller.js";
import { ReferralService } from "./referral.service.js";

@Module({
  imports: [LoyaltyModule],
  controllers: [ReferralController],
  providers: [ReferralService],
  exports: [ReferralService],
})
export class ReferralsModule {}
