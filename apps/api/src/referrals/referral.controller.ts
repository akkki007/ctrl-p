import { Body, Controller, Get, Post, UseGuards } from "@nestjs/common";
import { CurrentUser } from "../auth/current-user.decorator.js";
import type { AuthedUser } from "../auth/session.guard.js";
import { SessionGuard } from "../auth/session.guard.js";
import { ZodValidationPipe } from "../common/zod-validation.pipe.js";
import { ReferralService } from "./referral.service.js";
import { type ClaimReferralInput, claimReferralSchema } from "@ctrlp/shared";

@UseGuards(SessionGuard)
@Controller("referrals")
export class ReferralController {
  constructor(private readonly referrals: ReferralService) {}

  @Get()
  view(@CurrentUser() user: AuthedUser) {
    return this.referrals.view(user.id);
  }

  @Post("claim")
  claim(
    @CurrentUser() user: AuthedUser,
    @Body(new ZodValidationPipe(claimReferralSchema)) body: ClaimReferralInput,
  ) {
    return this.referrals.claim(user.id, body.code);
  }
}
