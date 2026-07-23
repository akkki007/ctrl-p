import { Body, Controller, Get, Post, UseGuards } from "@nestjs/common";
import { CurrentUser } from "../auth/current-user.decorator.js";
import type { AuthedUser } from "../auth/session.guard.js";
import { SessionGuard } from "../auth/session.guard.js";
import { ZodValidationPipe } from "../common/zod-validation.pipe.js";
import { PayoutService } from "./payout.service.js";
import { type RequestPayoutInput, requestPayoutSchema } from "@ctrlp/shared";

@UseGuards(SessionGuard)
@Controller("payouts")
export class PayoutController {
  constructor(private readonly payouts: PayoutService) {}

  @Get()
  mine(@CurrentUser() user: AuthedUser) {
    return this.payouts.myRequests(user.id);
  }

  @Post()
  request(
    @CurrentUser() user: AuthedUser,
    @Body(new ZodValidationPipe(requestPayoutSchema)) body: RequestPayoutInput,
  ) {
    return this.payouts.request(user.id, body);
  }
}
